/*
  # Complete Database Schema for Tasman Roofing Job Scheduler

  This migration creates the complete database schema for the roofing job scheduling application.

  ## 1. New Tables
    - `workers`
      - `id` (uuid, primary key)
      - `name` (text, required) - Worker's full name
      - `email` (text, unique, nullable) - Worker's email address
      - `phone` (text, nullable) - Worker's phone number
      - `role` (text, default 'admin') - Worker's role in the system
      - `created_at` (timestamptz) - Record creation timestamp

    - `jobs`
      - `id` (uuid, primary key)
      - `address` (text, required) - Job site address
      - `customer_name` (text, nullable) - Customer's name
      - `quote_number` (text, nullable) - Quote reference number
      - `fascia_colour` (text, nullable) - Fascia color specification
      - `spouting_colour` (text, nullable) - Spouting color specification
      - `spouting_profile` (text, nullable) - Spouting profile type
      - `roof_colour` (text, nullable) - Roof color specification
      - `roof_profile` (text, nullable) - Roof profile type
      - `downpipe_size` (text, nullable) - Downpipe size specification
      - `downpipe_colour` (text, nullable) - Downpipe color specification
      - `notes` (text, nullable) - Additional job notes
      - `worker_id` (uuid, nullable, foreign key) - Primary assigned worker
      - `start_date` (timestamptz, nullable) - Job start date and time
      - `end_date` (timestamptz, nullable) - Job end date and time
      - `status` (text, default 'Awaiting Order') - Current job status
      - `tile_color` (text, default '#3b82f6') - UI color for job tiles
      - `created_at` (timestamptz) - Record creation timestamp

    - `job_secondary_workers`
      - `id` (uuid, primary key)
      - `job_id` (uuid, foreign key) - Reference to jobs table
      - `worker_id` (uuid, foreign key) - Reference to workers table
      - `created_at` (timestamptz) - Record creation timestamp

  ## 2. Security
    - Enable RLS on all tables
    - Create permissive policies allowing all operations for all users
    - Set up proper foreign key constraints with cascade deletes

  ## 3. Functions
    - `test_connection()` - Simple function to test database connectivity

  ## 4. Indexes
    - Performance indexes on commonly queried columns
    - Unique constraints where appropriate

  ## 5. Data Integrity
    - Foreign key constraints with proper cascade behavior
    - Default values for required fields
    - Proper data types for all columns
*/

-- Create workers table
CREATE TABLE IF NOT EXISTS workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL,
  customer_name text,
  quote_number text,
  fascia_colour text,
  spouting_colour text,
  spouting_profile text,
  roof_colour text,
  roof_profile text,
  downpipe_size text,
  downpipe_colour text,
  notes text,
  worker_id uuid REFERENCES workers(id) ON DELETE SET NULL,
  start_date timestamptz,
  end_date timestamptz,
  status text DEFAULT 'Awaiting Order',
  tile_color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now()
);

-- Create job_secondary_workers junction table
CREATE TABLE IF NOT EXISTS job_secondary_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, worker_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_secondary_workers ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for workers table
CREATE POLICY "Allow all operations on workers"
  ON workers
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create permissive policies for jobs table
CREATE POLICY "Allow all operations on jobs"
  ON jobs
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create permissive policies for job_secondary_workers table
CREATE POLICY "Allow all operations on job_secondary_workers"
  ON job_secondary_workers
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_worker_id ON jobs(worker_id);
CREATE INDEX IF NOT EXISTS idx_jobs_start_date ON jobs(start_date);
CREATE INDEX IF NOT EXISTS idx_jobs_end_date ON jobs(end_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_workers_email ON workers(email);
CREATE INDEX IF NOT EXISTS idx_workers_name ON workers(name);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_job_id ON job_secondary_workers(job_id);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_worker_id ON job_secondary_workers(worker_id);

-- Create test connection function
CREATE OR REPLACE FUNCTION test_connection()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'Connection successful at ' || now()::text;
END;
$$;

-- Insert some sample data for testing (optional)
DO $$
BEGIN
  -- Only insert if tables are empty
  IF NOT EXISTS (SELECT 1 FROM workers LIMIT 1) THEN
    INSERT INTO workers (name, email, phone) VALUES
      ('John Smith', 'john.smith@example.com', '+64 21 123 4567'),
      ('Mike Johnson', 'mike.johnson@example.com', '+64 21 234 5678'),
      ('Sarah Williams', 'sarah.williams@example.com', '+64 21 345 6789');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM jobs LIMIT 1) THEN
    INSERT INTO jobs (address, customer_name, quote_number, status, tile_color) VALUES
      ('123 Main Street, Auckland', 'Robert Brown', 'Q2024-001', 'Awaiting Order', '#3b82f6'),
      ('456 Queen Street, Wellington', 'Lisa Davis', 'Q2024-002', 'Ordered', '#22c55e'),
      ('789 King Street, Christchurch', 'David Wilson', 'Q2024-003', 'In Progress', '#f59e0b');
  END IF;
END $$;