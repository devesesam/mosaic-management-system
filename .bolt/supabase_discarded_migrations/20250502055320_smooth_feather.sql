/*
  # Fix role policies for jobs and workers tables

  1. Changes
    - Drop and recreate policies to ensure they use correct roles
    - Ensure RLS is enabled on both tables
  
  2. Security
    - Policies use 'authenticated' role instead of 'admin'
    - Maintain existing CRUD operations
*/

-- Ensure RLS is enabled
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Recreate policies for jobs table
DROP POLICY IF EXISTS "Authenticated users can read jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can delete jobs" ON jobs;

CREATE POLICY "Authenticated users can read jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (true);

-- Recreate policies for workers table
DROP POLICY IF EXISTS "Authenticated users can read workers" ON workers;
DROP POLICY IF EXISTS "Authenticated users can insert workers" ON workers;
DROP POLICY IF EXISTS "Authenticated users can update workers" ON workers;
DROP POLICY IF EXISTS "Authenticated users can delete workers" ON workers;

CREATE POLICY "Authenticated users can read workers"
  ON workers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert workers"
  ON workers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update workers"
  ON workers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete workers"
  ON workers
  FOR DELETE
  TO authenticated
  USING (true);