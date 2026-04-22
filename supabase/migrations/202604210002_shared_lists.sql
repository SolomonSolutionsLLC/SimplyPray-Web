-- 202604210002_shared_lists.sql

create table if not exists public.shared_lists (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('church', 'group')),
  church_id uuid references public.churches(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  name text not null,
  description text,
  cadence text,
  write_mode text not null default 'admin_only'
    check (write_mode in ('admin_only', 'member_submit')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  public_page boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint scope_fk_consistency check (
    (scope = 'church' and church_id is not null and group_id is null)
    or (scope = 'group' and group_id is not null and church_id is null)
  )
);

create index if not exists idx_shared_lists_church on public.shared_lists(church_id) where church_id is not null;
create index if not exists idx_shared_lists_group on public.shared_lists(group_id) where group_id is not null;
create index if not exists idx_shared_lists_status on public.shared_lists(status);

drop trigger if exists trg_shared_lists_touch on public.shared_lists;
create trigger trg_shared_lists_touch
  before update on public.shared_lists
  for each row execute function public.touch_updated_at();
