/*
  # Fix worker deletion constraint

  1. Changes
    - Modify jobs_worker_id_fkey to add ON DELETE SET NULL
    This allows deleting workers while preserving their jobs (jobs become unassigned)

  2. Security
    - No changes to RLS policies
*/

-- First drop the existing constraint
ALTER TABLE jobs 
DROP CONSTRAINT IF EXISTS jobs_worker_id_fkey;

-- Re-add the constraint with ON DELETE SET NULL
ALTER TABLE jobs
ADD CONSTRAINT jobs_worker_id_fkey 
FOREIGN KEY (worker_id) 
REFERENCES workers(id) 
ON DELETE SET NULL;