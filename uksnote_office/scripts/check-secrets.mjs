#!/usr/bin/env node
// 커밋 전 개인정보·비밀값 검사 (공개 저장소용)
//   node scripts/check-secrets.mjs            커밋 대상(staged) 파일 검사 — pre-commit hook이 실행
//   node scripts/check-secrets.mjs --all      저장소에 올라가 있거나 올라갈 전체 파일 검사
//   node scripts/check-secrets.mjs --install  .git/hooks/pre-commit 설치
// 정말 필요한 경우에만 `git commit --no-verify`로 건너뛸 수 있습니다.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const root = git('rev-parse', '--show-toplevel').trim();
const PROJECT = 'uksnote_office/';

if (process.argv.includes('--install')) {
  const hook = path.join(git('rev-parse', '--git-path', 'hooks').trim(), 'pre-commit');
  const target = path.resolve(hook); // --git-path는 현재 폴더 기준 경로를 돌려준다
  if (fs.existsSync(target) && !fs.readFileSync(target, 'utf8').includes('check-secrets.mjs')) {
    console.error(`이미 다른 pre-commit hook이 있습니다: ${target}\n직접 합치거나 지운 뒤 다시 실행하세요.`);
    process.exit(1);
  }
  fs.writeFileSync(target, '#!/bin/sh\n# uksnote_office/scripts/check-secrets.mjs --install 로 설치됨\nexec node "$(git rev-parse --show-toplevel)/uksnote_office/scripts/check-secrets.mjs"\n', { mode: 0o755 });
  console.log('pre-commit hook 설치 완료: ' + target);
  process.exit(0);
}

const all = process.argv.includes('--all');
const files = (all
  ? git('ls-files', '-z', '--cached', '--others', '--exclude-standard')
  : git('diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR')
).split('\0').filter(Boolean);

// 1) 올리면 안 되는 파일 (저장소 전체)
const BLOCKED_FILES = [
  [/(^|\/)\.env(\.(?!example$)[^/]+)?$/, '환경 변수 파일(.env*)'],
  [/\.(pem|key|p12|pfx)$/i, '인증서·개인 키'],
  [/\.(dump|sqlite3?|db)$/i, 'DB 덤프'],
];
// uksnote_office 안에서만 막는 경로 (회원 데이터 내보내기, 이전 배포 원본)
const BLOCKED_PROJECT = [
  [/^legacy\//, '이전 Sites 배포 원본(legacy/)'],
  [/^supabase\/(seed[^/]*\.sql|\.temp\/|\.branches\/)/, 'Supabase 시드·로컬 상태'],
  [/^(backups|exports)\//, '데이터 백업·내보내기'],
  [/\.csv$/i, 'CSV 데이터'],
];

// 2) 비밀값 패턴 (저장소 전체). 테스트용 가짜 값은 허용
const SECRETS = [
  [/sk-ant-[A-Za-z0-9_-]{20,}/g, 'Anthropic API 키'],
  [/sk-(proj-)?[A-Za-z0-9_-]{32,}/g, 'OpenAI API 키'],
  [/AIza[0-9A-Za-z_-]{35}/g, 'Google API 키'],
  [/sb_secret_[A-Za-z0-9_-]{20,}/g, 'Supabase secret 키'],
  [/eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/g, 'JWT(Supabase service_role 등)'],
  [/postgres(?:ql)?:\/\/[^\s:/@'"`]+:[^\s@'"`]+@[^\s'"`]+/g, '비밀번호가 포함된 DB 접속 주소'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/g, '개인 키'],
  [/\bgh[pousr]_[A-Za-z0-9]{36}\b/g, 'GitHub 토큰'],
];
const FAKE = /never-real|not-a-real|test-key|unit-test|\[YOUR-PASSWORD\]|<password>|:password@|:PASSWORD@/i;

// 3) 실제 이메일 (uksnote_office 안). 예시·테스트·GitHub 비공개 주소만 허용
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const ALLOWED_EMAIL = /@(example\.(com|org|net)|test\.example|[a-z0-9-]+\.test|users\.noreply\.github\.com)$/i;
const SKIP_EMAIL_FILES = /(^|\/)(pnpm-lock\.yaml|package-lock\.json|LICENSE[^/]*|NOTICE[^/]*)$|^vendor\//;

const problems = [];
for (const file of files) {
  const inProject = file.startsWith(PROJECT), rel = inProject ? file.slice(PROJECT.length) : null;
  for (const [re, why] of BLOCKED_FILES) if (re.test(file)) problems.push(`${file}: ${why}`);
  if (rel !== null) for (const [re, why] of BLOCKED_PROJECT) if (re.test(rel)) problems.push(`${file}: ${why}`);

  let buf;
  try { buf = all ? fs.readFileSync(path.join(root, file)) : execFileSync('git', ['show', ':' + file], { cwd: root, maxBuffer: 64 * 1024 * 1024 }); }
  catch { continue; }
  if (buf.length > 5 * 1024 * 1024 || buf.subarray(0, 8000).includes(0)) continue; // 대용량·바이너리 제외
  const lines = buf.toString('utf8').split('\n');
  lines.forEach((line, i) => {
    for (const [re, why] of SECRETS) for (const m of line.matchAll(re)) if (!FAKE.test(m[0]) && !FAKE.test(line)) problems.push(`${file}:${i + 1}: ${why} (${m[0].slice(0, 12)}…)`);
    if (rel !== null && !SKIP_EMAIL_FILES.test(rel)) for (const m of line.matchAll(EMAIL)) if (!ALLOWED_EMAIL.test(m[0])) problems.push(`${file}:${i + 1}: 실제 이메일 주소 (${m[0]})`);
  });
}

if (problems.length) {
  console.error('\n[check-secrets] 공개 저장소에 올리면 안 되는 내용이 있어 중단했습니다.\n');
  for (const p of [...new Set(problems)]) console.error('  - ' + p);
  console.error('\n개인정보·키는 Supabase나 Vercel 환경변수, .env.local에만 두세요. (docs/SETUP.md 참고)\n');
  process.exit(1);
}
console.log(`[check-secrets] ${files.length}개 파일 검사 통과`);
