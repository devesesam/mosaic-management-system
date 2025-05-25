/*
  # Fix Workers Visibility

  1. Security Changes
    - Temporarily disable RLS on all tables to ensure data visibility
    - Re-enable RLS with proper policies
    - Reset all existing policies
  
  2. Worker Data
    - Create test workers if none exist
    - Ensure worker for current user exists
*/

-- TEMPORARILY DISABLE RLS ON ALL TABLES
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_secondary_workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- RESET ALL POLICIES
-- Remove all existing policies from tables
DROP POLICY IF EXISTS "Allow full access to jobs" ON jobs;
DROP POLICY IF EXISTS "Allow anonymous read access to jobs" ON jobs;
DROP POLICY IF EXISTS "Allow full access to workers" ON workers;
DROP POLICY IF EXISTS "Allow anonymous read access to workers" ON workers;
DROP POLICY IF EXISTS "Allow full access to job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Allow anonymous read access to job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Allow users to read all users" ON users;
DROP POLICY IF EXISTS "Allow users to update their own user" ON users;
DROP POLICY IF EXISTS "Allow anonymous read access to users" ON users;

-- ENSURE WORKERS TABLE HAS DATA
-- Check if workers table is empty and create test workers if needed
DO $$
DECLARE
  worker_count INTEGER;
  admin_id UUID;
BEGIN
  -- Count existing workers
  SELECT COUNT(*) INTO worker_count FROM workers;
  
  -- If no workers exist, create some test workers
  IF worker_count = 0 THEN
    INSERT INTO workers (name, email, role)
    VALUES 
      ('John Smith', 'john@example.com', 'admin'),
      ('Mike Johnson', 'mike@example.com', 'admin'),
      ('Sarah Williams', 'sarah@example.com', 'viewer'),
      ('Admin User', 'admin@tasman.com', 'admin');
  END IF;
  
  -- Always ensure the test admin user exists
  INSERT INTO workers (name, email, role)
  VALUES ('Admin User', 'admin@tasman.com', 'admin')
  ON CONFLICT (email) DO UPDATE SET role = 'admin'
  RETURNING id INTO admin_id;
  
  -- Add some test jobs for the admin
  IF admin_id IS NOT NULL THEN
    INSERT INTO jobs (
      address, 
      customer_name, 
      quote_number, 
      worker_id, 
      start_date, 
      end_date, 
      status, 
      tile_color
    )
    VALUES (
      '100 Admin Street',
      'Tasman Customer',
      'TSM-2025-001',
      admin_id,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '2 days',
      'In Progress',
      '#3b82f6'
    )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- RE-ENABLE RLS WITH PROPER POLICIES
-- JOBS table
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to jobs" ON jobs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous read access to jobs" ON jobs
  FOR SELECT TO anon
  USING (true);

-- WORKERS table
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to workers" ON workers
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous read access to workers" ON workers
  FOR SELECT TO anon
  USING (true);

-- JOB_SECONDARY_WORKERS table
ALTER TABLE job_secondary_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to job_secondary_workers" ON job_secondary_workers
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous read access to job_secondary_workers" ON job_secondary_workers
  FOR SELECT TO anon
  USING (true);

-- USERS table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow users to read all users" ON users
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow users to update their own user" ON users
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Allow anonymous read access to users" ON users
  FOR SELECT TO anon
  USING (true);

-- Create a diagnostic function to check data visibility
CREATE OR REPLACE FUNCTION public.check_data_visibility()
RETURNS TABLE (
  table_name TEXT,
  record_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 'workers'::TEXT, COUNT(*)::BIGINT FROM workers
  UNION ALL
  SELECT 'jobs'::TEXT, COUNT(*)::BIGINT FROM jobs
  UNION ALL
  SELECT 'job_secondary_workers'::TEXT, COUNT(*)::BIGINT FROM job_secondary_workers
  UNION ALL
  SELECT 'users'::TEXT, COUNT(*)::BIGINT FROM users;
END;
$$;