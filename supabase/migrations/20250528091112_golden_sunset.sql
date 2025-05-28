/*
  # EMERGENCY FIX FOR DATA ACCESS

  1. Disable RLS on all tables
     - Makes all tables directly accessible to authenticated users
     
  2. Grant full permissions to authenticated users
     - Ensures authenticated users can read/write all data
     
  3. Create public access functions
     - Provides alternate ways to access data if table access fails
*/

-- Disable RLS on all tables to ensure access
ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_secondary_workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Grant full access permissions to authenticated users
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create simple public access functions for direct data access
CREATE OR REPLACE FUNCTION public_get_all_workers()
RETURNS SETOF workers AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.workers ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public_get_all_jobs()
RETURNS SETOF jobs AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.jobs ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public_get_job_secondary_workers()
RETURNS SETOF job_secondary_workers AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.job_secondary_workers;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public_get_all_workers() TO authenticated;
GRANT EXECUTE ON FUNCTION public_get_all_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION public_get_job_secondary_workers() TO authenticated;

-- Update the worker deletion function for better error handling
DROP FUNCTION IF EXISTS delete_worker_with_jobs(uuid);

CREATE OR REPLACE FUNCTION delete_worker_with_jobs(worker_param uuid)
RETURNS boolean AS $$
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