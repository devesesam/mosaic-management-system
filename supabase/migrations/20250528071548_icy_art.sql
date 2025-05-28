-- First drop triggers that depend on functions to avoid dependency errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_complete ON auth.users;

-- Disable RLS on all tables for simpler permissions model
ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_secondary_workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Grant direct permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_secondary_workers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;

-- Grant usage on sequences and schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Clean up any existing functions to avoid conflicts
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

-- Create necessary functions

-- Worker deletion function
CREATE FUNCTION delete_worker_with_jobs(worker_id uuid)
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

-- Worker profile creation function
CREATE FUNCTION ensure_worker_profile()
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