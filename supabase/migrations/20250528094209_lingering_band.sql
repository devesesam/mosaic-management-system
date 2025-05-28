/*
  # Ensure essential tables exist with proper structure
  
  1. Schema Verification
     - Check and create workers table if not exists
     - Check and create jobs table if not exists
     - Check and create job_secondary_workers table if not exists
     - Check and create users table if not exists
  
  2. Permissions
     - Disable Row Level Security on all tables
     - Grant full access to authenticated users
*/

-- Ensure workers table exists
CREATE TABLE IF NOT EXISTS public.workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- Ensure jobs table exists
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
  worker_id uuid REFERENCES public.workers(id) ON DELETE SET NULL,
  start_date timestamptz,
  end_date timestamptz,
  status text NOT NULL DEFAULT 'Awaiting Order',
  tile_color text DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now()
);

-- Ensure job_secondary_workers table exists
CREATE TABLE IF NOT EXISTS public.job_secondary_workers (
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (job_id, worker_id)
);

-- Ensure users table exists
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role = 'admin'),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_worker_id ON public.jobs(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_worker_id ON public.job_secondary_workers(worker_id);

-- Disable Row Level Security on all tables
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_secondary_workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON public.workers TO authenticated;
GRANT ALL ON public.jobs TO authenticated;
GRANT ALL ON public.job_secondary_workers TO authenticated;
GRANT ALL ON public.users TO authenticated;

-- Insert test data if tables are empty
DO $$
BEGIN
  -- Check if workers table is empty
  IF NOT EXISTS (SELECT 1 FROM public.workers LIMIT 1) THEN
    -- Insert a test worker
    INSERT INTO public.workers (name, email, role)
    VALUES ('Test Worker', 'test@example.com', 'admin');
  END IF;
  
  -- Check if jobs table is empty
  IF NOT EXISTS (SELECT 1 FROM public.jobs LIMIT 1) THEN
    -- Get the worker id if any exists
    DECLARE
      worker_id uuid;
    BEGIN
      SELECT id INTO worker_id FROM public.workers LIMIT 1;
      
      -- Insert a test job
      INSERT INTO public.jobs (
        address, 
        customer_name, 
        worker_id, 
        status
      )
      VALUES (
        '123 Test Street', 
        'Test Customer', 
        worker_id,
        'Awaiting Order'
      );
    END;
  END IF;
END $$;