-- 202604210003_requests_and_subscriptions.sql

create table if not exists public.shared_requests (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shared_lists(id) on delete cascade,
  title text not null,
  body text,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'answered', 'removed')),
  submitted_by uuid not null references auth.users(id) on delete restrict,
  moderated_by uuid references auth.users(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shared_requests_list on public.shared_requests(list_id);
create index if not exists idx_shared_requests_status on public.shared_requests(status);

drop trigger if exists trg_shared_requests_touch on public.shared_requests;
create trigger trg_shared_requests_touch
  before update on public.shared_requests
  for each row execute function public.touch_updated_at();

create table if not exists public.list_subscriptions (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shared_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hidden boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (list_id, user_id)
);

create index if not exists idx_list_subscriptions_user on public.list_subscriptions(user_id);
create index if not exists idx_list_subscriptions_list on public.list_subscriptions(list_id);
