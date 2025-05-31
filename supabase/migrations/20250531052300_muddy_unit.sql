-- This migration adds additional public access policies to allow the application
-- to work without authentication requirements for read/write operations

-- Make sure RLS is enabled on all tables
ALTER TABLE IF EXISTS public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_secondary_workers ENABLE ROW LEVEL SECURITY;

-- Create policies for workers table - Allow public access for ALL operations
DROP POLICY IF EXISTS "Allow public read access to workers" ON public.workers;
CREATE POLICY "Allow public read access to workers"
  ON public.workers
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public insert to workers" ON public.workers;
CREATE POLICY "Allow public insert to workers"
  ON public.workers
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to workers" ON public.workers;
CREATE POLICY "Allow public update to workers"
  ON public.workers
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete from workers" ON public.workers;
CREATE POLICY "Allow public delete from workers"
  ON public.workers
  FOR DELETE
  TO public
  USING (true);

-- Create policies for jobs table - Allow public access for ALL operations
DROP POLICY IF EXISTS "Allow public read access to jobs" ON public.jobs;
CREATE POLICY "Allow public read access to jobs"
  ON public.jobs
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public insert to jobs" ON public.jobs;
CREATE POLICY "Allow public insert to jobs"
  ON public.jobs
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to jobs" ON public.jobs;
CREATE POLICY "Allow public update to jobs"
  ON public.jobs
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete from jobs" ON public.jobs;
CREATE POLICY "Allow public delete from jobs"
  ON public.jobs
  FOR DELETE
  TO public
  USING (true);

-- Create policies for job_secondary_workers table - Allow public access for ALL operations
DROP POLICY IF EXISTS "Allow public read access to job_secondary_workers" ON public.job_secondary_workers;
CREATE POLICY "Allow public read access to job_secondary_workers"
  ON public.job_secondary_workers
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Allow public insert to job_secondary_workers" ON public.job_secondary_workers;
CREATE POLICY "Allow public insert to job_secondary_workers"
  ON public.job_secondary_workers
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to job_secondary_workers" ON public.job_secondary_workers;
CREATE POLICY "Allow public update to job_secondary_workers"
  ON public.job_secondary_workers
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete from job_secondary_workers" ON public.job_secondary_workers;
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

-- Create a worker entry for testing if one doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.workers LIMIT 1) THEN
    INSERT INTO public.workers (name, role)
    VALUES ('Demo Worker', 'admin');
  END IF;
END
$$;