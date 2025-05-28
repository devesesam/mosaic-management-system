/*
  # Add Emergency Access Functions

  This migration adds special functions that bypass RLS and give emergency access to data
  for troubleshooting purposes.
*/

-- Emergency function to get all workers regardless of RLS
CREATE OR REPLACE FUNCTION emergency_get_workers()
RETURNS SETOF workers AS $$
BEGIN
  -- Directly query the workers table, bypassing RLS
  RETURN QUERY SELECT * FROM public.workers ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Emergency function to get all jobs regardless of RLS
CREATE OR REPLACE FUNCTION emergency_get_jobs()
RETURNS SETOF jobs AS $$
BEGIN
  -- Directly query the jobs table, bypassing RLS
  RETURN QUERY SELECT * FROM public.jobs ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Emergency function to get all secondary workers regardless of RLS
CREATE OR REPLACE FUNCTION emergency_get_secondary_workers()
RETURNS SETOF job_secondary_workers AS $$
BEGIN
  -- Directly query the job_secondary_workers table, bypassing RLS
  RETURN QUERY SELECT * FROM public.job_secondary_workers;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION emergency_get_workers() TO authenticated;
GRANT EXECUTE ON FUNCTION emergency_get_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION emergency_get_secondary_workers() TO authenticated;

-- Ensure all admin functions also exist and have proper permissions
DROP FUNCTION IF EXISTS admin_get_all_workers();
DROP FUNCTION IF EXISTS admin_get_all_jobs();
DROP FUNCTION IF EXISTS admin_get_all_secondary_workers();

-- Add Admin Function to Get All Workers (Bypasses RLS)
CREATE OR REPLACE FUNCTION admin_get_all_workers()
RETURNS SETOF workers AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.workers ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add Admin Function to Get All Jobs (Bypasses RLS)
CREATE OR REPLACE FUNCTION admin_get_all_jobs()
RETURNS SETOF jobs AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.jobs ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add Admin Function to Get All Secondary Workers (Bypasses RLS)
CREATE OR REPLACE FUNCTION admin_get_all_secondary_workers()
RETURNS SETOF job_secondary_workers AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.job_secondary_workers;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant Execute Permission to Authenticated Users
GRANT EXECUTE ON FUNCTION admin_get_all_workers() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_secondary_workers() TO authenticated;

-- Make all objects in public schema accessible to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;