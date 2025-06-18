-- Comprehensive fix for database access issues
-- This migration ensures all tables have proper public access

-- First, ensure RLS is enabled on all tables
ALTER TABLE IF EXISTS public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_secondary_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Allow public access to workers" ON public.workers;
DROP POLICY IF EXISTS "Allow public read access to workers" ON public.workers;
DROP POLICY IF EXISTS "Allow public insert to workers" ON public.workers;
DROP POLICY IF EXISTS "Allow public update to workers" ON public.workers;
DROP POLICY IF EXISTS "Allow public delete from workers" ON public.workers;
DROP POLICY IF EXISTS "Allow authenticated access" ON public.workers;

DROP POLICY IF EXISTS "Allow public access to jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow public read access to jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow public insert to jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow public update to jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow public delete from jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow authenticated access" ON public.jobs;

DROP POLICY IF EXISTS "Allow public access to job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow public read access to job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow public insert to job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow public update to job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow public delete from job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow authenticated access" ON public.job_secondary_workers;

DROP POLICY IF EXISTS "Allow public access to users" ON public.users;

-- Create simple, permissive policies for ALL operations on ALL tables
-- Workers table
CREATE POLICY "Allow all access to workers" ON public.workers
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Jobs table  
CREATE POLICY "Allow all access to jobs" ON public.jobs
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Job secondary workers table
CREATE POLICY "Allow all access to job_secondary_workers" ON public.job_secondary_workers
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Users table
CREATE POLICY "Allow all access to users" ON public.users
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Grant ALL permissions to both anon and authenticated roles
GRANT ALL PRIVILEGES ON TABLE public.workers TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.jobs TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.job_secondary_workers TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.users TO anon, authenticated;

-- Grant sequence permissions
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_jobs_worker_id ON public.jobs(worker_id);
CREATE INDEX IF NOT EXISTS idx_jobs_start_date ON public.jobs(start_date);
CREATE INDEX IF NOT EXISTS idx_jobs_end_date ON public.jobs(end_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_worker_id ON public.job_secondary_workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_job_id ON public.job_secondary_workers(job_id);

-- Create a test worker if none exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.workers LIMIT 1) THEN
    INSERT INTO public.workers (name, email, role)
    VALUES ('Test Worker', 'test@example.com', 'admin');
  END IF;
END
$$;

-- Create a test job if none exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.jobs LIMIT 1) THEN
    INSERT INTO public.jobs (address, status, tile_color)
    VALUES ('123 Test Street', 'Awaiting Order', '#3b82f6');
  END IF;
END
$$;