/*
  # Add secondary workers support
  
  1. New Tables
    - `job_secondary_workers` - Junction table for jobs and their secondary workers
      - `job_id` (uuid, references jobs)
      - `worker_id` (uuid, references workers)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on new table
    - Add policies for authenticated users
*/

-- Create junction table for secondary workers
CREATE TABLE IF NOT EXISTS job_secondary_workers (
    job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
    worker_id uuid REFERENCES workers(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (job_id, worker_id)
);

-- Enable RLS
ALTER TABLE job_secondary_workers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "auth_select_job_secondary_workers" ON job_secondary_workers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_job_secondary_workers" ON job_secondary_workers
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "auth_delete_job_secondary_workers" ON job_secondary_workers
    FOR DELETE TO authenticated USING (true);