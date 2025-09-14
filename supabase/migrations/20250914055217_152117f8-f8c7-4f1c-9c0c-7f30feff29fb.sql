-- Fix HR Dashboard issues by adding missing RLS policies

-- Allow HR to update referrals (for status changes)
CREATE POLICY "HR can update referrals" 
ON public.referrals 
FOR UPDATE 
USING (is_current_user_hr());

-- Allow HR to insert new jobs
CREATE POLICY "HR can insert jobs" 
ON public.jobs 
FOR INSERT 
WITH CHECK (is_current_user_hr());

-- Allow HR to update jobs (toggle active status, edit details)
CREATE POLICY "HR can update jobs" 
ON public.jobs 
FOR UPDATE 
USING (is_current_user_hr());

-- Allow HR to insert into referral status history
CREATE POLICY "HR can insert referral status history" 
ON public.referral_status_history 
FOR INSERT 
WITH CHECK (is_current_user_hr());

-- Allow HR to view referral status history
CREATE POLICY "HR can view referral status history" 
ON public.referral_status_history 
FOR SELECT 
USING (is_current_user_hr());

-- Also allow employees to view their own referral status history
CREATE POLICY "Employees can view their referral status history" 
ON public.referral_status_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM public.referrals r
    JOIN public.employees e ON e.id = r.referrer_id
    WHERE r.id = referral_status_history.referral_id 
      AND e.email = (auth.jwt() ->> 'email') 
      AND e.is_active = true
  )
);