-- Migration: Tighten RLS Policies for Better Security
-- Created: 2026-02-11
-- Description: Create admin_users table and add proper RLS policies

-- ==================================================
-- 1. Create admin_users table for role management
-- ==================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users table is read-only for all authenticated users
CREATE POLICY "Authenticated users can view admin list"
  ON admin_users FOR SELECT
  TO authenticated
  USING (true);

-- Only existing admins can manage the admin list
CREATE POLICY "Only admins can manage admin list"
  ON admin_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt()->>'email'
    )
  );

-- ==================================================
-- 2. Seed initial admin users
-- ==================================================
INSERT INTO admin_users (email) VALUES
  ('damsevese@gmail.com'),
  ('nick@roofingtasman.co.nz'),
  ('henry@roofingtasman.co.nz')
ON CONFLICT (email) DO NOTHING;

-- ==================================================
-- 3. Update workers table RLS policies
-- ==================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on workers" ON workers;

-- Authenticated users can view all workers
CREATE POLICY "Authenticated users can view workers"
  ON workers FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create workers
CREATE POLICY "Admins can create workers"
  ON workers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt()->>'email'
    )
  );

-- Only admins can update workers
CREATE POLICY "Admins can update workers"
  ON workers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt()->>'email'
    )
  );

-- Only admins can delete workers
CREATE POLICY "Admins can delete workers"
  ON workers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt()->>'email'
    )
  );

-- ==================================================
-- 4. Update jobs table RLS policies
-- ==================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on jobs" ON jobs;

-- Authenticated users can view all jobs
CREATE POLICY "Authenticated users can view jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create jobs
CREATE POLICY "Admins can create jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt()->>'email'
    )
  );

-- Only admins can update jobs
CREATE POLICY "Admins can update jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt()->>'email'
    )
  );

-- Only admins can delete jobs
CREATE POLICY "Admins can delete jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt()->>'email'
    )
  );

-- ==================================================
-- 5. Update job_secondary_workers table RLS policies
-- ==================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on job_secondary_workers" ON job_secondary_workers;

-- Authenticated users can view all job assignments
CREATE POLICY "Authenticated users can view job assignments"
  ON job_secondary_workers FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage job assignments
CREATE POLICY "Admins can manage job assignments"
  ON job_secondary_workers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt()->>'email'
    )
  );

-- ==================================================
-- Note: This migration requires that Edge Functions
-- properly pass the user's JWT for authentication.
-- The anon key will no longer work for write operations.
-- ==================================================
