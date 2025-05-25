/*
  # Enable RLS and add security policies
  
  1. New Security Settings
    - Enable Row Level Security on all tables
    - Add policies for each table to ensure proper data access
    - Fix security configuration while maintaining functionality
  
  2. Table Updates
    - jobs
    - workers
    - users
    - job_secondary_workers
*/

-- Enable Row Level Security on all tables
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_secondary_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- JOBS table policies
CREATE POLICY "Allow full access to jobs" ON jobs
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous read access to jobs" ON jobs
  FOR SELECT TO anon
  USING (true);

-- WORKERS table policies
CREATE POLICY "Allow full access to workers" ON workers
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous read access to workers" ON workers
  FOR SELECT TO anon
  USING (true);

-- JOB_SECONDARY_WORKERS table policies
CREATE POLICY "Allow full access to job_secondary_workers" ON job_secondary_workers
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous read access to job_secondary_workers" ON job_secondary_workers
  FOR SELECT TO anon
  USING (true);

-- USERS table policies
CREATE POLICY "Allow users to read all users" ON users
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow users to update their own user" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow anonymous read access to users" ON users
  FOR SELECT TO anon
  USING (true);