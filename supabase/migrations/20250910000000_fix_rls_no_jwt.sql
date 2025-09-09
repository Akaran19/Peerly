-- Fix RLS policies to work without Clerk JWT tokens
-- This migration removes JWT dependencies and makes policies more permissive

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
END $$;

-- Drop existing policies that depend on JWT tokens
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies safely
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('profiles', 'papers', 'user_papers')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                      policy_record.policyname,
                      policy_record.schemaname,
                      policy_record.tablename);
        RAISE NOTICE 'Dropped policy: %.%', policy_record.tablename, policy_record.policyname;
    END LOOP;
END $$;

-- PROFILES POLICIES - Simplified for non-JWT authentication
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
CREATE POLICY "profiles_public_read" ON public.profiles
FOR SELECT USING (true);

DROP POLICY IF EXISTS "profiles_authenticated_insert" ON public.profiles;
CREATE POLICY "profiles_authenticated_insert" ON public.profiles
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_authenticated_update" ON public.profiles;
CREATE POLICY "profiles_authenticated_update" ON public.profiles
FOR UPDATE USING (true) WITH CHECK (true);

-- PAPERS POLICIES - Simplified for non-JWT authentication
DROP POLICY IF EXISTS "papers_public_read" ON public.papers;
CREATE POLICY "papers_public_read" ON public.papers
FOR SELECT USING (true);

DROP POLICY IF EXISTS "papers_authenticated_insert" ON public.papers;
CREATE POLICY "papers_authenticated_insert" ON public.papers
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "papers_authenticated_update" ON public.papers;
CREATE POLICY "papers_authenticated_update" ON public.papers
FOR UPDATE USING (true) WITH CHECK (true);

-- USER_PAPERS POLICIES - Simplified for non-JWT authentication
DROP POLICY IF EXISTS "user_papers_public_read" ON public.user_papers;
CREATE POLICY "user_papers_public_read" ON public.user_papers
FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_papers_authenticated_insert" ON public.user_papers;
CREATE POLICY "user_papers_authenticated_insert" ON public.user_papers
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "user_papers_authenticated_update" ON public.user_papers;
CREATE POLICY "user_papers_authenticated_update" ON public.user_papers
FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user_papers_authenticated_delete" ON public.user_papers;
CREATE POLICY "user_papers_authenticated_delete" ON public.user_papers
FOR DELETE USING (true);

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
    RAISE NOTICE '🎉 RLS Policies Updated for Non-JWT Authentication!';
    RAISE NOTICE 'RLS Status:';
    RAISE NOTICE 'profiles: %', (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles');
    RAISE NOTICE 'papers: %', (SELECT relrowsecurity FROM pg_class WHERE relname = 'papers');
    RAISE NOTICE 'user_papers: %', (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_papers');
    RAISE NOTICE 'Policies updated successfully for non-JWT authentication!';
END $$;
