/*
  # Comprehensive RLS Policy Fix

  1. Changes:
     - Drop and recreate all RLS policies for jobs, workers, and job_secondary_workers
     - Ensure all tables have RLS enabled
     - Create specific policies for each operation (SELECT, INSERT, UPDATE, DELETE)
     - Make all policies permissive with simple TRUE conditions to allow full access

  2. Purpose:
     - Fix permission issues preventing data from being retrieved
     - Ensure consistent access across all tables
     - Remove any restrictive conditions that might be blocking data access
*/

-- ================= JOBS TABLE =================
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow reading jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow inserting jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow updating jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow deleting jobs" ON public.jobs;

-- Create new policies with simple TRUE conditions
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

-- ================= WORKERS TABLE =================
ALTER TABLE IF EXISTS public.workers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow full access to workers" ON public.workers;

-- Create new specific policies
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

-- ================= JOB_SECONDARY_WORKERS TABLE =================
ALTER TABLE IF EXISTS public.job_secondary_workers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow reading job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow inserting job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow updating job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow deleting job_secondary_workers" ON public.job_secondary_workers;

-- Create new policies with simple TRUE conditions
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