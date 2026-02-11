/*
  # Reset database and authentication
  
  1. Changes
    - Clear existing data from tables
    - Remove all existing policies
    - Clean up role-related objects
    - Create new authentication policies
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Drop all existing data
TRUNCATE TABLE jobs CASCADE;
TRUNCATE TABLE workers CASCADE;

-- Drop all existing policies
DROP POLICY IF EXISTS "auth_select_jobs" ON jobs;
DROP POLICY IF EXISTS "auth_insert_jobs" ON jobs;
DROP POLICY IF EXISTS "auth_update_jobs" ON jobs;
DROP POLICY IF EXISTS "auth_delete_jobs" ON jobs;

DROP POLICY IF EXISTS "auth_select_workers" ON workers;
DROP POLICY IF EXISTS "auth_insert_workers" ON workers;
DROP POLICY IF EXISTS "auth_update_workers" ON workers;
DROP POLICY IF EXISTS "auth_delete_workers" ON workers;

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

-- Delete all users from auth.users
DELETE FROM auth.users;

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