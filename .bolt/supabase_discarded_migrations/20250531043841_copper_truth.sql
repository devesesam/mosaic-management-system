-- This migration adds public read access to key tables while maintaining authenticated write access
-- This allows the application to fetch data without requiring authentication

-- Enable RLS on all tables to ensure policies take effect
ALTER TABLE IF EXISTS public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_secondary_workers ENABLE ROW LEVEL SECURITY;

-- Create conditional policies for workers table
DO $$
BEGIN
    -- Drop any conflicting policies first
    DROP POLICY IF EXISTS "Allow authenticated access" ON public.workers;
    
    -- Check if the policy already exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'workers' 
        AND policyname = 'Allow public read access to workers'
    ) THEN
        CREATE POLICY "Allow public read access to workers"
          ON public.workers
          FOR SELECT
          TO public
          USING (true);
    END IF;
    
    -- Create authenticated insert policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'workers' 
        AND policyname = 'Allow authenticated insert to workers'
    ) THEN
        CREATE POLICY "Allow authenticated insert to workers"
          ON public.workers
          FOR INSERT
          TO authenticated
          WITH CHECK (true);
    END IF;
    
    -- Create authenticated update policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'workers' 
        AND policyname = 'Allow authenticated update to workers'
    ) THEN
        CREATE POLICY "Allow authenticated update to workers"
          ON public.workers
          FOR UPDATE
          TO authenticated
          USING (true)
          WITH CHECK (true);
    END IF;
    
    -- Create authenticated delete policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'workers' 
        AND policyname = 'Allow authenticated delete from workers'
    ) THEN
        CREATE POLICY "Allow authenticated delete from workers"
          ON public.workers
          FOR DELETE
          TO authenticated
          USING (true);
    END IF;
END
$$;

-- Create conditional policies for jobs table
DO $$
BEGIN
    -- Drop any conflicting policies first
    DROP POLICY IF EXISTS "Allow authenticated access" ON public.jobs;
    
    -- Check if the policy already exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'jobs' 
        AND policyname = 'Allow public read access to jobs'
    ) THEN
        CREATE POLICY "Allow public read access to jobs"
          ON public.jobs
          FOR SELECT
          TO public
          USING (true);
    END IF;
    
    -- Create authenticated insert policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'jobs' 
        AND policyname = 'Allow authenticated insert to jobs'
    ) THEN
        CREATE POLICY "Allow authenticated insert to jobs"
          ON public.jobs
          FOR INSERT
          TO authenticated
          WITH CHECK (true);
    END IF;
    
    -- Create authenticated update policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'jobs' 
        AND policyname = 'Allow authenticated update to jobs'
    ) THEN
        CREATE POLICY "Allow authenticated update to jobs"
          ON public.jobs
          FOR UPDATE
          TO authenticated
          USING (true)
          WITH CHECK (true);
    END IF;
    
    -- Create authenticated delete policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'jobs' 
        AND policyname = 'Allow authenticated delete from jobs'
    ) THEN
        CREATE POLICY "Allow authenticated delete from jobs"
          ON public.jobs
          FOR DELETE
          TO authenticated
          USING (true);
    END IF;
END
$$;

-- Create conditional policies for job_secondary_workers table
DO $$
BEGIN
    -- Drop any conflicting policies first
    DROP POLICY IF EXISTS "Allow authenticated access" ON public.job_secondary_workers;
    
    -- Check if the policy already exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'job_secondary_workers' 
        AND policyname = 'Allow public read access to job_secondary_workers'
    ) THEN
        CREATE POLICY "Allow public read access to job_secondary_workers"
          ON public.job_secondary_workers
          FOR SELECT
          TO public
          USING (true);
    END IF;
    
    -- Create authenticated insert policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'job_secondary_workers' 
        AND policyname = 'Allow authenticated insert to job_secondary_workers'
    ) THEN
        CREATE POLICY "Allow authenticated insert to job_secondary_workers"
          ON public.job_secondary_workers
          FOR INSERT
          TO authenticated
          WITH CHECK (true);
    END IF;
    
    -- Create authenticated update policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'job_secondary_workers' 
        AND policyname = 'Allow authenticated update to job_secondary_workers'
    ) THEN
        CREATE POLICY "Allow authenticated update to job_secondary_workers"
          ON public.job_secondary_workers
          FOR UPDATE
          TO authenticated
          USING (true)
          WITH CHECK (true);
    END IF;
    
    -- Create authenticated delete policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'job_secondary_workers' 
        AND policyname = 'Allow authenticated delete from job_secondary_workers'
    ) THEN
        CREATE POLICY "Allow authenticated delete from job_secondary_workers"
          ON public.job_secondary_workers
          FOR DELETE
          TO authenticated
          USING (true);
    END IF;
END
$$;

-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_jobs_worker_id ON public.jobs(worker_id);
CREATE INDEX IF NOT EXISTS idx_jobs_start_date ON public.jobs(start_date);
CREATE INDEX IF NOT EXISTS idx_jobs_end_date ON public.jobs(end_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_worker_id ON public.job_secondary_workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_job_id ON public.job_secondary_workers(job_id);