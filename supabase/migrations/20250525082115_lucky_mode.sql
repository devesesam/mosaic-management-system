/*
  # Complete reset of data access permissions
  
  1. Changes:
    - Reset all RLS policies
    - Add diagnostic functions
    - Ensure admin user exists
    - Add sample data for testing
*/

-- First ensure the admin account exists
INSERT INTO workers (name, email, role)
VALUES (
  'Admin User',
  'damsevese@gmail.com',
  'admin'
)
ON CONFLICT (email) 
DO UPDATE SET role = 'admin';

-- Get the auth.users ID for the admin user
DO $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Get the ID from auth.users
  SELECT id INTO auth_user_id FROM auth.users WHERE email = 'damsevese@gmail.com';
  
  IF auth_user_id IS NULL THEN
    RAISE NOTICE 'User damsevese@gmail.com not found in auth.users!';
  ELSE
    RAISE NOTICE 'Found auth user with ID: %', auth_user_id;
    
    -- Create/update the corresponding record in public.users
    INSERT INTO public.users (id, name, email, role, created_at)
    VALUES (
      auth_user_id,
      'Admin User', 
      'damsevese@gmail.com', 
      'admin',
      now()
    )
    ON CONFLICT (id)
    DO UPDATE SET 
      role = 'admin',
      name = COALESCE(users.name, 'Admin User');
  END IF;
END $$;

-- COMPLETELY RESET ROW LEVEL SECURITY FOR ALL TABLES

-- First, disable RLS on all tables
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_secondary_workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Then re-enable RLS on all tables
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_secondary_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Remove all existing policies
DROP POLICY IF EXISTS "Anyone can read jobs" ON jobs;
DROP POLICY IF EXISTS "Anyone can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Anyone can update jobs" ON jobs;
DROP POLICY IF EXISTS "Anyone can delete jobs" ON jobs;

DROP POLICY IF EXISTS "Anyone can read workers" ON workers;
DROP POLICY IF EXISTS "Anyone can insert workers" ON workers;
DROP POLICY IF EXISTS "Anyone can update workers" ON workers;
DROP POLICY IF EXISTS "Anyone can delete workers" ON workers;

DROP POLICY IF EXISTS "Anyone can read job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Anyone can insert job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Anyone can delete job_secondary_workers" ON job_secondary_workers;

DROP POLICY IF EXISTS "Anyone can read users" ON users;
DROP POLICY IF EXISTS "Anyone can insert users" ON users;
DROP POLICY IF EXISTS "Anyone can update users" ON users;

-- Create new, extremely permissive policies for all tables
-- JOBS table
CREATE POLICY "jobs_select_policy" ON jobs
  FOR SELECT USING (true);

CREATE POLICY "jobs_insert_policy" ON jobs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "jobs_update_policy" ON jobs
  FOR UPDATE USING (true) WITH CHECK (true);
  
CREATE POLICY "jobs_delete_policy" ON jobs
  FOR DELETE USING (true);

-- WORKERS table
CREATE POLICY "workers_select_policy" ON workers
  FOR SELECT USING (true);
  
CREATE POLICY "workers_insert_policy" ON workers
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "workers_update_policy" ON workers
  FOR UPDATE USING (true) WITH CHECK (true);
  
CREATE POLICY "workers_delete_policy" ON workers
  FOR DELETE USING (true);

-- JOB_SECONDARY_WORKERS table
CREATE POLICY "job_secondary_workers_select_policy" ON job_secondary_workers
  FOR SELECT USING (true);
  
CREATE POLICY "job_secondary_workers_insert_policy" ON job_secondary_workers
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "job_secondary_workers_delete_policy" ON job_secondary_workers
  FOR DELETE USING (true);

-- USERS table
CREATE POLICY "users_select_policy" ON users
  FOR SELECT USING (true);
  
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "users_update_policy" ON users
  FOR UPDATE USING (true) WITH CHECK (true);

-- Add sample data for testing
DO $$
DECLARE
  worker_count INTEGER;
  job_count INTEGER;
  admin_worker_id UUID;
BEGIN
  -- Get existing record counts
  SELECT COUNT(*)::integer INTO worker_count FROM workers;
  SELECT COUNT(*)::integer INTO job_count FROM jobs;
  
  -- Get admin worker ID
  SELECT id INTO admin_worker_id FROM workers WHERE email = 'damsevese@gmail.com';
  
  RAISE NOTICE 'Current data: Workers: %, Jobs: %, Admin ID: %', 
    worker_count, job_count, admin_worker_id;
    
  -- If we have no admin worker ID, stop
  IF admin_worker_id IS NULL THEN
    RAISE EXCEPTION 'Cannot add sample data: No admin worker found';
  END IF;
  
  -- If we have no data, add sample data
  IF worker_count <= 1 OR job_count = 0 THEN
    -- Add workers if needed
    IF worker_count <= 1 THEN
      RAISE NOTICE 'Adding sample workers...';
      INSERT INTO workers (name, email, phone, role)
      VALUES 
        ('John Smith', 'john@example.com', '022-123-4567', 'admin'),
        ('Sarah Johnson', 'sarah@example.com', '021-987-6543', 'admin'),
        ('Mike Taylor', 'mike@example.com', '027-555-1234', 'admin')
      ON CONFLICT (email) DO NOTHING;
    END IF;
    
    -- Add jobs if we don't have any
    IF job_count = 0 THEN
      RAISE NOTICE 'Adding sample jobs...';
      
      -- Add jobs with the admin worker
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
          admin_worker_id, 
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
          admin_worker_id, 
          CURRENT_DATE + INTERVAL '4 days', 
          CURRENT_DATE + INTERVAL '6 days', 
          'Awaiting Order',
          '#22c55e'
        );
        
      -- Add unassigned job
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
          '789 Pine Road', 
          'Mark Johnson', 
          'Q-2025-003', 
          'Black', 
          'Black', 
          'Awaiting Order',
          '#f97316'
        );
    END IF;
  END IF;
  
  -- Log final record counts
  RAISE NOTICE 'Final data counts: Workers: %, Jobs: %', 
    (SELECT COUNT(*) FROM workers), 
    (SELECT COUNT(*) FROM jobs);
END $$;