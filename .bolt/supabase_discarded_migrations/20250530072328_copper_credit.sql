-- Simplify and strengthen RLS policies for all tables

-- First, ensure RLS is enabled on all tables
ALTER TABLE IF EXISTS workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS job_secondary_workers ENABLE ROW LEVEL SECURITY;

-- Remove all existing policies to start fresh
DROP POLICY IF EXISTS "Allow reading workers" ON workers;
DROP POLICY IF EXISTS "Allow inserting workers" ON workers;
DROP POLICY IF EXISTS "Allow updating workers" ON workers;
DROP POLICY IF EXISTS "Allow deleting workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated access" ON workers;

DROP POLICY IF EXISTS "Allow reading jobs" ON jobs;
DROP POLICY IF EXISTS "Allow inserting jobs" ON jobs;
DROP POLICY IF EXISTS "Allow updating jobs" ON jobs;
DROP POLICY IF EXISTS "Allow deleting jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated access" ON jobs;

DROP POLICY IF EXISTS "Allow reading job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Allow inserting job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Allow updating job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Allow deleting job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Allow authenticated access" ON job_secondary_workers;

-- Create simplified, permissive policies for all tables
-- Workers - single policy for all operations
CREATE POLICY "Allow authenticated access"
  ON workers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Jobs - single policy for all operations
CREATE POLICY "Allow authenticated access"
  ON jobs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Job Secondary Workers - single policy for all operations
CREATE POLICY "Allow authenticated access"
  ON job_secondary_workers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Make sure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_jobs_worker_id ON jobs(worker_id);
CREATE INDEX IF NOT EXISTS idx_jobs_start_date ON jobs(start_date);
CREATE INDEX IF NOT EXISTS idx_jobs_end_date ON jobs(end_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_worker_id ON job_secondary_workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_job_id ON job_secondary_workers(job_id);

-- Refresh the database statistics for query planning
ANALYZE workers;
ANALYZE jobs;
ANALYZE job_secondary_workers;