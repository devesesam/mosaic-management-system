/*
  # Enable Row Level Security on workers table

  1. Changes
    - Enable Row Level Security on the workers table
    - This ensures the RLS policies already defined can actually take effect
  
  2. Background
    - The table has RLS policies defined but RLS is not enabled
    - This causes requests to timeout as the policies are checked but not enforced
*/

-- Enable RLS on the workers table
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;