DROP POLICY IF EXISTS "Authenticated insert" ON public.college_stats;
CREATE POLICY "Users insert stats for own college"
ON public.college_stats
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.college = college_stats.college
  )
);