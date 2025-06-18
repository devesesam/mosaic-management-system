/*
  # Comprehensive schema setup with improved error handling
  
  1. Tables
    - workers - Store worker information with role support
    - jobs - Store job details and scheduling information
    - job_secondary_workers - Junction table for secondary workers assigned to jobs
  
  2. Security
    - Enable RLS on all tables
    - Add conditional policy creation to prevent conflicts
    - Create function for safely deleting workers
*/

-- Create workers table
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT workers_role_check CHECK (role IN ('admin', 'viewer'))
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  customer_name TEXT,
  quote_number TEXT,
  fascia_colour TEXT,
  spouting_colour TEXT,
  spouting_profile TEXT,
  roof_colour TEXT,
  roof_profile TEXT,
  downpipe_size TEXT,
  downpipe_colour TEXT,
  notes TEXT,
  worker_id UUID REFERENCES workers(id),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Awaiting Order',
  tile_color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create junction table for secondary workers
CREATE TABLE IF NOT EXISTS job_secondary_workers (
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (job_id, worker_id)
);

-- Enable Row Level Security
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_secondary_workers ENABLE ROW LEVEL SECURITY;

-- Create policies for jobs table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'auth_select_jobs'
  ) THEN
    CREATE POLICY "auth_select_jobs"
      ON jobs FOR SELECT
      TO authenticated
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'auth_insert_jobs'
  ) THEN
    CREATE POLICY "auth_insert_jobs"
      ON jobs FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'auth_update_jobs'
  ) THEN
    CREATE POLICY "auth_update_jobs"
      ON jobs FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'auth_delete_jobs'
  ) THEN
    CREATE POLICY "auth_delete_jobs"
      ON jobs FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END
$$;

-- Create policies for workers table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workers' AND policyname = 'auth_select_workers'
  ) THEN
    CREATE POLICY "auth_select_workers"
      ON workers FOR SELECT
      TO authenticated
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workers' AND policyname = 'auth_insert_workers'
  ) THEN
    CREATE POLICY "auth_insert_workers"
      ON workers FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workers' AND policyname = 'auth_update_workers'
  ) THEN
    CREATE POLICY "auth_update_workers"
      ON workers FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'workers' AND policyname = 'auth_delete_workers'
  ) THEN
    CREATE POLICY "auth_delete_workers"
      ON workers FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END
$$;

-- Create policies for job_secondary_workers table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_secondary_workers' AND policyname = 'auth_select_job_secondary_workers'
  ) THEN
    CREATE POLICY "auth_select_job_secondary_workers" 
      ON job_secondary_workers
      FOR SELECT TO authenticated 
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_secondary_workers' AND policyname = 'auth_insert_job_secondary_workers'
  ) THEN
    CREATE POLICY "auth_insert_job_secondary_workers" 
      ON job_secondary_workers
      FOR INSERT TO authenticated 
      WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'job_secondary_workers' AND policyname = 'auth_delete_job_secondary_workers'
  ) THEN
    CREATE POLICY "auth_delete_job_secondary_workers" 
      ON job_secondary_workers
      FOR DELETE TO authenticated 
      USING (true);
  END IF;
END
$$;

-- Create function to safely delete workers if it doesn't exist
CREATE OR REPLACE FUNCTION delete_worker_with_jobs(worker_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First update all jobs to remove the worker assignment
  UPDATE jobs
  SET worker_id = NULL
  WHERE jobs.worker_id = delete_worker_with_jobs.worker_id;

  -- Then delete the worker
  DELETE FROM workers
  WHERE workers.id = delete_worker_with_jobs.worker_id;

  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_worker_with_jobs TO authenticated;

-- Insert admin worker account
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM workers WHERE email = 'damsevese@gmail.com'
  ) THEN
    INSERT INTO workers (name, email, role)
    VALUES ('Admin', 'damsevese@gmail.com', 'admin');
  END IF;
END
$$;