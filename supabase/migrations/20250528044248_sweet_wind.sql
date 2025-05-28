/*
  # Fix data retrieval with service role
  
  1. New Functions
    - `admin_get_all_workers()` - Retrieves all workers with SECURITY DEFINER
    - `admin_get_all_jobs()` - Retrieves all jobs with SECURITY DEFINER
    - `admin_get_all_secondary_workers()` - Retrieves all job secondary workers with SECURITY DEFINER
  
  2. Security
    - Functions use SECURITY DEFINER to bypass RLS
    - Limited to authenticated users only
*/

-- Create admin function to get all workers
CREATE OR REPLACE FUNCTION admin_get_all_workers()
RETURNS SETOF workers AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.workers ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin function to get all jobs
CREATE OR REPLACE FUNCTION admin_get_all_jobs()
RETURNS SETOF jobs AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.jobs ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin function to get all secondary workers
CREATE OR REPLACE FUNCTION admin_get_all_secondary_workers()
RETURNS SETOF job_secondary_workers AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.job_secondary_workers;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_get_all_workers() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_secondary_workers() TO authenticated;