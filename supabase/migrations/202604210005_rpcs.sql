-- 202604210005_rpcs.sql

create or replace function public.get_shared_list_stats(p_list_id uuid)
returns table (
  subscriber_count int,
  active_requests int,
  answered_count int
)
language sql security definer set search_path = public as $$
  select
    (select count(*)::int from public.list_subscriptions where list_id = p_list_id),
    (select count(*)::int from public.shared_requests where list_id = p_list_id and status = 'active'),
    (select count(*)::int from public.shared_requests where list_id = p_list_id and status = 'answered')
$$;

grant execute on function public.get_shared_list_stats(uuid) to authenticated, anon;

create or replace function public.publish_list(p_list_id uuid)
returns public.shared_lists
language plpgsql security definer set search_path = public as $$
declare
  v_list public.shared_lists;
  v_uid uuid := auth.uid();
  v_allowed boolean := false;
begin
  select * into v_list from public.shared_lists where id = p_list_id for update;
  if not found then
    raise exception 'list not found';
  end if;

  if v_list.scope = 'church' then
    select exists(
      select 1 from public.church_members
      where church_id = v_list.church_id and user_id = v_uid
            and status='active' and role in ('owner','admin')
    ) into v_allowed;
  else
    select exists(
      select 1 from public.group_members
      where group_id = v_list.group_id and user_id = v_uid
            and role in ('admin','moderator')
    ) into v_allowed;
  end if;

  if not v_allowed then
    raise exception 'not authorized to publish this list';
  end if;

  update public.shared_lists
    set status = 'published',
        published_at = coalesce(published_at, now())
    where id = p_list_id
    returning * into v_list;

  return v_list;
end $$;

grant execute on function public.publish_list(uuid) to authenticated;
