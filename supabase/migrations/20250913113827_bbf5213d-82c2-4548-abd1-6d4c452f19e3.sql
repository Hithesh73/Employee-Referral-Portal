-- Create storage policies for resumes bucket

-- Allow employees to upload resumes to their own folder
CREATE POLICY "Employees can upload their resumes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'resumes' 
  AND (storage.foldername(name))[1] IN (
    SELECT e.id::text 
    FROM public.employees e 
    WHERE e.employee_id = (auth.jwt() ->> 'employee_id') 
    AND e.is_active = true
  )
);

-- Allow employees to view their own uploaded resumes
CREATE POLICY "Employees can view their resumes" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'resumes' 
  AND (storage.foldername(name))[1] IN (
    SELECT e.id::text 
    FROM public.employees e 
    WHERE e.employee_id = (auth.jwt() ->> 'employee_id') 
    AND e.is_active = true
  )
);

-- Allow HR to view all resumes
CREATE POLICY "HR can view all resumes" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'resumes' 
  AND EXISTS (
    SELECT 1 
    FROM public.employees e 
    WHERE e.employee_id = (auth.jwt() ->> 'employee_id') 
    AND e.role = 'hr'::user_role 
    AND e.is_active = true
  )
);