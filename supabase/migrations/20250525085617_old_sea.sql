/*
  # Fix RLS policy performance issue
  
  1. Security
    - Improve performance of RLS policy for the users table
    - Replace direct calls to auth.uid() with (SELECT auth.uid()) for better performance
*/

-- First, drop the existing policy with the performance issue
DROP POLICY IF EXISTS "Allow users to update their own user" ON users;

-- Recreate the policy with the optimized pattern
CREATE POLICY "Allow users to update their own user" ON users
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);