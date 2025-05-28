/*
  # Fix permissions for jobs table

  1. Updates
    - Re-enable RLS on jobs table
    - Create explicit policy for reading jobs
    - Create explicit policy for inserting jobs
    - Create explicit policy for updating jobs
    - Create explicit policy for deleting jobs

  This ensures any authenticated user can access all jobs regardless of user role.
*/

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to jobs" ON public.jobs;

-- Create specific policies for each operation
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

-- Also do the same for job_secondary_workers table
ALTER TABLE IF EXISTS public.job_secondary_workers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to job_secondary_workers" ON public.job_secondary_workers;

-- Create specific policies for each operation
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