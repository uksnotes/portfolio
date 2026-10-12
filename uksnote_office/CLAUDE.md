# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

HI OFFICE — 단일 사용자용 로컬 3D 개인 오피스(투자 분석·뉴스·일정·AI 팀·부동산). 원래 Cloudflare(D1) 웹 서비스였던 React/TypeScript 코드를 그대로 두고, 로컬 Node 서버 + SQLite 어댑터로 감싸 실행한다.

## 작업 방식 (컨텍스트 절약)

전체 코드를 읽지 말고, 아래 표에서 해당 폴더를 찾아 **그 폴더의 `CLAUDE.md`를 먼저 읽은 뒤** 필요한 파일만 연다.
`source/` 코드는 한 줄이 매우 긴 압축 스타일이므로 `Read` 전체 대신 `grep -n`/`grep -o`로 위치를 찾고 부분만 확인한다.

| 폴더 | 역할 | 안내 |
|---|---|---|
| `source/app/` | 화면(React) + API 라우터 | `source/app/CLAUDE.md` |
| `source/lib/` | 시세·뉴스·분석·AI·부동산·인증 로직 | `source/lib/CLAUDE.md` |
| `source/` (그 외) | UI 컴포넌트, DB 스키마/마이그레이션, 원본 테스트 | `source/CLAUDE.md` |
| `runtime/` | 로컬 HTTP 서버, D1→SQLite 어댑터 | `runtime/CLAUDE.md` |
| `web/`, `index.html` | 프런트 진입점 | `web/CLAUDE.md` |
| `scripts/` | 빌드 스크립트 | `scripts/CLAUDE.md` |
| `runtime-dist/` | API 서버 빌드 산출물 (직접 수정 금지) | `runtime-dist/CLAUDE.md` |
| `static/` | 프런트 빌드 산출물 (직접 수정 금지, 빌드마다 비워짐 → 안내 파일 없음) | `source/app/`에서 수정 후 재빌드 |
| `tests/` | 로컬 E2E 테스트 | `tests/CLAUDE.md` |
| `data/` | 사용자 DB·비밀 설정 (건드리지 않음) | `data/CLAUDE.md` |
| `docs/` | 코드 맵·검증 기록·빌드 정보 | `docs/CLAUDE.md` |

기능 → 파일 매핑은 `docs/CODE_MAP.md`에 있다.

## 명령어

```bash
python app.py                 # 실행 (http://127.0.0.1:8000, 로그인 datascience_user1 / 1234)
python app.py --check         # Node 버전·빌드 산출물 검사만
python app.py --port 8001 --no-browser --data-dir <경로>
python app.py --set-password  # 서버 종료 상태에서 비밀번호 변경

npm install && npm run build  # source/ runtime/ web/ 수정 후 반드시 재빌드 (최상위에서)
python tests/test_local.py    # = npm test, 임시 DB로 실제 서버 E2E 검증
```

요구 사항: Python 3.10+ (표준 라이브러리만), Node.js 22.13+ (`node:sqlite` 사용).
`source/` 안에서 `npm start`/`pnpm` 등을 실행하지 말 것 — 그것은 원본 Cloudflare 배포용이다.

## 실행 구조 (big picture)

1. `app.py`가 Node 버전과 `static/index.html`, `runtime-dist/server.mjs` 존재를 확인하고, 첫 실행 시 `data/settings.json`(비밀번호 해시·암호화 키) 생성.
2. 환경변수 `HI_OFFICE_ROOT / HI_OFFICE_DATA_DIR / HI_OFFICE_PORT / HI_OFFICE_INSTANCE`로 `runtime-dist/server.mjs` 실행.
3. `runtime/environment.ts`가 `cloudflare:workers`의 `env`를 흉내 냄: SQLite를 열고 `source/drizzle/*.sql` 중 미적용 마이그레이션만 적용, settings 값을 `env`로 노출.
4. `runtime/server.ts`가 127.0.0.1에서 `static/` 제공 + `/api/*`를 `source/app/api/[action]/route.ts`의 `GET/POST/DELETE`로 전달.
5. 프런트는 `web/main.tsx` → `source/app/office.tsx`.

핵심: 빌드 시 esbuild가 `cloudflare:workers` import를 `runtime/environment.ts`로 alias하므로 **원본 비즈니스 코드는 수정 없이** 로컬에서 돈다. 이 alias 구조를 깨지 말 것.

## 주의

- 수정 후 재빌드하지 않으면 `python app.py`는 이전 산출물을 실행한다.
- `MANIFEST_SHA256.json`은 배포 체크섬 목록이며 런타임에서 검사하지 않는다(파일 변경 시 갱신은 선택).
- 시세·뉴스·매물 수집 실패 시 임의 값으로 대체하지 않는 것이 기존 정책이다.
