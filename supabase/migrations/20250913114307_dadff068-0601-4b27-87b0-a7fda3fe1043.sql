-- Align RLS with Supabase Auth email claim for all access checks

-- Employees table policies
DROP POLICY IF EXISTS "Employees can view their own data" ON public.employees;
DROP POLICY IF EXISTS "HR can view all active employees" ON public.employees;

-- Helper function updated to check by email instead of employee_id
CREATE OR REPLACE FUNCTION public.is_current_user_hr()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.email = (auth.jwt() ->> 'email')
      AND e.role = 'hr'::user_role
      AND e.is_active = true
  );
$$;

CREATE POLICY "Employees can view their own data"
ON public.employees
FOR SELECT
USING (email = (auth.jwt() ->> 'email') AND is_active = true);

CREATE POLICY "HR can view all active employees"
ON public.employees
FOR SELECT
USING (public.is_current_user_hr() AND is_active = true);

-- Referrals policies (email-based)
DROP POLICY IF EXISTS "Employees can create referrals" ON public.referrals;
DROP POLICY IF EXISTS "Employees can view their own referrals" ON public.referrals;

CREATE POLICY "Employees can create referrals"
ON public.referrals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = referrals.referrer_id
      AND e.email = (auth.jwt() ->> 'email')
      AND e.is_active = true
  )
);

CREATE POLICY "Employees can view their own referrals"
ON public.referrals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = referrals.referrer_id
      AND e.email = (auth.jwt() ->> 'email')
      AND e.is_active = true
  )
);

-- Referral status history policies (email-based)
DROP POLICY IF EXISTS "Employees can create status history" ON public.referral_status_history;
DROP POLICY IF EXISTS "Employees can view their referral history" ON public.referral_status_history;

CREATE POLICY "Employees can create status history"
ON public.referral_status_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id::text = referral_status_history.changed_by::text
      AND e.email = (auth.jwt() ->> 'email')
      AND e.is_active = true
  )
);

CREATE POLICY "Employees can view their referral history"
ON public.referral_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.referrals r
    JOIN public.employees e ON r.referrer_id = e.id
    WHERE r.id = referral_status_history.referral_id
      AND e.email = (auth.jwt() ->> 'email')
      AND e.is_active = true
  )
);

-- Storage policies for resumes bucket (email-based)
DROP POLICY IF EXISTS "Employees can upload their resumes" ON storage.objects;
DROP POLICY IF EXISTS "Employees can view their resumes" ON storage.objects;
DROP POLICY IF EXISTS "HR can view all resumes" ON storage.objects;

CREATE POLICY "Employees can upload their resumes"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] IN (
    SELECT e.id::text FROM public.employees e
    WHERE e.email = (auth.jwt() ->> 'email')
      AND e.is_active = true
  )
);

CREATE POLICY "Employees can view their resumes"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] IN (
    SELECT e.id::text FROM public.employees e
    WHERE e.email = (auth.jwt() ->> 'email')
      AND e.is_active = true
  )
);

CREATE POLICY "HR can view all resumes"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'resumes'
  AND public.is_current_user_hr()
);