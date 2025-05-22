/*
  # Initial schema setup for Tasman Roofing job scheduler
  
  1. New Tables
    - `workers` - Stores worker information
    - `jobs` - Stores job details and scheduling information
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create workers table
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
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

-- Enable Row Level Security
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for jobs table
CREATE POLICY "auth_select_jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "auth_insert_jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "auth_update_jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "auth_delete_jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (true);

-- Create policies for workers table
CREATE POLICY "auth_select_workers"
  ON workers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "auth_insert_workers"
  ON workers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "auth_update_workers"
  ON workers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "auth_delete_workers"
  ON workers FOR DELETE
  TO authenticated
  USING (true);

-- Create function to safely delete workers
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