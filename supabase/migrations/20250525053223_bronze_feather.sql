/*
  # Verify and update admin roles

  1. Changes
    - Ensures specified email has admin role
    - Updates role to admin if not already set

  2. Security
    - No changes to RLS policies
    - Safe to run multiple times
*/

DO $$
BEGIN
  -- Update the worker role to admin for the specified email
  UPDATE workers
  SET role = 'admin'
  WHERE email = 'damsevese@gmail.com'
  AND (role IS NULL OR role != 'admin');
  
  -- Verify the update
  IF NOT EXISTS (
    SELECT 1 FROM workers 
    WHERE email = 'damsevese@gmail.com' 
    AND role = 'admin'
  ) THEN
    -- Insert a new admin worker if none exists
    INSERT INTO workers (name, email, role)
    VALUES (
      'damsevese',
      'damsevese@gmail.com',
      'admin'
    )
    ON CONFLICT (email) DO NOTHING;
  END IF;
END $$;