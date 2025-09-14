-- Fix login error: function crypt(text, text) does not exist
-- Use fully-qualified function from Supabase extensions schema and include it in search_path

CREATE OR REPLACE FUNCTION public.validate_employee_login(p_email text, p_employee_id text, p_password text)
RETURNS SETOF employees
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT e.*
  FROM public.employees e
  WHERE e.is_active = true
    AND extensions.crypt(p_password, e.password) = e.password
    AND (
      (p_email IS NOT NULL AND e.email = p_email)
      OR
      (p_employee_id IS NOT NULL AND e.employee_id = p_employee_id)
    )
  LIMIT 1;
END;
$$;