/*
  # Remove user roles and simplify authentication
  
  1. Changes
    - Drop user_role enum type
    - Drop role column from auth.users
    - Drop role-related functions
    - Ensure policies only use 'authenticated' role
    
  2. Security
    - Maintain RLS enabled on all tables
    - Use only Supabase's built-in authenticated role
    - Keep existing CRUD operation policies
*/

-- Drop role-related functions if they exist
DROP FUNCTION IF EXISTS auth.is_admin();
DROP FUNCTION IF EXISTS auth.get_role();

-- Drop role column from auth.users if it exists
ALTER TABLE auth.users DROP COLUMN IF EXISTS role;

-- Drop user_role enum type
DROP TYPE IF EXISTS public.user_role;

-- Ensure RLS is enabled
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Recreate policies for jobs table
DROP POLICY IF EXISTS "Allow authenticated users to read jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to insert jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to update jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to delete jobs" ON jobs;

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

-- Recreate policies for workers table
DROP POLICY IF EXISTS "Allow authenticated users to read workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to insert workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to update workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to delete workers" ON workers;

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