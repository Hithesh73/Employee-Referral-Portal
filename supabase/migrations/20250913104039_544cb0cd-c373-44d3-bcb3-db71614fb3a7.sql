-- Drop existing profiles table and related triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Create policies for employees table
CREATE POLICY "Employees can view their own data" 
ON public.employees 
FOR SELECT 
USING (auth.jwt() ->> 'employee_id' = employee_id AND is_active = true);

CREATE POLICY "HR can view all active employees" 
ON public.employees 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.employee_id = auth.jwt() ->> 'employee_id' 
    AND e.role = 'hr' 
    AND e.is_active = true
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update referrals table to reference employees instead of auth users
ALTER TABLE public.referrals 
DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey;

-- Add foreign key to employees table
ALTER TABLE public.referrals 
ADD CONSTRAINT referrals_referrer_id_fkey 
FOREIGN KEY (referrer_id) REFERENCES public.employees(id);

-- Update RLS policies for referrals to work with employees
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;

CREATE POLICY "Employees can create referrals" 
ON public.referrals 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = referrer_id 
    AND e.employee_id = auth.jwt() ->> 'employee_id'
    AND e.is_active = true
  )
);

CREATE POLICY "Employees can view their own referrals" 
ON public.referrals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = referrer_id 
    AND e.employee_id = auth.jwt() ->> 'employee_id'
    AND e.is_active = true
  )
);

-- Update referral_status_history policies
DROP POLICY IF EXISTS "Authenticated users can create status history" ON public.referral_status_history;
DROP POLICY IF EXISTS "Users can view their referral history" ON public.referral_status_history;

CREATE POLICY "Employees can create status history" 
ON public.referral_status_history 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id::text = changed_by::text 
    AND e.employee_id = auth.jwt() ->> 'employee_id'
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
    AND e.employee_id = auth.jwt() ->> 'employee_id'
    AND e.is_active = true
  )
);