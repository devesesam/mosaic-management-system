/*
  # Clean up migrations and simplify database setup

  1. Security
     - Disable RLS on all tables for simplicity
     - Grant full permissions to authenticated users
  2. Helper Functions
     - Create worker deletion function
     - Create worker profile creation function
*/

-- Disable RLS on all tables for simplicity
ALTER TABLE IF EXISTS public.jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_secondary_workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- Grant full permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_secondary_workers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Clean up any existing functions
DROP FUNCTION IF EXISTS delete_worker_with_jobs(uuid);
DROP FUNCTION IF EXISTS ensure_worker_profile();
DROP FUNCTION IF EXISTS admin_get_all_workers();
DROP FUNCTION IF EXISTS admin_get_all_jobs();
DROP FUNCTION IF EXISTS admin_get_all_secondary_workers();
DROP FUNCTION IF EXISTS emergency_get_workers();
DROP FUNCTION IF EXISTS emergency_get_jobs();
DROP FUNCTION IF EXISTS emergency_get_secondary_workers();
DROP FUNCTION IF EXISTS repair_worker_associations();
DROP FUNCTION IF EXISTS get_worker_by_email(text);
DROP FUNCTION IF EXISTS force_associate_worker(text);
DROP FUNCTION IF EXISTS handle_new_user();

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_complete ON auth.users;

-- Create worker deletion function
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

-- Create worker profile creation function
CREATE OR REPLACE FUNCTION ensure_worker_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workers (name, email, role)
  VALUES (
    COALESCE(NEW.email, 'New User'),
    NEW.email,
    'admin'
  )
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic worker profile creation
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION ensure_worker_profile();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION delete_worker_with_jobs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_worker_profile() TO authenticated;