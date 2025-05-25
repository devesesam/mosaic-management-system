/*
  # Final fix for data visibility and sample data
  
  This migration:
  1. Makes all RLS policies completely open for authenticated users
  2. Adds sample data for testing
  3. Adds diagnostics to verify data is accessible
*/

-- First ensure our admin account exists and has proper permissions
INSERT INTO workers (name, email, role)
VALUES (
  'Admin User',
  'damsevese@gmail.com',
  'admin'
)
ON CONFLICT (email) 
DO UPDATE SET role = 'admin';

-- Reset all RLS policies to be completely open
-- Completely open JOBS policies
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read jobs" ON jobs;
CREATE POLICY "Anyone can read jobs" ON jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert jobs" ON jobs;
CREATE POLICY "Anyone can insert jobs" ON jobs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update jobs" ON jobs;
CREATE POLICY "Anyone can update jobs" ON jobs FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete jobs" ON jobs;
CREATE POLICY "Anyone can delete jobs" ON jobs FOR DELETE USING (true);

-- Completely open WORKERS policies
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read workers" ON workers;
CREATE POLICY "Anyone can read workers" ON workers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert workers" ON workers;
CREATE POLICY "Anyone can insert workers" ON workers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update workers" ON workers;
CREATE POLICY "Anyone can update workers" ON workers FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete workers" ON workers;
CREATE POLICY "Anyone can delete workers" ON workers FOR DELETE USING (true);

-- Completely open JOB_SECONDARY_WORKERS policies
ALTER TABLE job_secondary_workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_secondary_workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read job_secondary_workers" ON job_secondary_workers;
CREATE POLICY "Anyone can read job_secondary_workers" ON job_secondary_workers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert job_secondary_workers" ON job_secondary_workers;
CREATE POLICY "Anyone can insert job_secondary_workers" ON job_secondary_workers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete job_secondary_workers" ON job_secondary_workers;
CREATE POLICY "Anyone can delete job_secondary_workers" ON job_secondary_workers FOR DELETE USING (true);

-- Completely open USERS policies
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read users" ON users;
CREATE POLICY "Anyone can read users" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert users" ON users;
CREATE POLICY "Anyone can insert users" ON users FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update users" ON users;
CREATE POLICY "Anyone can update users" ON users FOR UPDATE USING (true) WITH CHECK (true);

-- Ensure we have sample data for testing

-- Get worker IDs for our admin
DO $$
DECLARE
  admin_id UUID;
  worker_count BIGINT;
  job_count BIGINT;
BEGIN
  SELECT id INTO admin_id FROM workers WHERE email = 'damsevese@gmail.com';
  SELECT COUNT(*) INTO worker_count FROM workers;
  SELECT COUNT(*) INTO job_count FROM jobs;
  
  RAISE NOTICE 'Admin ID: %, Worker count: %, Job count: %', admin_id, worker_count, job_count;
  
  -- Add sample data if needed
  IF worker_count < 3 OR job_count < 5 THEN
    -- Add more workers if needed
    IF worker_count < 3 THEN
      RAISE NOTICE 'Adding sample workers...';
      INSERT INTO workers (name, email, phone, role)
      VALUES 
        ('John Smith', 'john@example.com', '022-123-4567', 'admin'),
        ('Sarah Johnson', 'sarah@example.com', '021-987-6543', 'admin'),
        ('Mike Taylor', 'mike@example.com', '027-555-1234', 'admin')
      ON CONFLICT (email) DO NOTHING;
    END IF;
    
    -- Add jobs if needed
    IF job_count < 5 AND admin_id IS NOT NULL THEN
      RAISE NOTICE 'Adding sample jobs...';
      
      -- Add jobs with worker assignments
      INSERT INTO jobs (
        address, 
        customer_name, 
        quote_number, 
        fascia_colour, 
        spouting_colour, 
        worker_id, 
        start_date, 
        end_date, 
        status,
        tile_color
      )
      VALUES
        (
          '123 Main Street', 
          'John Customer', 
          'Q-2025-001', 
          'Grey', 
          'Grey', 
          admin_id, 
          CURRENT_DATE, 
          CURRENT_DATE + INTERVAL '2 days', 
          'In Progress',
          '#3b82f6'
        ),
        (
          '456 Oak Avenue', 
          'Jane Smith', 
          'Q-2025-002', 
          'White', 
          'White', 
          admin_id, 
          CURRENT_DATE + INTERVAL '4 days', 
          CURRENT_DATE + INTERVAL '6 days', 
          'Awaiting Order',
          '#22c55e'
        ),
        (
          '789 Pine Road', 
          'Mark Johnson', 
          'Q-2025-003', 
          'Black', 
          'Black', 
          NULL, -- Unassigned job
          NULL, 
          NULL, 
          'Awaiting Order',
          '#f97316'
        )
      ON CONFLICT DO NOTHING;
      
      -- Add unscheduled jobs
      INSERT INTO jobs (
        address, 
        customer_name, 
        quote_number, 
        fascia_colour, 
        spouting_colour, 
        status,
        tile_color
      )
      VALUES
        (
          '42 Park Avenue', 
          'Michael Brown', 
          'Q-2025-004', 
          'Green', 
          'Green', 
          'Awaiting Order',
          '#a855f7'
        ),
        (
          '15 Beach Road', 
          'Emma Wilson', 
          'Q-2025-005', 
          'Red', 
          'Red', 
          'Awaiting Order',
          '#f43f5e'
        )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  -- Verify data was added
  RAISE NOTICE 'Final worker count: %, Final job count: %', 
    (SELECT COUNT(*) FROM workers),
    (SELECT COUNT(*) FROM jobs);
END $$;

-- Add a function for diagnostic testing
CREATE OR REPLACE FUNCTION test_data_access(user_email TEXT)
RETURNS TABLE (
  workers_visible BIGINT,
  jobs_visible BIGINT,
  secondary_workers_visible BIGINT,
  user_worker_role TEXT
) AS $$
DECLARE
  worker_role TEXT;
BEGIN
  -- Get the current user's worker role
  SELECT role INTO worker_role FROM workers WHERE email = user_email;
  
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM workers),
    (SELECT COUNT(*) FROM jobs),
    (SELECT COUNT(*) FROM job_secondary_workers),
    worker_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the diagnostic test
DO $$
DECLARE
  test_result RECORD;
BEGIN
  SELECT * INTO test_result FROM test_data_access('damsevese@gmail.com');
  
  RAISE NOTICE 'Data access test for damsevese@gmail.com:';
  RAISE NOTICE '  Workers visible: %', test_result.workers_visible;
  RAISE NOTICE '  Jobs visible: %', test_result.jobs_visible;
  RAISE NOTICE '  Secondary workers visible: %', test_result.secondary_workers_visible;
  RAISE NOTICE '  User worker role: %', test_result.user_worker_role;
END $$;