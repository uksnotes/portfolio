# AI 팀 보고서 표 형식·다운로드·결정 화면 축소 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대표 결정 선택지를 칩으로 줄이고, 최종 보고서를 표 중심·3페이지 이내로 만들며, Word(.docx)·PDF(인쇄)로 내보낸다.

**Architecture:** writer 단계만 `reportSchema`(기존 결과 + `table`)를 쓰고, `responseResult`가 표를 검증·정리한다. 내보내기는 클라이언트 모듈 `app/team-report-export.ts`가 같은 보고서 데이터로 Word 문서(`docx`, 동적 import)와 인쇄용 HTML(iframe `print()`)을 만든다.

**Tech Stack:** Next.js 16, TypeScript, `docx`(새 의존성, pnpm), PGlite 회귀 테스트

**Spec:** `docs/superpowers/specs/2026-10-14-ai-team-report-export-design.md`

## Global Constraints

- 표: 열 2~5개, 행 최대 8개(초과분 자름), 셀 수 = 열 수. 어긋나면 `table`만 제거.
- writer 지시: 요약 2문장, findings 4개 이하, options 3개 이하, A4 3페이지 이내.
- Word: 글꼴 '맑은 고딕', 본문 10.5pt, 표 9.5pt, A4, 여백 18mm, 파일명 `보고서-<제목 30자>-<YYYYMMDD>.docx`.
- PDF: `@page{size:A4;margin:16mm}`, 본문 10.5pt, 표 9.5pt, 모든 텍스트 이스케이프.
- 의존성 추가는 `npx --yes pnpm@11.19.0 add docx`로 lockfile까지 갱신(Vercel이 `--frozen-lockfile` 사용).

## Review Focus

1. 예전 보고서(표 없음)·예전 업무 화면 → 그대로 표시. → Task 1 테스트(표 없는 결과 허용), Task 3 렌더 테스트.
2. 셀/제목에 `<`, `&`, 따옴표가 든 보고서를 PDF로 → 깨지거나 스크립트가 실행되지 않음. → Task 2 이스케이프 테스트.
3. 제목에 `/`, `:` 같은 파일명 금지 문자 → 안전한 파일명. → Task 2 파일명 테스트.
4. 출처 URL이 https가 아니면 → 링크로 넣지 않음. → Task 2 테스트.
5. writer 결과가 없는 업무(진행 중·오류) → 다운로드 버튼 없음. → Task 3.

---

### Task 1: 보고서 스키마 (`lib/sol.ts`, `lib/ai-team.ts`)
- [ ] 테스트: `responseResult`의 표 유지·8행 자르기·열 1/6개 및 셀 수 불일치 시 제거·표 없음 허용, writer 요청만 `"table"` 포함 → 실패 확인
- [ ] 구현: `reportSchema`, writer 지시 문구, `responseResult` 표 정리, `TeamResult.table?` 타입 → 통과, 커밋

### Task 2: 내보내기 모듈 (`app/team-report-export.ts`, `docx` 추가)
- [ ] `docx` 설치(pnpm lockfile 갱신), 테스트 컴파일 목록에 모듈 추가
- [ ] 테스트: `reportFileName`, `reportHTML`(이스케이프·`@page`·https 링크만), `wordDocument` → `Packer.toBuffer` → `word/document.xml`에 제목·셀 → 실패 확인
- [ ] 구현: `reportDocument`, `reportFileName`, `reportHTML`, `wordDocument`, `downloadWord`, `printReport` → 통과, 커밋

### Task 3: 화면 (`app/team-intake.tsx`, `app/team-office.tsx`, `app/globals.css`)
- [ ] 테스트: TeamIntake 칩 버튼 수·`type="radio"` 없음 → 실패 확인
- [ ] 구현: 칩 UI, Report 표 렌더링(비교표·근거 표·선택지 표), 결정 카드 Word/PDF 버튼(writer 결과가 있을 때만), CSS → 통과, `tsc`, 린트 비교, dev 서버 로드, 커밋

### Task 4: 문서
- [ ] `docs/FLOW.md` AI 팀 절에 보고서 형식·다운로드 한 줄, `docs/FEATURE_MAP.md`에 `app/team-report-export.ts`. 커밋
