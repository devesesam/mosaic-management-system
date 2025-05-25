/*
  # Ensure admin user exists

  1. Updates
     - Creates or updates the admin user account
     - Fixes issue with account linking

  2. Security
     - Ensures the admin user has proper permissions
*/

-- First update any null email values to prevent constraint violation
UPDATE workers 
SET email = 'worker_' || id || '@example.com'
WHERE email IS NULL;

-- Use UPSERT to ensure the admin worker exists
-- This avoids any constraint errors by using the ON CONFLICT clause properly
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

-- Add debug logging
DO $$
DECLARE
  worker_count INTEGER;
  worker_role TEXT;
  worker_name TEXT;
BEGIN
  SELECT COUNT(*) INTO worker_count FROM workers WHERE email = 'damsevese@gmail.com';
  RAISE NOTICE 'Worker count for damsevese@gmail.com: %', worker_count;
  
  IF worker_count > 0 THEN
    SELECT role, name INTO worker_role, worker_name FROM workers WHERE email = 'damsevese@gmail.com';
    RAISE NOTICE 'Worker role for damsevese@gmail.com: %, name: %', worker_role, worker_name;
  ELSE
    RAISE EXCEPTION 'Failed to ensure admin worker exists';
  END IF;
END $$;