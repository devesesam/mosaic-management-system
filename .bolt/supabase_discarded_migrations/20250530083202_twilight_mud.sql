-- This migration addresses issues with Row Level Security (RLS) and ensures
-- all tables have consistent policies for authenticated access

-- Make sure RLS is enabled on all tables
ALTER TABLE IF EXISTS public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_secondary_workers ENABLE ROW LEVEL SECURITY;

-- Create simplified ALL permissive policies for authenticated users
-- These replace multiple policies with a single comprehensive policy per table
-- Only do this if the policy doesn't already exist

-- Workers table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workers' AND policyname = 'Allow authenticated access') THEN
        CREATE POLICY "Allow authenticated access" ON public.workers
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END
$$;

-- Jobs table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Allow authenticated access') THEN
        CREATE POLICY "Allow authenticated access" ON public.jobs
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END
$$;

-- Job Secondary Workers table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_secondary_workers' AND policyname = 'Allow authenticated access') THEN
        CREATE POLICY "Allow authenticated access" ON public.job_secondary_workers
            FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END
$$;

-- Create helpful indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_jobs_worker_id ON public.jobs(worker_id);
CREATE INDEX IF NOT EXISTS idx_jobs_start_date ON public.jobs(start_date);
CREATE INDEX IF NOT EXISTS idx_jobs_end_date ON public.jobs(end_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_worker_id ON public.job_secondary_workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_job_id ON public.job_secondary_workers(job_id);

-- Make sure the workers email constraint is correctly set
ALTER TABLE public.workers DROP CONSTRAINT IF EXISTS workers_email_unique;
ALTER TABLE public.workers ADD CONSTRAINT workers_email_unique UNIQUE NULLS NOT DISTINCT (email);