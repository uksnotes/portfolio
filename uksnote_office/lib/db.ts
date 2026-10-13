import postgres from 'postgres';
/** Supabase Postgres 연결.
 * 기존 코드가 쓰던 D1 형태(prepare→bind→first/all/run)를 그대로 제공해
 * 업무 로직의 SQL 호출부는 바꾸지 않고 저장소만 교체한다.
 * `?` 자리표시자는 Postgres의 `$1, $2…`로 바꿔 실행한다.
 */
type Row = Record<string, any>;
export type Executor = (query: string, params: unknown[]) => Promise<{ rows: Row[]; count: number }>;
type Statement = {
  bind(...values: unknown[]): Statement;
  first<T = Row>(): Promise<T | null>;
  all<T = Row>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number } }>;
};

const cache = globalThis as unknown as { __officeDbExecutor?: Executor };

export function placeholders(query: string) {
  let i = 0;
  return query.replace(/'(?:[^']|'')*'|\?/g, m => (m === '?' ? '$' + ++i : m));
}

function connectionUrl() {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!raw) throw new Error('DATABASE_URL이 설정되지 않았습니다. Supabase 연결 문자열을 환경 변수에 등록해 주세요.');
  // Vercel·Supabase 연동이 붙이는 비표준 파라미터(supa 등)는 Postgres 시작 옵션으로 전달되면 접속이 거부된다.
  const url = new URL(raw);
  for (const key of [...url.searchParams.keys()]) if (key !== 'sslmode') url.searchParams.delete(key);
  return url;
}

function postgresExecutor(): Executor {
  const url = connectionUrl();
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  const sql = postgres(url.toString(), {
    // Supabase 트랜잭션 풀러(6543)는 prepared statement를 지원하지 않는다.
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: local ? false : 'require',
    // bigint(만료 시각 등 ms 단위)를 기존 코드처럼 숫자로 다룬다.
    types: { int8: { to: 20, from: [20], serialize: (x: number) => String(x), parse: (x: string) => Number(x) } },
  });
  return async (query, params) => {
    const result = await sql.unsafe(query, params as any[]);
    return { rows: [...result] as Row[], count: result.count };
  };
}

export function db() {
  const run = (cache.__officeDbExecutor ??= postgresExecutor());
  return {
    prepare(query: string): Statement {
      const text = placeholders(query);
      let values: unknown[] = [];
      const statement: Statement = {
        bind(...v) { values = v; return statement; },
        async first<T>() { return ((await run(text, values)).rows[0] as T) ?? null; },
        async all<T>() { return { results: (await run(text, values)).rows as T[] }; },
        async run() { return { meta: { changes: (await run(text, values)).count } }; },
      };
      return statement;
    },
  };
}

/** Postgres·네트워크 오류는 SQLSTATE/시스템 code를 가진다. 업무 검증 오류(Error 메시지)와 구분한다. */
export function storageError(e: unknown): string | null {
  const code = (e as { code?: unknown })?.code;
  if (typeof code !== 'string') return null;
  if (code === '23505') return '다른 화면에서 변경되었습니다. 새로고침 후 다시 시도해 주세요.';
  return '저장소 응답을 확인할 수 없습니다. 입력을 유지하고 다시 시도해 주세요.';
}
