-- Create RPC to fetch referrals for an employee without relying on auth.jwt()
CREATE OR REPLACE FUNCTION public.get_referrals_by_employee_identifier(
  p_employee_id text,
  p_email text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  candidate_first_name text,
  candidate_middle_name text,
  candidate_last_name text,
  candidate_phone text,
  candidate_email text,
  current_status referral_status,
  created_at timestamptz,
  updated_at timestamptz,
  resume_path text,
  how_know_candidate text,
  job_id uuid,
  job_job_id text,
  job_title text,
  job_department text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee uuid;
BEGIN
  SELECT e.id INTO v_employee
  FROM public.employees e
  WHERE e.is_active = true
    AND (
      (p_employee_id IS NOT NULL AND e.employee_id = p_employee_id)
      OR (p_email IS NOT NULL AND e.email = p_email)
    )
  LIMIT 1;

  IF v_employee IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT r.id,
         r.candidate_first_name,
         r.candidate_middle_name,
         r.candidate_last_name,
         r.candidate_phone,
         r.candidate_email,
         r.current_status,
         r.created_at,
         r.updated_at,
         r.resume_path,
         r.how_know_candidate,
         r.job_id,
         j.job_id,
         j.title,
         j.department
  FROM public.referrals r
  JOIN public.jobs j ON j.id = r.job_id
  WHERE r.referrer_id = v_employee
  ORDER BY r.created_at DESC;
END;
$$;