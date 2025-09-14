-- Create helper function to get HR employee UUID by employee_id or email
CREATE OR REPLACE FUNCTION public.get_hr_employee_uuid(p_employee_id text, p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_emp uuid;
BEGIN
  SELECT e.id INTO v_emp
  FROM public.employees e
  WHERE e.is_active = true
    AND e.role = 'hr'::user_role
    AND (
      (p_employee_id IS NOT NULL AND e.employee_id = p_employee_id)
      OR (p_email IS NOT NULL AND e.email = p_email)
    )
  LIMIT 1;

  IF v_emp IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN v_emp;
END;
$$;

-- Return all referrals for HR with join info
CREATE OR REPLACE FUNCTION public.get_referrals_for_hr_by_identifier(p_employee_id text, p_email text)
RETURNS TABLE(
  id uuid,
  candidate_first_name text,
  candidate_middle_name text,
  candidate_last_name text,
  candidate_phone text,
  candidate_email text,
  candidate_dob date,
  current_status referral_status,
  created_at timestamptz,
  updated_at timestamptz,
  resume_path text,
  how_know_candidate text,
  job_uuid uuid,
  job_job_id text,
  job_title text,
  job_department text,
  referrer_name text,
  referrer_employee_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_hr uuid;
BEGIN
  v_hr := public.get_hr_employee_uuid(p_employee_id, p_email);

  RETURN QUERY
  SELECT r.id,
         r.candidate_first_name,
         r.candidate_middle_name,
         r.candidate_last_name,
         r.candidate_phone,
         r.candidate_email,
         r.candidate_dob,
         r.current_status,
         r.created_at,
         r.updated_at,
         r.resume_path,
         r.how_know_candidate,
         r.job_id as job_uuid,
         j.job_id,
         j.title,
         j.department,
         e.name as referrer_name,
         e.employee_id as referrer_employee_id
  FROM public.referrals r
  JOIN public.jobs j ON j.id = r.job_id
  JOIN public.employees e ON e.id = r.referrer_id
  ORDER BY r.created_at DESC;
END;
$$;

-- Return all jobs (active and inactive) for HR
CREATE OR REPLACE FUNCTION public.get_all_jobs_for_hr(p_employee_id text, p_email text)
RETURNS SETOF public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_hr uuid;
BEGIN
  v_hr := public.get_hr_employee_uuid(p_employee_id, p_email);
  RETURN QUERY SELECT * FROM public.jobs ORDER BY created_at DESC;
END;
$$;

-- Toggle job active flag by HR
CREATE OR REPLACE FUNCTION public.toggle_job_active_by_hr(p_employee_id text, p_email text, p_job_id uuid, p_is_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_hr uuid;
BEGIN
  v_hr := public.get_hr_employee_uuid(p_employee_id, p_email);
  UPDATE public.jobs SET is_active = p_is_active, updated_at = now() WHERE id = p_job_id;
END;
$$;

-- Create new job by HR
CREATE OR REPLACE FUNCTION public.create_job_by_hr(p_employee_id text, p_email text, p_job_id text, p_title text, p_department text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_hr uuid;
  v_new uuid;
BEGIN
  v_hr := public.get_hr_employee_uuid(p_employee_id, p_email);
  INSERT INTO public.jobs(job_id, title, department)
  VALUES (p_job_id, p_title, p_department)
  RETURNING id INTO v_new;
  RETURN v_new;
END;
$$;

-- Update job by HR
CREATE OR REPLACE FUNCTION public.update_job_by_hr(p_employee_id text, p_email text, p_id uuid, p_job_id text, p_title text, p_department text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_hr uuid;
BEGIN
  v_hr := public.get_hr_employee_uuid(p_employee_id, p_email);
  UPDATE public.jobs
  SET job_id = p_job_id,
      title = p_title,
      department = p_department,
      updated_at = now()
  WHERE id = p_id;
END;
$$;

-- Update referral status by HR and insert history
CREATE OR REPLACE FUNCTION public.update_referral_status_by_hr(p_employee_id text, p_email text, p_referral_id uuid, p_status referral_status, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_hr uuid;
BEGIN
  v_hr := public.get_hr_employee_uuid(p_employee_id, p_email);

  UPDATE public.referrals
  SET current_status = p_status,
      updated_at = now()
  WHERE id = p_referral_id;

  INSERT INTO public.referral_status_history(referral_id, status, changed_by, note)
  VALUES (p_referral_id, p_status, v_hr, NULLIF(p_note, ''));
END;
$$;

-- Get referral status history for HR with user names
CREATE OR REPLACE FUNCTION public.get_referral_status_history_for_hr(p_employee_id text, p_email text, p_referral_id uuid)
RETURNS TABLE(id uuid, status referral_status, note text, created_at timestamptz, changed_by uuid, user_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_hr uuid;
BEGIN
  v_hr := public.get_hr_employee_uuid(p_employee_id, p_email);
  RETURN QUERY
  SELECT h.id, h.status, h.note, h.created_at, h.changed_by, e.name as user_name
  FROM public.referral_status_history h
  LEFT JOIN public.employees e ON e.id = h.changed_by
  WHERE h.referral_id = p_referral_id
  ORDER BY h.created_at DESC;
END;
$$;