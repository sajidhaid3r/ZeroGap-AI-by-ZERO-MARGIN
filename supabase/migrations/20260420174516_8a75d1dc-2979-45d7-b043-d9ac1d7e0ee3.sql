-- Streak tracking
CREATE TABLE public.user_streaks (
  user_id UUID PRIMARY KEY,
  streak_count INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_active_date DATE,
  freezes_remaining INT NOT NULL DEFAULT 2,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own streak" ON public.user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own streak" ON public.user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own streak" ON public.user_streaks FOR UPDATE USING (auth.uid() = user_id);

-- Anonymous leaderboard
CREATE TABLE public.leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  college TEXT NOT NULL,
  city TEXT NOT NULL,
  ats_score INT NOT NULL,
  improvement_delta INT NOT NULL DEFAULT 0,
  anonymous_name TEXT NOT NULL,
  opted_in BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated views leaderboard" ON public.leaderboard_entries FOR SELECT TO authenticated USING (opted_in = true);
CREATE POLICY "Users upsert own entry" ON public.leaderboard_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own entry" ON public.leaderboard_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own entry" ON public.leaderboard_entries FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_leaderboard_college_score ON public.leaderboard_entries(college, ats_score DESC);
CREATE INDEX idx_leaderboard_city_score ON public.leaderboard_entries(city, ats_score DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard_entries;
ALTER TABLE public.leaderboard_entries REPLICA IDENTITY FULL;

-- Anonymous college stats for peer comparison
CREATE TABLE public.college_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college TEXT NOT NULL,
  city TEXT NOT NULL,
  ats_score INT NOT NULL,
  target_role TEXT,
  week_of DATE NOT NULL DEFAULT date_trunc('week', now())::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.college_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated views stats" ON public.college_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert" ON public.college_stats FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_college_stats_college ON public.college_stats(college);
CREATE INDEX idx_college_stats_city ON public.college_stats(city);

-- AI Feedback
CREATE TABLE public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  page TEXT NOT NULL,
  response_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
  reason TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own feedback" ON public.ai_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own feedback" ON public.ai_feedback FOR SELECT USING (auth.uid() = user_id);

-- Referrals
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  uses_count INT NOT NULL DEFAULT 0,
  max_uses INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own code" ON public.referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own code" ON public.referral_codes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone validates code" ON public.referral_codes FOR SELECT TO anon USING (true);

CREATE TABLE public.referral_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own referrals" ON public.referral_uses FOR SELECT USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);
CREATE POLICY "Authenticated insert referrals" ON public.referral_uses FOR INSERT TO authenticated WITH CHECK (auth.uid() = referred_user_id);

-- Add state to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state TEXT;

-- Update handle_new_user to include state
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, college, city, state)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'college',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state'
  );

  -- Auto-create referral code
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.id, upper(substr(md5(NEW.id::text || random()::text), 1, 6)));

  -- Initialize streak
  INSERT INTO public.user_streaks (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();