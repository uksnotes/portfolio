# source/ — 원본 웹 서비스 소스

원래 Cloudflare(Next/vite + D1) 서비스의 마지막 구현 소스. 로컬판은 최상위 `scripts/build.mjs`가 이 코드를 직접 번들한다.
화면/로직은 하위 폴더 안내를 볼 것: `app/CLAUDE.md`, `lib/CLAUDE.md`.

| 경로 | 내용 | 비고 |
|---|---|---|
| `components/ui/` | shadcn 스타일 공통 UI | 생성형 컴포넌트, 보통 수정 불필요 |
| `hooks/` | React 훅 (`use-mobile`) | |
| `db/`, `drizzle.config.ts` | Drizzle 스키마 | |
| `drizzle/*.sql` | SQL 마이그레이션 | 로컬 런타임이 파일명 순서로 1회씩 적용 (`local_migrations` 테이블) |
| `public/`, `vendor/` | 아이콘·CSS·라이선스 | `public/`은 빌드 시 `static/`으로 복사 |
| `tests/office-regression.mjs` | 원본 회귀 테스트 (lib 모듈을 TS 컴파일 후 검증) | `source/`를 cwd로 실행, 산출물은 `.sites-runtime/` |
| `build/`, `scripts/`, `examples/`, `package.json`, `next.config.ts`, `vite.config.ts` 등 | 원본 배포용 설정 | **로컬 실행에 사용 안 함** |

## 규칙
- `@/` alias = `source/`.
- DB 테이블: `attempts`, `records`(owner·kind·data JSON), `secrets`, `sessions`, `identity_aliases`. 대부분의 사용자 데이터는 `records`에 kind별 JSON으로 저장.
- 새 테이블/컬럼은 `drizzle/`에 다음 번호 `.sql` 파일을 추가 (기존 마이그레이션 파일 수정 금지 — 이미 적용된 DB에는 재실행되지 않음).
- 여기서 `npm start`/`pnpm install` 실행 금지. 수정 후 최상위에서 `npm run build`.
