/*
  # Create workers and jobs tables with policies
  
  1. New Tables
    - workers: Stores worker information
    - jobs: Stores job details and scheduling information
    
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "auth_select_workers" ON workers;
DROP POLICY IF EXISTS "auth_insert_workers" ON workers;
DROP POLICY IF EXISTS "auth_update_workers" ON workers;
DROP POLICY IF EXISTS "auth_delete_workers" ON workers;

DROP POLICY IF EXISTS "auth_select_jobs" ON jobs;
DROP POLICY IF EXISTS "auth_insert_jobs" ON jobs;
DROP POLICY IF EXISTS "auth_update_jobs" ON jobs;
DROP POLICY IF EXISTS "auth_delete_jobs" ON jobs;

-- Create workers table
CREATE TABLE IF NOT EXISTS workers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text,
    phone text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on workers
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workers
CREATE POLICY "auth_select_workers" ON workers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_workers" ON workers
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_workers" ON workers
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_workers" ON workers
    FOR DELETE TO authenticated USING (true);

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
    worker_id uuid REFERENCES workers(id),
    start_date timestamptz,
    end_date timestamptz,
    status text NOT NULL DEFAULT 'Awaiting Order',
    tile_color text DEFAULT '#3b82f6',
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for jobs
CREATE POLICY "auth_select_jobs" ON jobs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_jobs" ON jobs
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_jobs" ON jobs
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_jobs" ON jobs
    FOR DELETE TO authenticated USING (true);