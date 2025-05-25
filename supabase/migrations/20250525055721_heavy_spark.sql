/*
  # Fix Admin User Creation
  
  1. Updates
     - Ensures admin user for "damsevese@gmail.com" exists
     - Improves worker creation with better conflict handling
     - Adds more debug information for troubleshooting
  
  2. Fixes
     - Resolves issues with previous migrations
     - Avoids recreating existing constraints
*/

-- First update any null email values to prevent constraint violation
UPDATE workers 
SET email = 'worker_' || id || '@example.com'
WHERE email IS NULL;

-- Use upsert to ensure the admin worker exists
-- This avoids the constraint error by using a different approach
INSERT INTO workers (name, email, role)
VALUES (
  'damsevese',
  'damsevese@gmail.com',
  'admin'
)
ON CONFLICT (email) 
DO UPDATE SET 
  name = EXCLUDED.name,
  role = 'admin';

-- Add debug logging to help troubleshoot
DO $$
DECLARE
  worker_count INTEGER;
  worker_role TEXT;
BEGIN
  SELECT COUNT(*) INTO worker_count FROM workers WHERE email = 'damsevese@gmail.com';
  RAISE NOTICE 'Worker count for damsevese@gmail.com: %', worker_count;
  
  IF worker_count > 0 THEN
    SELECT role INTO worker_role FROM workers WHERE email = 'damsevese@gmail.com';
    RAISE NOTICE 'Worker role for damsevese@gmail.com: %', worker_role;
  END IF;
END $$;