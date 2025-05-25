/*
  # Fix email constraint and ensure admin role

  1. Changes
    - Update null email values to unique values
    - Add unique constraint on email column
    - Ensure admin user exists with correct role

  2. Notes
    - Handles existing null values before adding constraint
    - Ensures data integrity
*/

-- First update any null email values to prevent constraint violation
UPDATE workers 
SET email = 'worker_' || id || '@example.com'
WHERE email IS NULL;

-- Add unique constraint
ALTER TABLE workers ADD CONSTRAINT workers_email_unique UNIQUE (email);

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