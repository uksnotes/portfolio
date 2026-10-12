# runtime/ — 로컬 실행 어댑터 (TypeScript)

원본 Cloudflare 코드를 수정 없이 로컬에서 돌리기 위한 층. 빌드되면 `runtime-dist/server.mjs`가 된다.

- `environment.ts` — 빌드 시 `cloudflare:workers` 대신 주입되는 모듈.
  - `HI_OFFICE_ROOT`, `HI_OFFICE_DATA_DIR` 기준으로 `data/settings.json` 로드(필수 키: `OFFICE_PASSWORD_SALT/HASH`, `OFFICE_ENCRYPTION_KEY`).
  - `node:sqlite`로 `office.sqlite3` 열기(WAL), `source/drizzle/*.sql` 미적용분만 트랜잭션으로 적용.
  - D1 `prepare().bind().first/all/run` 인터페이스를 흉내 내는 `Statement` 클래스, `env` export.
- `server.ts` — `node:http` 서버, 127.0.0.1 전용.
  - Host 허용목록(127.0.0.1/localhost:포트), Origin·`sec-fetch-site` 검사로 DNS 리바인딩/교차 출처 차단.
  - `/health`, `/api/*` → `source/app/api/[action]/route.ts`의 GET/POST/DELETE, 그 외 `static/` 파일.
  - 요청 본문 1MB 제한, 사용자 식별 헤더는 버리고 고정 로컬 소유자 사용, `data/`는 절대 서빙하지 않음.

수정 후 최상위에서 `npm run build` → `python tests/test_local.py`로 확인.
