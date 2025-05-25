/*
  # Fix worker email constraints and ensure admin user exists

  1. Updates:
     - Updates any null email values to prevent constraint violations
     - Ensures admin user exists with the specified email
   
  2. Verifications:
     - Verifies that the admin user was created successfully
*/

-- First update any null email values to prevent constraint violation
UPDATE workers 
SET email = 'worker_' || id || '@example.com'
WHERE email IS NULL;

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