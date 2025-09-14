-- Fix final security issue: Secure referral status history table
-- Restrict access to referral status history to prevent unauthorized viewing of HR processes

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Employees can view their referral status history" ON public.referral_status_history;
DROP POLICY IF EXISTS "HR can view referral status history bypass" ON public.referral_status_history;
DROP POLICY IF EXISTS "HR can insert referral status history bypass" ON public.referral_status_history;

-- Create ultra-restrictive policy - force RPC usage only
CREATE POLICY "Force status history RPC access only" ON public.referral_status_history
FOR ALL
USING (false)
WITH CHECK (false);

-- Secure jobs table as well to prevent direct access
DROP POLICY IF EXISTS "All authenticated users can view active jobs" ON public.jobs;
DROP POLICY IF EXISTS "HR can insert jobs bypass" ON public.jobs;
DROP POLICY IF EXISTS "HR can update jobs bypass" ON public.jobs;

-- Create restrictive policy for jobs - force RPC usage only
CREATE POLICY "Force jobs RPC access only" ON public.jobs
FOR ALL
USING (false)
WITH CHECK (false);