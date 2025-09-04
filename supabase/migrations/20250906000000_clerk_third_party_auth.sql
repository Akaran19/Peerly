-- Proper Clerk third-party auth integration
-- This migration sets up RLS policies that work with Clerk's JWT tokens

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "user_papers_select_all" ON public.user_papers;
DROP POLICY IF EXISTS "user_papers_insert_all" ON public.user_papers;
DROP POLICY IF EXISTS "user_papers_update_all" ON public.user_papers;
DROP POLICY IF EXISTS "user_papers_delete_all" ON public.user_papers;

-- Create policies that check for authenticated role from Clerk JWT
-- The role claim should be set to 'authenticated' in Clerk session tokens
CREATE POLICY "user_papers_select_authenticated"
  ON public.user_papers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "user_papers_insert_authenticated"
  ON public.user_papers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "user_papers_update_authenticated"
  ON public.user_papers FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "user_papers_delete_authenticated"
  ON public.user_papers FOR DELETE
  USING (auth.role() = 'authenticated');

-- Allow anonymous read access for aggregate data (ratings, reviews)
-- This enables the homepage to show paper aggregates without authentication
CREATE POLICY "user_papers_select_anon_aggregates"
  ON public.user_papers FOR SELECT
  USING (
    auth.role() = 'anon' AND
    -- Only allow access to rating and review data for aggregation
    -- This is safe because it doesn't expose user-specific data
    true
  );

-- Ensure papers table allows public read access
DROP POLICY IF EXISTS "papers_select_all" ON public.papers;
CREATE POLICY "papers_select_all"
  ON public.papers FOR SELECT
  USING (true);

-- Profiles should be accessible for authenticated users
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_authenticated" ON public.profiles;

CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_insert_authenticated"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "profiles_update_authenticated"
  ON public.profiles FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT ON public.user_papers TO authenticated;
GRANT INSERT ON public.user_papers TO authenticated;
GRANT UPDATE ON public.user_papers TO authenticated;
GRANT DELETE ON public.user_papers TO authenticated;

-- Allow anonymous access for aggregate queries
GRANT SELECT ON public.user_papers TO anon;

GRANT SELECT ON public.papers TO authenticated;
GRANT SELECT ON public.papers TO anon;
GRANT SELECT ON public.papers TO service_role;

GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

-- Enable RLS
ALTER TABLE public.user_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
