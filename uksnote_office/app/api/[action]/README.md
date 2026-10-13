# [action] — 요청 분기

`route.ts`: URL 마지막의 action으로 로그인, 저장, 검색, 키 설정 등을 구분합니다. GET·POST·DELETE와 입력 검사를 확인한 뒤 `lib/` 함수를 호출합니다.

API 키를 응답에 넣거나 로그인 검사를 건너뛰지 않습니다.
