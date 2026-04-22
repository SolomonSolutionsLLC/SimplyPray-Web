-- 202604210001_groups.sql
-- Groups: church-scoped (church_id not null) or independent (church_id null).
-- Creator becomes admin via trigger.

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  church_id uuid references public.churches(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete restrict,
  visibility text not null default 'invite_only'
    check (visibility in ('open', 'invite_only')),
  is_church_sponsored boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_groups_church_id on public.groups(church_id);
create index if not exists idx_groups_created_by on public.groups(created_by);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('admin', 'moderator', 'member')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index if not exists idx_group_members_group_id on public.group_members(group_id);
create index if not exists idx_group_members_user_id on public.group_members(user_id);

create or replace function public.set_group_creator_as_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.group_members(group_id, user_id, role)
  values (NEW.id, NEW.created_by, 'admin')
  on conflict (group_id, user_id) do update set role = 'admin';
  return NEW;
end $$;

drop trigger if exists trg_groups_creator_admin on public.groups;
create trigger trg_groups_creator_admin
  after insert on public.groups
  for each row execute function public.set_group_creator_as_admin();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  NEW.updated_at = now();
  return NEW;
end $$;

drop trigger if exists trg_groups_touch on public.groups;
create trigger trg_groups_touch
  before update on public.groups
  for each row execute function public.touch_updated_at();
