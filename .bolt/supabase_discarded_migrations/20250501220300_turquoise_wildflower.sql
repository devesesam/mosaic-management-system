/*
  # Update worker access policies

  1. Changes
    - Drop existing user-specific policies
    - Create new policies allowing all authenticated users to access workers
    - Remove user_id column from workers table
  
  2. Security
    - Enable RLS on workers table
    - Add policies for authenticated users to perform CRUD operations
*/

-- First drop the existing policies
DROP POLICY IF EXISTS "Users can insert own workers" ON workers;
DROP POLICY IF EXISTS "Users can read own workers" ON workers;
DROP POLICY IF EXISTS "Users can update own workers" ON workers;
DROP POLICY IF EXISTS "Users can delete own workers" ON workers;

-- Now we can safely drop the user_id column
ALTER TABLE workers 
DROP COLUMN IF EXISTS user_id CASCADE;

-- Create new policies for all authenticated users
CREATE POLICY "Authenticated users can read workers"
ON workers FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert workers"
ON workers FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update workers"
ON workers FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete workers"
ON workers FOR DELETE 
TO authenticated 
USING (true);