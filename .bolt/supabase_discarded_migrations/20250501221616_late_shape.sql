/*
  # Add delete_worker_with_jobs function

  1. New Functions
    - `delete_worker_with_jobs`: A PostgreSQL function that safely deletes a worker and unassigns their jobs
      - Takes a worker_id parameter
      - Updates all jobs to remove the worker assignment
      - Deletes the worker record
      - Returns true on success

  2. Security
    - Function is accessible to authenticated users only
*/

CREATE OR REPLACE FUNCTION delete_worker_with_jobs(worker_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First update all jobs to remove the worker assignment
  UPDATE jobs
  SET worker_id = NULL
  WHERE worker_id = $1;

  -- Then delete the worker
  DELETE FROM workers
  WHERE id = $1;

  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_worker_with_jobs TO authenticated;