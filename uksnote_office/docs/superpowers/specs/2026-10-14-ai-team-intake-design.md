# AI 팀 사전 질문·웹 검색·조건부 분석 설계

2026-10-14 · 대상: `app/team-office.tsx`, `lib/team-jobs.ts` 외

## 목적

AI 팀이 대표의 의도를 추측하지 않도록, 업무를 설계하기 전에 대표가 5가지 질문에 답해 업무 범위를 직접 결정한다. 리서치와 검증은 항상 웹 검색으로 최신 근거를 확인한다. 데이터 분석가는 투자 관련 업무에서만 수치화한다.

## 확정 사항 (대표 결정)

| 항목 | 결정 |
| --- | --- |
| 질문 방식 | 업무 지시에 맞춘 AI 생성 질문 5개. 질문마다 선택지 2~4개와 직접 입력 |
| 웹 검색 | 리서치 분석가 + 검증 담당자. ChatGPT·Claude·Gemini 모두 |
| 분석가 실행 | 사전 질문 단계에서 AI가 투자 관련 여부를 판단. 대표가 답변 제출 전에 바꿀 수 있음. 투자 관련이 아니면 '건너뜀' |
| 구현 방식 | 사전 질문을 업무 단계 하나로 추가해 기존 단계 처리(리스·폴링·재시도)를 재사용 |

## 흐름

```
업무 등록 (status: running, steps[0] = intake)
 → intake 단계: 질문 5개 + investment 판단 생성
 → status: awaiting_answers  (화면: 질문 카드, 답변 제출)
 → team-answers 제출: job.brief 저장, investment=false면 analyst 단계 status='skipped'
 → status: running → chief → research(검색) → analyst(또는 건너뜀) → reviewer(검색) → writer
 → status: awaiting_decision → 승인/보류/수정 (기존과 동일)
```

## 데이터

- `AI_TEAM`(5명)은 그대로 둔다. 사전 질문은 별도 상수 `INTAKE_STEP = {id:'intake', name:'사전 질문', short:'대표 결정', ...}`로 정의하고, 새 업무의 `steps` 맨 앞에 `{role:'intake'}`를 넣는다.
- 단계 처리 코드는 `steps[i].role`로 담당자를 찾는다(현재는 인덱스로 `AI_TEAM[i]`를 찾음). 기존 업무(사전 질문 없음)도 그대로 동작한다.
- intake 결과: `{investment:boolean, investment_reason:string, q1..q5:{question, why, options:string[]}}`. 질문 수는 고정 필드 `q1`~`q5`로 강제한다. 선택지가 2~4개가 아니거나 빈 문자열이면 단계 오류로 처리한다.
- `job.brief = {investment:boolean, answers:[{question, answer}] x5, answeredAt}`.
- 단계 상태에 `skipped`를 추가한다. 다음 단계 찾기와 완료 판정은 `complete`와 `skipped`를 모두 끝난 것으로 본다.

## API

- `team-answers` (POST `{id, version, answers:string[5], investment:boolean}`)
  - `awaiting_answers` 상태에서만 받는다. 버전이 다르면 거부한다.
  - 답변 5개가 모두 필요하다. 각 답변은 1~300자로 공백을 제거해 저장한다.
  - 다른 진행 중인 업무가 있으면 거부한다(기존 규칙과 동일).
- `team-decision`의 `cancel`은 `awaiting_answers`에서도 허용한다.
- 진행 중 업무 판정(`status='running'`)에 `awaiting_answers`를 포함해, 질문에 답하지 않은 업무가 있으면 새 업무를 등록할 수 없게 한다.

## 프롬프트

- **intake**: 비서실장이 지시를 읽고, 결과를 크게 바꾸는 결정만 질문한다(목적, 범위·제외, 기준·예산, 기한·시점, 결과물 형태 중 업무에 맞게). 이미 지시에 있는 내용은 다시 묻지 않는다. 투자(주식·자산·포트폴리오·매매 판단) 관련 여부와 이유를 함께 낸다. 웹 검색은 쓰지 않는다.
- **chief 이후 모든 단계**: 입력에 `brief`(대표 답변)를 넣고 "대표 답변은 확정 조건이며 이를 바꾸거나 다시 묻지 않는다"를 지시한다.
- **chief**: `next_tasks`에 담당자별 작업과 완료 기준을 쓴다. 분석가를 건너뛰는 업무면 분석가에게 작업을 배정하지 않는다.
- **analyst**: 투자 업무 전용. 금액·비율·수익률을 계산 근거와 함께 수치화한다.
- **research / reviewer**: 반드시 웹 검색으로 확인하고, 검증 담당자는 앞선 핵심 사실을 다시 검색해 교차 확인한다.

## 웹 검색 구현

- **ChatGPT**: research와 reviewer 요청에 `tools:[{type:'web_search'}]`를 넣는다(현재 research만 있음).
- **Claude·Gemini**: `ai-gateway.ts`의 2단계 방식을 팀 단계에도 쓴다. 1단계에서 검색 도구로 조사 메모와 출처를 만들고, 2단계에서 검색 없이 `resultSchema` JSON으로 정리한다. 출처는 도구 메타데이터에서만 가져오며, 하나도 없으면 단계 오류로 처리한다.
- Claude 검색 도구: Opus 5·Sonnet 5는 `web_search_20260209`, Haiku 4.5는 `web_search_20250305`.
- 검색 단계의 응답 대기 한도는 기존 Claude·Gemini 리서치와 같은 수준으로 유지한다(단계 리스 120초).

## 화면 (`app/team-office.tsx`)

- 단계 탭 맨 앞에 '사전 질문'을 추가한다. 예전 업무에는 표시하지 않는다.
- `awaiting_answers`일 때 질문 카드 5개를 보여준다. 각 카드에는 질문, '왜 묻는지', 선택지 라디오와 '직접 입력'이 있다. 그 위에 "투자 관련 업무로 판단: 예/아니오 (이유)" 토글을 두고, 아니오면 "데이터 분석가 단계를 건너뜁니다"를 표시한다.
- 답변을 모두 고르기 전에는 제출 버튼을 비활성화한다. 제출 후에는 답변 요약을 읽기 전용으로 보여준다.
- 건너뛴 분석가 탭은 '건너뜀'으로 표시한다. 진행 표시는 "N / 실행 대상 수 담당자 완료"로 계산한다.
- 상태 라벨에 `awaiting_answers: '대표 답변 대기'`, 단계 라벨에 `skipped: '건너뜀'`을 추가한다.

## 수정 요청·재시도

- 수정 요청(`revise`)은 `brief`를 유지하고 intake를 제외한 단계부터 다시 실행한다. 분석가 건너뜀 여부도 유지한다.
- intake 단계가 실패하면 기존 '실패 단계 다시 실행'으로 재시도한다(최대 3회).

## 오류 처리

- 질문 형식이 맞지 않음 → intake 단계 오류 "질문을 만들지 못했습니다. 다시 실행하세요."
- 검색 출처 없음 → 해당 단계 오류. 추정 결과를 만들지 않는다.
- Claude 크레딧 부족 등 → 기존 오류 문구(`claudeFailure`)를 그대로 쓴다.

## 테스트 (`tests/office-regression.mjs`, 유료 호출 없이 모의 fetch)

1. 업무 등록 → intake 실행 → `awaiting_answers`, 질문 5개와 선택지가 공개 응답에 포함된다.
2. 답변이 4개이거나 300자를 넘으면 거부된다. 버전이 다르면 거부된다.
3. `investment:false`로 제출 → analyst `skipped`, 분석가 호출이 0회이고 writer 완료 후 `awaiting_decision`이 된다.
4. `investment:true` → analyst 실행.
5. 서비스별로 research·reviewer 요청에 검색 도구가 포함되고, chief·analyst·writer·intake에는 포함되지 않는다. Claude Haiku는 `web_search_20250305`를 쓴다.
6. Claude 검색 결과에 출처가 없으면 단계 오류가 된다.
7. 사전 질문이 없는 예전 업무 기록도 목록·진행·결정이 기존처럼 동작한다.
8. `awaiting_answers` 업무가 있으면 새 업무 등록이 거부되고, 취소는 허용된다.

## 범위 밖

- 질문 수나 담당자 구성을 사용자가 바꾸는 기능
- intake 단계의 웹 검색
- 서버 환경변수 키 사용 규칙 변경
