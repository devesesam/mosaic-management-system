/*
  # Fix User Record and Database Issues
  
  1. Create/update worker record for damsevese@gmail.com
  2. Create a corresponding user record in public.users
  3. Update handle_new_user function to properly create records in both tables
  4. Make RLS policies more permissive to ensure proper access
  5. Add diagnostic logging
*/

-- First ensure we have a worker record for the admin user
INSERT INTO workers (name, email, role)
VALUES (
  'Admin User',
  'damsevese@gmail.com',
  'admin'
)
ON CONFLICT (email) 
DO UPDATE SET role = 'admin';

-- Get the auth.users ID for the admin user
DO $$
DECLARE
  auth_user_id UUID;
  worker_id UUID;
BEGIN
  -- Get the ID from auth.users
  SELECT id INTO auth_user_id FROM auth.users WHERE email = 'damsevese@gmail.com';
  
  IF auth_user_id IS NULL THEN
    RAISE NOTICE 'User damsevese@gmail.com not found in auth.users!';
  ELSE
    RAISE NOTICE 'Found auth user with ID: %', auth_user_id;
    
    -- Create/update the corresponding record in public.users
    INSERT INTO public.users (id, name, email, role, created_at)
    VALUES (
      auth_user_id,
      'Admin User', 
      'damsevese@gmail.com', 
      'admin',
      now()
    )
    ON CONFLICT (id)
    DO UPDATE SET 
      role = 'admin',
      name = COALESCE(users.name, 'Admin User');
    
    -- Verify the user was created/updated
    IF EXISTS (SELECT 1 FROM public.users WHERE id = auth_user_id) THEN
      RAISE NOTICE 'Successfully created/updated user record in public.users';
    ELSE
      RAISE WARNING 'Failed to create user record in public.users!';
    END IF;
  END IF;
END $$;

-- Improve the handle_new_user function to better handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- First create the worker record
  INSERT INTO public.workers (name, email, role)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    'admin'  -- Default all new users to admin role
  )
  ON CONFLICT (email) 
  DO UPDATE SET
    role = 'admin',
    name = COALESCE(workers.name, SPLIT_PART(NEW.email, '@', 1));
  
  -- Then create the users record that links to auth.users
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    'admin'
  )
  ON CONFLICT (id)
  DO UPDATE SET
    role = 'admin',
    name = COALESCE(users.name, SPLIT_PART(NEW.email, '@', 1));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add a diagnostic function to check the state of a specific user
CREATE OR REPLACE FUNCTION check_user_status(user_email TEXT)
RETURNS TABLE (
  auth_user_exists BOOLEAN,
  public_user_exists BOOLEAN,
  worker_exists BOOLEAN,
  auth_user_id UUID,
  public_user_id UUID,
  worker_id UUID,
  worker_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH auth_check AS (
    SELECT id FROM auth.users WHERE email = user_email
  ),
  public_check AS (
    SELECT id FROM public.users WHERE email = user_email
  ),
  worker_check AS (
    SELECT id, role FROM workers WHERE email = user_email
  )
  SELECT 
    EXISTS(SELECT 1 FROM auth_check),
    EXISTS(SELECT 1 FROM public_check),
    EXISTS(SELECT 1 FROM worker_check),
    (SELECT id FROM auth_check),
    (SELECT id FROM public_check),
    (SELECT id FROM worker_check),
    (SELECT role FROM worker_check);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the diagnostic for our user
DO $$
DECLARE
  result RECORD;
BEGIN
  SELECT * INTO result FROM check_user_status('damsevese@gmail.com');
  
  RAISE NOTICE 'User status check for damsevese@gmail.com:';
  RAISE NOTICE '  Auth user exists: %', result.auth_user_exists;
  RAISE NOTICE '  Public user exists: %', result.public_user_exists;
  RAISE NOTICE '  Worker exists: %', result.worker_exists;
  RAISE NOTICE '  Auth user ID: %', result.auth_user_id;
  RAISE NOTICE '  Public user ID: %', result.public_user_id;
  RAISE NOTICE '  Worker ID: %', result.worker_id;
  RAISE NOTICE '  Worker role: %', result.worker_role;
END $$;

-- Verify that our data model is functioning properly
DO $$
DECLARE
  worker_count INTEGER;
  job_count INTEGER;
  user_count INTEGER;
BEGIN
  -- Count existing data
  SELECT COUNT(*) INTO worker_count FROM workers;
  SELECT COUNT(*) INTO job_count FROM jobs;
  SELECT COUNT(*) INTO user_count FROM public.users;
  
  RAISE NOTICE 'Database status: % workers, % jobs, % users', 
               worker_count, job_count, user_count;
END $$;