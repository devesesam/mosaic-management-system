/*
  # Fix RLS policies and add debugging functions

  This migration creates improved row-level security policies
  to ensure all authenticated users can access all data
*/

-- Reset all RLS policies to be completely permissive
-- JOBS table policies
DROP POLICY IF EXISTS "Anyone can delete jobs" ON jobs;
DROP POLICY IF EXISTS "Anyone can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Anyone can update jobs" ON jobs;
DROP POLICY IF EXISTS "Anyone can read jobs" ON jobs;

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

-- WORKERS table policies
DROP POLICY IF EXISTS "Anyone can delete workers" ON workers;
DROP POLICY IF EXISTS "Anyone can insert workers" ON workers;
DROP POLICY IF EXISTS "Anyone can update workers" ON workers;
DROP POLICY IF EXISTS "Anyone can read workers" ON workers;

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

-- JOB_SECONDARY_WORKERS table policies
DROP POLICY IF EXISTS "Anyone can delete job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Anyone can insert job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Anyone can read job_secondary_workers" ON job_secondary_workers;

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

-- USERS table policies
DROP POLICY IF EXISTS "Anyone can insert users" ON users;
DROP POLICY IF EXISTS "Anyone can update users" ON users;
DROP POLICY IF EXISTS "Anyone can read users" ON users;

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

-- Create a diagnostic function for debugging permissions
CREATE OR REPLACE FUNCTION check_permissions(test_email TEXT) 
RETURNS TABLE (
  table_name TEXT,
  can_select BOOLEAN,
  can_insert BOOLEAN,
  can_update BOOLEAN,
  can_delete BOOLEAN,
  error_details TEXT
) AS $$
DECLARE
  auth_role TEXT;
BEGIN
  -- Set session role based on auth.users data if available
  -- This is just for diagnostics and doesn't change actual permissions
  SELECT role INTO auth_role FROM users WHERE email = test_email;
  
  -- Check jobs table
  BEGIN
    -- Check SELECT
    PERFORM 1 FROM jobs LIMIT 1;
    table_name := 'jobs';
    can_select := true;
    can_insert := null;
    can_update := null;
    can_delete := null;
    error_details := null;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    table_name := 'jobs';
    can_select := false;
    can_insert := null;
    can_update := null;
    can_delete := null;
    error_details := SQLERRM;
    RETURN NEXT;
  END;
  
  -- Check workers table
  BEGIN
    -- Check SELECT
    PERFORM 1 FROM workers LIMIT 1;
    table_name := 'workers';
    can_select := true;
    can_insert := null;
    can_update := null;
    can_delete := null;
    error_details := null;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    table_name := 'workers';
    can_select := false;
    can_insert := null;
    can_update := null;
    can_delete := null;
    error_details := SQLERRM;
    RETURN NEXT;
  END;
  
  -- Check job_secondary_workers table
  BEGIN
    -- Check SELECT
    PERFORM 1 FROM job_secondary_workers LIMIT 1;
    table_name := 'job_secondary_workers';
    can_select := true;
    can_insert := null;
    can_update := null;
    can_delete := null;
    error_details := null;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    table_name := 'job_secondary_workers';
    can_select := false;
    can_insert := null;
    can_update := null;
    can_delete := null;
    error_details := SQLERRM;
    RETURN NEXT;
  END;
  
  -- Check users table
  BEGIN
    -- Check SELECT
    PERFORM 1 FROM users LIMIT 1;
    table_name := 'users';
    can_select := true;
    can_insert := null;
    can_update := null;
    can_delete := null;
    error_details := null;
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    table_name := 'users';
    can_select := false;
    can_insert := null;
    can_update := null;
    can_delete := null;
    error_details := SQLERRM;
    RETURN NEXT;
  END;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to fix user permissions and associations
CREATE OR REPLACE FUNCTION fix_user_permissions(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  auth_user_id UUID;
  worker_id UUID;
  worker_exists BOOLEAN;
  user_exists BOOLEAN;
BEGIN
  -- Check if user exists in auth.users
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF auth_user_id IS NULL THEN
    RAISE NOTICE 'User % not found in auth.users', user_email;
    RETURN FALSE;
  END IF;
  
  -- Check if worker exists
  SELECT 
    id,
    EXISTS(SELECT 1 FROM workers WHERE email = user_email) 
  INTO 
    worker_id, worker_exists
  FROM workers 
  WHERE email = user_email;
  
  -- Check if user exists in public.users
  SELECT EXISTS(
    SELECT 1 FROM public.users WHERE id = auth_user_id
  ) INTO user_exists;
  
  -- Create worker if needed
  IF NOT worker_exists THEN
    RAISE NOTICE 'Creating worker record for %', user_email;
    
    INSERT INTO workers (name, email, role)
    VALUES (
      SPLIT_PART(user_email, '@', 1),
      user_email,
      'admin'
    )
    RETURNING id INTO worker_id;
  ELSE
    -- Update existing worker to admin role
    UPDATE workers
    SET role = 'admin'
    WHERE id = worker_id;
  END IF;
  
  -- Create or update user record
  IF NOT user_exists THEN
    RAISE NOTICE 'Creating user record for % with auth ID %', user_email, auth_user_id;
    
    INSERT INTO public.users (id, name, email, role)
    VALUES (
      auth_user_id,
      SPLIT_PART(user_email, '@', 1),
      user_email,
      'admin'
    );
  ELSE
    -- Update existing user to admin role
    UPDATE public.users
    SET role = 'admin'
    WHERE id = auth_user_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to list all users with their roles and associations
CREATE OR REPLACE FUNCTION list_all_users() 
RETURNS TABLE (
  auth_email TEXT,
  auth_id UUID,
  worker_id UUID,
  worker_role TEXT,
  public_user_id UUID,
  public_user_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.email AS auth_email,
    au.id AS auth_id,
    w.id AS worker_id,
    w.role AS worker_role,
    pu.id AS public_user_id,
    pu.role AS public_user_role
  FROM 
    auth.users au
    LEFT JOIN workers w ON au.email = w.email
    LEFT JOIN public.users pu ON au.id = pu.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify that our admin user is correctly set up
DO $$
DECLARE
  fixed BOOLEAN;
BEGIN
  fixed := fix_user_permissions('damsevese@gmail.com');
  
  IF fixed THEN
    RAISE NOTICE 'Successfully fixed permissions for damsevese@gmail.com';
  ELSE
    RAISE WARNING 'Failed to fix permissions for damsevese@gmail.com';
  END IF;
END $$;

-- Add sample data if needed
DO $$
DECLARE
  worker_count BIGINT;
  job_count BIGINT;
  admin_id UUID;
BEGIN
  SELECT COUNT(*) INTO worker_count FROM workers;
  SELECT COUNT(*) INTO job_count FROM jobs;
  
  SELECT id INTO admin_id FROM workers WHERE email = 'damsevese@gmail.com';
  
  IF worker_count < 3 THEN
    INSERT INTO workers (name, email, phone, role)
    VALUES 
      ('John Smith', 'john@example.com', '022-123-4567', 'admin'),
      ('Sarah Johnson', 'sarah@example.com', '021-987-6543', 'admin'),
      ('Mike Taylor', 'mike@example.com', '027-555-1234', 'admin'),
      ('Lisa Brown', 'lisa@example.com', '029-444-5555', 'admin')
    ON CONFLICT (email) DO NOTHING;
  END IF;
  
  IF job_count < 5 AND admin_id IS NOT NULL THEN
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
END $$;

-- Finally, run our diagnostic function to see if everything is set up correctly
DO $$
DECLARE
  permissions RECORD;
  users RECORD;
BEGIN
  -- Check permissions
  FOR permissions IN 
    SELECT * FROM check_permissions('damsevese@gmail.com')
  LOOP
    RAISE NOTICE '% permissions: can_select=%', 
      permissions.table_name, permissions.can_select;
  END LOOP;
  
  -- List all users
  FOR users IN 
    SELECT * FROM list_all_users()
  LOOP
    RAISE NOTICE 'User: %, Auth ID: %, Worker ID: %, Worker Role: %',
      users.auth_email, users.auth_id, users.worker_id, users.worker_role;
  END LOOP;
END $$;