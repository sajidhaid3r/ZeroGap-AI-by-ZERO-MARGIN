-- mock_tests table
CREATE TABLE public.mock_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  test_id TEXT UNIQUE NOT NULL,
  domain TEXT NOT NULL,
  city TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_marks INTEGER NOT NULL DEFAULT 100,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  time_taken_secs INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  violations_count INTEGER NOT NULL DEFAULT 0,
  violation_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  emoji_reaction TEXT,
  feedback_rating INTEGER,
  feedback_text TEXT,
  questions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own mock tests" ON public.mock_tests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own mock tests" ON public.mock_tests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own mock tests" ON public.mock_tests
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own mock tests" ON public.mock_tests
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_mock_tests_user_completed ON public.mock_tests (user_id, completed_at DESC);

-- user_progress table
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_test_date DATE,
  tests_completed INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own progress" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own progress" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own progress" ON public.user_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();