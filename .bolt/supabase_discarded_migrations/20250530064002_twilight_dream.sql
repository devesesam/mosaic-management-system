/*
  # Enable consistent Row Level Security

  1. Changes
    - Enable RLS on the jobs and job_secondary_workers tables
    - Ensure all tables have consistent security policies
  
  2. Security
    - This ensures all tables have consistent security models
    - Fixes the authentication and jobs fetch timeout issues
*/

-- Enable RLS for jobs table (currently disabled)
ALTER TABLE IF EXISTS jobs ENABLE ROW LEVEL SECURITY;

-- Enable RLS for job_secondary_workers table (currently disabled)
ALTER TABLE IF EXISTS job_secondary_workers ENABLE ROW LEVEL SECURITY;

-- Ensure the jobs policies are properly defined (they already exist but redefining for clarity)
DROP POLICY IF EXISTS "Allow reading jobs" ON jobs;
CREATE POLICY "Allow reading jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow inserting jobs" ON jobs;
CREATE POLICY "Allow inserting jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow updating jobs" ON jobs;
CREATE POLICY "Allow updating jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow deleting jobs" ON jobs;
CREATE POLICY "Allow deleting jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (true);

-- Ensure the job_secondary_workers policies are properly defined
DROP POLICY IF EXISTS "Allow reading job_secondary_workers" ON job_secondary_workers;
CREATE POLICY "Allow reading job_secondary_workers"
  ON job_secondary_workers
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow inserting job_secondary_workers" ON job_secondary_workers;
CREATE POLICY "Allow inserting job_secondary_workers"
  ON job_secondary_workers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow updating job_secondary_workers" ON job_secondary_workers;
CREATE POLICY "Allow updating job_secondary_workers"
  ON job_secondary_workers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow deleting job_secondary_workers" ON job_secondary_workers;
CREATE POLICY "Allow deleting job_secondary_workers"
  ON job_secondary_workers
  FOR DELETE
  TO authenticated
  USING (true);

-- Verify workers policies are consistent with the other tables (they should already exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'workers' AND cmd = 'SELECT') THEN
    CREATE POLICY "Allow reading workers"
      ON workers
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;