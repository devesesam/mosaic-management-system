-- Enable Row Level Security (RLS) on users table if not already enabled
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on the users table to avoid conflicts
DROP POLICY IF EXISTS "Allow public access to users" ON public.users;
DROP POLICY IF EXISTS "Allow public delete from users" ON public.users;
DROP POLICY IF EXISTS "Allow public insert to users" ON public.users;
DROP POLICY IF EXISTS "Allow public read access to users" ON public.users;
DROP POLICY IF EXISTS "Allow public update to users" ON public.users;

-- Create comprehensive public access policies for users table
CREATE POLICY "Allow public access to users" 
ON public.users 
FOR ALL 
TO PUBLIC 
USING (true) 
WITH CHECK (true);

-- Enable proper triggers for users table
DROP TRIGGER IF EXISTS ensure_worker_on_user_change ON public.users;
CREATE TRIGGER ensure_worker_on_user_change
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_worker_profile();