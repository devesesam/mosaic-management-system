-- Migration: Auto-create team member on signup
-- Created: 2026-03-03
-- Description: Automatically create a workers entry when a user signs up in Supabase Auth

-- ==================================================
-- 1. Create function to handle new user signup
-- ==================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workers (id, name, email, role, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'admin',
    NOW()
  )
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- 2. Create trigger on auth.users insert
-- ==================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==================================================
-- 3. Backfill existing auth users who don't have worker entries
-- ==================================================
INSERT INTO public.workers (id, name, email, role, created_at)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
  au.email,
  'admin',
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.workers w WHERE w.email = au.email
)
ON CONFLICT (email) DO NOTHING;

-- ==================================================
-- Note: This ensures any user who signs up automatically
-- gets a corresponding entry in the workers table, making
-- them visible in the calendar.
-- ==================================================
