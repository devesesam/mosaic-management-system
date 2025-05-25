/*
  # Fix function search path security vulnerabilities

  1. Security Updates
     - Add explicit search_path to all functions to prevent search path injection attacks
     - Drop and recreate all functions with proper search_path settings
     
  2. Functions Updated
     - delete_worker_with_jobs
     - is_admin
     - check_job_visibility
     - handle_new_user
     - check_user_status
     - test_data_access
     - check_user_record
     - count_visible_data
*/

-- Drop functions first to avoid return type issues
DROP FUNCTION IF EXISTS public.delete_worker_with_jobs(uuid);
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.check_job_visibility(uuid);
DROP FUNCTION IF EXISTS public.check_user_status();
DROP FUNCTION IF EXISTS public.test_data_access();
DROP FUNCTION IF EXISTS public.check_user_record();
DROP FUNCTION IF EXISTS public.count_visible_data();

-- Recreate delete_worker_with_jobs function
CREATE OR REPLACE FUNCTION public.delete_worker_with_jobs(worker_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update jobs to unassign this worker
  UPDATE jobs
  SET 
    worker_id = NULL, 
    start_date = NULL, 
    end_date = NULL
  WHERE worker_id = delete_worker_with_jobs.worker_id;
  
  -- Remove secondary worker assignments
  DELETE FROM job_secondary_workers
  WHERE worker_id = delete_worker_with_jobs.worker_id;
  
  -- Delete the worker
  DELETE FROM workers
  WHERE id = delete_worker_with_jobs.worker_id;
  
  RETURN TRUE;
END;
$$;

-- Recreate is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;

-- Recreate check_job_visibility function
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

-- Fix handle_new_user function - we need to preserve the trigger function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  worker_id UUID;
BEGIN
  -- First create the worker record
  INSERT INTO public.workers (name, email, role)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    'admin'  -- Default all new users to admin role
  )
  ON CONFLICT (email) 
  DO UPDATE SET
    role = 'admin'
  RETURNING id INTO worker_id;
  
  -- Then create the users record that links to auth.users
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    'admin'
  )
  ON CONFLICT (id)
  DO UPDATE SET
    role = 'admin';
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Recreate check_user_status function
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

-- Recreate test_data_access function
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

-- Recreate check_user_record function
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

-- Recreate count_visible_data function
CREATE OR REPLACE FUNCTION public.count_visible_data()
RETURNS TABLE (
  total_jobs BIGINT,
  user_jobs BIGINT,
  total_workers BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_email TEXT;
  current_worker_id UUID;
BEGIN
  -- Get the current user email
  SELECT email INTO current_user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Get the worker ID for this user
  SELECT id INTO current_worker_id
  FROM workers
  WHERE email = current_user_email;
  
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM jobs) AS total_jobs,
    (SELECT COUNT(*) FROM jobs WHERE worker_id = current_worker_id) AS user_jobs,
    (SELECT COUNT(*) FROM workers) AS total_workers;
END;
$$;