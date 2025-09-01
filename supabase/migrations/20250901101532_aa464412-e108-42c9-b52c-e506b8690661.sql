-- Enable pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- profiles: one row per user (id matches auth.users.id)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique,
  name text,
  image text,
  created_at timestamptz default now()
);

-- papers: minimal paper record
create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  doi text unique not null,  -- normalized: lowercase, no doi.org/
  title text not null,
  abstract text,
  year int,
  journal text,
  meta jsonb,
  created_at timestamptz default now()
);

-- user_papers: user shelves + rating/review
create table if not exists public.user_papers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  paper_id uuid not null references public.papers(id) on delete cascade,
  shelf text not null check (shelf in ('WANT','READING','READ')),
  rating int check (rating between 1 and 5),
  review text,
  upvotes int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, paper_id)
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_user_papers_updated_at on public.user_papers;
create trigger trg_user_papers_updated_at
before update on public.user_papers
for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.papers enable row level security;
alter table public.user_papers enable row level security;

-- Policies: profiles
create policy "profiles_select_all"
on public.profiles for select
using (true);

create policy "profiles_upsert_self"
on public.profiles for insert
with check (auth.uid() = id);

create policy "profiles_update_self"
on public.profiles for update
using (auth.uid() = id);

-- Policies: papers
create policy "papers_select_all"
on public.papers for select
using (true);

create policy "papers_insert_any_authed"
on public.papers for insert
with check (auth.role() = 'authenticated');

create policy "papers_update_none" on public.papers for update using (false);

-- Policies: user_papers
create policy "user_papers_select_all"
on public.user_papers for select
using (true);

create policy "user_papers_ins_own"
on public.user_papers for insert
with check (auth.uid() = user_id);

create policy "user_papers_upd_own"
on public.user_papers for update
using (auth.uid() = user_id);

create policy "user_papers_del_own"
on public.user_papers for delete
using (auth.uid() = user_id);

-- Helpful indexes
create index if not exists idx_papers_doi on public.papers(doi);
create index if not exists idx_user_papers_user on public.user_papers(user_id);
create index if not exists idx_user_papers_paper on public.user_papers(paper_id);