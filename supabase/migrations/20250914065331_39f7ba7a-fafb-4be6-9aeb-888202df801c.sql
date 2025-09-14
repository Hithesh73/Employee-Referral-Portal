-- Fix HR status update failing due to trigger inserting history with NULL changed_by when auth.uid() is NULL
-- Update the trigger function to no-op when auth.uid() is NULL. Our RPC handles history inserts for HR.

CREATE OR REPLACE FUNCTION public.update_status_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.current_status != NEW.current_status THEN
    -- Only insert via trigger when a real authenticated user exists
    IF auth.uid() IS NOT NULL THEN
      INSERT INTO public.referral_status_history (referral_id, status, changed_by)
      VALUES (NEW.id, NEW.current_status, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;