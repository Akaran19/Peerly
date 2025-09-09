-- Add tier and usage tracking for billing system
-- Migration: 20250909000000_add_tier_and_usage_tables.sql

-- Add tier column to profiles table
alter table public.profiles
add column if not exists tier text check (tier in ('free','pro','lab')) default 'free';

-- Create usage_events table for tracking export usage
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('export')),
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.usage_events enable row level security;

-- Create RLS policies for usage_events
create policy "usage_read_own" on public.usage_events for select using (auth.uid() = user_id);
create policy "usage_write_own" on public.usage_events for insert with check (auth.uid() = user_id);
