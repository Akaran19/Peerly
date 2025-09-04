-- Update RLS policies to work with Clerk authentication
-- Since we're now using Clerk instead of Supabase Auth, we need to update the policies

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_upsert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "papers_select_all" ON public.papers;
DROP POLICY IF EXISTS "papers_insert_any_authed" ON public.papers;
DROP POLICY IF EXISTS "papers_update_none" ON public.papers;
DROP POLICY IF EXISTS "user_papers_select_all" ON public.user_papers;
DROP POLICY IF EXISTS "user_papers_ins_own" ON public.user_papers;
DROP POLICY IF EXISTS "user_papers_upd_own" ON public.user_papers;
DROP POLICY IF EXISTS "user_papers_del_own" ON public.user_papers;

-- Profiles policies (allow anyone to read, only authenticated users can modify their own)
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (clerk_id = get_clerk_user_id());

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (clerk_id = get_clerk_user_id());

-- Papers policies (anyone can read, authenticated users can insert)
CREATE POLICY "papers_select_all"
  ON public.papers FOR SELECT
  USING (true);

CREATE POLICY "papers_insert_clerk_authed"
  ON public.papers FOR INSERT
  WITH CHECK (get_clerk_user_id() IS NOT NULL);

CREATE POLICY "papers_update_none"
  ON public.papers FOR UPDATE
  USING (false);

-- User papers policies (anyone can read, users can only modify their own)
CREATE POLICY "user_papers_select_all"
  ON public.user_papers FOR SELECT
  USING (true);

CREATE POLICY "user_papers_insert_own"
  ON public.user_papers FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.profiles
      WHERE clerk_id = get_clerk_user_id()
    )
  );

CREATE POLICY "user_papers_update_own"
  ON public.user_papers FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM public.profiles
      WHERE clerk_id = get_clerk_user_id()
    )
  );

CREATE POLICY "user_papers_delete_own"
  ON public.user_papers FOR DELETE
  USING (
    user_id IN (
      SELECT id FROM public.profiles
      WHERE clerk_id = get_clerk_user_id()
    )
  );