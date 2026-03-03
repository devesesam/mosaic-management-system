/*
  # Refactor Jobs to Tasks - Database Migration

  This migration converts the roofing job scheduler schema to a generic task scheduler.

  ## Changes
  1. Rename `jobs` table to `tasks`
  2. Rename `job_secondary_workers` table to `task_secondary_workers`
  3. Rename `address` column to `name` (generic task name instead of job address)
  4. Rename `job_id` foreign key to `task_id`
  5. Drop roofing-specific columns (customer_name, quote_number, fascia_colour, etc.)
  6. Migrate status values to simplified set
  7. Update indexes and RLS policies

  ## New Status Values
  - 'Not Started' (from: Awaiting Order, Ordered)
  - 'In Progress' (from: In Progress, Urgent)
  - 'On Hold' (from: Held Up)
  - 'Completed' (from: Complete, Invoiced, Closed)
*/

-- Step 1: Rename tables
ALTER TABLE IF EXISTS jobs RENAME TO tasks;
ALTER TABLE IF EXISTS job_secondary_workers RENAME TO task_secondary_workers;

-- Step 2: Rename columns
ALTER TABLE tasks RENAME COLUMN address TO name;
ALTER TABLE task_secondary_workers RENAME COLUMN job_id TO task_id;

-- Step 3: Drop roofing-specific columns
ALTER TABLE tasks DROP COLUMN IF EXISTS customer_name;
ALTER TABLE tasks DROP COLUMN IF EXISTS quote_number;
ALTER TABLE tasks DROP COLUMN IF EXISTS fascia_colour;
ALTER TABLE tasks DROP COLUMN IF EXISTS spouting_colour;
ALTER TABLE tasks DROP COLUMN IF EXISTS spouting_profile;
ALTER TABLE tasks DROP COLUMN IF EXISTS roof_colour;
ALTER TABLE tasks DROP COLUMN IF EXISTS roof_profile;
ALTER TABLE tasks DROP COLUMN IF EXISTS downpipe_size;
ALTER TABLE tasks DROP COLUMN IF EXISTS downpipe_colour;

-- Step 4: Migrate status values to simplified set
UPDATE tasks SET status = 'Not Started' WHERE status IN ('Awaiting Order', 'Ordered');
UPDATE tasks SET status = 'In Progress' WHERE status IN ('In Progress', 'Urgent');
UPDATE tasks SET status = 'On Hold' WHERE status = 'Held Up';
UPDATE tasks SET status = 'Completed' WHERE status IN ('Complete', 'Invoiced', 'Closed');

-- Ensure any remaining unknown statuses default to 'Not Started'
UPDATE tasks SET status = 'Not Started' WHERE status NOT IN ('Not Started', 'In Progress', 'On Hold', 'Completed');

-- Step 5: Update default status value
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'Not Started';

-- Step 6: Drop old indexes and create new ones
DROP INDEX IF EXISTS idx_jobs_worker_id;
DROP INDEX IF EXISTS idx_jobs_start_date;
DROP INDEX IF EXISTS idx_jobs_end_date;
DROP INDEX IF EXISTS idx_jobs_status;
DROP INDEX IF EXISTS idx_jobs_created_at;
DROP INDEX IF EXISTS idx_job_secondary_workers_job_id;
DROP INDEX IF EXISTS idx_job_secondary_workers_worker_id;

CREATE INDEX IF NOT EXISTS idx_tasks_worker_id ON tasks(worker_id);
CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
CREATE INDEX IF NOT EXISTS idx_tasks_end_date ON tasks(end_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_name ON tasks(name);
CREATE INDEX IF NOT EXISTS idx_task_secondary_workers_task_id ON task_secondary_workers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_secondary_workers_worker_id ON task_secondary_workers(worker_id);

-- Step 7: Update RLS policies
DROP POLICY IF EXISTS "Allow all operations on jobs" ON tasks;
DROP POLICY IF EXISTS "Allow all operations on job_secondary_workers" ON task_secondary_workers;

CREATE POLICY "Allow all operations on tasks"
  ON tasks
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on task_secondary_workers"
  ON task_secondary_workers
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Step 8: Update unique constraint name (if exists)
ALTER TABLE task_secondary_workers
  DROP CONSTRAINT IF EXISTS job_secondary_workers_job_id_worker_id_key;

ALTER TABLE task_secondary_workers
  ADD CONSTRAINT task_secondary_workers_task_id_worker_id_key UNIQUE (task_id, worker_id);

-- Migration complete
COMMENT ON TABLE tasks IS 'Generic tasks for the Mosaic scheduling system. Renamed from jobs table.';
COMMENT ON TABLE task_secondary_workers IS 'Junction table for secondary worker assignments. Renamed from job_secondary_workers.';
COMMENT ON COLUMN tasks.name IS 'Task name or title (renamed from address column)';
