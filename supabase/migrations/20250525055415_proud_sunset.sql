/*
  # Fix admin user worker profile

  1. Changes
     - Ensures the worker profile for 'damsevese@gmail.com' exists
     - Handles potential conflicts with existing records
     - Properly sets admin role to ensure access
  
  2. Notes
     - This migration fixes issues with automatic worker creation
     - Uses a more robust method to insert/update the worker record
*/

-- First update any null email values to prevent constraint violation
UPDATE workers 
SET email = 'worker_' || id || '@example.com'
WHERE email IS NULL;

-- Use upsert to ensure the admin worker exists
-- This uses the ON CONFLICT clause with the email column directly
INSERT INTO workers (name, email, role)
VALUES (
  'damsevese',
  'damsevese@gmail.com',
  'admin'
)
ON CONFLICT (email) 
DO UPDATE SET 
  name = 'damsevese',
  role = 'admin';

-- Add debug logging to help troubleshoot
DO $$
DECLARE
  worker_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO worker_count FROM workers WHERE email = 'damsevese@gmail.com';
  RAISE NOTICE 'Worker count for damsevese@gmail.com: %', worker_count;
END $$;