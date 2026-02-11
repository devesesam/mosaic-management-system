/*
  # Clean up schema and reset policies
  
  1. Changes
    - Drop all role-related objects
    - Reset policies to use only authenticated role
    - Clean up any remaining role references
    
  2. Security
    - Ensure RLS is properly configured
    - Maintain secure access control
*/

-- Drop any remaining role-related objects
DROP FUNCTION IF EXISTS auth.is_admin() CASCADE;
DROP FUNCTION IF EXISTS auth.get_role() CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Drop role column from auth.users if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE auth.users DROP COLUMN role;
  END IF;
END $$;

-- Reset policies for jobs table
DROP POLICY IF EXISTS "Allow authenticated users to read jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to insert jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to update jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to delete jobs" ON jobs;

CREATE POLICY "Allow authenticated users to read jobs"
  ON jobs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert jobs"
  ON jobs FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update jobs"
  ON jobs FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete jobs"
  ON jobs FOR DELETE TO authenticated
  USING (true);

-- Reset policies for workers table
DROP POLICY IF EXISTS "Allow authenticated users to read workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to insert workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to update workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to delete workers" ON workers;

CREATE POLICY "Allow authenticated users to read workers"
  ON workers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert workers"
  ON workers FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update workers"
  ON workers FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete workers"
  ON workers FOR DELETE TO authenticated
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;