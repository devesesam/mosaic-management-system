/*
  # Enable anon access to users table
  
  1. Changes
    - Enable Row Level Security on users table
    - Create public access policies for all operations
    - Grant necessary permissions to anon role
  
  2. Security
    - Allows anonymous users to read, insert, update, and delete from users table
    - Maintains RLS structure while providing full public access
*/

-- Enable Row Level Security on users table
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public access to users" ON public.users;
DROP POLICY IF EXISTS "Allow public read access to users" ON public.users;
DROP POLICY IF EXISTS "Allow public insert to users" ON public.users;
DROP POLICY IF EXISTS "Allow public update to users" ON public.users;
DROP POLICY IF EXISTS "Allow public delete from users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can read themselves and admins can read all" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;

-- Create comprehensive public access policy for all operations
CREATE POLICY "Allow public access to users" 
  ON public.users 
  FOR ALL 
  TO public 
  USING (true) 
  WITH CHECK (true);

-- Grant necessary permissions to anon role
GRANT ALL PRIVILEGES ON TABLE public.users TO anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Ensure the users table exists with proper structure
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on the users table (in case it wasn't enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create or update the worker sync function
CREATE OR REPLACE FUNCTION ensure_worker_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If a user is created, ensure a worker profile exists with the same email
  INSERT INTO public.workers (name, email, role)
  VALUES (
    NEW.name,
    NEW.email,
    'admin'
  )
  ON CONFLICT (email) WHERE email IS NOT NULL
  DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role;
    
  RETURN NEW;
END;
$$;

-- Create trigger to sync users to workers if it doesn't exist
DROP TRIGGER IF EXISTS ensure_worker_on_user_change ON public.users;
CREATE TRIGGER ensure_worker_on_user_change
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_worker_profile();