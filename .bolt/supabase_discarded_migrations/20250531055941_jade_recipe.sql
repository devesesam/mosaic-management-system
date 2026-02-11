-- This migration adds BYPASS RLS permission to the anon key
-- This will allow all operations regardless of any RLS policies

-- First, ensure RLS is enabled on all tables
ALTER TABLE IF EXISTS public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_secondary_workers ENABLE ROW LEVEL SECURITY;

-- Grant the anon role BYPASS RLS permission on all tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT BYPASS RLS ON TABLES TO anon;
GRANT BYPASS RLS ON ALL TABLES IN SCHEMA public TO anon;

-- Grant specific BYPASS RLS to important tables
GRANT BYPASS RLS ON public.workers TO anon;
GRANT BYPASS RLS ON public.jobs TO anon;
GRANT BYPASS RLS ON public.job_secondary_workers TO anon;

-- Also grant all standard privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Create a test worker entry if one doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.workers LIMIT 1) THEN
    INSERT INTO public.workers (name, role)
    VALUES ('Test Worker', 'admin');
  END IF;
END
$$;

-- Create a test job entry if one doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.jobs LIMIT 1) THEN
    INSERT INTO public.jobs (address, status)
    VALUES ('123 Test Street', 'Awaiting Order');
  END IF;
END
$$;