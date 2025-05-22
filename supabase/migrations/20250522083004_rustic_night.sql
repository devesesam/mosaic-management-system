/*
  # Add initial admin workers
  
  1. Updates
    - Add unique constraint on workers.email
    - Insert admin workers with email addresses
    
  2. Security
    - No changes to security policies
*/

-- First add a unique constraint on email
DO $$ 
BEGIN
  -- Only add the constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'workers_email_key'
    AND table_name = 'workers'
  ) THEN
    ALTER TABLE workers ADD CONSTRAINT workers_email_key UNIQUE (email);
  END IF;
END $$;

-- Then insert the admin workers
INSERT INTO workers (name, email, role)
VALUES 
  ('Dam', 'damsevese@gmail.com', 'admin'),
  ('Nick', 'nick@tasmanroofing.co.nz', 'admin')
ON CONFLICT (email) DO UPDATE 
SET role = 'admin', name = EXCLUDED.name
WHERE workers.email = EXCLUDED.email;