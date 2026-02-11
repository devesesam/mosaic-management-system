/*
  # Fix worker deletion function

  1. New Functions
    - `delete_worker_with_jobs` - Safely deletes a worker and unassigns their jobs
  
  2. Changes
    - Creates a safer way to delete workers by first updating any jobs assigned to them
*/

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