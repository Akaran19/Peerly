-- Clerk third-party auth integration with RLS disabled for testing

-- Fix profiles table to use text ID for Clerk user IDs
ALTER TABLE public.profiles ALTER COLUMN id TYPE text;
DROP CONSTRAINT IF EXISTS profiles_pkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

-- Update user_papers table to use text for user_id
ALTER TABLE public.user_papers ALTER COLUMN user_id TYPE text;

-- Temporarily disable RLS for testing
ALTER TABLE public.user_papers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.papers DISABLE ROW LEVEL SECURITY;
