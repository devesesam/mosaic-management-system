-- This migration updates table permissions and adds anon role permissions

-- First, ensure RLS is enabled on all tables
ALTER TABLE IF EXISTS public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_secondary_workers ENABLE ROW LEVEL SECURITY;

-- Create simple public access policies for all operations
-- For workers table
DROP POLICY IF EXISTS "Allow public access to workers" ON public.workers;
CREATE POLICY "Allow public access to workers"
  ON public.workers
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- For jobs table
DROP POLICY IF EXISTS "Allow public access to jobs" ON public.jobs;
CREATE POLICY "Allow public access to jobs"
  ON public.jobs
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- For job_secondary_workers table
DROP POLICY IF EXISTS "Allow public access to job_secondary_workers" ON public.job_secondary_workers;
CREATE POLICY "Allow public access to job_secondary_workers"
  ON public.job_secondary_workers
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Grant appropriate permissions to the anon role
GRANT ALL PRIVILEGES ON TABLE public.workers TO anon;
GRANT ALL PRIVILEGES ON TABLE public.jobs TO anon;
GRANT ALL PRIVILEGES ON TABLE public.job_secondary_workers TO anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Create a test worker entry if one doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.workers LIMIT 1) THEN
    INSERT INTO public.workers (name, role)
    VALUES ('Test Worker', 'admin');
  END IF;
END
$$;

-- Create a test job entry if one doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.jobs LIMIT 1) THEN
    INSERT INTO public.jobs (address, status)
    VALUES ('123 Test Street', 'Awaiting Order');
  END IF;
END
$$;