/*
  # Fix RLS policies and worker profile association
  
  This migration ensures all tables have permissive RLS policies and adds a function
  to ensure worker profiles are properly associated with users.
*/

-- ================= RESET ALL RLS POLICIES =================

-- Jobs Table
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow reading jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow inserting jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow updating jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow deleting jobs" ON public.jobs;

-- Create completely permissive policies
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

-- Create completely permissive policies
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

-- Create completely permissive policies
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

-- ================= ADD WORKER ASSOCIATION FUNCTION =================

-- Create a function to ensure a worker exists for each auth user
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

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a trigger to automatically create a worker profile for new auth users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION ensure_worker_profile();

-- Function to repair all existing users (make sure they have worker profiles)
CREATE OR REPLACE FUNCTION repair_worker_associations()
RETURNS TABLE (user_email TEXT, worker_id UUID, status TEXT) AS $$
DECLARE
  auth_user RECORD;
  worker_record RECORD;
BEGIN
  FOR auth_user IN SELECT * FROM auth.users
  LOOP
    SELECT * INTO worker_record FROM public.workers WHERE email = auth_user.email LIMIT 1;
    
    IF worker_record.id IS NULL THEN
      -- Create a worker profile for this user
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
    ELSE
      user_email := auth_user.email;
      worker_id := worker_record.id;
      status := 'EXISTS';
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Immediately run the repair function to fix existing users
SELECT * FROM repair_worker_associations();