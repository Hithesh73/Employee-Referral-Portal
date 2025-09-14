-- Create secure RPC to list active jobs for any active employee
CREATE OR REPLACE FUNCTION public.get_active_jobs_for_employee(p_employee_id text, p_email text)
RETURNS SETOF jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp uuid;
BEGIN
  -- Verify the caller is an active employee (employee or HR)
  SELECT id INTO v_emp
  FROM public.employees
  WHERE is_active = true
    AND (
      (p_employee_id IS NOT NULL AND employee_id = p_employee_id)
      OR (p_email IS NOT NULL AND email = p_email)
    )
  LIMIT 1;

  IF v_emp IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Return active jobs
  RETURN QUERY
  SELECT * FROM public.jobs
  WHERE is_active = true
  ORDER BY job_id;
END;
$$;