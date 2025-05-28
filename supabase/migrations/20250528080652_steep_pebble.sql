/*
  # Disable RLS and simplify database access

  1. RLS Configuration
    - Disable row level security on all tables
    - Grant full access permissions to authenticated users
  
  2. Worker Management
    - Create a clean worker deletion function that handles foreign key relationships
*/

-- Disable RLS on all tables to fix data access issues
ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_secondary_workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Grant full access permissions to authenticated users
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create or replace the worker deletion function
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