/*
  # Final RLS policies cleanup
  
  1. Changes
    - Drop all existing policies
    - Create new simplified policies with consistent naming
    - Remove any remaining role-related objects
    
  2. Security
    - Enable RLS on all tables
    - Consistent policy naming scheme
    - Clean authentication rules
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "jobs_select_policy" ON jobs;
DROP POLICY IF EXISTS "jobs_insert_policy" ON jobs;
DROP POLICY IF EXISTS "jobs_update_policy" ON jobs;
DROP POLICY IF EXISTS "jobs_delete_policy" ON jobs;

DROP POLICY IF EXISTS "workers_select_policy" ON workers;
DROP POLICY IF EXISTS "workers_insert_policy" ON workers;
DROP POLICY IF EXISTS "workers_update_policy" ON workers;
DROP POLICY IF EXISTS "workers_delete_policy" ON workers;

DROP POLICY IF EXISTS "Allow authenticated users to read jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to insert jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to update jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated users to delete jobs" ON jobs;

DROP POLICY IF EXISTS "Allow authenticated users to read workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to insert workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to update workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to delete workers" ON workers;

-- Clean up any remaining role-related objects
DROP FUNCTION IF EXISTS auth.is_admin() CASCADE;
DROP FUNCTION IF EXISTS auth.get_role() CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Remove role column from auth.users if it exists
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

-- Ensure RLS is enabled
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Create final policies for jobs table
CREATE POLICY "auth_select_jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "auth_insert_jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "auth_update_jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "auth_delete_jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (true);

-- Create final policies for workers table
CREATE POLICY "auth_select_workers"
  ON workers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "auth_insert_workers"
  ON workers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "auth_update_workers"
  ON workers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "auth_delete_workers"
  ON workers FOR DELETE
  TO authenticated
  USING (true);