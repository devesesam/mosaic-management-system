/*
  # Add user roles and admin functions
  
  1. Changes
    - Create user_role enum type in public schema
    - Add role column to auth.users table
    - Set all existing users to admin role
    - Add helper functions for role checking
  
  2. Security
    - Functions are created with SECURITY DEFINER
    - Proper search path settings
    - Execute permissions granted to authenticated users
*/

-- Create role type in public schema
CREATE TYPE public.user_role AS ENUM ('admin', 'user');

-- Add role column to auth.users
DO $$ 
BEGIN
  -- First drop the column if it exists (to handle potential type mismatch)
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE auth.users DROP COLUMN role;
  END IF;
  
  -- Add the column with the correct type
  ALTER TABLE auth.users ADD COLUMN role public.user_role DEFAULT 'user'::public.user_role;
END $$;

-- Update all existing users to admin role
UPDATE auth.users
SET role = 'admin'::public.user_role;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
    AND role::text = 'admin'
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auth.is_admin TO authenticated;

-- Create function to get current user's role
CREATE OR REPLACE FUNCTION auth.get_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(role, 'user'::public.user_role)
  FROM auth.users
  WHERE id = auth.uid();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION auth.get_role TO authenticated;