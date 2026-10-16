# BrainCrews 소스 코드

2026-10-13 배포 버전 기준 · 소스 커밋 `09d0667cf64fa5500e1ddc892262e37b6ce636e4`

일정·투자·뉴스·부동산·여행을 한곳에서 보는 개인 오피스입니다. 2026-10-13에 OpenAI Sites(Cloudflare D1)에서 Vercel + Supabase로 옮기면서 이메일 가입·로그인으로 바꿨습니다. 업무 기능 로직은 그대로입니다.

## 처음 읽는 순서

1. 이 파일: 전체 구조
2. `docs/FEATURE_MAP.md`: 기능별 수정 위치
3. 필요한 폴더의 `README.md`: 핵심 파일 설명
4. 실행하려면 `docs/SETUP.md`

## 폴더별 역할

모양을 바꾸려면 `app/`, 계산·검색·AI 규칙을 바꾸려면 `lib/`를 보세요.

### `app/` — 화면과 API 입구

| 기능 | 파일 |
| --- | --- |
| 홈·메뉴·뉴스 | `office.tsx`, `page.tsx`, `layout.tsx` |
| 3D 사무실·캐릭터 | `scene.tsx` |
| AI 팀 | `team-office.tsx`(진행), `team-intake.tsx`(대표 결정: 참여 담당자 + 질문 5개), `team-report.tsx`(표 보고서), `team-report-export.ts`(Word·PDF) |
| 여행 | `travel-office.tsx`, `travel-itinerary-*.tsx`(일정표·맛집·지도) |
| 항공권 | `flight-results.tsx`, `airport-picker.tsx` |
| 부동산 | `apartment-office.tsx`, `royal-ranking.tsx` |
| 주식 | `stock-analysis.tsx`, `kospi-ranking.tsx` |
| API 키 설정 | `api-key-settings.tsx`, `travel-api-key.tsx` |
| 관리자 | `admin/`: 사용자 차단·로그·비밀번호 재설정·사용량 |
| 로그인 | `login/` |
| 서버 요청 | `api/[action]/route.ts`: 모든 API를 받는 단일 라우트 |
| 스타일 | `globals.css` |

### `lib/` — 실제 처리

| 기능 | 파일 |
| --- | --- |
| AI 공통 | `ai-provider.ts`, `ai-gateway.ts`(ChatGPT·Claude·Gemini 호출·웹 검색), `ai-keys.ts`(키 암호화 저장) |
| AI 팀 | `team-jobs.ts`(업무 상태 흐름), `sol.ts`(역할별 지시·응답 형식), `ai-team.ts`(역할 정의) |
| 여행·항공 | `research-jobs.ts`, `travel-*.ts`, `itinerary-map.ts`, `kiwi-fares.ts`, `flight-*.ts` |
| 부동산 | `apartments.ts`, `apartment-*.ts`, `naver-estate.ts`, `royal-search.ts`, `asil-trades.ts` |
| 주식 | `analysis.ts`, `market-history.ts`, `kospi-*.ts`, `naver-chart.ts` |
| 뉴스 | `providers.ts`, `news-summary.ts`, `news-categories.ts` |
| 계정·DB·로그 | `accounts.ts`, `supabase-auth.ts`, `db.ts`, `server.ts`, `usage.ts`, `user-logs.ts`, `mail.ts` |

### 그 외

| 폴더 | 내용 |
| --- | --- |
| `components/ui/` | 버튼·탭·입력창 같은 공통 부품(shadcn) |
| `hooks/` | `use-mobile.ts`: 모바일 화면 감지 |
| `supabase/migrations/` | Supabase 테이블 생성 SQL |
| `tests/` | `office-regression.mjs`: 회귀 테스트(모의 응답, 유료 호출 없음) |
| `scripts/` | `check-secrets.mjs`: 키 유출 검사 |
| `docs/` | `FLOW.md`(동작 흐름), `FEATURE_MAP.md`(기능별 수정 위치), `SETUP.md`(실행 준비), `superpowers/`(설계·계획) |
| `examples/` | 화면 예시 이미지 |
| `public/`, `vendor/` | 파비콘, 외부 스타일과 라이선스 |
| `legacy/` | 이전 Cloudflare·Sites 배포 파일 보관 (빌드 제외) |

## 배포 구조

- **Vercel**: Next.js 앱 배포 (Root Directory `uksnote_office`)
- **Supabase Postgres**: 오피스 데이터, 회원·차단 상태(`office_users`), 사용자 로그(`user_logs`), 기능별 사용량(`feature_usage`)
- **Supabase Auth**: 이메일·비밀번호
- **공개 가입**: 가입하면 바로 이용. 관리자는 `/admin`에서 로그 확인, 문제 계정 차단, 임시 비밀번호 발급, 기능별 사용량 확인
- **서버 AI 키는 관리자 전용**: 다른 사용자는 각자 API 키를 등록해서 사용

설정 방법은 `docs/SETUP.md`를 보세요.

## 현재 핵심 기능

- 여행: 전체 일정표 / 맛집 리스트 / 날짜별 지도. 식당 변경은 일정과 지도에 함께 반영
- 항공권: Kiwi 실시간 조회, 왕복·직항·최저가 및 서로 다른 항공사 조합. Skyscanner는 외부 비교 링크
- 공통 AI: Claude·Gemini·ChatGPT 키를 계정별 암호화 저장. 하나만 등록하면 해당 서비스만 사용
- 부동산: 매매 59·84㎡, 실거래·중개사 매물·로얄동 근거 확인
- AI 팀: 대표 결정 질문 5개 → 비서실장·리서치(웹 검색)·분석(선택)·검증(웹 검색, 선택)·보고서. 분석·검증은 대표 결정 첫 단계에서 뺄 수 있음(AI 추천). 최종 보고서는 표 위주 3페이지 이내, Word·PDF 다운로드
- 투자·뉴스·일정·메일 초안

## 포함하지 않은 것

실제 API 키, 로그인 비밀번호·검증값, 사용자 DB, 세션, Git 이력, 설치된 패키지, 빌드 결과·캐시는 포함하지 않았습니다. `.env.example`에는 빈 설정 항목만 있습니다.

Vercel·Supabase 전환 후 `next build`와 회귀 테스트(PGlite 메모리 Postgres)는 통과했습니다. 브라우저 화면 검증과 개인 API 키를 사용한 유료 호출 검증은 별도입니다.
