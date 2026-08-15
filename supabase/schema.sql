-- Bloque · Supabase schema (run in Supabase → SQL Editor)
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS.
--
-- Deviation from the original handoff spec: routine_shares carries the routine
-- as a JSONB payload instead of a routine_id FK, because routines live in each
-- device's local DB (offline-first). The recipient clones the payload locally.

-- ---------------------------------------------------------------- users
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  email text,
  created_at timestamptz default timezone('utc', now()) not null
);

alter table public.users enable row level security;

-- Usernames are public so people can be found to share with.
drop policy if exists "users are readable" on public.users;
create policy "users are readable"
  on public.users for select using (true);

drop policy if exists "insert own profile" on public.users;
create policy "insert own profile"
  on public.users for insert with check (auth.uid() = id);

drop policy if exists "update own profile" on public.users;
create policy "update own profile"
  on public.users for update using (auth.uid() = id);

-- ------------------------------------------------------- routine_shares
create table if not exists public.routine_shares (
  id bigserial primary key,
  routine_payload jsonb not null,           -- SharedRoutine tree (no ids)
  shared_by uuid references public.users(id) on delete cascade not null,
  shared_to uuid references public.users(id) on delete cascade not null,
  status text check (status in ('PENDING','ACCEPTED','REJECTED'))
    default 'PENDING' not null,
  created_at timestamptz default timezone('utc', now()) not null
);

alter table public.routine_shares enable row level security;

-- Sender and recipient can both read the share.
drop policy if exists "shares readable by parties" on public.routine_shares;
create policy "shares readable by parties"
  on public.routine_shares for select
  using (auth.uid() = shared_by or auth.uid() = shared_to);

-- Only the sender can create a share, and only as themselves.
drop policy if exists "sender can insert share" on public.routine_shares;
create policy "sender can insert share"
  on public.routine_shares for insert
  with check (auth.uid() = shared_by);

-- Only the recipient can change status (accept/reject).
drop policy if exists "recipient can update status" on public.routine_shares;
create policy "recipient can update status"
  on public.routine_shares for update
  using (auth.uid() = shared_to);
