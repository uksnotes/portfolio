# app — 사용자 화면

| 핵심 파일 | 역할 |
| --- | --- |
| `office.tsx` | 로그인, 홈, 메뉴, 일정·투자·뉴스 화면 연결 |
| `landing.tsx` | 로그인 전 첫 화면(서비스 소개). `/`는 소개, `/login`은 로그인 폼 |
| `scene.tsx` | 3D 오피스와 캐릭터 |
| `travel-office.tsx` | 여행 검색 조건과 저장 결과 |
| `travel-itinerary-results.tsx` | 전체 일정표 / 맛집 리스트 / 지도 탭 |
| `travel-itinerary-overview.tsx` | 1~5일차 표. 일정은 선택 장소만, 맛집은 후보와 메뉴 표시 |
| `api-key-settings.tsx` | 전체 오피스 공통 API 키 등록 |
| `globals.css` | 색상·배치·모바일 화면 스타일 |

`page.tsx`는 시작 화면, `layout.tsx`는 공통 레이아웃과 사이트 제목입니다. 실제 데이터 처리 규칙은 `lib/`에 있습니다.
