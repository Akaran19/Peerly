-- Update RLS policies to allow guest users to insert papers
-- This migration updates the papers table policies to allow unauthenticated users to insert papers

-- Drop the old restrictive policy
drop policy if exists "papers_insert_any_authed" on public.papers;

-- Create new policy that allows anyone to insert papers
create policy "papers_insert_any"
on public.papers for insert
with check (true);
