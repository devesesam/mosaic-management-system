-- This migration sets up comprehensive RLS policies for all tables
-- It ensures anonymous and authenticated users have appropriate access

-- =============================================
-- USERS TABLE RLS SETUP
-- =============================================

-- Make sure RLS is enabled on users table
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- Delete any existing policies on users table to avoid conflicts
DROP POLICY IF EXISTS "Allow public access to users" ON public.users;
DROP POLICY IF EXISTS "Allow public read access to users" ON public.users;
DROP POLICY IF EXISTS "Allow public insert to users" ON public.users;
DROP POLICY IF EXISTS "Allow public update to users" ON public.users;
DROP POLICY IF EXISTS "Allow public delete from users" ON public.users;
DROP POLICY IF EXISTS "Allow anonymous read access to users" ON public.users;
DROP POLICY IF EXISTS "Allow anonymous insert to users" ON public.users;
DROP POLICY IF EXISTS "Allow anonymous update to users" ON public.users;
DROP POLICY IF EXISTS "Allow anonymous delete from users" ON public.users;

-- Create comprehensive policies for users table
-- Single policy for all operations
CREATE POLICY "universal_access_users" ON public.users
FOR ALL
TO public, anon
USING (true)
WITH CHECK (true);

-- =============================================
-- WORKERS TABLE RLS SETUP
-- =============================================

-- Make sure RLS is enabled on workers table
ALTER TABLE IF EXISTS public.workers ENABLE ROW LEVEL SECURITY;

-- Delete any existing policies on workers table to avoid conflicts
DROP POLICY IF EXISTS "Allow public access to workers" ON public.workers;
DROP POLICY IF EXISTS "Allow public read access to workers" ON public.workers;
DROP POLICY IF EXISTS "Allow public insert to workers" ON public.workers;
DROP POLICY IF EXISTS "Allow public update to workers" ON public.workers;
DROP POLICY IF EXISTS "Allow public delete from workers" ON public.workers;

-- Create comprehensive policies for workers table
-- Single policy for all operations
CREATE POLICY "universal_access_workers" ON public.workers
FOR ALL
TO public, anon
USING (true)
WITH CHECK (true);

-- =============================================
-- JOBS TABLE RLS SETUP
-- =============================================

-- Make sure RLS is enabled on jobs table
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;

-- Delete any existing policies on jobs table to avoid conflicts
DROP POLICY IF EXISTS "Allow public access to jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow public read access to jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow public insert to jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow public update to jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow public delete from jobs" ON public.jobs;

-- Create comprehensive policies for jobs table
-- Single policy for all operations
CREATE POLICY "universal_access_jobs" ON public.jobs
FOR ALL
TO public, anon
USING (true)
WITH CHECK (true);

-- =============================================
-- JOB_SECONDARY_WORKERS TABLE RLS SETUP
-- =============================================

-- Make sure RLS is enabled on job_secondary_workers table
ALTER TABLE IF EXISTS public.job_secondary_workers ENABLE ROW LEVEL SECURITY;

-- Delete any existing policies on job_secondary_workers table to avoid conflicts
DROP POLICY IF EXISTS "Allow public access to job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow public read access to job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow public insert to job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow public update to job_secondary_workers" ON public.job_secondary_workers;
DROP POLICY IF EXISTS "Allow public delete from job_secondary_workers" ON public.job_secondary_workers;

-- Create comprehensive policies for job_secondary_workers table
-- Single policy for all operations
CREATE POLICY "universal_access_job_secondary_workers" ON public.job_secondary_workers
FOR ALL
TO public, anon
USING (true)
WITH CHECK (true);

-- =============================================
-- VERIFY DATABASE SETTINGS
-- =============================================

-- Ensure the database allows anonymous access (debugging purposes)
ALTER ROLE anon SET log_statement = 'all';
ALTER ROLE anon SET log_min_messages = 'debug';