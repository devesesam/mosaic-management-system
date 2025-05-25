/*
  # Ensure admin role for specific user

  1. Changes
    - Add unique constraint on workers.email
    - Ensure specific user has admin role
  
  2. Security
    - No changes to RLS policies
*/

-- First add unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'workers_email_unique'
  ) THEN
    ALTER TABLE workers ADD CONSTRAINT workers_email_unique UNIQUE (email);
  END IF;
END $$;

-- Then ensure the worker exists with admin role
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