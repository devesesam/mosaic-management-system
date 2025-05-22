/*
  # Add worker role support
  
  1. Updates
    - Add `role` column to workers table
    - Add constraint to ensure role is either 'admin' or 'viewer'
    - Existing workers default to 'admin' role
  
  2. Security
    - No changes to security policies (permissions are handled in the UI)
*/

-- Add role column to workers table with default 'admin'
ALTER TABLE workers 
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';

-- Add check constraint to limit role values
ALTER TABLE workers
ADD CONSTRAINT workers_role_check
CHECK (role IN ('admin', 'viewer'));