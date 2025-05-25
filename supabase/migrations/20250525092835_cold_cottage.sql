/*
  # Remove all role permissions and RLS

  1. Changes:
     - Permanently disables Row Level Security on all tables
     - Removes all existing security policies
     - Updates all workers and users to have 'admin' role first
     - Then modifies constraints to only allow 'admin' role
     - Creates sample workers if none exist

  2. Security:
     - Completely removes all security policies
     - Makes all users admins with full access to all data
*/

-- First, update all existing workers and users to be admins
-- This must happen BEFORE we modify the constraints
UPDATE workers SET role = 'admin';
UPDATE users SET role = 'admin';

-- PERMANENTLY DISABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE job_secondary_workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- REMOVE ALL EXISTING POLICIES
DROP POLICY IF EXISTS "Allow full access to jobs" ON jobs;
DROP POLICY IF EXISTS "Allow anonymous read access to jobs" ON jobs;
DROP POLICY IF EXISTS "jobs_delete_policy" ON jobs;
DROP POLICY IF EXISTS "jobs_insert_policy" ON jobs;
DROP POLICY IF EXISTS "jobs_update_policy" ON jobs;
DROP POLICY IF EXISTS "jobs_select_policy" ON jobs;
DROP POLICY IF EXISTS "Anyone can delete jobs" ON jobs;
DROP POLICY IF EXISTS "Anyone can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Anyone can update jobs" ON jobs;
DROP POLICY IF EXISTS "Anyone can read jobs" ON jobs;

DROP POLICY IF EXISTS "Allow full access to workers" ON workers;
DROP POLICY IF EXISTS "Allow anonymous read access to workers" ON workers;
DROP POLICY IF EXISTS "workers_delete_policy" ON workers;
DROP POLICY IF EXISTS "workers_insert_policy" ON workers;
DROP POLICY IF EXISTS "workers_update_policy" ON workers;
DROP POLICY IF EXISTS "workers_select_policy" ON workers;
DROP POLICY IF EXISTS "Anyone can delete workers" ON workers;
DROP POLICY IF EXISTS "Anyone can insert workers" ON workers;
DROP POLICY IF EXISTS "Anyone can update workers" ON workers;
DROP POLICY IF EXISTS "Anyone can read workers" ON workers;
DROP POLICY IF EXISTS "Everyone can see all workers" ON workers;
DROP POLICY IF EXISTS "Authenticated users can modify workers" ON workers;

DROP POLICY IF EXISTS "Allow full access to job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Allow anonymous read access to job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "job_secondary_workers_delete_policy" ON job_secondary_workers;
DROP POLICY IF EXISTS "job_secondary_workers_insert_policy" ON job_secondary_workers;
DROP POLICY IF EXISTS "job_secondary_workers_select_policy" ON job_secondary_workers;
DROP POLICY IF EXISTS "Anyone can delete job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Anyone can insert job_secondary_workers" ON job_secondary_workers;
DROP POLICY IF EXISTS "Anyone can read job_secondary_workers" ON job_secondary_workers;

DROP POLICY IF EXISTS "Allow users to read all users" ON users;
DROP POLICY IF EXISTS "Allow users to update their own user" ON users;
DROP POLICY IF EXISTS "Allow anonymous read access to users" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "Anyone can insert users" ON users;
DROP POLICY IF EXISTS "Anyone can update users" ON users;
DROP POLICY IF EXISTS "Anyone can read users" ON users;

-- Now it's safe to modify role constraints since all data conforms
-- MODIFY ROLE CONSTRAINTS TO MAKE ALL USERS ADMINS
-- Remove role check constraint from users table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_role_check' AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;
END $$;

-- Re-add constraint that only allows 'admin' role
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role = 'admin');

-- Remove role check constraint from workers table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'workers_role_check' AND conrelid = 'workers'::regclass
  ) THEN
    ALTER TABLE workers DROP CONSTRAINT workers_role_check;
  END IF;
END $$;

-- Re-add constraint that only allows 'admin' role
ALTER TABLE workers ADD CONSTRAINT workers_role_check
  CHECK (role = 'admin');

-- Verify that we have at least some workers in the system
DO $$
DECLARE
  worker_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO worker_count FROM workers;
  
  -- If no workers exist, create some test workers
  IF worker_count = 0 THEN
    INSERT INTO workers (name, email, role)
    VALUES 
      ('John Smith', 'john@example.com', 'admin'),
      ('Mike Johnson', 'mike@example.com', 'admin'),
      ('Sarah Williams', 'sarah@example.com', 'admin');
  END IF;
END $$;