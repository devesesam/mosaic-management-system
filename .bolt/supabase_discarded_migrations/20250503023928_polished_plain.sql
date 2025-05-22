/*
  # Fix RLS policies for jobs and workers tables

  1. Changes
    - Remove existing policies that may be causing conflicts
    - Create new policies using Supabase's built-in authenticated role
    - Ensure consistent policy naming and structure

  2. Security
    - Maintain RLS enabled on all tables
    - Use authenticated role for all policies
    - Ensure proper access control for CRUD operations
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON jobs;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON jobs;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON jobs;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON jobs;

DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON workers;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON workers;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON workers;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON workers;

-- Create new policies for jobs table
CREATE POLICY "Allow authenticated users to read jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (true);

-- Create new policies for workers table
CREATE POLICY "Allow authenticated users to read workers"
  ON workers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert workers"
  ON workers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update workers"
  ON workers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete workers"
  ON workers
  FOR DELETE
  TO authenticated
  USING (true);