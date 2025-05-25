/*
  # Fix Function Search Path Security Issues

  1. Security Fixes
     - Add explicit search_path parameter to remaining functions with role mutable search path
     - Properly drop functions before recreating them to avoid return type issues
     - Applies to: check_job_visibility, check_user_status, test_data_access, check_user_record
  
  2. Changes
     - All functions now have SET search_path = public
     - Function signatures and functionality remain the same
     - Proper DROP/CREATE sequence to avoid PostgreSQL errors
*/

-- First drop all functions to avoid return type issues
DROP FUNCTION IF EXISTS public.check_job_visibility(uuid);
DROP FUNCTION IF EXISTS public.check_user_status();
DROP FUNCTION IF EXISTS public.test_data_access();
DROP FUNCTION IF EXISTS public.check_user_record();

-- Recreate check_job_visibility with secure search_path
CREATE OR REPLACE FUNCTION public.check_job_visibility(job_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  worker_record workers%ROWTYPE;
  job_record jobs%ROWTYPE;
  is_authorized BOOLEAN;
BEGIN
  -- Get the current user's worker record
  SELECT * INTO worker_record
  FROM workers
  WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid());
  
  -- Get the job record
  SELECT * INTO job_record
  FROM jobs
  WHERE id = check_job_visibility.job_id;
  
  -- Check if the user is authorized to see this job
  IF worker_record.role = 'admin' THEN
    -- Admins can see all jobs
    is_authorized := TRUE;
  ELSE
    -- Non-admins can only see jobs assigned to them
    is_authorized := job_record.worker_id = worker_record.id OR 
                     EXISTS (
                        SELECT 1 FROM job_secondary_workers 
                        WHERE job_id = check_job_visibility.job_id AND worker_id = worker_record.id
                     );
  END IF;
  
  RETURN is_authorized;
END;
$$;

-- Recreate check_user_status with secure search_path
CREATE OR REPLACE FUNCTION public.check_user_status()
RETURNS TABLE (
  auth_id UUID,
  email TEXT,
  has_worker_profile BOOLEAN,
  has_user_record BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  current_user_email TEXT;
BEGIN
  -- Get the current user info
  SELECT id, email INTO current_user_id, current_user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN QUERY
  SELECT 
    current_user_id,
    current_user_email,
    EXISTS (SELECT 1 FROM workers WHERE email = current_user_email),
    EXISTS (SELECT 1 FROM users WHERE id = current_user_id);
END;
$$;

-- Recreate test_data_access with secure search_path
CREATE OR REPLACE FUNCTION public.test_data_access()
RETURNS TABLE (
  jobs_count BIGINT,
  workers_count BIGINT,
  secondary_workers_count BIGINT,
  users_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM jobs),
    (SELECT COUNT(*) FROM workers),
    (SELECT COUNT(*) FROM job_secondary_workers),
    (SELECT COUNT(*) FROM users);
END;
$$;

-- Recreate check_user_record with secure search_path
CREATE OR REPLACE FUNCTION public.check_user_record()
RETURNS TABLE (
  auth_id UUID,
  users_record JSON,
  workers_record JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  current_user_email TEXT;
BEGIN
  -- Get the current user info
  SELECT id, email INTO current_user_id, current_user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN QUERY
  SELECT 
    current_user_id,
    (SELECT row_to_json(u) FROM users u WHERE id = current_user_id) AS users_record,
    (SELECT row_to_json(w) FROM workers w WHERE email = current_user_email) AS workers_record;
END;
$$;