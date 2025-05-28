-- Fix database schema and permissions
-- This migration ensures all tables exist with correct structure and permissions

-- 1. ENSURE WORKERS TABLE EXISTS
CREATE TABLE IF NOT EXISTS public.workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  role text NOT NULL DEFAULT 'admin'::text,
  created_at timestamptz DEFAULT now()
);

-- Constraints for workers
ALTER TABLE public.workers DROP CONSTRAINT IF EXISTS workers_role_check;
ALTER TABLE public.workers ADD CONSTRAINT workers_role_check 
  CHECK (role = 'admin'::text);

-- 2. ENSURE JOBS TABLE EXISTS
CREATE TABLE IF NOT EXISTS public.jobs (
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
  status text NOT NULL DEFAULT 'Awaiting Order'::text,
  tile_color text DEFAULT '#3b82f6'::text,
  created_at timestamptz DEFAULT now()
);

-- 3. ENSURE JOB_SECONDARY_WORKERS TABLE EXISTS
CREATE TABLE IF NOT EXISTS public.job_secondary_workers (
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id uuid REFERENCES workers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (job_id, worker_id)
);

-- 4. ENSURE USERS TABLE EXISTS
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin'::text,
  created_at timestamptz DEFAULT now()
);

-- Add constraint for users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role = 'admin'::text);

-- 5. CREATE OR RECREATE INDEXES
DROP INDEX IF EXISTS idx_jobs_worker_id;
CREATE INDEX idx_jobs_worker_id ON public.jobs(worker_id);

DROP INDEX IF EXISTS idx_job_secondary_workers_worker_id;
CREATE INDEX idx_job_secondary_workers_worker_id ON public.job_secondary_workers(worker_id);

-- 6. DISABLE ROW LEVEL SECURITY
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_secondary_workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 7. GRANT PERMISSIONS
GRANT ALL ON public.workers TO authenticated;
GRANT ALL ON public.workers TO anon;

GRANT ALL ON public.jobs TO authenticated; 
GRANT ALL ON public.jobs TO anon;

GRANT ALL ON public.job_secondary_workers TO authenticated;
GRANT ALL ON public.job_secondary_workers TO anon;

GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO anon;

-- 8. INSERT TEST DATA

-- First clear any existing test data to avoid duplicates
DO $$
BEGIN
  DELETE FROM public.job_secondary_workers;
  DELETE FROM public.jobs;
  DELETE FROM public.workers;
END$$;

-- Insert test workers
INSERT INTO public.workers (id, name, email, phone, role, created_at)
VALUES 
  ('11111111-1111-4000-a000-000000000001', 'John Smith', 'john@example.com', '021-555-1234', 'admin', now()),
  ('22222222-2222-4000-a000-000000000002', 'Sarah Johnson', 'sarah@example.com', '021-555-5678', 'admin', now());

-- Insert test jobs with proper dates and worker assignments
DO $$
DECLARE
  worker1_id uuid := '11111111-1111-4000-a000-000000000001';
  worker2_id uuid := '22222222-2222-4000-a000-000000000002';
  job1_id uuid;
  job2_id uuid;
  job3_id uuid;
  job4_id uuid;
  -- Calculate dates relative to current date
  current_day date := current_date;
  this_monday date := current_date - EXTRACT(DOW FROM current_date)::int + 1;
  this_wednesday date := current_date - EXTRACT(DOW FROM current_date)::int + 3;
  this_friday date := current_date - EXTRACT(DOW FROM current_date)::int + 5;
  next_monday date := current_date - EXTRACT(DOW FROM current_date)::int + 8;
  next_friday date := current_date - EXTRACT(DOW FROM current_date)::int + 12;
BEGIN
  -- Job 1: This Monday-Wednesday, assigned to worker 1
  INSERT INTO public.jobs (
    address, customer_name, quote_number, 
    fascia_colour, spouting_colour, spouting_profile, 
    roof_colour, roof_profile, downpipe_size, downpipe_colour,
    notes, worker_id, start_date, end_date, status, tile_color
  )
  VALUES (
    '123 Main Street, Wellington', 
    'Michael Brown',
    'Q12345',
    'White', 'White', 'Quarter Round',
    'Grey', 'Corrugated', '80mm', 'White',
    'Customer prefers work done early in the morning',
    worker1_id,
    to_timestamp(this_monday::text || ' 09:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    to_timestamp(this_wednesday::text || ' 17:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    'In Progress',
    '#3b82f6'  -- blue
  )
  RETURNING id INTO job1_id;
  
  -- Job 2: This Friday, assigned to worker 2
  INSERT INTO public.jobs (
    address, customer_name, quote_number, 
    fascia_colour, spouting_colour, spouting_profile, 
    roof_colour, roof_profile, downpipe_size, downpipe_colour,
    notes, worker_id, start_date, end_date, status, tile_color
  )
  VALUES (
    '456 High Street, Wellington', 
    'Jennifer Wilson',
    'Q23456',
    'Cream', 'Cream', 'Half Round',
    'Brown', 'Tile', '100mm', 'Brown',
    'Access through side gate',
    worker2_id,
    to_timestamp(this_friday::text || ' 09:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    to_timestamp(this_friday::text || ' 17:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    'Ordered',
    '#f97316'  -- orange
  )
  RETURNING id INTO job2_id;
  
  -- Job 3: Next week, assigned to worker 1
  INSERT INTO public.jobs (
    address, customer_name, quote_number, 
    fascia_colour, spouting_colour, spouting_profile, 
    roof_colour, roof_profile, downpipe_size, downpipe_colour,
    notes, worker_id, start_date, end_date, status, tile_color
  )
  VALUES (
    '789 Beach Road, Wellington', 
    'Robert Taylor',
    'Q34567',
    'Green', 'Green', 'Box',
    'Black', 'Metal', '80mm', 'Black',
    'Large job, will require multiple days',
    worker1_id,
    to_timestamp(next_monday::text || ' 09:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    to_timestamp(next_friday::text || ' 17:00:00', 'YYYY-MM-DD HH24:MI:SS'),
    'Awaiting Order',
    '#22c55e'  -- green
  )
  RETURNING id INTO job3_id;
  
  -- Job 4: Unscheduled job (no worker, no dates)
  INSERT INTO public.jobs (
    address, customer_name, quote_number, 
    fascia_colour, spouting_colour, spouting_profile, 
    roof_colour, roof_profile, downpipe_size, downpipe_colour,
    notes, worker_id, start_date, end_date, status, tile_color
  )
  VALUES (
    '321 Valley Way, Wellington', 
    'Elizabeth Moore',
    'Q45678',
    'Black', 'Black', 'Half Round',
    'Red', 'Corrugated', '100mm', 'Black',
    'Waiting for customer confirmation',
    NULL,
    NULL,
    NULL,
    'Awaiting Order',
    '#ef4444'  -- red
  )
  RETURNING id INTO job4_id;
  
  -- Add secondary worker assignments
  INSERT INTO public.job_secondary_workers (job_id, worker_id)
  VALUES
    (job1_id, worker2_id),  -- Add worker 2 as secondary to job 1
    (job3_id, worker2_id);  -- Add worker 2 as secondary to job 3
END$$;