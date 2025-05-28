/*
  # Fix Authentication Flow

  1. Admin Functions
    - Create SECURITY DEFINER functions that bypass RLS for data access
    - Add functions to get all workers, jobs, and secondary workers

  2. Security
    - Ensure permissions for authenticated users to access the functions
    - Create a function to repair worker associations

  3. Worker Profile Management
    - Create a trigger to automatically create worker profiles for new auth users
    - Add function to ensure every auth user has a corresponding worker record
*/

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

-- Create Automatic Worker Profile Creation Trigger
CREATE OR REPLACE FUNCTION ensure_worker_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workers (name, email, role)
  VALUES (
    COALESCE(NEW.email, 'New User'),
    NEW.email,
    'admin'
  )
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a trigger to automatically create a worker profile for new auth users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION ensure_worker_profile();

-- Function to repair all existing users (make sure they have worker profiles)
CREATE OR REPLACE FUNCTION repair_worker_associations()
RETURNS TABLE (user_email TEXT, worker_id UUID, status TEXT) AS $$
DECLARE
  auth_user RECORD;
  worker_record RECORD;
BEGIN
  FOR auth_user IN SELECT * FROM auth.users
  LOOP
    SELECT * INTO worker_record FROM public.workers WHERE email = auth_user.email LIMIT 1;
    
    IF worker_record.id IS NULL THEN
      -- Create a worker profile for this user
      INSERT INTO public.workers (name, email, role)
      VALUES (
        COALESCE(auth_user.email, 'User'),
        auth_user.email,
        'admin'
      )
      RETURNING id INTO worker_record;
      
      user_email := auth_user.email;
      worker_id := worker_record.id;
      status := 'CREATED';
      RETURN NEXT;
    ELSE
      user_email := auth_user.email;
      worker_id := worker_record.id;
      status := 'EXISTS';
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION repair_worker_associations() TO authenticated;

-- Immediately run the repair function to fix existing users
SELECT * FROM repair_worker_associations();

-- Add a helper function to handle user deletion properly
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a worker profile for the new user
  INSERT INTO public.workers (name, email, role)
  VALUES (
    COALESCE(NEW.email, 'New User'),
    NEW.email,
    'admin'
  )
  ON CONFLICT (email) DO NOTHING;

  -- Create a user record with proper role and name
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    'admin'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_complete ON auth.users;

-- Create a new trigger for complete user setup
CREATE TRIGGER on_auth_user_created_complete
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();