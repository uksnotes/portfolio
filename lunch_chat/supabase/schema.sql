-- ============================================================
-- LunchChat — Supabase Schema
-- Supabase SQL Editor에 그대로 붙여넣고 실행하세요.
-- ============================================================

-- ── 1. prompts 테이블 ──────────────────────────────────────
-- 유저가 입력한 프롬프트와 AI 텍스트 응답을 저장합니다.
CREATE TABLE IF NOT EXISTS prompts (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt_text    TEXT,                                   -- 유저가 입력한 질문/프롬프트
  response_text  TEXT,                                   -- AI 텍스트 응답
  result_type    TEXT        CHECK (result_type IN ('text', 'image', 'both'))
                             DEFAULT 'both',             -- 결과 유형 분류
  has_input_image BOOLEAN    DEFAULT FALSE,              -- 유저가 사진을 첨부했는지 여부
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. prompt_images 테이블 ────────────────────────────────
-- AI가 생성한 이미지를 prompts와 1:N 관계로 저장합니다.
CREATE TABLE IF NOT EXISTS prompt_images (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id      UUID        REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_path   TEXT        NOT NULL,                   -- Supabase Storage 경로 (thumbnails/{user_id}/{timestamp}.png)
  public_url     TEXT        NOT NULL,                   -- 공개 접근 URL
  mime_type      TEXT        DEFAULT 'image/png',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. 인덱스 ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_prompts_user_id       ON prompts       (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_images_prompt  ON prompt_images (prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompt_images_user    ON prompt_images (user_id, created_at DESC);

-- ── 4. Row Level Security ──────────────────────────────────
ALTER TABLE prompts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_images ENABLE ROW LEVEL SECURITY;

-- prompts: 본인 데이터만 조회/삽입 가능
CREATE POLICY "prompts: select own" ON prompts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "prompts: insert own" ON prompts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- prompt_images: 본인 데이터만 조회/삽입 가능
CREATE POLICY "prompt_images: select own" ON prompt_images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "prompt_images: insert own" ON prompt_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 5. Storage Bucket (이미 있으면 skip) ───────────────────
-- Supabase Dashboard > Storage > New Bucket 에서 수동으로 만들어도 됩니다.
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('thumbnails', 'thumbnails', true)
-- ON CONFLICT (id) DO NOTHING;
