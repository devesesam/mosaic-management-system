/*
  # Simplify authentication flow

  1. Changes
     - Ensures user/worker pairing works correctly
     - Adds default admin user if doesn't exist
     - Updates any existing user records to have proper email

  2. Security
     - Maintains existing RLS policies
*/

-- First update any null email values to prevent constraint violation
UPDATE workers 
SET email = 'worker_' || id || '@example.com'
WHERE email IS NULL;

-- Ensure the worker exists with admin role for default user
INSERT INTO workers (name, email, role)
VALUES (
  'damsevese',
  'damsevese@gmail.com',
  'admin'
)
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'admin',
  name = COALESCE(workers.name, 'damsevese');

-- Create function to automatically create worker profiles for new users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.workers (name, email, role)
  VALUES (
    SPLIT_PART(NEW.email, '@', 1),
    NEW.email,
    'admin'
  )
  ON CONFLICT (email) 
  DO NOTHING;
  
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