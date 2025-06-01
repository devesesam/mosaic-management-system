-- Add explicit RLS policies for anonymous users to access the users table
-- This ensures that unauthenticated requests can access the users table data

-- Create policy for anonymous SELECT access
CREATE POLICY "Allow anonymous read access to users" ON public.users
FOR SELECT
TO anon
USING (true);

-- Create policy for anonymous INSERT access
CREATE POLICY "Allow anonymous insert to users" ON public.users
FOR INSERT
TO anon
WITH CHECK (true);

-- Create policy for anonymous UPDATE access
CREATE POLICY "Allow anonymous update to users" ON public.users
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Create policy for anonymous DELETE access
CREATE POLICY "Allow anonymous delete from users" ON public.users
FOR DELETE
TO anon
USING (true);

-- Make sure RLS is enabled
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;