-- First ensure the email is properly set up in the workers table
INSERT INTO workers (name, email, role)
VALUES (
  'damsevese',
  'damsevese@gmail.com',
  'admin'
)
ON CONFLICT (email) 
DO UPDATE SET role = 'admin';

-- Update all RLS policies for all tables to allow full access to authenticated users

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

-- Create or update the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.workers (name, email, role)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    'admin'  -- Default all new users to admin role
  )
  ON CONFLICT (email) 
  DO UPDATE SET
    role = 'admin',
    name = COALESCE(workers.name, SPLIT_PART(NEW.email, '@', 1));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger already exists and drop it if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  END IF;
END
$$;

-- Create trigger to create worker profile when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();