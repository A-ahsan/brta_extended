-- Questions table for BRTA exam preparation
-- NO RLS policies for easy database editing

CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text_en TEXT NOT NULL,
  question_text_bn TEXT NOT NULL,
  question_type VARCHAR(20) DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'road_sign')),
  image_url TEXT,
  option_a_en TEXT NOT NULL,
  option_a_bn TEXT NOT NULL,
  option_b_en TEXT NOT NULL,
  option_b_bn TEXT NOT NULL,
  option_c_en TEXT NOT NULL,
  option_c_bn TEXT NOT NULL,
  option_d_en TEXT NOT NULL,
  option_d_bn TEXT NOT NULL,
  correct_answer CHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_active ON questions(is_active);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- NOTE: NO RLS policies are applied to this table for easy database editing
-- This means anyone can query/modify the questions table
