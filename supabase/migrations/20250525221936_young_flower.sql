/*
  # Update RLS policies for worker visibility

  1. Changes
    - Modify workers table RLS policies to allow workers to see their own records
    - Keep existing policies for jobs and secondary workers
    - Add specific policy for worker self-access

  2. Security
    - Workers can read their own records
    - Admins maintain full access
    - Preserves existing job access
*/

-- Drop existing workers policies
DROP POLICY IF EXISTS "Allow authenticated users to read workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to insert workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to update workers" ON workers;
DROP POLICY IF EXISTS "Allow authenticated users to delete workers" ON workers;

-- Create updated workers policies
CREATE POLICY "Workers can read their own records"
  ON workers
  FOR SELECT
  TO authenticated
  USING (
    email = auth.jwt() ->> 'email' OR
    role = 'admin'
  );

CREATE POLICY "Admins can insert workers"
  ON workers
  FOR INSERT
  TO authenticated
  WITH CHECK (role = 'admin');

CREATE POLICY "Workers can update their own records"
  ON workers
  FOR UPDATE
  TO authenticated
  USING (
    email = auth.jwt() ->> 'email' OR
    role = 'admin'
  )
  WITH CHECK (role = 'admin');

CREATE POLICY "Admins can delete workers"
  ON workers
  FOR DELETE
  TO authenticated
  USING (role = 'admin');