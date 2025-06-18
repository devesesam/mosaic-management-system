-- Make sure RLS is enabled on all tables
ALTER TABLE IF EXISTS workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS job_secondary_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating them
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

-- Create standard policies for all tables
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

-- Make sure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_jobs_worker_id ON jobs(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_worker_id ON job_secondary_workers(worker_id);