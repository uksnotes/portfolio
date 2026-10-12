# tests/ — 로컬 E2E 테스트

`python tests/test_local.py` (= `npm test`). unittest 1개(`test_end_to_end_and_restart`):
임시 data 폴더로 실제 `app.py`/빌드 산출물 서버를 띄워 로그인 → 저장 → 재시작 후 유지를 검증. 외부 API·메일 호출 없음.

- 빌드 산출물을 대상으로 하므로 **소스 수정 후 `npm run build` 먼저**.
- 단일 테스트: `python -m unittest tests.test_local.LocalOfficeTest.test_end_to_end_and_restart` (최상위에서).
- lib 단위 로직 회귀 테스트는 `source/tests/office-regression.mjs` (source/CLAUDE.md 참고).
