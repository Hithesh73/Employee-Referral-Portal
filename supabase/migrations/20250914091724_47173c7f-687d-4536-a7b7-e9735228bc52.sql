-- Create function for employees to get referral status history
CREATE OR REPLACE FUNCTION public.get_referral_status_history_for_employee(p_employee_id text, p_email text, p_referral_id uuid)
 RETURNS TABLE(id uuid, status referral_status, note text, created_at timestamp with time zone, changed_by uuid, user_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_employee uuid;
BEGIN
  -- Validate employee exists and is active
  SELECT e.id INTO v_employee
  FROM public.employees e
  WHERE e.is_active = true
    AND (
      (p_employee_id IS NOT NULL AND e.employee_id = p_employee_id)
      OR (p_email IS NOT NULL AND e.email = p_email)
    )
  LIMIT 1;

  IF v_employee IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Check if the referral belongs to this employee
  IF NOT EXISTS (
    SELECT 1 FROM public.referrals r 
    WHERE r.id = p_referral_id AND r.referrer_id = v_employee
  ) THEN
    RAISE EXCEPTION 'Referral not found or not authorized';
  END IF;

  -- Return status history with user names
  RETURN QUERY
  SELECT h.id, h.status, h.note, h.created_at, h.changed_by, e.name as user_name
  FROM public.referral_status_history h
  LEFT JOIN public.employees e ON e.id = h.changed_by
  WHERE h.referral_id = p_referral_id
  ORDER BY h.created_at DESC;
END;
$function$;