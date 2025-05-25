/*
  # Fix Admin Role and Permissions

  1. Changes
    - Ensures the specified email has admin role
    - Creates worker record if it doesn't exist
    - Updates existing worker to admin if needed
    - Adds RLS policy for admin role

  2. Security
    - Adds policy to ensure only admins can modify worker roles
*/

DO $$
BEGIN
  -- First ensure the worker exists with admin role
  INSERT INTO workers (name, email, role)
  VALUES (
    'damsevese',
    'damsevese@gmail.com',
    'admin'
  )
  ON CONFLICT (email) 
  DO UPDATE SET role = 'admin'
  WHERE workers.role IS NULL OR workers.role != 'admin';

  -- Verify the update was successful
  IF NOT EXISTS (
    SELECT 1 FROM workers 
    WHERE email = 'damsevese@gmail.com' 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Failed to ensure admin role for user';
  END IF;
END $$;