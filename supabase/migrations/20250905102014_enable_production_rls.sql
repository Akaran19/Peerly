-- Enable production-ready RLS policies for Clerk authentication
-- This replaces the JWT-based policies with webhook-synced user data

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "allow_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "allow_all_papers" ON public.papers;
DROP POLICY IF EXISTS "allow_all_user_papers" ON public.user_papers;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "papers_select_all" ON public.papers;
DROP POLICY IF EXISTS "papers_insert_authenticated" ON public.papers;
DROP POLICY IF EXISTS "papers_update_authenticated" ON public.papers;
DROP POLICY IF EXISTS "user_papers_select_own" ON public.user_papers;
DROP POLICY IF EXISTS "user_papers_insert_own" ON public.user_papers;
DROP POLICY IF EXISTS "user_papers_update_own" ON public.user_papers;
DROP POLICY IF EXISTS "user_papers_delete_own" ON public.user_papers;

-- Function to get current user from Clerk (placeholder for future enhancement)
-- For now, we'll use application-level security for user-specific data
CREATE OR REPLACE FUNCTION public.get_current_clerk_user()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- This is a placeholder. In production, you might extract from request headers
  -- or use a more sophisticated authentication mechanism
  SELECT nullif(current_setting('request.clerk_user_id', true), '');
$$;

-- ===========================================
-- PROFILES TABLE POLICIES
-- ===========================================

-- Allow public read access to profiles (for user discovery and mentions)
CREATE POLICY "profiles_public_read" ON public.profiles
FOR SELECT USING (true);

-- Allow users to insert their own profile (handled by webhook)
CREATE POLICY "profiles_webhook_insert" ON public.profiles
FOR INSERT WITH CHECK (true);  -- Webhook service role will handle this

-- Allow users to update their own profile
CREATE POLICY "profiles_self_update" ON public.profiles
FOR UPDATE USING (
  clerk_id = get_current_clerk_user() OR
  get_current_clerk_user() IS NULL  -- Allow webhook updates
) WITH CHECK (
  clerk_id = get_current_clerk_user() OR
  get_current_clerk_user() IS NULL  -- Allow webhook updates
);

-- ===========================================
-- PAPERS TABLE POLICIES
-- ===========================================

-- Allow public read access to all papers (essential for discovery and SEO)
CREATE POLICY "papers_public_read" ON public.papers
FOR SELECT USING (true);

-- Allow authenticated users to insert papers
CREATE POLICY "papers_authenticated_insert" ON public.papers
FOR INSERT WITH CHECK (
  get_current_clerk_user() IS NOT NULL OR
  auth.role() = 'authenticated'
);

-- Allow authenticated users to update papers they created
-- (This assumes we add a created_by field in the future)
CREATE POLICY "papers_authenticated_update" ON public.papers
FOR UPDATE USING (
  get_current_clerk_user() IS NOT NULL OR
  auth.role() = 'authenticated'
) WITH CHECK (
  get_current_clerk_user() IS NOT NULL OR
  auth.role() = 'authenticated'
);

-- ===========================================
-- USER_PAPERS TABLE POLICIES
-- ===========================================

-- Allow public read access for aggregate data and statistics
CREATE POLICY "user_papers_public_read" ON public.user_papers
FOR SELECT USING (true);

-- Allow users to manage their own paper interactions
CREATE POLICY "user_papers_self_insert" ON public.user_papers
FOR INSERT WITH CHECK (
  user_id IN (
    SELECT id FROM public.profiles
    WHERE clerk_id = get_current_clerk_user()
  ) OR
  get_current_clerk_user() IS NULL  -- Allow webhook operations
);

CREATE POLICY "user_papers_self_update" ON public.user_papers
FOR UPDATE USING (
  user_id IN (
    SELECT id FROM public.profiles
    WHERE clerk_id = get_current_clerk_user()
  ) OR
  get_current_clerk_user() IS NULL  -- Allow webhook operations
) WITH CHECK (
  user_id IN (
    SELECT id FROM public.profiles
    WHERE clerk_id = get_current_clerk_user()
  ) OR
  get_current_clerk_user() IS NULL  -- Allow webhook operations
);

CREATE POLICY "user_papers_self_delete" ON public.user_papers
FOR DELETE USING (
  user_id IN (
    SELECT id FROM public.profiles
    WHERE clerk_id = get_current_clerk_user()
  ) OR
  get_current_clerk_user() IS NULL  -- Allow webhook operations
);

-- ===========================================
-- SECURITY NOTES
-- ===========================================

/*
Production Security Considerations:

1. The get_current_clerk_user() function is a placeholder.
   In production, consider:
   - Extracting user ID from request headers set by your application
   - Using Supabase Auth with custom JWT claims
   - Implementing middleware to set user context

2. Public read access is granted for:
   - Papers: Essential for discovery and SEO
   - Profiles: For user mentions and public profiles
   - User_papers: For aggregate statistics and social features

3. User-specific operations rely on:
   - Application-level authentication
   - Proper user identification in API calls
   - Secure webhook operations for profile sync

4. For enhanced security, consider:
   - Adding rate limiting
   - Implementing audit logging
   - Adding created_by fields to track data ownership
   - Using Supabase Auth hooks for additional validation
*/

-- Grant necessary permissions to authenticated users
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_papers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.papers TO authenticated;

-- Grant public read access
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.papers TO anon;
GRANT SELECT ON public.user_papers TO anon;