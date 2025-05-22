/*
  # Add admin workers
  
  1. Updates
    - Clean up any NULL or duplicate emails
    - Add unique constraint on email
    - Add initial admin workers
  
  2. Security
    - No changes to security policies
*/

-- First, update any NULL emails to be unique placeholder values
UPDATE workers 
SET email = 'worker_' || id || '@placeholder.com' 
WHERE email IS NULL;

-- Remove duplicate emails, keeping the newest record
DELETE FROM workers a
USING workers b
WHERE a.email = b.email 
  AND a.created_at < b.created_at;

-- Add unique constraint on email
ALTER TABLE workers 
ADD CONSTRAINT workers_email_key UNIQUE NULLS NOT DISTINCT (email);

-- Insert admin workers
INSERT INTO workers (name, email, role)
VALUES 
  ('Dam', 'damsevese@gmail.com', 'admin'),
  ('Nick', 'nick@tasmanroofing.co.nz', 'admin')
ON CONFLICT (email) DO UPDATE 
SET role = 'admin', 
    name = EXCLUDED.name
WHERE workers.email = EXCLUDED.email;