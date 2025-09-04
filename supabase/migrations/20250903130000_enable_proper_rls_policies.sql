-- Enable proper RLS policies for Clerk authentication
-- This migration enables RLS and creates policies that work with Clerk JWT tokens

-- Enable RLS on tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;

-- Drop the temporary permissive policies
DROP POLICY IF EXISTS "allow_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_papers" ON public.papers;
DROP POLICY IF EXISTS "allow_all_user_papers" ON public.user_papers;

-- Create function to extract Clerk user ID from JWT
CREATE OR REPLACE FUNCTION public.get_clerk_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON public.profiles
FOR SELECT USING (
  clerk_id = get_clerk_user_id() OR
  get_clerk_user_id() IS NULL  -- Allow anonymous reads for public profiles
);

CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT WITH CHECK (
  clerk_id = get_clerk_user_id()
);

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE USING (
  clerk_id = get_clerk_user_id()
) WITH CHECK (
  clerk_id = get_clerk_user_id()
);

-- Papers policies (read-only for authenticated users)
CREATE POLICY "papers_select_all" ON public.papers
FOR SELECT USING (true);

CREATE POLICY "papers_insert_authenticated" ON public.papers
FOR INSERT WITH CHECK (
  get_clerk_user_id() IS NOT NULL
);

CREATE POLICY "papers_update_authenticated" ON public.papers
FOR UPDATE USING (
  get_clerk_user_id() IS NOT NULL
) WITH CHECK (
  get_clerk_user_id() IS NOT NULL
);

-- User papers policies
CREATE POLICY "user_papers_select_own" ON public.user_papers
FOR SELECT USING (
  user_id IN (
    SELECT id FROM public.profiles WHERE clerk_id = get_clerk_user_id()
  ) OR
  get_clerk_user_id() IS NULL  -- Allow anonymous reads for aggregate data
);

CREATE POLICY "user_papers_insert_own" ON public.user_papers
FOR INSERT WITH CHECK (
  user_id IN (
    SELECT id FROM public.profiles WHERE clerk_id = get_clerk_user_id()
  )
);

CREATE POLICY "user_papers_update_own" ON public.user_papers
FOR UPDATE USING (
  user_id IN (
    SELECT id FROM public.profiles WHERE clerk_id = get_clerk_user_id()
  )
) WITH CHECK (
  user_id IN (
    SELECT id FROM public.profiles WHERE clerk_id = get_clerk_user_id()
  )
);

CREATE POLICY "user_papers_delete_own" ON public.user_papers
FOR DELETE USING (
  user_id IN (
    SELECT id FROM public.profiles WHERE clerk_id = get_clerk_user_id()
  )
);
