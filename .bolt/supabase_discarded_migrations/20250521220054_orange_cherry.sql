/*
  # Add admin worker
  
  1. Updates
    - Add unique constraint on workers email
    - Insert initial admin worker
  
  2. Security
    - No changes to security policies
*/

-- Add unique constraint to email
ALTER TABLE workers
ADD CONSTRAINT workers_email_key UNIQUE (email);

-- Insert admin worker
INSERT INTO workers (name, email, role)
VALUES ('Admin', 'damsevese@gmail.com', 'admin')
ON CONFLICT (email) DO UPDATE
SET role = 'admin',
    name = EXCLUDED.name;