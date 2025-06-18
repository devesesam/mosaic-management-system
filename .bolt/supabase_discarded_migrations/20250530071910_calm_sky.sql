-- Add additional indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_jobs_worker_id ON public.jobs(worker_id);
CREATE INDEX IF NOT EXISTS idx_jobs_start_date ON public.jobs(start_date);
CREATE INDEX IF NOT EXISTS idx_jobs_end_date ON public.jobs(end_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_worker_id ON public.job_secondary_workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_job_id ON public.job_secondary_workers(job_id);

-- Optimize tables
ANALYZE public.workers;
ANALYZE public.jobs;
ANALYZE public.job_secondary_workers;
ANALYZE public.users;

-- Ensure proper RLS policies are in place and optimized
DO $$
BEGIN
  -- Make sure all tables have RLS enabled
  EXECUTE 'ALTER TABLE IF EXISTS public.workers ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS public.job_secondary_workers ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY';
  
  -- Ensure we have proper policies with simplified conditions for better performance
  
  -- Workers policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workers' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON public.workers
      USING (true)
      WITH CHECK (true);
  END IF;
  
  -- Jobs policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON public.jobs
      USING (true)
      WITH CHECK (true);
  END IF;
  
  -- Job secondary workers policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_secondary_workers' AND policyname = 'Allow authenticated access') THEN
    CREATE POLICY "Allow authenticated access" ON public.job_secondary_workers
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;