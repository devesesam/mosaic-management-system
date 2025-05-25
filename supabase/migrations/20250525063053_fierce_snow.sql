/*
  # Update RLS policies for full visibility

  1. Changes
    - Update RLS policies to allow all authenticated users to see all data
    - Remove role restrictions on jobs and workers tables
    - Ensures that any authenticated user can view all workers and jobs
  
  2. Security
    - All authenticated users will now have admin-level read access
    - Authentication is still required
*/

-- Update job policies to allow all authenticated users to see all jobs
DROP POLICY IF EXISTS "Anyone can read jobs" ON jobs;
CREATE POLICY "Anyone can read jobs" ON jobs
  FOR SELECT
  TO authenticated
  USING (true);

-- Update worker policies to allow all authenticated users to see all workers
DROP POLICY IF EXISTS "Anyone can read workers" ON workers;
CREATE POLICY "Anyone can read workers" ON workers
  FOR SELECT
  TO authenticated
  USING (true);

-- Update job_secondary_workers policies
DROP POLICY IF EXISTS "auth_select_job_secondary_workers" ON job_secondary_workers;
CREATE POLICY "auth_select_job_secondary_workers" ON job_secondary_workers
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure all users are treated as admins regardless of their role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  -- Always return true for any authenticated user
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update users policies to allow all authenticated users to see all users
DROP POLICY IF EXISTS "Users can read themselves and admins can read all" ON users;
CREATE POLICY "All authenticated users can read all users" ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Make sure the admin account exists with admin role
INSERT INTO workers (name, email, role)
VALUES (
  'Admin User',
  'damsevese@gmail.com',
  'admin'
)
ON CONFLICT (email) 
DO UPDATE SET role = 'admin';

-- Add sample workers if none exist
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM workers) < 3 THEN
    INSERT INTO workers (name, email, phone, role)
    VALUES 
      ('John Smith', 'john@example.com', '022-123-4567', 'admin'),
      ('Sarah Johnson', 'sarah@example.com', '021-987-6543', 'viewer')
    ON CONFLICT (email) DO NOTHING;
  END IF;
END $$;

-- Add sample jobs if none exist
DO $$
DECLARE
  worker_id UUID;
BEGIN
  IF (SELECT COUNT(*) FROM jobs) < 2 THEN
    -- Get a worker ID to assign to jobs
    SELECT id INTO worker_id FROM workers LIMIT 1;
    
    -- Add some example jobs
    INSERT INTO jobs (
      address, 
      customer_name, 
      quote_number,
      worker_id,
      status,
      start_date,
      end_date
    )
    VALUES
      ('123 Main Street, Auckland', 'James Wilson', 'Q-2025-001', worker_id, 'In Progress', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days'),
      ('45 Beach Road, Wellington', 'Sarah Thompson', 'Q-2025-002', NULL, 'Awaiting Order', NULL, NULL)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;