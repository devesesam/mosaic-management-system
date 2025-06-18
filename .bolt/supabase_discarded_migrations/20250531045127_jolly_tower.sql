-- This migration makes ALL tables fully publicly accessible for both reading and writing
-- It provides the most permissive access possible while still maintaining RLS structure

-- Enable RLS on all tables (required for policies to work)
ALTER TABLE IF EXISTS public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_secondary_workers ENABLE ROW LEVEL SECURITY;

-- Remove ALL existing policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated access" ON public.workers;
DROP POLICY IF EXISTS "Allow public read access to workers" ON public.workers;
DROP POLICY IF EXISTS "Allow authenticated insert to workers" ON public.workers;
DROP POLICY IF EXISTS "Allow authenticated update to workers" ON public.workers;
DROP POLICY IF EXISTS "Allow authenticated delete from workers" ON public.workers;

DROP POLICY IF EXISTS "Allow authenticated access" ON public.jobs;
DROP POLICY IF EXISTS "Allow public read access to jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow authenticated insert to jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow authenticated update to jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow authenticated delete from jobs" ON public.jobs;

DROP POLICY IF EXISTS "Allow authenticated access" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow public read access to job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow authenticated insert to job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow authenticated update to job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow authenticated delete from job_secondary_workers" ON public.job_secondary_workers;

-- Create FULLY PUBLIC access policies for ALL operations on all tables
-- WORKERS: Full public access
CREATE POLICY "Allow public read access to workers"
  ON public.workers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to workers"
  ON public.workers
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to workers"
  ON public.workers
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from workers"
  ON public.workers
  FOR DELETE
  TO public
  USING (true);

-- JOBS: Full public access
CREATE POLICY "Allow public read access to jobs"
  ON public.jobs
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to jobs"
  ON public.jobs
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to jobs"
  ON public.jobs
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from jobs"
  ON public.jobs
  FOR DELETE
  TO public
  USING (true);

-- JOB_SECONDARY_WORKERS: Full public access
CREATE POLICY "Allow public read access to job_secondary_workers"
  ON public.job_secondary_workers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert to job_secondary_workers"
  ON public.job_secondary_workers
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update to job_secondary_workers"
  ON public.job_secondary_workers
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from job_secondary_workers"
  ON public.job_secondary_workers
  FOR DELETE
  TO public
  USING (true);

-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_jobs_worker_id ON public.jobs(worker_id);
CREATE INDEX IF NOT EXISTS idx_jobs_start_date ON public.jobs(start_date);
CREATE INDEX IF NOT EXISTS idx_jobs_end_date ON public.jobs(end_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_worker_id ON public.job_secondary_workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_job_id ON public.job_secondary_workers(job_id);