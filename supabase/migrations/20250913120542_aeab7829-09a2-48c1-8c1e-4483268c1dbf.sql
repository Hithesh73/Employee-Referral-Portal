-- Allow HR to view all referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'referrals'
      AND policyname = 'HR can view all referrals'
  ) THEN
    CREATE POLICY "HR can view all referrals"
    ON public.referrals
    FOR SELECT
    USING (is_current_user_hr());
  END IF;
END$$;