-- Complete fix for Supabase connection and RLS issues
-- This migration ensures proper database access without authentication barriers

-- Disable RLS temporarily to ensure we can make changes
ALTER TABLE IF EXISTS public.workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_secondary_workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start completely fresh
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on workers table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'workers') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.workers';
    END LOOP;
    
    -- Drop all policies on jobs table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'jobs') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.jobs';
    END LOOP;
    
    -- Drop all policies on job_secondary_workers table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'job_secondary_workers') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.job_secondary_workers';
    END LOOP;
    
    -- Drop all policies on users table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.users';
    END LOOP;
END
$$;

-- Grant comprehensive permissions to anon role (this is what the API uses)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant comprehensive permissions to authenticated role as well
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Re-enable RLS but with completely permissive policies
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_secondary_workers ENABLE ROW LEVEL SECURITY;

-- Create the most permissive policies possible
CREATE POLICY "workers_full_access" ON public.workers FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "jobs_full_access" ON public.jobs FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "job_secondary_workers_full_access" ON public.job_secondary_workers FOR ALL TO public USING (true) WITH CHECK (true);

-- Handle users table separately (it might not exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "users_full_access" ON public.users FOR ALL TO public USING (true) WITH CHECK (true);
    END IF;
END
$$;

-- Ensure all required indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_workers_email ON public.workers(email);
CREATE INDEX IF NOT EXISTS idx_jobs_worker_id ON public.jobs(worker_id);
CREATE INDEX IF NOT EXISTS idx_jobs_start_date ON public.jobs(start_date);
CREATE INDEX IF NOT EXISTS idx_jobs_end_date ON public.jobs(end_date);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_worker_id ON public.job_secondary_workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_secondary_workers_job_id ON public.job_secondary_workers(job_id);

-- Create test data if tables are empty (to verify connection works)
DO $$
BEGIN
    -- Insert test worker if none exist
    IF NOT EXISTS (SELECT 1 FROM public.workers LIMIT 1) THEN
        INSERT INTO public.workers (name, email, role) 
        VALUES ('Test Worker', 'test@tasman.com', 'admin');
    END IF;
    
    -- Insert test job if none exist  
    IF NOT EXISTS (SELECT 1 FROM public.jobs LIMIT 1) THEN
        INSERT INTO public.jobs (address, status, tile_color)
        VALUES ('123 Test Street, Test City', 'Awaiting Order', '#3b82f6');
    END IF;
END
$$;

-- Create a simple function to test database connectivity
CREATE OR REPLACE FUNCTION public.test_connection()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT json_build_object(
        'status', 'success',
        'workers_count', (SELECT count(*) FROM public.workers),
        'jobs_count', (SELECT count(*) FROM public.jobs),
        'timestamp', now()
    );
$$;

-- Grant execute permission on the test function
GRANT EXECUTE ON FUNCTION public.test_connection() TO anon, authenticated, public;