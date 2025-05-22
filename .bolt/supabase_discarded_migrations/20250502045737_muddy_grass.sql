/*
  # Make jobs accessible to all authenticated users
  
  1. Changes
    - Remove user_id foreign key constraint from jobs table
    - Update RLS policies to allow all authenticated users to access jobs
    - Drop existing user-specific policies
    
  2. Security
    - Maintain RLS enabled
    - All authenticated users can perform CRUD operations on jobs
*/

-- First drop the existing policies
DROP POLICY IF EXISTS "Users can delete own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can insert own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can read own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON jobs;

-- Drop the user_id foreign key constraint
ALTER TABLE jobs
DROP CONSTRAINT IF EXISTS jobs_user_id_fkey;

-- Drop the user_id column
ALTER TABLE jobs
DROP COLUMN IF EXISTS user_id;

-- Create new policies for all authenticated users
CREATE POLICY "Authenticated users can read jobs"
ON jobs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert jobs"
ON jobs FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update jobs"
ON jobs FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete jobs"
ON jobs FOR DELETE 
TO authenticated 
USING (true);