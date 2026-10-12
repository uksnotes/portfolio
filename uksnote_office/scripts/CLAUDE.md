# scripts/ — 로컬 빌드

`build.mjs` (`npm run build`):
1. Vite: root=최상위, `publicDir=source/public`, alias `@`→`source/`, PostCSS 설정은 `source/` → 출력 `static/`.
2. esbuild: `runtime/server.ts` → `runtime-dist/server.mjs` (node22 ESM, 의존성 전부 번들), alias `cloudflare:workers`→`runtime/environment.ts`.

새 외부 패키지는 최상위 `package.json`에 추가(`source/package.json` 아님). 원본 배포용 스크립트는 `source/scripts/`에 따로 있고 사용하지 않는다.
