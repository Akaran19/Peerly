-- Verify and ensure production RLS policies are enabled
-- This migration ensures RLS is properly configured for production launch

DO $$
DECLARE
    profiles_rls boolean;
    papers_rls boolean;
    user_papers_rls boolean;
BEGIN
    -- Check current RLS status
    SELECT relrowsecurity INTO profiles_rls FROM pg_class WHERE relname = 'profiles';
    SELECT relrowsecurity INTO papers_rls FROM pg_class WHERE relname = 'papers';
    SELECT relrowsecurity INTO user_papers_rls FROM pg_class WHERE relname = 'user_papers';

    RAISE NOTICE 'Current RLS Status:';
    RAISE NOTICE 'profiles: %', profiles_rls;
    RAISE NOTICE 'papers: %', papers_rls;
    RAISE NOTICE 'user_papers: %', user_papers_rls;

    -- Enable RLS if not already enabled
    IF NOT profiles_rls THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on profiles table';
    END IF;

    IF NOT papers_rls THEN
        ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on papers table';
    END IF;

    IF NOT user_papers_rls THEN
        ALTER TABLE public.user_papers ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on user_papers table';
    END IF;

    -- Verify policies exist
    RAISE NOTICE 'Checking for existing policies...';

    -- Count policies
    RAISE NOTICE 'Profiles policies: %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles');
    RAISE NOTICE 'Papers policies: %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'papers');
    RAISE NOTICE 'User_papers policies: %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_papers');
END $$;

-- Apply production RLS policies (from the enable_production_rls migration)
-- This ensures we have the correct policies even if they were dropped

-- Drop any existing policies first
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

-- Apply production policies
-- PROFILES POLICIES
CREATE POLICY "profiles_public_read" ON public.profiles
FOR SELECT USING (true);

CREATE POLICY "profiles_webhook_insert" ON public.profiles
FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_self_update" ON public.profiles
FOR UPDATE USING (clerk_id = current_setting('request.clerk_user_id', true))
WITH CHECK (clerk_id = current_setting('request.clerk_user_id', true));

-- PAPERS POLICIES
CREATE POLICY "papers_public_read" ON public.papers
FOR SELECT USING (true);

CREATE POLICY "papers_authenticated_insert" ON public.papers
FOR INSERT WITH CHECK (current_setting('request.clerk_user_id', true) IS NOT NULL);

CREATE POLICY "papers_authenticated_update" ON public.papers
FOR UPDATE USING (current_setting('request.clerk_user_id', true) IS NOT NULL)
WITH CHECK (current_setting('request.clerk_user_id', true) IS NOT NULL);

-- USER_PAPERS POLICIES
CREATE POLICY "user_papers_public_read" ON public.user_papers
FOR SELECT USING (true);

CREATE POLICY "user_papers_self_insert" ON public.user_papers
FOR INSERT WITH CHECK (
  user_id IN (
    SELECT id FROM public.profiles
    WHERE clerk_id = current_setting('request.clerk_user_id', true)
  )
);

CREATE POLICY "user_papers_self_update" ON public.user_papers
FOR UPDATE USING (
  user_id IN (
    SELECT id FROM public.profiles
    WHERE clerk_id = current_setting('request.clerk_user_id', true)
  )
) WITH CHECK (
  user_id IN (
    SELECT id FROM public.profiles
    WHERE clerk_id = current_setting('request.clerk_user_id', true)
  )
);

CREATE POLICY "user_papers_self_delete" ON public.user_papers
FOR DELETE USING (
  user_id IN (
    SELECT id FROM public.profiles
    WHERE clerk_id = current_setting('request.clerk_user_id', true)
  )
);

-- Grant permissions
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_papers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.papers TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.papers TO anon;
GRANT SELECT ON public.user_papers TO anon;

-- Final verification
DO $$
BEGIN
    RAISE NOTICE '🎉 Production RLS Setup Complete!';
    RAISE NOTICE 'RLS Status:';
    RAISE NOTICE 'profiles: %', (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles');
    RAISE NOTICE 'papers: %', (SELECT relrowsecurity FROM pg_class WHERE relname = 'papers');
    RAISE NOTICE 'user_papers: %', (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_papers');
    RAISE NOTICE 'Policies created successfully for production launch!';
END $$;
