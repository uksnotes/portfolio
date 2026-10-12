# runtime-dist/ — 빌드 산출물 (직접 수정 금지)

`server.mjs`(+ sourcemap)는 `npm run build` 시 esbuild가 `runtime/server.ts`와 `source/` 전체를 번들한 결과. `app.py`가 이 파일을 실행한다.
수정은 `runtime/` 또는 `source/`에서 하고 재빌드할 것. 디버깅 시 원인 위치는 `.map` 대신 원본 소스를 grep.
