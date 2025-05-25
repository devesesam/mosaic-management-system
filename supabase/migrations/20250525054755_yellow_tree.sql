/*
  # Fix Admin User Email Setup
  
  1. Changes
     - Update null emails to ensure all workers have valid email addresses
     - Ensure admin user exists with correct role
  
  2. Notes
     - Skip creating the unique email constraint as it already exists
     - Verify the admin user was properly set up
*/

-- First update any null email values to prevent constraint violation
UPDATE workers 
SET email = 'worker_' || id || '@example.com'
WHERE email IS NULL;

-- The unique constraint already exists, so we skip that step

-- Ensure the worker exists with admin role
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM workers 
    WHERE email = 'damsevese@gmail.com' 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Failed to ensure admin role for user';
  END IF;
END $$;