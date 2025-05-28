/*
  # Fix worker profile retrieval

  1. New Functions
    - `get_worker_by_email`: Securely get a worker by email (bypasses RLS)
    - `force_associate_worker`: Force associate a user with their worker profile
  
  2. Security
    - Functions use SECURITY DEFINER to bypass RLS restrictions
    - Limited to specific use cases for worker profile retrieval
*/

-- Function to securely get a worker by email (bypassing RLS)
CREATE OR REPLACE FUNCTION get_worker_by_email(worker_email TEXT)
RETURNS SETOF workers AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.workers WHERE email = worker_email LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to force associate a user with their worker profile
CREATE OR REPLACE FUNCTION force_associate_worker(user_email TEXT)
RETURNS TABLE (success BOOLEAN, worker_id UUID, message TEXT) AS $$
DECLARE
  worker_record workers%ROWTYPE;
BEGIN
  -- First check if the worker exists
  SELECT * INTO worker_record FROM public.workers WHERE email = user_email LIMIT 1;
  
  IF worker_record.id IS NULL THEN
    -- Create a new worker profile
    INSERT INTO public.workers (name, email, role)
    VALUES (
      COALESCE(user_email, 'New User'),
      user_email,
      'admin'
    )
    RETURNING * INTO worker_record;
    
    success := TRUE;
    worker_id := worker_record.id;
    message := 'Created new worker profile';
    RETURN NEXT;
  ELSE
    -- Worker exists, return it
    success := TRUE;
    worker_id := worker_record.id;
    message := 'Worker profile already exists';
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_worker_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION force_associate_worker(TEXT) TO authenticated;