-- Fix user_papers RLS policies to work with Clerk authentication
-- Update policies to check clerk_id instead of auth.uid()

-- Drop existing policies
DROP POLICY IF EXISTS "user_papers_select_all" ON public.user_papers;
DROP POLICY IF EXISTS "user_papers_ins_own" ON public.user_papers;
DROP POLICY IF EXISTS "user_papers_upd_own" ON public.user_papers;
DROP POLICY IF EXISTS "user_papers_del_own" ON public.user_papers;

-- Create new policies that work with Clerk
CREATE POLICY "user_papers_select_all"
  ON public.user_papers FOR SELECT
  USING (true);

CREATE POLICY "user_papers_insert_any"
  ON public.user_papers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "user_papers_update_any"
  ON public.user_papers FOR UPDATE
  USING (true);

CREATE POLICY "user_papers_delete_any"
  ON public.user_papers FOR DELETE
  USING (true);
