# Shared Lists — Manual UAT Script

**Created:** 2026-04-21
**Status:** Script written; not yet executed end-to-end against staging.

Supabase project: `SimplyPray` (`wkptusgzngfzoucocije`).

## Pre-reqs
- At least one church row with `default_list_write_mode='admin_only'` and at least one `church_members` row with `role='admin'` and `status='active'`.
- Two user accounts: an admin and a non-admin member of that church.

## Steps

1. **Create draft.** Admin browses `/dashboard/shared-lists/new`, creates "Weekly Prayer" with description + cadence "Weekly", `admin_only`. Expect redirect to `/dashboard/shared-lists/<id>` showing pill `draft`.
   - Verify SQL: `select status, write_mode from shared_lists where name='Weekly Prayer';` → `draft, admin_only`.

2. **Publish.** Click Publish. Expect status flips to `published`, `published_at` set.
   - Verify SQL: `select status, published_at from shared_lists where name='Weekly Prayer';`.
   - Verify subscribers: `select count(*) from list_subscriptions where list_id=(select id from shared_lists where name='Weekly Prayer');` → equals count of active `church_members` in this church.

3. **Non-admin sees it (SQL proxy).** Using the non-admin user's JWT (Supabase dashboard → API → impersonate), run `select id,name from shared_lists where church_id='<id>';` → should return the published list row.

4. **Flip to member_submit.** Edit the list, choose "Members can submit". Save.
   - SQL: `update auth trick omitted; insert member submission directly as the non-admin user (via impersonation):` `insert into shared_requests (list_id,title,submitted_by,status) values ('<list-id>','Pray for Mike','<non-admin-uid>','pending');`
   - Admin visits `/dashboard/shared-lists/<id>/requests?tab=pending`. Expect one row. Click Approve.
   - Verify SQL: row status=`active`, `moderated_by`=admin UID.

5. **Mark answered.** Admin switches to Active tab, clicks Mark answered. Verify row `status='answered'`, `answered_at` set.

6. **Public page flag.** Admin toggles the list's `public_page=on` and in Settings enables `public_lists_enabled`. Open `/church/<slug>/shared` in incognito. Expect the list + active/answered requests to render.

7. **Disable public.** Toggle `public_lists_enabled` off. Incognito reload → 404.

8. **Archive.** Admin chooses Archive. Published tab no longer shows it; Archived tab does. Subscriptions remain.

9. **Delete.** Admin clicks Delete in Danger zone. Expect redirect to `/dashboard/shared-lists`. SQL: the `shared_lists`, its `shared_requests`, and `list_subscriptions` are gone (cascaded).

10. **Privacy — `list_subscriptions` leakage.** As a non-admin user JWT, `select * from list_subscriptions where list_id='<another-members-list-id>';` should return only rows where `user_id = auth.uid()`. The `get_shared_list_stats(p_list_id)` RPC should still return aggregate subscriber counts.

## Run log

_Not yet executed end-to-end. Run with a real church + two test users and update this section with pass/fail per step._

---

## Addendum — Permissions matrix + invites (added 2026-06-10, plan 05)

Covers the per-list permission policies (`post_policy`, `answer_policy`) and the invite lifecycle shipped in SimplyPray-App PR audit-2026-06/05. Pre-reqs as above (admin + non-admin member, both signed up), plus a third email address that has NO account yet.

11. **Permissions card.** Admin opens `/dashboard/shared-lists/<id>`. Expect a "Permissions" card with "Who can post requests?" (Moderators only / All members) and "Who can mark answered?" (Moderators only / Requester / All members). Change post policy to "All members", answer policy to "Requester", save.
    - Verify SQL: `select post_policy, answer_policy from shared_lists where id='<id>';` → `members, submitter`.

12. **Member-post per policy.** As the non-admin member (impersonated JWT), `insert into shared_requests (list_id,title,submitted_by) values ('<id>','From a member','<non-admin-uid>');` → succeeds while `post_policy='members'`. Flip the policy back to "Moderators only" in the UI, repeat the insert → expect RLS denial (error, not silent success).

13. **Submitter-mark-answered per policy.** With `answer_policy='submitter'`: as the non-admin who submitted "From a member", `update shared_requests set status='answered' where id='<req-id>';` → succeeds and `answered_at` is set by trigger. As a different non-moderator member, the same update on someone else's request → RLS denial. Set policy to "Moderators only" → submitter update now denied too.

14. **Create open invite.** Admin on the list page uses the Invites panel: expiry 7 days, max uses 1, no email. Expect the new invite URL `https://app.simplypray.io/invite/<token>` shown with a Copy button and listed as `active`, uses `0/1`.
    - Verify SQL: `select target_type, list_id, max_uses, use_count from invites where token='<token>';` → `list, <id>, 1, 0`.

15. **Open-link join (logged out → signup).** Open the invite URL in incognito. Expect "You're invited to join <list name>" + signup form. Sign up with the third (fresh) email, confirm via the email link → should land back on `/invite/<token>` signed in → click "Accept invite" → success card with App Store + dashboard CTAs.
    - Verify SQL: `select user_id from list_subscriptions where list_id='<id>'` includes the new user; `use_count`=1.

16. **Exhausted invite.** Open the same URL again (any session). Expect "This invite has already been used." (max_uses 1 reached).

17. **Locked-email invite + mismatch rejected.** Admin creates an invite locked to `victor@example.com` (any address you do NOT control a session for) — expect "email sent" notice if SES succeeds or the copy-link fallback notice. Open the URL signed in as the non-admin member (different email) and accept → expect friendly "This invite is for a different email address" error, no membership change.

18. **Revoke.** Admin revokes an active invite in the panel. Status pill flips to `revoked`; opening its URL shows "This invite has been revoked."
    - Verify SQL: `revoked_at is not null`.

19. **Expiry.** SQL: `update invites set expires_at=now()-interval '1 day' where token='<token>';` → URL shows "This invite has expired"; panel pill shows `expired`.

20. **Defaults from church settings.** In Settings set the church default post policy (if exposed) / `default_post_policy='members'` via SQL, then `/dashboard/shared-lists/new` → the "Who can post requests?" select should default to "All members".

## Addendum run log

**Run 2026-06-21** (PRD-13 follow-up) against **prod** Supabase `wkptusgzngfzoucocije`. Backend assertions executed via authenticated-role impersonation (`set_config('request.jwt.claims', …)` + `set local role authenticated`); browser/email steps deferred to a human on a preview deploy.

Backend invite lifecycle — **PASS** (live):
- **16 Exhausted invite** — 2nd accept past `max_uses=1` → raised `invite already used`. PASS.
- **17 Locked-email mismatch** — accept with `invited_email` ≠ caller email → raised `invite is restricted to a different email`, no membership change. PASS.
- **18 Revoke** — accept after `revoked_at` set → raised `invite revoked`. PASS.
- **19 Expiry** — accept after `expires_at` in the past → raised `invite expired`. PASS.

Covered by CI (`SimplyPray-App/supabase/tests/*.sql`, gated by the new required `Supabase SQL matrix` check):
- **12 Member-post policy** / **13 Submitter-mark-answered** → `permissions_matrix.sql` (post_policy/answer_policy RLS).
- **14 invite verify** / lifecycle → `invites.sql`. **Entitlement/groups** → `entitlement.sql`. **List RLS** → `rls_shared_lists.sql`. **church_public exposure** → `churches_public_exposure.sql`.

PENDING HUMAN (browser on a preview deploy + an email inbox for SES/confirmation):
- **11** Permissions card UI, **14** Invites-panel UI + copy-link, **15** logged-out open-link → signup → email confirm → accept, **17** SES locked-email send, **20** church-default post policy prefilled in `/dashboard/shared-lists/new`.
- Steps **1–10** (church admin draft→publish→moderate→public-page→delete) not run this pass (require a seeded church + admin/non-admin members; prod currently has 0 churches).

---

## Church-independence E2E (PRD-13) — added 2026-06-21

Proves Groups sharing works with **NO church anywhere** (the PRD-13 guarantee). Live against prod `wkptusgzngfzoucocije`. **PASS.**

- **Entitlement.** `get_user_entitlement()` for two users with no `church_members` row and no active subscription → `{ "tier": "free", "source": "none", "groups": { "enabled": true, "can_share": true, "max_groups": 10 } }`. A user with only a `personal` Stripe sub (no church) → same `groups` block. Groups are enabled independent of church/subscription (`get_user_entitlement` sets `groups_free_for_all := true`).
- **Full cycle.** No-church user **A** created group "PRD-13 No-Church E2E" (`church_id` NULL), shared a list into it (`scope='group'`, `church_id` NULL, published) and minted an open invite via `create_invite`. No-church user **B** accepted via `accept_invite` → joined (`already_member:false`, `scope_name:"PRD-13 No-Church E2E"`).
- **RLS (enforced, role `authenticated` as B).** B sees own membership (1), the group (1), and the group's church-independent shared list (1). No-church members can read the shared list under RLS.

_Test fixtures (the no-church E2E group + list + invites, and the throwaway memberships) were cleaned up after the run; the "PRD-13 Device Link Test" group + open invite were intentionally left live for the on-device universal-link test (Item 2)._
