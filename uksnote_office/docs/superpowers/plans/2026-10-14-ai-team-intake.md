# AI 팀 사전 질문·웹 검색·조건부 분석 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 업무 설계 전에 대표가 AI 맞춤 질문 5개에 답하고, 리서치·검증은 항상 웹 검색을 쓰며, 데이터 분석가는 투자 업무에서만 실행되게 한다.

**Architecture:** 사전 질문을 `steps[0]`(`role:'intake'`) 단계로 추가해 기존 리스·폴링·재시도 처리를 재사용한다. intake가 끝나면 업무가 `awaiting_answers`에서 멈추고, `team-answers`로 답변(`job.brief`)을 받으면 나머지 단계가 이어진다. 단계 처리 코드는 배열 인덱스가 아니라 `step.role`로 담당자를 찾는다.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase Postgres(`postgres`), PGlite 회귀 테스트(`node tests/office-regression.mjs`), OpenAI Responses·Anthropic Messages·Gemini generateContent (raw fetch)

**Spec:** `docs/superpowers/specs/2026-10-14-ai-team-intake-design.md`

## Global Constraints

- 질문은 정확히 5개(`q1`~`q5`), 질문마다 선택지 2~4개. 어긋나면 intake 단계 오류 "질문을 만들지 못했습니다. 다시 실행하세요."
- 답변은 5개 모두 필수, 각 1~300자(공백 제거 후).
- 웹 검색: `research`, `reviewer` 단계만. intake·chief·analyst·writer에는 검색 도구를 넣지 않는다.
- Claude 검색 도구: Haiku 계열 `web_search_20250305`, 그 외 `web_search_20260209`.
- 검색 출처가 없으면 단계 오류(추정 결과를 만들지 않음).
- 진행 중 업무 판정은 `running`과 `awaiting_answers` 둘 다.
- 기존 업무(사전 질문 없음)는 기존처럼 동작해야 한다.
- 유료 API 호출 없는 모의 fetch로만 테스트한다.
- 코드 스타일: 주변 코드처럼 압축된 한 줄 스타일, 사용자 문구는 한국어.

## Review Focus

1. 질문에 답하지 않고 창을 닫았다 다시 연 경우 → `awaiting_answers`가 유지되고 질문 폼이 다시 보여야 한다(자동 진행 루프가 이 업무를 advance하지 않아야 함). → Task 4 테스트: `awaiting_answers`에서 `team-advance`를 불러도 모델 호출이 늘지 않음.
2. 답변 제출을 두 화면에서 동시에 누른 경우 → 한 번만 반영. → Task 2 테스트: 같은 버전으로 두 번 제출하면 두 번째는 거부.
3. 투자 아님으로 제출 후 수정 요청 → 분석가가 계속 건너뛰어져야 한다. → Task 2 테스트.
4. 사전 질문 단계가 실패한 업무를 다시 실행 → intake만 재실행. → Task 2 테스트(크레딧 오류 후 retry).
5. 답변 대기 중 새 업무 등록 → 거부, 취소는 허용. → Task 2 테스트.

---

### Task 1: 역할·스키마·요청 생성 (`lib/ai-team.ts`, `lib/sol.ts`)

**Files:**
- Modify: `lib/ai-team.ts` (INTAKE_STEP, SEARCH_ROLES, teamRole, 라벨, 타입)
- Modify: `lib/sol.ts` (intakeSchema, duties, solRequest를 role 기반으로, outputJSON/intakeResult)

**Interfaces (Produces):**
- `INTAKE_STEP: {id:'intake',name:'사전 질문',short:'대표 결정',description:string,color:string}`
- `SEARCH_ROLES: readonly string[]` = `['research','reviewer']`
- `DONE_STEPS: readonly string[]` = `['complete','skipped']`
- `teamRole(id:string)` → INTAKE_STEP 또는 AI_TEAM 항목
- `type IntakeResult={investment:boolean;investment_reason:string;questions:{question:string;why:string;options:string[]}[]}`
- `intakeSchema` (JSON schema), `intakeResult(response):IntakeResult`
- `solRequest(job,index)` — `job.steps[index].role` 기준. intake면 `text.format.schema=intakeSchema`, search 역할이면 `tools:[{type:'web_search',...}]`. 입력 JSON에 `brief` 포함, `previous_results`는 intake·건너뜀 단계 제외.

- [ ] Step 1: `ai-team.ts`에 상수·타입 추가, `JOB_LABELS.awaiting_answers='대표 답변 대기'`, `STEP_LABELS.skipped='건너뜀'`.
- [ ] Step 2: `sol.ts`에 `intakeSchema = object({investment:{type:'boolean'},investment_reason:string,q1..q5:object({question,why,options:strings})})`.
- [ ] Step 3: `duties`에 intake 추가, chief(brief 확정 조건·완료 기준·분석가 미배정), research/reviewer(웹 검색 필수·교차 확인), analyst(투자 수치화) 문구 수정.
- [ ] Step 4: `responseResult`의 JSON 파싱을 `outputJSON(response)`로 추출하고 `intakeResult` 추가.

### Task 2: 업무 상태 흐름 (`lib/team-jobs.ts`, route)

**Files:**
- Modify: `lib/team-jobs.ts`
- Modify: `app/api/[action]/route.ts` (`team-answers`)
- Modify: `lib/usage.ts` (`'team-answers':'team'`)
- Test: `tests/office-regression.mjs`

**Interfaces:**
- Consumes: Task 1 전부
- Produces: `answerTeamJob(owner,{id,version,answers:string[],investment:boolean})` → publicJob. 업무 공개 객체에 `brief` 포함.

- [ ] Step 1 (테스트 먼저): 기존 OpenAI 팀 테스트를 intake 흐름으로 고친다 — 모의 fetch가 요청 본문에 `"q1"`이 있으면 `fakeIntake`를 돌려주고, 첫 advance 후 `awaiting_answers`, `team-answers` 제출 후 5단계 진행. 모델 호출 수 6회(intake 1 + 5). 신규 검증: 답변 4개/301자/버전 불일치 거부, 대기 중 새 업무 거부·취소 허용, 대기 중 advance가 호출을 만들지 않음, `investment:false`면 analyst `skipped`·호출 5회·writer `previous_results` 3개, 수정 요청 후에도 analyst `skipped`, 동일 버전 이중 제출 거부.
- [ ] Step 2: 테스트 실행 → 실패 확인.
- [ ] Step 3: 구현 — `ACTIVE` 상태 SQL(`IN ('running','awaiting_answers')`)을 create/persist/retry/revise에 적용, 새 업무 `steps=[intake,...teamSteps()]`, advance의 다음 단계 탐색·완료 판정에 `DONE_STEPS`, intake 완료 시 `awaiting_answers`, 검색 단계(Claude·Gemini) 리스 200초, `answerTeamJob`, cancel 허용 상태에 `awaiting_answers`, revise 시 intake 유지·brief 기준 analyst 건너뜀.
- [ ] Step 4: 테스트 통과 확인 후 커밋.

### Task 3: 서비스별 웹 검색 (`lib/ai-provider.ts`, `lib/ai-gateway.ts`)

**Files:**
- Modify: `lib/ai-provider.ts` (`submitTeamResponse`, `claudeRequest` 스키마를 base에서)
- Modify: `lib/ai-gateway.ts` (Claude 검색 도구 버전 선택)
- Test: `tests/office-regression.mjs`

- [ ] Step 1 (테스트 먼저): Claude 팀 테스트 — 검색 단계는 `tools` 포함 요청 + 정리 요청(2회), 그 외 단계는 `tools` 없음. Sonnet 5는 `web_search_20260209`, Haiku는 `web_search_20250305`. 검색 결과에 출처가 없으면 research 단계 오류. Gemini 팀 테스트 — steps[0]이 intake, research에서 `google_search` 도구.
- [ ] Step 2: 실패 확인.
- [ ] Step 3: 구현 — `submitTeamResponse`에서 `SEARCH_ROLES`이고 provider가 anthropic/google이면 `groundedResearch(owner,job,solRequest(job,index))`. OpenAI는 solRequest의 tools가 그대로 전달. `claudeRequest`는 `base.text.format.schema` 사용. `claude()` 도구 타입을 모델별로.
- [ ] Step 4: 통과 확인 후 커밋.

### Task 4: 화면 (`app/team-office.tsx`, `app/globals.css`)

**Files:**
- Modify: `app/team-office.tsx`
- Modify: `app/globals.css` (`.team-intake` 스타일)

- [ ] Step 1: 단계 상태를 인덱스 대신 `role`로 찾도록 roster·탭·상태 콜백 수정, intake가 있는 업무에 '대표 결정' 탭 추가.
- [ ] Step 2: `IntakePanel` — 투자 여부 토글(이유 표시, 아니오면 "데이터 분석가 단계를 건너뜁니다"), 질문 5개 라디오 + 직접 입력(300자), 모두 고르기 전 제출 비활성, 제출 후 답변 요약 읽기 전용.
- [ ] Step 3: 진행 표시를 실행 대상 수 기준으로, 자동 진행은 `running`만, 새 업무 버튼은 `running`/`awaiting_answers`면 비활성, 취소 버튼에 `awaiting_answers` 포함, 건너뜀 단계 안내 문구.
- [ ] Step 4: `npx tsc --noEmit`, `npm run lint` 대상 파일, 로컬 dev 서버에서 페이지 로드 확인 후 커밋.

### Task 5: 문서

- [ ] `docs/FLOW.md`에 AI 팀 흐름(사전 질문 → 답변 → 5단계, 검색·건너뜀 규칙) 추가, `docs/FEATURE_MAP.md` AI 팀 행에 `team-answers` 반영. 커밋.
