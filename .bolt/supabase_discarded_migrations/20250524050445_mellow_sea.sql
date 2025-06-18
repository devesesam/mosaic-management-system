/*
  # Fix user policies to prevent infinite recursion

  1. Changes
     - Drop existing recursive policies on the users table
     - Create new policies that avoid self-referencing the users table
     - Use auth.jwt() to check roles instead of querying the users table itself
  
  2. Problem Solved
     - Fixes the "infinite recursion detected in policy for relation users" error
     - Maintains the same security model with admins having full control
*/

-- Drop the existing recursive policies
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;

-- Create new non-recursive policies
CREATE POLICY "Admins can insert users" 
  ON public.users 
  FOR INSERT 
  TO authenticated 
  WITH CHECK ((auth.jwt() ->> 'role')::text = 'admin');

CREATE POLICY "Users can read themselves and admins can read all" 
  ON public.users 
  FOR SELECT 
  TO authenticated 
  USING (((auth.jwt() ->> 'role')::text = 'admin') OR (auth.uid() = id));

CREATE POLICY "Admins can update users" 
  ON public.users 
  FOR UPDATE 
  TO authenticated 
  USING (((auth.jwt() ->> 'role')::text = 'admin'))
  WITH CHECK (((auth.jwt() ->> 'role')::text = 'admin'));

-- Update role claim function to store role in JWT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_role text := 'admin';
BEGIN
  -- Create a user record
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    default_role
  );

  -- Set the role claim in the JWT
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    raw_app_meta_data,
    '{role}',
    to_jsonb(default_role)
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- If the trigger doesn't exist, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;