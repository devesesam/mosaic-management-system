-- Drop all existing policies first to avoid conflicts
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

-- Create clean policies for jobs table
CREATE POLICY "jobs_select_policy"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "jobs_insert_policy"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "jobs_update_policy"
  ON jobs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "jobs_delete_policy"
  ON jobs FOR DELETE
  TO authenticated
  USING (true);

-- Create clean policies for workers table
CREATE POLICY "workers_select_policy"
  ON workers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "workers_insert_policy"
  ON workers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "workers_update_policy"
  ON workers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "workers_delete_policy"
  ON workers FOR DELETE
  TO authenticated
  USING (true);