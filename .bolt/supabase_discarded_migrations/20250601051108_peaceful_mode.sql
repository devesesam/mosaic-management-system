-- Enable RLS on users table if not already enabled
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public access to users table
CREATE POLICY "Allow public access to users" ON public.users
FOR ALL
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public read access to users" ON public.users
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public insert to users" ON public.users
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public update to users" ON public.users
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public delete from users" ON public.users
FOR DELETE
TO public
USING (true);