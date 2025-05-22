/*
  # Add user_id to jobs table

  1. Changes
    - Add user_id column to jobs table
    - Update RLS policies to enforce user-based access
    - Add foreign key constraint to auth.users
    - Backfill existing jobs with current user

  2. Security
    - Enable RLS on jobs table
    - Add policies for user-specific access
*/

-- Add user_id column
ALTER TABLE jobs
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Update RLS policies
DROP POLICY IF EXISTS "Authenticated users can read jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can delete jobs" ON jobs;

CREATE POLICY "Users can read own jobs"
ON jobs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
ON jobs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
ON jobs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs"
ON jobs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);