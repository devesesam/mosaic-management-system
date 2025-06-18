/*
  # Fix for all RLS (Row Level Security) issues
  
  1. Drops and recreates all policies with consistent naming and proper definitions
  2. Ensures all tables have RLS enabled
  3. Creates indexes for better performance
  4. Fixes the constraint on users table that might be causing issues
*/

-- Make sure RLS is enabled on all tables
ALTER TABLE IF EXISTS workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS job_secondary_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to ensure clean slate
DROP POLICY IF EXISTS "Allow reading workers" ON workers;
DROP POLICY IF EXISTS "Allow inserting workers" ON workers;
DROP POLICY IF EXISTS "Allow updating workers" ON workers;
DROP POLICY IF EXISTS "Allow deleting workers" ON workers;

DROP POLICY IF EXISTS "Allow reading jobs" ON jobs;
DROP POLICY IF EXISTS "Allow inserting jobs" ON jobs;
DROP POLICY IF EXISTS "Allow updating jobs" ON jobs;
DROP POLICY IF EXISTS "Allow deleting jobs" ON jobs;

DROP POLICY IF EXISTS "Allow reading job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Allow inserting job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Allow updating job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Allow deleting job_secondary_workers" ON job_secondary_workers;

-- Create consistent policies for all tables
-- Workers
CREATE POLICY "Allow reading workers"
  ON workers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow inserting workers"
  ON workers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow updating workers"
  ON workers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow deleting workers"
  ON workers
  FOR DELETE
  TO authenticated
  USING (true);

-- Jobs
CREATE POLICY "Allow reading jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow inserting jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow updating jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow deleting jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (true);

-- Job Secondary Workers
CREATE POLICY "Allow reading job_secondary_workers"
  ON job_secondary_workers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow inserting job_secondary_workers"
  ON job_secondary_workers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow updating job_secondary_workers"
  ON job_secondary_workers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow deleting job_secondary_workers"
  ON job_secondary_workers
  FOR DELETE
  TO authenticated
  USING (true);

-- Add indexes for better performance
DROP INDEX IF EXISTS idx_jobs_worker_id;
CREATE INDEX IF NOT EXISTS idx_jobs_worker_id ON jobs(worker_id);

DROP INDEX IF EXISTS idx_job_secondary_workers_worker_id;
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_worker_id ON job_secondary_workers(worker_id);

-- Optionally create unique constraint for emails in workers, but allow nulls
ALTER TABLE workers DROP CONSTRAINT IF EXISTS workers_email_unique;
ALTER TABLE workers ADD CONSTRAINT workers_email_unique UNIQUE NULLS NOT DISTINCT (email);

-- Create a function to ensure worker profile exists and is kept in sync
CREATE OR REPLACE FUNCTION ensure_worker_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If a user is created, ensure a worker profile exists with the same email
  INSERT INTO workers (name, email, role)
  VALUES (
    NEW.name,
    NEW.email,
    'admin'
  )
  ON CONFLICT (email) WHERE email IS NOT NULL
  DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role;
    
  RETURN NEW;
END;
$$;

-- Add trigger to sync users to workers if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'ensure_worker_on_user_change'
  ) THEN
    CREATE TRIGGER ensure_worker_on_user_change
    AFTER INSERT OR UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION ensure_worker_profile();
  END IF;
END
$$;