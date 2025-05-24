/*
  # Fix worker deletion function

  1. Changes
    - Drop existing function if it exists
    - Create function to safely delete workers and reassign their jobs
    - Function will:
      - Unassign jobs from the worker being deleted
      - Remove secondary worker associations
      - Delete the worker record
*/

-- First drop the function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'delete_worker_with_jobs' 
    AND pg_function_is_visible(oid)
  ) THEN
    DROP FUNCTION public.delete_worker_with_jobs(uuid);
  END IF;
END
$$;

-- Create function to safely delete a worker and handle their jobs
CREATE OR REPLACE FUNCTION public.delete_worker_with_jobs(worker_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First, update any jobs assigned to this worker to be unassigned
  UPDATE public.jobs
  SET worker_id = NULL,
      start_date = NULL,
      end_date = NULL
  WHERE worker_id = delete_worker_with_jobs.worker_id;

  -- Delete any secondary worker assignments
  DELETE FROM public.job_secondary_workers
  WHERE worker_id = delete_worker_with_jobs.worker_id;

  -- Finally, delete the worker
  DELETE FROM public.workers
  WHERE id = delete_worker_with_jobs.worker_id;
END;
$$;