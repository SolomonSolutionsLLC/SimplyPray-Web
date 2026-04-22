-- 202604210006_rls.sql

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.shared_lists enable row level security;
alter table public.shared_requests enable row level security;
alter table public.list_subscriptions enable row level security;

-- groups -----------------------------------------------------------
create policy groups_select on public.groups for select using (
  exists (select 1 from public.group_members gm where gm.group_id = id and gm.user_id = auth.uid())
  or (church_id is not null and exists (
    select 1 from public.church_members cm
    where cm.church_id = groups.church_id and cm.user_id = auth.uid()
          and cm.status='active' and cm.role in ('owner','admin')
  ))
  or (is_church_sponsored = true and church_id is not null and exists (
    select 1 from public.church_members cm
    where cm.church_id = groups.church_id and cm.user_id = auth.uid() and cm.status='active'
  ))
);

create policy groups_insert on public.groups for insert to authenticated
  with check (created_by = auth.uid());

create policy groups_update on public.groups for update using (
  exists (select 1 from public.group_members gm
          where gm.group_id = id and gm.user_id = auth.uid() and gm.role='admin')
) with check (
  exists (select 1 from public.group_members gm
          where gm.group_id = id and gm.user_id = auth.uid() and gm.role='admin')
);

create policy groups_delete on public.groups for delete using (
  exists (select 1 from public.group_members gm
          where gm.group_id = id and gm.user_id = auth.uid() and gm.role='admin')
);

-- group_members ----------------------------------------------------
create policy gm_select on public.group_members for select using (
  user_id = auth.uid()
  or exists (select 1 from public.group_members self
             where self.group_id = group_members.group_id and self.user_id = auth.uid())
);

create policy gm_insert on public.group_members for insert to authenticated with check (
  exists (select 1 from public.group_members gm
          where gm.group_id = group_members.group_id and gm.user_id = auth.uid() and gm.role='admin')
  or (user_id = auth.uid() and exists (
    select 1 from public.groups g where g.id = group_members.group_id and g.visibility='open'
  ))
);

create policy gm_update on public.group_members for update using (
  exists (select 1 from public.group_members gm
          where gm.group_id = group_members.group_id and gm.user_id = auth.uid() and gm.role='admin')
);

create policy gm_delete on public.group_members for delete using (
  user_id = auth.uid()
  or exists (select 1 from public.group_members gm
             where gm.group_id = group_members.group_id and gm.user_id = auth.uid() and gm.role='admin')
);

-- shared_lists -----------------------------------------------------
create policy sl_select on public.shared_lists for select using (
  (scope='church' and exists (
    select 1 from public.church_members cm
    where cm.church_id = shared_lists.church_id and cm.user_id = auth.uid() and cm.status='active'
  ))
  or (scope='group' and exists (
    select 1 from public.group_members gm
    where gm.group_id = shared_lists.group_id and gm.user_id = auth.uid()
  ))
);

create policy sl_select_public on public.shared_lists for select to anon using (
  public_page = true and status='published'
);

create policy sl_insert on public.shared_lists for insert to authenticated with check (
  (scope='church' and exists (
    select 1 from public.church_members cm
    where cm.church_id = shared_lists.church_id and cm.user_id = auth.uid()
          and cm.status='active' and cm.role in ('owner','admin')
  ))
  or (scope='group' and exists (
    select 1 from public.group_members gm
    where gm.group_id = shared_lists.group_id and gm.user_id = auth.uid() and gm.role='admin'
  ))
);

create policy sl_update on public.shared_lists for update using (
  (scope='church' and exists (
    select 1 from public.church_members cm
    where cm.church_id = shared_lists.church_id and cm.user_id = auth.uid()
          and cm.status='active' and cm.role in ('owner','admin')
  ))
  or (scope='group' and exists (
    select 1 from public.group_members gm
    where gm.group_id = shared_lists.group_id and gm.user_id = auth.uid() and gm.role in ('admin','moderator')
  ))
);

create policy sl_delete on public.shared_lists for delete using (
  (scope='church' and exists (
    select 1 from public.church_members cm
    where cm.church_id = shared_lists.church_id and cm.user_id = auth.uid()
          and cm.status='active' and cm.role in ('owner','admin')
  ))
  or (scope='group' and exists (
    select 1 from public.group_members gm
    where gm.group_id = shared_lists.group_id and gm.user_id = auth.uid() and gm.role='admin'
  ))
);

-- shared_requests --------------------------------------------------
create or replace function public.is_list_moderator(p_list_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.shared_lists sl
    where sl.id = p_list_id and (
      (sl.scope='church' and exists (
        select 1 from public.church_members cm
        where cm.church_id = sl.church_id and cm.user_id = auth.uid()
              and cm.status='active' and cm.role in ('owner','admin')
      ))
      or (sl.scope='group' and exists (
        select 1 from public.group_members gm
        where gm.group_id = sl.group_id and gm.user_id = auth.uid() and gm.role in ('admin','moderator')
      ))
    )
  )
$$;

grant execute on function public.is_list_moderator(uuid) to authenticated, anon;

create policy sr_select on public.shared_requests for select using (
  public.is_list_moderator(list_id)
  or submitted_by = auth.uid()
  or (status in ('active','answered') and exists (
    select 1 from public.list_subscriptions ls
    where ls.list_id = shared_requests.list_id and ls.user_id = auth.uid()
  ))
);

create policy sr_select_public on public.shared_requests for select to anon using (
  status in ('active','answered') and exists (
    select 1 from public.shared_lists sl
    where sl.id = list_id and sl.public_page = true and sl.status = 'published'
  )
);

create policy sr_insert_mod on public.shared_requests for insert to authenticated with check (
  public.is_list_moderator(list_id)
);

create policy sr_insert_member_submit on public.shared_requests for insert to authenticated with check (
  status = 'pending'
  and submitted_by = auth.uid()
  and exists (
    select 1 from public.list_subscriptions ls
    where ls.list_id = shared_requests.list_id and ls.user_id = auth.uid()
  )
  and exists (
    select 1 from public.shared_lists sl
    where sl.id = shared_requests.list_id and sl.write_mode = 'member_submit'
  )
);

create policy sr_update on public.shared_requests for update using (
  public.is_list_moderator(list_id)
);

create policy sr_delete on public.shared_requests for delete using (
  public.is_list_moderator(list_id)
);

-- list_subscriptions ----------------------------------------------
create policy ls_select_self on public.list_subscriptions for select using (
  user_id = auth.uid()
);

create policy ls_update_self on public.list_subscriptions for update using (
  user_id = auth.uid()
) with check (
  user_id = auth.uid()
);

create policy ls_delete_self on public.list_subscriptions for delete using (
  user_id = auth.uid()
);
