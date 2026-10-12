# web/ — 로컬판 프런트 진입점

- `main.tsx`: `source/app/office.tsx`를 ErrorBoundary로 감싸 렌더하고 `source/app/globals.css` import. 최상위 `index.html`이 이 파일을 로드.
- 원본 Next `layout.tsx`/`page.tsx` 대신 이 경로가 쓰인다. 전역 Provider·에러 화면을 바꿀 때만 수정.
