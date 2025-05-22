/*
  # Fix RLS policies for jobs and workers tables

  1. Changes
    - Drop existing policies that reference non-existent roles
    - Create new policies using the 'authenticated' role
    - Ensure RLS is enabled on both tables
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to perform CRUD operations
*/

-- Drop existing policies for jobs table
DROP POLICY IF EXISTS "Authenticated users can delete jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can read jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON jobs;

-- Create new policies for jobs table
CREATE POLICY "Enable read access for authenticated users" ON jobs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON jobs
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON jobs
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON jobs
  FOR DELETE TO authenticated
  USING (true);

-- Drop existing policies for workers table
DROP POLICY IF EXISTS "Authenticated users can delete workers" ON workers;
DROP POLICY IF EXISTS "Authenticated users can insert workers" ON workers;
DROP POLICY IF EXISTS "Authenticated users can read workers" ON workers;
DROP POLICY IF EXISTS "Authenticated users can update workers" ON workers;

-- Create new policies for workers table
CREATE POLICY "Enable read access for authenticated users" ON workers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON workers
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users" ON workers
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete access for authenticated users" ON workers
  FOR DELETE TO authenticated
  USING (true);

-- Ensure RLS is enabled on both tables
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;