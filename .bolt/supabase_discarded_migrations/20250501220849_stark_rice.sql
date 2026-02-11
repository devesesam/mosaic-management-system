/*
  # Add permanent unassigned worker

  1. Changes
    - Add is_permanent column to workers table
    - Create permanent unassigned worker
    - Update RLS policies to prevent deletion of permanent workers
*/

-- Add is_permanent column
ALTER TABLE workers
ADD COLUMN IF NOT EXISTS is_permanent boolean DEFAULT false;

-- Create the permanent unassigned worker if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM workers WHERE name = 'Unassigned' AND is_permanent = true
  ) THEN
    INSERT INTO workers (name, is_permanent)
    VALUES ('Unassigned', true);
  END IF;
END $$;

-- Update delete policy to prevent deletion of permanent workers
DROP POLICY IF EXISTS "Authenticated users can delete workers" ON workers;
CREATE POLICY "Authenticated users can delete non-permanent workers"
ON workers FOR DELETE 
TO authenticated 
USING (NOT is_permanent);