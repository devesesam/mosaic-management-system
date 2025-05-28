/*
  # Remove User Identification Restrictions
  
  1. Changes
     - Remove all complex RLS policies
     - Make all tables fully accessible to any authenticated user
     - Add public functions for direct data access
     - Simplify worker profile logic
  
  2. Security
     - All authenticated users can access all data
     - No user-specific restrictions
*/

-- ================= RESET ALL RLS POLICIES =================

-- Disable RLS on users table since we're not using it for restrictions
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- Make all tables accessible to any authenticated user

-- Jobs Table
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow reading jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow inserting jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow updating jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow deleting jobs" ON public.jobs;

-- Create simple open access policies for all authenticated users
CREATE POLICY "Allow reading jobs" 
ON public.jobs
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow inserting jobs" 
ON public.jobs
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow updating jobs" 
ON public.jobs
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow deleting jobs" 
ON public.jobs
FOR DELETE 
TO authenticated 
USING (true);

-- Workers Table
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow reading workers" ON public.workers;
DROP POLICY IF EXISTS "Allow inserting workers" ON public.workers;
DROP POLICY IF EXISTS "Allow updating workers" ON public.workers;
DROP POLICY IF EXISTS "Allow deleting workers" ON public.workers;

-- Create simple open access policies for all authenticated users
CREATE POLICY "Allow reading workers" 
ON public.workers
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow inserting workers" 
ON public.workers
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow updating workers" 
ON public.workers
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow deleting workers" 
ON public.workers
FOR DELETE 
TO authenticated 
USING (true);

-- Job Secondary Workers Table
ALTER TABLE public.job_secondary_workers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow reading job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow inserting job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow updating job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow deleting job_secondary_workers" ON public.job_secondary_workers;

-- Create simple open access policies for all authenticated users
CREATE POLICY "Allow reading job_secondary_workers" 
ON public.job_secondary_workers
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow inserting job_secondary_workers" 
ON public.job_secondary_workers
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow updating job_secondary_workers" 
ON public.job_secondary_workers
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow deleting job_secondary_workers" 
ON public.job_secondary_workers
FOR DELETE 
TO authenticated 
USING (true);

-- Create a simpler function to ensure a worker profile for any auth user
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

-- Make sure the trigger is in place
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION ensure_worker_profile();

-- Create or replace the worker repair function to be more robust
CREATE OR REPLACE FUNCTION repair_worker_associations()
RETURNS TABLE (user_email TEXT, worker_id UUID, status TEXT) AS $$
DECLARE
  auth_user RECORD;
  worker_record RECORD;
BEGIN
  -- First try to create workers for existing auth users
  FOR auth_user IN SELECT * FROM auth.users
  LOOP
    -- Insert or ignore for each auth user
    INSERT INTO public.workers (name, email, role)
    VALUES (
      COALESCE(auth_user.email, 'User'),
      auth_user.email,
      'admin'
    )
    ON CONFLICT (email) DO NOTHING;
    
    -- Get the worker record (new or existing)
    SELECT * INTO worker_record FROM public.workers WHERE email = auth_user.email LIMIT 1;
    
    user_email := auth_user.email;
    worker_id := worker_record.id;
    status := 'REPAIRED';
    RETURN NEXT;
  END LOOP;
  
  -- Now check for any users without worker profiles
  FOR auth_user IN 
    SELECT au.* 
    FROM auth.users au
    LEFT JOIN public.workers w ON au.email = w.email
    WHERE w.id IS NULL
  LOOP
    -- Insert a worker profile for this auth user
    INSERT INTO public.workers (name, email, role)
    VALUES (
      COALESCE(auth_user.email, 'User'),
      auth_user.email,
      'admin'
    )
    RETURNING id INTO worker_record;
    
    user_email := auth_user.email;
    worker_id := worker_record.id;
    status := 'CREATED';
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION repair_worker_associations() TO authenticated;

-- Create admin access functions for direct data access
CREATE OR REPLACE FUNCTION admin_get_all_workers()
RETURNS SETOF workers AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.workers ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_get_all_jobs()
RETURNS SETOF jobs AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.jobs ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_get_all_secondary_workers()
RETURNS SETOF job_secondary_workers AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.job_secondary_workers;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_worker_by_email(worker_email TEXT)
RETURNS SETOF workers AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.workers WHERE email = worker_email LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to all authenticated users
GRANT EXECUTE ON FUNCTION admin_get_all_workers() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_secondary_workers() TO authenticated;
GRANT EXECUTE ON FUNCTION get_worker_by_email(TEXT) TO authenticated;