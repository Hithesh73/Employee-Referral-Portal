-- Fix recursive RLS policy and add secure login RPC

-- 1) Drop problematic policy that self-queries employees
DROP POLICY IF EXISTS "HR can view all active employees" ON public.employees;

-- 2) Create a SECURITY DEFINER helper to check if current JWT belongs to HR
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
    WHERE e.employee_id = (auth.jwt() ->> 'employee_id')
      AND e.role = 'hr'::user_role
      AND e.is_active = true
  );
$$;

-- 3) Recreate the HR policy using the helper (no recursion)
CREATE POLICY "HR can view all active employees"
ON public.employees
FOR SELECT
USING (public.is_current_user_hr() AND is_active = true);

-- 4) Secure login RPC that bypasses RLS and validates credentials
CREATE OR REPLACE FUNCTION public.validate_employee_login(
  p_email text,
  p_employee_id text,
  p_password text
)
RETURNS SETOF public.employees
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT e.*
  FROM public.employees e
  WHERE e.is_active = true
    AND e.password = p_password
    AND (
      (p_email IS NOT NULL AND e.email = p_email)
      OR
      (p_employee_id IS NOT NULL AND e.employee_id = p_employee_id)
    )
  LIMIT 1;
END;
$$;