-- 202604210007_church_settings.sql

alter table public.churches
  add column if not exists default_list_write_mode text not null default 'admin_only'
    check (default_list_write_mode in ('admin_only','member_submit')),
  add column if not exists public_lists_enabled boolean not null default false;
