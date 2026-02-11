/*
  # Fix authentication policies
  
  1. Changes
    - Update policies for jobs and workers tables to use authenticated role
    - Enable RLS on both tables
    - Add proper policies for CRUD operations
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Update jobs table policies
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON jobs;
CREATE POLICY "Enable read access for authenticated users"
ON jobs FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON jobs;
CREATE POLICY "Enable insert access for authenticated users"
ON jobs FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON jobs;
CREATE POLICY "Enable update access for authenticated users"
ON jobs FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON jobs;
CREATE POLICY "Enable delete access for authenticated users"
ON jobs FOR DELETE
TO authenticated
USING (true);

-- Update workers table policies
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON workers;
CREATE POLICY "Enable read access for authenticated users"
ON workers FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON workers;
CREATE POLICY "Enable insert access for authenticated users"
ON workers FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for authenticated users" ON workers;
CREATE POLICY "Enable update access for authenticated users"
ON workers FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON workers;
CREATE POLICY "Enable delete access for authenticated users"
ON workers FOR DELETE
TO authenticated
USING (true);