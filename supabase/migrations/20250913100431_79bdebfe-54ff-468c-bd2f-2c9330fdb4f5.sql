-- Create enum types
CREATE TYPE public.user_role AS ENUM ('employee', 'hr');
CREATE TYPE public.referral_status AS ENUM ('submitted', 'screening', 'interview', 'offer', 'hired', 'rejected');

-- Create profiles table for additional user info
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  candidate_first_name TEXT NOT NULL,
  candidate_middle_name TEXT,
  candidate_last_name TEXT NOT NULL,
  candidate_phone TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  candidate_dob DATE NOT NULL,
  resume_path TEXT,
  how_know_candidate TEXT NOT NULL CHECK (length(how_know_candidate) <= 500),
  current_status referral_status NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create status history table for timeline
CREATE TABLE public.referral_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  status referral_status NOT NULL,
  note TEXT,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_status_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "HR can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'hr'
    )
  );

-- Jobs policies  
CREATE POLICY "All authenticated users can view active jobs" ON public.jobs
  FOR SELECT USING (is_active = true);

CREATE POLICY "HR can manage jobs" ON public.jobs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'hr'
    )
  );

-- Referrals policies
CREATE POLICY "Users can view their own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Users can create referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "HR can view all referrals" ON public.referrals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'hr'
    )
  );

CREATE POLICY "HR can update referrals" ON public.referrals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'hr'
    )
  );

-- Status history policies
CREATE POLICY "Users can view their referral history" ON public.referral_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.referrals r 
      WHERE r.id = referral_id AND r.referrer_id = auth.uid()
    )
  );

CREATE POLICY "HR can view all status history" ON public.referral_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'hr'
    )
  );

CREATE POLICY "Authenticated users can create status history" ON public.referral_status_history
  FOR INSERT WITH CHECK (auth.uid() = changed_by);

-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Storage policies
CREATE POLICY "Users can upload resumes" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resumes' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own resumes" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resumes' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "HR can view all resumes" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resumes' AND
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'hr'
    )
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, employee_id, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'employee_id',
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'employee')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to automatically create initial status history entry
CREATE OR REPLACE FUNCTION public.create_initial_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.referral_status_history (referral_id, status, changed_by, note)
  VALUES (NEW.id, NEW.current_status, NEW.referrer_id, 'Referral submitted');
  RETURN NEW;
END;
$$;

-- Trigger to create initial status history
CREATE TRIGGER create_initial_referral_status
  AFTER INSERT ON public.referrals
  FOR EACH ROW EXECUTE PROCEDURE public.create_initial_status_history();

-- Function to update status history on referral status change
CREATE OR REPLACE FUNCTION public.update_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.current_status != NEW.current_status THEN
    INSERT INTO public.referral_status_history (referral_id, status, changed_by)
    VALUES (NEW.id, NEW.current_status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to update status history on status change
CREATE TRIGGER update_referral_status_history
  AFTER UPDATE ON public.referrals
  FOR EACH ROW EXECUTE PROCEDURE public.update_status_history();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.referral_status_history;

-- Set replica identity for realtime
ALTER TABLE public.referrals REPLICA IDENTITY FULL;
ALTER TABLE public.referral_status_history REPLICA IDENTITY FULL;

-- Insert some sample jobs
INSERT INTO public.jobs (job_id, title, department) VALUES
  ('ENG-001', 'Senior Software Engineer', 'Engineering'),
  ('ENG-002', 'Frontend Developer', 'Engineering'),
  ('ENG-003', 'DevOps Engineer', 'Engineering'),
  ('MKT-001', 'Marketing Manager', 'Marketing'),
  ('HR-001', 'HR Business Partner', 'Human Resources'),
  ('SAL-001', 'Sales Representative', 'Sales');