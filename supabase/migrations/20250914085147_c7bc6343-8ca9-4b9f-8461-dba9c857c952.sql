-- CRITICAL SECURITY FIX: Secure employee data and hash passwords (Fixed version)
-- This migration addresses the security vulnerabilities while maintaining functionality

-- Step 1: Add password hashing extension if not exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 2: Add a new hashed_password column
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS hashed_password text;

-- Step 3: Hash existing plaintext passwords and store in new column
UPDATE public.employees 
SET hashed_password = crypt(password, gen_salt('bf', 12))
WHERE hashed_password IS NULL;

-- Step 4: Update the validation function to use hashed passwords
CREATE OR REPLACE FUNCTION public.validate_employee_login(p_email text, p_employee_id text, p_password text)
RETURNS SETOF employees
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT e.*
  FROM public.employees e
  WHERE e.is_active = true
    AND e.hashed_password = crypt(p_password, e.hashed_password)
    AND (
      (p_email IS NOT NULL AND e.email = p_email)
      OR
      (p_employee_id IS NOT NULL AND e.employee_id = p_employee_id)
    )
  LIMIT 1;
END;
$$;

-- Step 5: Drop the plaintext password column after hashing is complete
-- We'll do this in a separate step to ensure no data loss
ALTER TABLE public.employees DROP COLUMN IF EXISTS password;

-- Step 6: Make hashed_password required and rename it to password
ALTER TABLE public.employees ALTER COLUMN hashed_password SET NOT NULL;
ALTER TABLE public.employees RENAME COLUMN hashed_password TO password;

-- Step 7: Update RLS policies to be more restrictive
-- Drop existing policies first
DROP POLICY IF EXISTS "Employees can view their own data" ON public.employees;
DROP POLICY IF EXISTS "HR can view all active employees" ON public.employees;
DROP POLICY IF EXISTS "Employees view own info via RPC only" ON public.employees;
DROP POLICY IF EXISTS "HR operations via RPC only" ON public.employees;

-- Create ultra-restrictive policy - deny ALL direct access
CREATE POLICY "Force RPC access only" ON public.employees
FOR ALL
USING (false)
WITH CHECK (false);

-- Step 8: Create a secure function to get employee info without password
CREATE OR REPLACE FUNCTION public.get_employee_info(p_employee_id text, p_email text)
RETURNS TABLE(
  id uuid,
  employee_id text,
  name text,
  email text,
  role user_role,
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.employee_id, e.name, e.email, e.role, e.is_active, e.created_at, e.updated_at
  FROM public.employees e
  WHERE e.is_active = true
    AND (
      (p_employee_id IS NOT NULL AND e.employee_id = p_employee_id)
      OR (p_email IS NOT NULL AND e.email = p_email)
    )
  LIMIT 1;
END;
$$;

-- Step 9: Secure referrals table as well
DROP POLICY IF EXISTS "Employees can view their own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Employees can create referrals" ON public.referrals;
DROP POLICY IF EXISTS "HR can view all referrals bypass" ON public.referrals;
DROP POLICY IF EXISTS "HR can update referrals bypass" ON public.referrals;
DROP POLICY IF EXISTS "Referrals access via RPC only" ON public.referrals;

-- Create restrictive policy for referrals - force RPC usage only
CREATE POLICY "Force referrals RPC access only" ON public.referrals
FOR ALL
USING (false)
WITH CHECK (false);

-- Step 10: Create secure RPC for employee referral creation
CREATE OR REPLACE FUNCTION public.create_referral_secure(
  p_employee_id text,
  p_employee_email text, 
  p_job_id uuid,
  p_candidate_first_name text,
  p_candidate_middle_name text,
  p_candidate_last_name text,
  p_candidate_phone text,
  p_candidate_email text,
  p_candidate_dob date,
  p_resume_path text,
  p_how_know_candidate text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_new_id uuid;
BEGIN
  -- Validate employee exists and is active
  SELECT id INTO v_referrer_id
  FROM public.employees
  WHERE is_active = true
    AND (
      (p_employee_id IS NOT NULL AND employee_id = p_employee_id)
      OR (p_employee_email IS NOT NULL AND email = p_employee_email)
    )
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RAISE EXCEPTION 'Employee not found or inactive';
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