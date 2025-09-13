-- Create a function to get user profile by user_id for status history
CREATE OR REPLACE FUNCTION public.get_user_profile_for_status(user_id UUID)
RETURNS TABLE (
  first_name TEXT,
  last_name TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.first_name, p.last_name
  FROM public.profiles p
  WHERE p.user_id = $1;
$$;