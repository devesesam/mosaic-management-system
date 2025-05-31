-- This migration adds public read access to key tables while maintaining authenticated write access
-- This allows the application to fetch data without requiring authentication

-- Enable RLS on all tables to ensure policies take effect
ALTER TABLE IF EXISTS public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_secondary_workers ENABLE ROW LEVEL SECURITY;

-- Workers table policies
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated access" ON public.workers;
DROP POLICY IF EXISTS "Allow public read access" ON public.workers;

-- Create policy for public read access to workers
CREATE POLICY "Allow public read access to workers"
  ON public.workers
  FOR SELECT
  TO public
  USING (true);

-- Create policy for authenticated write access to workers
CREATE POLICY "Allow authenticated write access to workers"
  ON public.workers
  FOR INSERT UPDATE DELETE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Jobs table policies
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated access" ON public.jobs;
DROP POLICY IF EXISTS "Allow public read access" ON public.jobs;

-- Create policy for public read access to jobs
CREATE POLICY "Allow public read access to jobs"
  ON public.jobs
  FOR SELECT
  TO public
  USING (true);

-- Create policy for authenticated write access to jobs
CREATE POLICY "Allow authenticated write access to jobs"
  ON public.jobs
  FOR INSERT UPDATE DELETE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Job Secondary Workers table policies
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated access" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow public read access" ON public.job_secondary_workers;

-- Create policy for public read access to job_secondary_workers
CREATE POLICY "Allow public read access to job_secondary_workers"
  ON public.job_secondary_workers
  FOR SELECT
  TO public
  USING (true);

-- Create policy for authenticated write access to job_secondary_workers
CREATE POLICY "Allow authenticated write access to job_secondary_workers"
  ON public.job_secondary_workers
  FOR INSERT UPDATE DELETE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_jobs_worker_id ON public.jobs(worker_id);
CREATE INDEX IF NOT EXISTS idx_jobs_start_date ON public.jobs(start_date);
CREATE INDEX IF NOT EXISTS idx_jobs_end_date ON public.jobs(end_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_worker_id ON public.job_secondary_workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_job_id ON public.job_secondary_workers(job_id);