/*
  # Ensure admin user exists

  1. Updates
    - Ensures damsevese@gmail.com exists as an admin user in the workers table
    - Creates or replaces a trigger function to automatically create worker profiles
    - Sets up a trigger to create worker profiles when new auth users are created

  2. Data Changes
    - Makes damsevese@gmail.com an admin if it exists
    - Adds the account if it doesn't exist
*/

-- First ensure our admin account exists and has proper permissions
INSERT INTO workers (name, email, role)
VALUES (
  'Admin User',
  'damsevese@gmail.com',
  'admin'
)
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'admin';

-- Create or replace function to automatically create worker profiles for new users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
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