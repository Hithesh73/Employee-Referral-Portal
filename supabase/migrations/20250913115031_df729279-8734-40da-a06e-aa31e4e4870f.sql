-- Secure RPC to create referrals without hitting table RLS directly
CREATE OR REPLACE FUNCTION public.create_referral(
  p_job_id uuid,
  p_candidate_first_name text,
  p_candidate_middle_name text,
  p_candidate_last_name text,
  p_candidate_phone text,
  p_candidate_email text,
  p_candidate_dob date,
  p_resume_path text,
  p_how_know_candidate text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_new_id uuid;
BEGIN
  SELECT id INTO v_referrer_id
  FROM public.employees
  WHERE email = (auth.jwt() ->> 'email') AND is_active = true
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.referrals (
    referrer_id, job_id, candidate_first_name, candidate_middle_name,
    candidate_last_name, candidate_phone, candidate_email, candidate_dob,
    resume_path, how_know_candidate
  ) VALUES (
    v_referrer_id, p_job_id, p_candidate_first_name, NULLIF(p_candidate_middle_name, ''),
    p_candidate_last_name, p_candidate_phone, p_candidate_email, p_candidate_dob,
    NULLIF(p_resume_path, ''), p_how_know_candidate
  ) RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;