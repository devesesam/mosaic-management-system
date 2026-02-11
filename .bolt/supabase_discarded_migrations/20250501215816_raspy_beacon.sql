/*
  # Add user_id to workers table and update policies

  1. Changes
    - Add user_id column to workers table
    - Update RLS policies to scope workers to authenticated users
    - Add foreign key constraint to users table

  2. Security
    - Enable RLS on workers table
    - Add policies for CRUD operations scoped to user_id
*/

-- Add user_id column to workers table
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Update RLS policies
DROP POLICY IF EXISTS "Authenticated users can insert workers" ON workers;
DROP POLICY IF EXISTS "Authenticated users can read workers" ON workers;
DROP POLICY IF EXISTS "Authenticated users can update workers" ON workers;

CREATE POLICY "Users can insert own workers"
ON workers FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own workers"
ON workers FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own workers"
ON workers FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workers"
ON workers FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);