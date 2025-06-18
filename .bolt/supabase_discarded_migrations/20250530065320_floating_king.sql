-- Make sure RLS is enabled on all tables
ALTER TABLE IF EXISTS workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS job_secondary_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- Create standard policies for all tables using DO blocks to check if they exist first
DO $$
BEGIN
  -- Workers policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workers' AND policyname = 'Allow reading workers'
  ) THEN
    CREATE POLICY "Allow reading workers"
      ON workers
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workers' AND policyname = 'Allow inserting workers'
  ) THEN
    CREATE POLICY "Allow inserting workers"
      ON workers
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workers' AND policyname = 'Allow updating workers'
  ) THEN
    CREATE POLICY "Allow updating workers"
      ON workers
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workers' AND policyname = 'Allow deleting workers'
  ) THEN
    CREATE POLICY "Allow deleting workers"
      ON workers
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;

  -- Jobs policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Allow reading jobs'
  ) THEN
    CREATE POLICY "Allow reading jobs"
      ON jobs
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Allow inserting jobs'
  ) THEN
    CREATE POLICY "Allow inserting jobs"
      ON jobs
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Allow updating jobs'
  ) THEN
    CREATE POLICY "Allow updating jobs"
      ON jobs
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Allow deleting jobs'
  ) THEN
    CREATE POLICY "Allow deleting jobs"
      ON jobs
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;

  -- Job Secondary Workers policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_secondary_workers' AND policyname = 'Allow reading job_secondary_workers'
  ) THEN
    CREATE POLICY "Allow reading job_secondary_workers"
      ON job_secondary_workers
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_secondary_workers' AND policyname = 'Allow inserting job_secondary_workers'
  ) THEN
    CREATE POLICY "Allow inserting job_secondary_workers"
      ON job_secondary_workers
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_secondary_workers' AND policyname = 'Allow updating job_secondary_workers'
  ) THEN
    CREATE POLICY "Allow updating job_secondary_workers"
      ON job_secondary_workers
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_secondary_workers' AND policyname = 'Allow deleting job_secondary_workers'
  ) THEN
    CREATE POLICY "Allow deleting job_secondary_workers"
      ON job_secondary_workers
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END
$$;

-- Make sure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_jobs_worker_id ON jobs(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_worker_id ON job_secondary_workers(worker_id);