/*
  # Remove custom roles and revert to standard authentication
  
  1. Changes
    - Drop custom role type and related functions
    - Remove role column from auth.users
    - Clean up any remaining role-related objects
    
  2. Security
    - Maintain standard Supabase authentication
    - Keep existing RLS policies for authenticated users
*/

-- Drop role-related functions if they exist
DROP FUNCTION IF EXISTS auth.is_admin();
DROP FUNCTION IF EXISTS auth.get_role();

-- Drop role column from auth.users if it exists
ALTER TABLE auth.users DROP COLUMN IF EXISTS role;

-- Drop the user_role type
DROP TYPE IF EXISTS public.user_role;

-- Ensure RLS is enabled
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Recreate clean policies for jobs
DROP POLICY IF EXISTS "Allow authenticated users to read jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to insert jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to update jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to delete jobs" ON jobs;

CREATE POLICY "Allow authenticated users to read jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (true);

-- Recreate clean policies for workers
DROP POLICY IF EXISTS "Allow authenticated users to read workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to insert workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to update workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to delete workers" ON workers;

CREATE POLICY "Allow authenticated users to read workers"
  ON workers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert workers"
  ON workers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update workers"
  ON workers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete workers"
  ON workers FOR DELETE
  TO authenticated
  USING (true);