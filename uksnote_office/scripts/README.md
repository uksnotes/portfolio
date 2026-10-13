# scripts

| 파일 | 역할 |
| --- | --- |
| `check-secrets.mjs` | 커밋 전 API 키·DB 비밀번호·실제 이메일·.env·회원 데이터 파일 검사 |

- `pnpm check:secrets`: 올라갈 전체 파일 검사
- `pnpm hooks:install`: 새로 clone한 PC에서 pre-commit hook 설치 (hook은 git에 저장되지 않음)

이전 Sites 실행 도우미는 `legacy/cloudflare-sites/scripts/`로 옮겼습니다(git 제외). 지금은 루트의 `pnpm dev`, `pnpm build`, `pnpm test`를 사용합니다.
