-- Drop existing policies
DROP POLICY IF EXISTS "Workers can read their own records" ON workers;
DROP POLICY IF EXISTS "Admins can insert workers" ON workers;
DROP POLICY IF EXISTS "Workers can update their own records" ON workers;
DROP POLICY IF EXISTS "Admins can delete workers" ON workers;

-- Create new unrestricted policies for workers
CREATE POLICY "Allow full access to workers"
  ON workers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create new unrestricted policies for jobs
DROP POLICY IF EXISTS "Allow authenticated users to read jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to insert jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to update jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to delete jobs" ON jobs;

CREATE POLICY "Allow full access to jobs"
  ON jobs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create new unrestricted policies for secondary workers
DROP POLICY IF EXISTS "Allow authenticated users to read job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Allow authenticated users to insert job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Allow authenticated users to update job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Allow authenticated users to delete job_secondary_workers" ON job_secondary_workers;

CREATE POLICY "Allow full access to job_secondary_workers"
  ON job_secondary_workers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant all permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;