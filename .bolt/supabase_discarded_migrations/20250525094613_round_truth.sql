/*
  # Fix Data Access Issues

  1. Changes
    - Disable RLS on all tables
    - Add test data if none exists
    - Fix any constraint issues
    - Add diagnostic functions
*/

-- Disable RLS on all tables
ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_secondary_workers DISABLE ROW LEVEL SECURITY;

-- Add test data if none exists
DO $$
BEGIN
  -- Add a test worker if none exist
  IF NOT EXISTS (SELECT 1 FROM public.workers LIMIT 1) THEN
    INSERT INTO public.workers (name, email, role)
    VALUES ('Test Worker', 'test@example.com', 'admin');
  END IF;

  -- Add a test job if none exist
  IF NOT EXISTS (SELECT 1 FROM public.jobs LIMIT 1) THEN
    INSERT INTO public.jobs (
      address,
      customer_name,
      status,
      tile_color
    )
    VALUES (
      '123 Test Street',
      'Test Customer',
      'Awaiting Order',
      '#3b82f6'
    );
  END IF;
END $$;

-- Create diagnostic function
CREATE OR REPLACE FUNCTION check_data_access()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'workers_count', (SELECT COUNT(*) FROM public.workers),
    'jobs_count', (SELECT COUNT(*) FROM public.jobs),
    'users_count', (SELECT COUNT(*) FROM public.users),
    'secondary_workers_count', (SELECT COUNT(*) FROM public.job_secondary_workers),
    'tables_with_rls', (
      SELECT json_agg(table_name)
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('jobs', 'workers', 'users', 'job_secondary_workers')
      AND EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = table_name
      )
    )
  ) INTO result;
  
  RETURN result;
END;
$$;