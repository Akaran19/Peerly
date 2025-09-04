-- Fix profiles table to work properly with Clerk authentication
-- Remove the foreign key constraint to auth.users since Clerk users don't exist there

-- Drop the foreign key constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Make id column not reference auth.users
-- Change id to be a regular uuid without foreign key
ALTER TABLE public.profiles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Create a function to get or create profile for Clerk users
CREATE OR REPLACE FUNCTION public.get_or_create_profile(
  p_clerk_id text,
  p_handle text DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_image text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_id uuid;
BEGIN
  -- Try to find existing profile
  SELECT id INTO profile_id
  FROM public.profiles
  WHERE clerk_id = p_clerk_id;

  -- If profile exists, return its ID
  IF profile_id IS NOT NULL THEN
    RETURN profile_id;
  END IF;

  -- Create new profile
  INSERT INTO public.profiles (clerk_id, handle, name, image)
  VALUES (p_clerk_id, p_handle, p_name, p_image)
  RETURNING id INTO profile_id;

  RETURN profile_id;
END;
$$;

-- Update RLS policies to allow profile operations
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_any" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_insert_any"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "profiles_update_any"
  ON public.profiles FOR UPDATE
  USING (true);
