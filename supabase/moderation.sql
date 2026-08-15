-- Bloque · moderation + account deletion (run in Supabase → SQL Editor)
-- Required for App Store review: account deletion (5.1.1) and UGC
-- report/block tools (1.2). Safe to re-run.

-- ------------------------------------------------ account deletion (5.1.1)
-- Deletes the caller's cloud account and all their data. Runs as the function
-- owner (postgres) so it can remove the auth.users row too.
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.routine_shares
    where shared_by = auth.uid() or shared_to = auth.uid();
  delete from public.blocked_users
    where blocker = auth.uid() or blocked = auth.uid();
  delete from public.content_reports where reporter = auth.uid();
  delete from public.users where id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_user_account() to authenticated;

-- --------------------------------------------------- blocked users (1.2)
create table if not exists public.blocked_users (
  blocker uuid references public.users(id) on delete cascade not null,
  blocked uuid references public.users(id) on delete cascade not null,
  created_at timestamptz default timezone('utc', now()) not null,
  primary key (blocker, blocked)
);

alter table public.blocked_users enable row level security;

drop policy if exists "manage own blocks" on public.blocked_users;
create policy "manage own blocks" on public.blocked_users
  for all using (auth.uid() = blocker) with check (auth.uid() = blocker);

-- ------------------------------------------------- content reports (1.2)
create table if not exists public.content_reports (
  id bigserial primary key,
  reporter uuid references public.users(id) on delete cascade not null,
  share_id bigint,
  reported_user uuid,
  reason text,
  created_at timestamptz default timezone('utc', now()) not null
);

alter table public.content_reports enable row level security;

drop policy if exists "insert own reports" on public.content_reports;
create policy "insert own reports" on public.content_reports
  for insert with check (auth.uid() = reporter);

-- -------------------------- enforce blocking when sharing a routine
-- A sender cannot share to someone who has blocked them.
drop policy if exists "sender can insert share" on public.routine_shares;
create policy "sender can insert share" on public.routine_shares
  for insert with check (
    auth.uid() = shared_by
    and not exists (
      select 1 from public.blocked_users b
      where b.blocker = shared_to and b.blocked = auth.uid()
    )
  );
