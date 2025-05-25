/*
  # Fix email uniqueness and ensure admin user

  1. Changes
    - Update any null email values with unique generated emails
    - Add unique constraint on email column
    - Ensure admin user exists with correct role

  2. Notes
    - Handles duplicate null values before adding constraint
    - Uses DO block for safe updates
    - Verifies admin user creation
*/

-- First handle any null or duplicate email values
DO $$
DECLARE
  worker_record RECORD;
BEGIN
  FOR worker_record IN 
    SELECT id 
    FROM workers 
    WHERE email IS NULL OR email = ''
  LOOP
    UPDATE workers 
    SET email = 'worker_' || worker_record.id || '@example.com'
    WHERE id = worker_record.id;
  END LOOP;
END $$;

-- Now we can safely add the unique constraint
ALTER TABLE workers 
ADD CONSTRAINT workers_email_unique UNIQUE NULLS NOT DISTINCT (email);

-- Ensure the admin user exists
INSERT INTO workers (name, email, role)
VALUES (
  'damsevese',
  'damsevese@gmail.com',
  'admin'
)
ON CONFLICT ON CONSTRAINT workers_email_unique
DO UPDATE SET role = 'admin'
WHERE workers.role IS NULL OR workers.role != 'admin';

-- Verify the admin user was created/updated correctly
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