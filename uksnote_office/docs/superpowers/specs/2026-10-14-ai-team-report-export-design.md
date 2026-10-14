# AI 팀 보고서 표 형식·다운로드·대표 결정 화면 축소 설계

2026-10-14 · 대상: `app/team-intake.tsx`, `app/team-office.tsx`, `lib/sol.ts`

## 목적

대표 결정 화면을 촘촘하게 만들고, 최종 보고서를 핵심 위주의 표 중심 보고서(A4 3페이지 이내)로 바꾸며, 보고서를 Word 또는 PDF로 받을 수 있게 한다.

## 확정 사항

| 항목 | 결정 |
| --- | --- |
| 선택지 UI | 라디오 대신 작은 칩 버튼(높이 약 32px, 14px). 한 줄에 여러 개 |
| 보고서 구조 | 보고서 담당자 전용 스키마에 `table`(제목, 열 2~5개, 행 최대 8개) 추가 |
| 분량 | 요약 2문장, 핵심 근거 4개 이하, 선택지 3개 이하, 셀은 짧게. 내용을 자르지는 않음 |
| Word | `docx` 라이브러리로 `.docx` 생성. 버튼을 누를 때 동적 import |
| PDF | 보고서 전용 A4 인쇄 레이아웃 + 브라우저 인쇄 창(`PDF로 저장`) |

## 보고서 스키마 (`lib/sol.ts`)

- `reportSchema = resultSchema` 항목 + `table:{title:string,columns:string[],rows:string[][]}`.
- writer 단계만 `reportSchema`를 쓴다. 나머지 단계는 `resultSchema` 그대로.
- `responseResult`는 `table`이 있으면 검증한다: 열 2~5개, 각 행의 셀 수 = 열 수, 행 최대 8개(초과분은 잘라냄), 모든 셀은 문자열. 열 수가 범위를 벗어나거나 행 셀 수가 맞지 않으면 `table`을 버리고 나머지 보고서는 유지한다(보고서 전체를 실패시키지 않음).
- writer 지시: "A4 3페이지 이내 보고용. 요약 2문장, findings 4개 이하, options 3개 이하. 업무에 맞는 비교표를 table에 작성하고 셀은 짧게(20자 안팎) 쓴다."

## 화면

- **대표 결정**: `fieldset` 안의 선택지를 `button[aria-pressed]` 칩으로 바꾼다. '직접 입력'도 칩이며, 선택하면 아래에 한 줄 입력칸이 나온다. 투자 여부 버튼도 같은 칩 스타일.
- **보고서(`Report`)**: 순서 = 결론 요약 → 비교표(`table`) → 핵심 근거 표(항목 | 근거 | 출처) → 선택지 표(선택지 | 장점 | 고려할 점) → 추천안 → 확인할 점 → 참고 자료. 표가 없는 예전 보고서도 그대로 표시한다.
- **다운로드**: 결정 카드에 `Word 다운로드`, `PDF 다운로드` 버튼. writer 결과가 있을 때만 보인다.

## 내보내기 (`app/team-report-export.ts`)

- `reportDocument(job)` → 내보낼 데이터 `{title, instruction, model, date, result, sources}` (writer 결과 + 업무 정보 + 출처 목록).
- `downloadWord(job)` → `docx`로 문서 생성: 제목, 업무·기준일, 요약, 비교표, 핵심 근거 표, 선택지 표, 추천안, 확인할 점, 참고 자료(하이퍼링크). 글꼴 '맑은 고딕', 본문 10.5pt, 표 9.5pt, A4·여백 18mm. 파일명 `보고서-<제목 앞 30자>-<YYYYMMDD>.docx`(파일명에 쓸 수 없는 문자는 `-`).
- `printReport(job)` → 숨은 iframe에 보고서 전용 HTML(인쇄 CSS: `@page{size:A4;margin:16mm}`, 본문 10.5pt, 표 9.5pt, 표 행이 페이지 사이에서 잘리지 않게)을 그리고 `print()`를 호출한다. HTML의 모든 텍스트는 이스케이프한다.
- `reportHTML(doc)`과 `wordDocument(doc)`는 테스트를 위해 export한다.

## 테스트 (모의, 유료 호출 없음)

1. `responseResult`: 올바른 `table` 유지, 행 9개 → 8개로 자름, 열 1개·6개 또는 셀 수 불일치 → `table` 제거, `table` 없는 결과 허용.
2. writer 요청만 `reportSchema`(본문에 `"table"` 포함), chief 요청은 아님.
3. `reportHTML`: 제목·표 셀·출처 포함, `<script>` 같은 문자열이 이스케이프됨, `@page` 포함.
4. `wordDocument` → `Packer.toBuffer` → zip의 `word/document.xml`에 제목·표 셀 텍스트 포함.
5. `TeamIntake` 렌더링: 칩 `button`이 선택지 수만큼, `type="radio"` 없음.

## 범위 밖

- PDF 파일 직접 생성(글꼴 내장)
- 담당자별(최종 보고 외) 결과 다운로드
- 3페이지 초과 시 내용 자동 축약
