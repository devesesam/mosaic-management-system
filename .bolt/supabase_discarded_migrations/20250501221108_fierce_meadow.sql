/*
  # Remove unassigned worker and cleanup policies

  1. Changes
    - Delete the unassigned worker
    - Drop the existing delete policy that depends on is_permanent
    - Remove the is_permanent column
    - Create new delete policy for all workers

  2. Security
    - Update delete policy to allow authenticated users to delete any worker
*/

-- First drop the policy that depends on is_permanent
DROP POLICY IF EXISTS "Authenticated users can delete non-permanent workers" ON workers;

-- Then delete the unassigned worker
DELETE FROM workers 
WHERE name = 'Unassigned' AND is_permanent = true;

-- Now we can safely remove the is_permanent column
ALTER TABLE workers 
DROP COLUMN IF EXISTS is_permanent;

-- Create new policy to allow deletion of all workers
CREATE POLICY "Authenticated users can delete workers"
ON workers FOR DELETE 
TO authenticated 
USING (true);