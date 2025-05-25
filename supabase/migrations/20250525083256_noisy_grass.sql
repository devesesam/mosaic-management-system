/*
  # Complete Reset of Security and Data Access
  
  1. Security Changes
     - Disable RLS on all tables
     - Remove all existing policies
     - Clear any database conflicts
  
  2. Data Creation
     - Add sample test data directly visible to current user
     - Ensure worker record exists
*/

-- STEP 1: COMPLETELY DISABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_secondary_workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- STEP 2: REMOVE ALL EXISTING POLICIES
DROP POLICY IF EXISTS "jobs_delete_policy" ON jobs;
DROP POLICY IF EXISTS "jobs_insert_policy" ON jobs;
DROP POLICY IF EXISTS "jobs_update_policy" ON jobs;
DROP POLICY IF EXISTS "jobs_select_policy" ON jobs;
DROP POLICY IF EXISTS "Anyone can delete jobs" ON jobs;
DROP POLICY IF EXISTS "Anyone can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Anyone can update jobs" ON jobs;
DROP POLICY IF EXISTS "Anyone can read jobs" ON jobs;

DROP POLICY IF EXISTS "workers_delete_policy" ON workers;
DROP POLICY IF EXISTS "workers_insert_policy" ON workers;
DROP POLICY IF EXISTS "workers_update_policy" ON workers;
DROP POLICY IF EXISTS "workers_select_policy" ON workers;
DROP POLICY IF EXISTS "Anyone can delete workers" ON workers;
DROP POLICY IF EXISTS "Anyone can insert workers" ON workers;
DROP POLICY IF EXISTS "Anyone can update workers" ON workers;
DROP POLICY IF EXISTS "Anyone can read workers" ON workers;

DROP POLICY IF EXISTS "job_secondary_workers_delete_policy" ON job_secondary_workers;
DROP POLICY IF EXISTS "job_secondary_workers_insert_policy" ON job_secondary_workers;
DROP POLICY IF EXISTS "job_secondary_workers_select_policy" ON job_secondary_workers;
DROP POLICY IF EXISTS "Anyone can delete job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Anyone can insert job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Anyone can read job_secondary_workers" ON job_secondary_workers;

DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "Anyone can insert users" ON users;
DROP POLICY IF EXISTS "Anyone can update users" ON users;
DROP POLICY IF EXISTS "Anyone can read users" ON users;

-- STEP 3: ENSURE ADMIN USER EXISTS
INSERT INTO workers (name, email, role)
VALUES ('Admin User', 'damsevese@gmail.com', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- Get the worker ID for our admin user
DO $$
DECLARE
  admin_worker_id UUID;
BEGIN
  -- Get admin worker ID
  SELECT id INTO admin_worker_id FROM workers WHERE email = 'damsevese@gmail.com';

  -- STEP 4: ADD SAMPLE DATA THAT WILL DEFINITELY BE VISIBLE
  -- Add unassigned jobs
  INSERT INTO jobs (
    address,
    customer_name,
    quote_number,
    status,
    tile_color
  )
  VALUES
    ('123 Test Street', 'Test Customer 1', 'Q-2025-101', 'Awaiting Order', '#ef4444'),
    ('456 Sample Road', 'Test Customer 2', 'Q-2025-102', 'Awaiting Order', '#f97316')
  ON CONFLICT DO NOTHING;

  -- Add jobs assigned to our admin user
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
  VALUES
    (
      '789 Example Avenue', 
      'Test Customer 3', 
      'Q-2025-103', 
      admin_worker_id, 
      CURRENT_DATE, 
      CURRENT_DATE + INTERVAL '2 days', 
      'In Progress', 
      '#3b82f6'
    ),
    (
      '101 Demo Boulevard', 
      'Test Customer 4', 
      'Q-2025-104', 
      admin_worker_id, 
      CURRENT_DATE + INTERVAL '5 days', 
      CURRENT_DATE + INTERVAL '7 days', 
      'Awaiting Order', 
      '#22c55e'
    )
  ON CONFLICT DO NOTHING;
  
  -- Add another worker for testing
  INSERT INTO workers (name, email, role)
  VALUES ('Test Worker', 'testworker@example.com', 'admin')
  ON CONFLICT (email) DO NOTHING;
END $$;

-- STEP 5: ADD FUNCTION TO CHECK DATA ACCESS
CREATE OR REPLACE FUNCTION debug_data_access() 
RETURNS TABLE (
  jobs_count BIGINT,
  workers_count BIGINT,
  secondary_workers_count BIGINT,
  users_count BIGINT,
  sample_job JSON
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM jobs),
    (SELECT COUNT(*) FROM workers),
    (SELECT COUNT(*) FROM job_secondary_workers),
    (SELECT COUNT(*) FROM users),
    (SELECT row_to_json(j) FROM jobs j LIMIT 1);
END;
$$;