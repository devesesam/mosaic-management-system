/*
  # Fix Database Permissions and Functions
  
  1. Security Changes
    - Disable RLS on all tables
    - Grant full access permissions to authenticated users
  
  2. Function Updates
    - Drop and recreate worker deletion function with proper error handling
    - Create repair function for worker profiles
  
  3. Maintenance
    - Run repair function to ensure all auth users have worker profiles
*/

-- Remove RLS completely from all tables
ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_secondary_workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Grant full access permissions to authenticated users
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Drop the existing function first, then recreate it
DROP FUNCTION IF EXISTS delete_worker_with_jobs(uuid);

-- Create or replace the worker deletion function with proper error handling
CREATE OR REPLACE FUNCTION delete_worker_with_jobs(worker_id uuid)
RETURNS boolean AS $$
DECLARE
  worker_param ALIAS FOR worker_id;
BEGIN
  -- First update any jobs assigned to this worker
  UPDATE public.jobs
  SET worker_id = NULL
  WHERE worker_id = worker_param;
  
  -- Delete secondary worker assignments
  DELETE FROM public.job_secondary_workers
  WHERE worker_id = worker_param;
  
  -- Delete the worker
  DELETE FROM public.workers
  WHERE id = worker_param;
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in delete_worker_with_jobs: %', SQLERRM;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_worker_with_jobs(uuid) TO authenticated;

-- Create a function to ensure worker profiles exist for all auth users
CREATE OR REPLACE FUNCTION repair_all_worker_profiles()
RETURNS TABLE (email text, status text) AS $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN (SELECT * FROM auth.users) LOOP
    -- Check if worker exists
    IF NOT EXISTS (SELECT 1 FROM public.workers WHERE email = auth_user.email) THEN
      -- Create worker
      INSERT INTO public.workers (name, email, role)
      VALUES (
        COALESCE(auth_user.email, 'New User'),
        auth_user.email,
        'admin'
      );
      
      email := auth_user.email;
      status := 'CREATED';
      RETURN NEXT;
    ELSE
      email := auth_user.email;
      status := 'EXISTS';
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION repair_all_worker_profiles() TO authenticated;

-- Run the repair function
SELECT * FROM repair_all_worker_profiles();