/*
  # Ensure admin account exists and fix authentication flow
  
  1. Ensures the specified user exists with admin privileges
  2. Creates a trigger to automatically handle user-worker account linking
  3. Updates any existing accounts without proper role assignment
*/

-- First update any null email values to prevent constraint violation
UPDATE workers 
SET email = 'worker_' || id || '@example.com'
WHERE email IS NULL;

-- Ensure the damsevese@gmail.com account exists with admin role
INSERT INTO workers (name, email, role)
VALUES (
  'Admin User',
  'damsevese@gmail.com',
  'admin'
)
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'admin',
  name = COALESCE(workers.name, 'Admin User');

-- Create or replace function to automatically create worker profiles for new users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.workers (name, email, role)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    'admin'
  )
  ON CONFLICT (email) 
  DO UPDATE SET
    role = 'admin',
    name = COALESCE(workers.name, SPLIT_PART(NEW.email, '@', 1));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger already exists and drop it if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  END IF;
END
$$;

-- Create trigger to create worker profile when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add debug logging to verify the admin account exists
DO $$
DECLARE
  worker_count INTEGER;
  worker_role TEXT;
  worker_name TEXT;
BEGIN
  SELECT COUNT(*) INTO worker_count FROM workers WHERE email = 'damsevese@gmail.com';
  
  IF worker_count > 0 THEN
    SELECT role, name INTO worker_role, worker_name FROM workers WHERE email = 'damsevese@gmail.com';
    RAISE NOTICE 'Admin account verified - email: damsevese@gmail.com, role: %, name: %', worker_role, worker_name;
  ELSE
    RAISE EXCEPTION 'Failed to ensure admin account exists';
  END IF;
END $$;