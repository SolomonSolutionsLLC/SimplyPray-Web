# Shared Lists — Design

**Date:** 2026-04-21
**Status:** Approved — ready for implementation planning
**Scope:** SimplyPray-Web (admin portal + public page) + SimplyPray iOS (Supabase client migration)

## 1. Goals

Admins publish prayer lists to groups of people. Every member of the scope automatically sees the list in their prayer app. Two scopes:

- **Church-wide.** Church `owner`/`admin` publishes a list. Every active `church_member` auto-subscribes. Members cannot opt out of visibility at the system level (can hide locally via `list_subscriptions.hidden`).
- **Group.** Any user creates a group and becomes its admin. Group can be church-scoped (nested inside a church, church-sponsored groups auto-discoverable to church members) or independent (`church_id` null, cross-church / individual-only).

Supabase is the single source of truth. iOS migrates from its current Go/Node + E2EE backend to the Supabase client. This enables reader-app framing for App Store (external paid links allowed).

## 2. Non-goals (MVP)

- End-to-end encryption. Content is plaintext at rest, protected by RLS + TLS. Defer E2EE until a customer requires it.
- Categories on requests.
- Auto-archive after N days.
- Weekly digest email.
- Public list page with write access (public page is read-only).

## 3. Data model

All tables in the public schema. All user FKs reference `auth.users`.

### `groups`
```
id                  uuid pk
church_id           uuid null fk → churches         -- null = independent
name                text not null
description         text
created_by          uuid not null fk → auth.users   -- auto-admin
visibility          text not null default 'invite_only'  -- 'open' | 'invite_only'
is_church_sponsored bool not null default false     -- church admin created → listed to church members, opt-in join
created_at, updated_at timestamptz
```

### `group_members`
```
id         uuid pk
group_id   uuid fk → groups
user_id    uuid fk → auth.users
role       text not null  -- 'admin' | 'moderator' | 'member'
joined_at  timestamptz default now()
unique(group_id, user_id)
```

Group creator gets `role='admin'` on creation.

### `shared_lists`
```
id           uuid pk
scope        text not null  -- 'church' | 'group'
church_id    uuid null fk → churches
group_id     uuid null fk → groups
name         text not null
description  text
cadence      text           -- free text display label set by admin
write_mode   text not null default 'admin_only'  -- 'admin_only' | 'member_submit'
status       text not null default 'draft'       -- 'draft' | 'published' | 'archived'
public_page  bool not null default false         -- only meaningful when scope='church'
created_by   uuid not null fk → auth.users
created_at, updated_at, published_at timestamptz

check: (scope='church' and church_id is not null and group_id is null)
    or (scope='group'  and group_id  is not null and church_id is null)
```

### `shared_requests`
```
id           uuid pk
list_id      uuid fk → shared_lists
title        text not null
body         text
status       text not null default 'pending'   -- 'pending' | 'active' | 'answered' | 'removed'
submitted_by uuid not null fk → auth.users
moderated_by uuid null fk → auth.users
answered_at  timestamptz null
created_at, updated_at timestamptz
```

Lifecycle:
- Admin writes `active` directly.
- Member on `member_submit` list writes `pending`; moderator transitions `pending → active | removed`.
- Anyone with write rights transitions `active → answered` (moves to thanksgiving bucket; stays visible).
- Moderator can transition anything to `removed`.

### `list_subscriptions`
```
id          uuid pk
list_id     uuid fk → shared_lists
user_id     uuid fk → auth.users
hidden      bool not null default false
sort_order  int  not null default 0
created_at  timestamptz default now()
unique(list_id, user_id)
```

Per-user preferences. Hide and reorder without mutating the source list.

## 4. Triggers & functions

### Auto-subscribe on join
`after insert on church_members when status='active'`:
insert `list_subscriptions` rows for every `shared_lists where church_id = NEW.church_id and status='published'`.

`after insert on group_members`:
insert subscriptions for every `shared_lists where group_id = NEW.group_id and status='published'`.

### Backfill on publish
`after update on shared_lists when OLD.status != 'published' and NEW.status = 'published'`:
insert subscriptions for all current members of the list's scope.

### SECURITY DEFINER: `publish_list(p_list_id uuid)`
Atomic: asserts caller is list-admin, sets `status='published'`, sets `published_at=now()`, triggers backfill.

### SECURITY DEFINER: `get_shared_list_stats(p_list_id uuid)`
Returns `{ subscriber_count int, active_requests int, answered_count int }`. Used by admin dashboard and by mobile clients for "N praying" display. Never exposes individual subscriber identities.

### SECURITY DEFINER: `auto_subscribe_existing_members(p_list_id uuid)`
Called by publish flow; does the membership→subscription join insert. Idempotent via `on conflict do nothing`.

## 5. Row-level security

### `shared_lists`
- **select:** user is active `church_members` of `church_id` OR active `group_members` of `group_id`. `anon` role may select where `public_page=true and status='published'`.
- **insert:** user is church `owner|admin` (scope='church') OR group `admin` (scope='group').
- **update:** same as insert, plus group `moderator` may update status.
- **delete:** list creator or church `owner`/group `admin`.

### `shared_requests`
- **select:** user is subscribed to list AND (status in `('active','answered')` OR user is list admin/moderator OR `submitted_by = user`). Public-page read: `anon` may select where list `public_page=true` and request `status in ('active','answered')`.
- **insert:** user is admin/moderator (any status) OR user is subscribed AND list `write_mode='member_submit'` (forced to `pending`).
- **update:** admin/moderator only.
- **delete:** admin only; prefer `status='removed'` soft-delete.

### `list_subscriptions`
- **select/update/delete:** `user_id = auth.uid()` only. No one — including admins — queries others' subscription rows. Counts come from RPC.
- **insert:** only via trigger (SECURITY DEFINER).

### `groups`
- **select:** creator, any `group_members`, OR church admin when `church_id` matches their church.
- **insert:** authenticated.
- **update/delete:** group `admin` only.

### `group_members`
- **select:** own row, or fellow group members.
- **insert/delete:** group `admin` (self-leave = user can delete own row if not last admin).
- **update:** group `admin`.

## 6. Web admin UI

### New routes (`packages/app/src/app/(dashboard)/dashboard/`)
- `shared-lists/page.tsx` — grid/tabs Published/Drafts/Archived, search, filter by scope.
- `shared-lists/new/page.tsx` — create list: name, description, scope (church | group picker), cadence, write_mode.
- `shared-lists/[id]/page.tsx` — edit metadata, publish/unpublish/archive, delete.
- `shared-lists/[id]/requests/page.tsx` — request management: moderation queue (pending), active requests, answered archive, remove/answer actions.

### Updated routes
- `dashboard/page.tsx` — add Shared Lists summary card, Recent Shared Requests card, aggregate stats (Active Members, Shared Lists count, Shared Requests active, Answered this month).
- `dashboard/members/page.tsx` — add Inactive 120+ tab using `last_seen_at`.
- `dashboard/settings/page.tsx` — add toggles: "Require approval before publishing" (sets default `write_mode` for new lists), "Allow public shared-list page" (sets `churches.public_lists_enabled`).

### New public route (`packages/app/src/app/(public)/`)
- `church/[slug]/page.tsx` — read-only rendered view of a church's `public_page=true, status='published'` shared lists and their active/answered requests. Uses `anon` RLS.

### Design system migration
- Extend `tailwind.config.ts` with bundle palette: `sanctuary` (deep green) + `parchment` (cream) + `brass` accent + `inkSoft` etc. — mapped from portal.css CSS variables.
- Add `next/font` imports for Cormorant Garamond, DM Sans, JetBrains Mono in root layout.
- Drop `portal.css`; port all rules to Tailwind utilities/components.
- Reskin existing dashboard, members, settings to new aesthetic in same PR as shared-lists UI; design system changes cross-cut.

## 7. iOS client changes (separate Codex plan)

- Add Supabase Swift SDK.
- Decide on auth bridge: keep Sign In With Apple, exchange for Supabase JWT via edge function — OR adopt Supabase Auth with Apple provider. Auth strategy is the main fork in the iOS plan.
- Replace `SharedListService` E2EE flow with `SupabaseSharedListRepository` — plain reads/writes to the new tables.
- Local `PrayerList` model gets `sourceType` (`local | shared_church | shared_group`) and `remoteListID uuid?`.
- App launch: fetch own `list_subscriptions` + their `shared_lists` + active `shared_requests` → hydrate SwiftData.
- Realtime: subscribe to changes on each visible list's `shared_requests` channel.
- Groups CRUD UI surfaces.
- Personal (non-shared) lists stay local + E2EE — no change.
- Feature flag `sharedListsOnSupabase` gates cutover per-user.
- One-time migration: any existing local "shared" lists mapped to new Supabase rows the first time the feature flag flips for a user.
- Deprecate Go/Node shared-list endpoints once all live users migrate.

## 8. Migration rollout

1. Apply migration to staging Supabase project. Seed a test church + test group.
2. Ship web portal changes → staging → production behind a feature flag on the dashboard nav.
3. Ship iOS Supabase integration behind flag → TestFlight.
4. Pilot one real church. Validate moderation, backfill, subscriber counts.
5. General availability: unflag web + iOS.
6. Deprecate and retire Go/Node shared-list endpoints after 30-day dual-run.

## 9. Testing

### Supabase
- Migration replays cleanly on empty DB.
- RLS matrix: per-role SELECT/INSERT/UPDATE/DELETE on each table, including `anon` for public page.
- Trigger tests: insert `church_members` → subscriptions appear. Publish a list with N existing members → N subscriptions backfilled, idempotent on re-run.
- RPC correctness: `get_shared_list_stats` matches direct counts; never reads individual rows.

### Web
- Vitest for server actions / data layer.
- Playwright: admin creates draft → publishes → member sees list → member submits request → admin approves → appears in member view → admin marks answered.

### iOS
- Unit tests for `SupabaseSharedListRepository` against a mock client.
- Integration tests against staging Supabase.
- Migration round-trip: local shared list → Supabase → back.

## 10. Open questions logged for later

- E2EE for group-scope shared lists. Defer.
- Push notifications for new request / answered. Defer.
- Rate-limiting member submissions to prevent spam. Revisit if abuse surfaces.
- Group discovery (beyond church-sponsored auto-listing). Defer.
- Transfer of group admin role. Defer; workaround = admin adds co-admin then leaves.

## 11. Privacy notes

- `list_subscriptions` rows are never exposed across users. Admins see aggregate counts only via `get_shared_list_stats`. This is by design and must survive any future dashboards or exports.
- Request body content is plaintext in DB. Add E2EE before building analytics / search features that would expose it further.
