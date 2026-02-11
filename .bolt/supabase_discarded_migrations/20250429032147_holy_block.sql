/*
  # Create initial schema for Tasman Roofing job scheduler
  
  1. New Tables
    - `workers` - Stores worker information
    - `jobs` - Stores job details including scheduling information
  
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
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'Awaiting Order',
  tile_color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read workers"
  ON workers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert workers"
  ON workers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update workers"
  ON workers
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (true);