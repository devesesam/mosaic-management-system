/*
  # Fix data visibility and add sample data

  1. Updates:
     - Modifies all RLS policies to ensure any authenticated user can view all data
     - Updates all INSERT, UPDATE, DELETE policies to allow all authenticated users full access
     - Removes role-based restrictions from all tables

  2. Sample Data:
     - Adds sample workers if none exist
     - Adds sample jobs if none exist
     - Associates jobs with workers
*/

-- First ensure the email is properly set up in the workers table
INSERT INTO workers (name, email, role)
VALUES (
  'damsevese',
  'damsevese@gmail.com',
  'admin'
)
ON CONFLICT (email) 
DO UPDATE SET role = 'admin';

-- Update all RLS policies for JOBS table
-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can delete jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can update jobs" ON jobs;
DROP POLICY IF EXISTS "Anyone can read jobs" ON jobs;

-- Create new permissive policies
CREATE POLICY "Anyone can delete jobs" ON jobs
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert jobs" ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update jobs" ON jobs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can read jobs" ON jobs
  FOR SELECT
  TO authenticated
  USING (true);

-- Update all RLS policies for WORKERS table
-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can delete workers" ON workers;
DROP POLICY IF EXISTS "Admins can insert workers" ON workers;
DROP POLICY IF EXISTS "Admins can update workers" ON workers;
DROP POLICY IF EXISTS "Anyone can read workers" ON workers;

-- Create new permissive policies
CREATE POLICY "Anyone can delete workers" ON workers
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert workers" ON workers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update workers" ON workers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can read workers" ON workers
  FOR SELECT
  TO authenticated
  USING (true);

-- Update all RLS policies for JOB_SECONDARY_WORKERS table
-- Drop existing policies first
DROP POLICY IF EXISTS "auth_delete_job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "auth_insert_job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "auth_select_job_secondary_workers" ON job_secondary_workers;

-- Create new permissive policies
CREATE POLICY "Anyone can delete job_secondary_workers" ON job_secondary_workers
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert job_secondary_workers" ON job_secondary_workers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read job_secondary_workers" ON job_secondary_workers
  FOR SELECT
  TO authenticated
  USING (true);

-- Update all RLS policies for USERS table
-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "All authenticated users can read all users" ON users;

-- Create new permissive policies
CREATE POLICY "Anyone can insert users" ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update users" ON users
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can read users" ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Add sample workers if none exist
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM workers) <= 1 THEN
    INSERT INTO workers (name, email, phone, role)
    VALUES 
      ('John Smith', 'john@example.com', '022-123-4567', 'admin'),
      ('Sarah Johnson', 'sarah@example.com', '021-987-6543', 'admin'),
      ('Mike Taylor', 'mike@example.com', '027-555-1234', 'admin'),
      ('Lisa Brown', 'lisa@example.com', '029-444-5555', 'admin')
    ON CONFLICT (email) DO NOTHING;
  END IF;
END $$;

-- Add sample jobs if none exist
DO $$
DECLARE
  worker_id UUID;
  worker2_id UUID;
  job1_id UUID;
  job2_id UUID;
BEGIN
  IF (SELECT COUNT(*) FROM jobs) < 2 THEN
    -- Get worker IDs
    SELECT id INTO worker_id FROM workers WHERE email = 'john@example.com';
    SELECT id INTO worker2_id FROM workers WHERE email = 'sarah@example.com';
    
    IF worker_id IS NULL THEN
      -- If specific worker not found, get any worker
      SELECT id INTO worker_id FROM workers LIMIT 1;
    END IF;
    
    -- Add scheduled jobs
    INSERT INTO jobs (
      address, 
      customer_name, 
      quote_number, 
      fascia_colour, 
      spouting_colour, 
      spouting_profile, 
      roof_colour, 
      roof_profile, 
      downpipe_size, 
      downpipe_colour, 
      notes, 
      worker_id, 
      start_date, 
      end_date, 
      status, 
      tile_color
    )
    VALUES
      (
        '123 Main Street, Wellington', 
        'James Wilson', 
        'Q-2025-001', 
        'Grey', 
        'Grey', 
        'Half Round', 
        'Colorsteel', 
        'Corrugate', 
        '80mm', 
        'Grey', 
        'Customer requested completion before end of month.', 
        worker_id, 
        (CURRENT_DATE)::TIMESTAMP, 
        (CURRENT_DATE + INTERVAL '2 days')::TIMESTAMP, 
        'In Progress', 
        '#22c55e'
      ) RETURNING id INTO job1_id;
      
    INSERT INTO jobs (
      address, 
      customer_name, 
      quote_number, 
      fascia_colour, 
      spouting_colour, 
      spouting_profile, 
      roof_colour, 
      roof_profile, 
      downpipe_size, 
      downpipe_colour, 
      notes, 
      status, 
      tile_color
    )
    VALUES
      (
        '45 Beach Road, Auckland', 
        'Sarah Thompson', 
        'Q-2025-002', 
        'White', 
        'White', 
        'Box', 
        'Colorsteel', 
        'Tray', 
        '65mm', 
        'White', 
        'New build, coordinate with building contractor.', 
        'Awaiting Order', 
        '#3b82f6'
      ) RETURNING id INTO job2_id;
      
    -- Add secondary workers to the first job if possible
    IF worker2_id IS NOT NULL AND job1_id IS NOT NULL THEN
      INSERT INTO job_secondary_workers (job_id, worker_id)
      VALUES (job1_id, worker2_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- Verify that our changes worked
DO $$
DECLARE
  worker_count INTEGER;
  job_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Count existing data
  SELECT COUNT(*) INTO worker_count FROM workers;
  SELECT COUNT(*) INTO job_count FROM jobs;
  
  -- Count policies to ensure they were created
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename IN ('jobs', 'workers', 'job_secondary_workers', 'users');
  
  RAISE NOTICE 'Verification results: % workers, % jobs, % policies', 
               worker_count, job_count, policy_count;
               
  -- Verify that our specific user exists
  IF NOT EXISTS (
    SELECT 1 FROM workers WHERE email = 'damsevese@gmail.com'
  ) THEN
    RAISE WARNING 'damsevese@gmail.com user not found in workers table!';
  END IF;
END $$;