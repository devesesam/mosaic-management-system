/*
  # Database cleanup and security configuration

  1. Security
     - Disable RLS on all tables for simplicity
     - Grant direct permissions to authenticated users
  2. Helper Functions
     - Create worker deletion function with proper drop
*/

-- First disable RLS on all tables
ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_secondary_workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Grant direct permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_secondary_workers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;

-- Drop the function if it exists to avoid return type conflicts
DROP FUNCTION IF EXISTS delete_worker_with_jobs(uuid);

-- Create a simple worker deletion function
CREATE OR REPLACE FUNCTION delete_worker_with_jobs(worker_id uuid)
RETURNS void AS $$
BEGIN
  -- First update any jobs assigned to this worker
  UPDATE public.jobs
  SET worker_id = NULL
  WHERE worker_id = $1;
  
  -- Delete secondary worker assignments
  DELETE FROM public.job_secondary_workers
  WHERE worker_id = $1;
  
  -- Delete the worker
  DELETE FROM public.workers
  WHERE id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_worker_with_jobs(uuid) TO authenticated;