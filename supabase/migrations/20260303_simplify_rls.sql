-- Migration: Simplify RLS - Remove admin-only restrictions
-- Created: 2026-03-03
-- Description: Allow all authenticated users to create/update/delete (no admin_users check)

-- ==================================================
-- 1. Drop admin-only policies on workers table
-- ==================================================
DROP POLICY IF EXISTS "Admins can create workers" ON workers;
DROP POLICY IF EXISTS "Admins can update workers" ON workers;
DROP POLICY IF EXISTS "Admins can delete workers" ON workers;

-- Create permissive policies for all authenticated users
CREATE POLICY "Authenticated users can create workers"
  ON workers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update workers"
  ON workers FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete workers"
  ON workers FOR DELETE
  TO authenticated
  USING (true);

-- ==================================================
-- 2. Drop admin-only policies on jobs table
-- ==================================================
DROP POLICY IF EXISTS "Admins can create jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can update jobs" ON jobs;
DROP POLICY IF EXISTS "Admins can delete jobs" ON jobs;

-- Create permissive policies for all authenticated users
CREATE POLICY "Authenticated users can create jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (true);

-- ==================================================
-- 3. Drop admin-only policy on job_secondary_workers table
-- ==================================================
DROP POLICY IF EXISTS "Admins can manage job assignments" ON job_secondary_workers;

-- Create permissive policies for all authenticated users
CREATE POLICY "Authenticated users can create job assignments"
  ON job_secondary_workers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update job assignments"
  ON job_secondary_workers FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete job assignments"
  ON job_secondary_workers FOR DELETE
  TO authenticated
  USING (true);

-- ==================================================
-- Note: The admin_users table is kept for now but no longer
-- used for permission checks. It can be dropped in a future
-- migration if not needed for other purposes.
-- ==================================================
