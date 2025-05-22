/*
  # Add initial admin workers
  
  1. Changes
    - Add two admin worker profiles
      - One for damsevese@gmail.com
      - One for Nick
  
  2. Security
    - No changes to security policies
*/

INSERT INTO workers (name, email, role)
VALUES 
  ('Dam', 'damsevese@gmail.com', 'admin'),
  ('Nick', 'nick@tasmanroofing.co.nz', 'admin')
ON CONFLICT (email) DO UPDATE 
SET role = 'admin'
WHERE workers.email = EXCLUDED.email;