/*
  # Simplify security settings

  1. Security Changes
     - Disable Row Level Security (RLS) on all tables
     - Ensure authenticated users have access to data
*/

-- Disable RLS on all tables individually to ensure access
ALTER TABLE IF EXISTS public.jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.job_secondary_workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- Grant basic access permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_secondary_workers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;