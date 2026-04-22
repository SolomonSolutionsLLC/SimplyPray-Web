-- 202604210004_auto_subscribe.sql
-- When a church/group membership is created, auto-subscribe to all published lists in that scope.
-- When a list transitions to published, backfill subscriptions for all current scope members.

create or replace function public.auto_subscribe_for_church_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.status <> 'active' then
    return NEW;
  end if;
  insert into public.list_subscriptions (list_id, user_id)
  select sl.id, NEW.user_id
  from public.shared_lists sl
  where sl.church_id = NEW.church_id and sl.status = 'published'
  on conflict (list_id, user_id) do nothing;
  return NEW;
end $$;

drop trigger if exists trg_church_member_autosubscribe on public.church_members;
create trigger trg_church_member_autosubscribe
  after insert or update of status on public.church_members
  for each row execute function public.auto_subscribe_for_church_member();

create or replace function public.auto_subscribe_for_group_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.list_subscriptions (list_id, user_id)
  select sl.id, NEW.user_id
  from public.shared_lists sl
  where sl.group_id = NEW.group_id and sl.status = 'published'
  on conflict (list_id, user_id) do nothing;
  return NEW;
end $$;

drop trigger if exists trg_group_member_autosubscribe on public.group_members;
create trigger trg_group_member_autosubscribe
  after insert on public.group_members
  for each row execute function public.auto_subscribe_for_group_member();

create or replace function public.backfill_subscriptions_for_list()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.status = 'published' and (TG_OP = 'INSERT' or OLD.status is distinct from 'published') then
    if NEW.scope = 'church' then
      insert into public.list_subscriptions (list_id, user_id)
      select NEW.id, cm.user_id
      from public.church_members cm
      where cm.church_id = NEW.church_id and cm.status = 'active'
      on conflict (list_id, user_id) do nothing;
    elsif NEW.scope = 'group' then
      insert into public.list_subscriptions (list_id, user_id)
      select NEW.id, gm.user_id
      from public.group_members gm
      where gm.group_id = NEW.group_id
      on conflict (list_id, user_id) do nothing;
    end if;
    if NEW.published_at is null then
      update public.shared_lists set published_at = now() where id = NEW.id;
    end if;
  end if;
  return NEW;
end $$;

drop trigger if exists trg_shared_lists_backfill on public.shared_lists;
create trigger trg_shared_lists_backfill
  after insert or update of status on public.shared_lists
  for each row execute function public.backfill_subscriptions_for_list();
