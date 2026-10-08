# October 8 website alignment handoff

This feature branch contains the corrected October 8 Privacy Policy and Individual
Terms, plus marketing and support copy aligned with reviewed source behavior and
Christine's confirmed plan decision. It supersedes the narrower Web PR #38
candidate. App PR #70 and #72 own canonical policy source and activation handoffs.
The effective dates and exact legal text are preserved. Older downloadable policy
versions remain unchanged. No internal review appears in the public policy pages.

## Sources reviewed

- SimplyPray-Web origin/main plus Privacy PR #38 at `60ca04e`.
- SimplyPray-App origin/main at `6135330`: capability schema/resolver, account
  lifecycle and private church release, removed-request retention, safety
  permissions, billing state/management, checkout trial rules and pricing copy.
- Native jdkirk12/simply-pray origin/main at `f95662d`: FeatureGateService,
  SubscriptionService, launch flags, AuthenticationService, account lifecycle,
  SafetyRepository/AbusePolicy, Bible translations and local AnalyticsService.
- Native offline-policy candidate PR #148 is required for the advertised offline
  policy-admission behavior. Bible version wording remains general and consistent
  with the intended general translation notice in PR #150.

All nine root pages were read: index, privacy, terms, support, abuse, adoration,
confession, thanksgiving and supplication. Historical marketing-docs and plans
are not public policy or current product evidence.

## Public changes and evidence

| Area | Result | Source basis |
| --- | --- | --- |
| Legal pages | Corrected October 8 Privacy and Terms, exact text downloads | App policy candidates #70/#72; HTML/TXT parity check |
| Personal sharing | No shared lists in Personal; no Personal sharing feature bullet | Christine confirmed October 8 that Joshua will correct backend; see rollout dependency below |
| Community | Unlimited shared lists; separate church access | Current capability table and private church access functions |
| Church plan | Starting price covers up to 100 sponsored members, larger plans available | src/lib/stripe/prices.ts bracket registry; checkout remains final price source |
| Church privacy | Active membership plus qualifying sponsorship; no public lists/open joining; public church page is separate | church_content_access, church_list_scope_access, list_is_open and restrictive RLS |
| Leaving church | Ends membership-based access, including authored requests | Private church scope access applies to authors and creators |
| Trial/renewal | Eligibility-qualified Community trial; Personal has no separate trial; original provider controls changes and cancellation | buildStripeCheckoutRequest, TRIAL_PERIOD_DAYS, billing state/provider management |
| Billing help | Account Access and subscriptions, Stripe/RevenueCat and receipt recovery | src/app/(account)/account/page.tsx; revenuecat-management.ts; portal holds |
| Deletion | Server success differs from pending local/provider cleanup; other devices/backups need separate action | AuthenticationService.finishDeletedAccount; cleanup.ts and cleanup-activation.ts |
| Offline use | Online setup/verified policy acceptance precedes personal offline use; required new policy acceptance is online | Native policy-admission flow and PR #148 |
| Removed requests | 30-day read/restore cutoff and scheduled live purge; distinct from personal archive | 20261006160230_removed_request_retention_release.sql |
| Audience/analytics | Ordinary public-list audience disclosed; no blanket no-tracking claim | Shared visibility/history RLS; local analytics, RevenueCat and public website analytics disclosures |
| Safety | Existing October 3 policy preserved; support explains owners/church admins and staff reporting | Native AbusePolicy matches public page; is_list_owner maps church administration to authorized church admins |
| Devotional pages | ACTS, reflections, prayer/answered/archive instructions and current translation copy retained | Native devotional and archive views; ScriptureTranslation |

The homepage's unsupported zero-dollar structured offer and “never lose one”
metadata were removed. Personal device records are not server-synced or recoverable
from SimplyPray's server. Prayer screenshots are fictional/demonstration data.

## Personal sharing: source discrepancy and required correction

The confirmed product rule is **Personal has no shared lists**. Joshua owns the
backend correction. This website change does not change permissions or migrations.
Fetched source still differs from that intended rule:

- iOS `FeatureGateService.swift:131` falls back to two Personal shared lists and
  `canShare: true`; gates at lines 21–22 allow Personal. Server values override
  the sharing block. The native current paid-tier flag is false, so launch-time
  behavior is distinct from advertised paid-tier capabilities.
- Backend `20260916165428_entitlement_phase1_schema.sql:61` seeds Personal with
  `max_shared_lists = 2`, `can_share = true`; the resolver reads that table.
- `supabase/tests/entitlement.sql:519` explicitly expects those values. Passing
  the current SQL suite is not proof that the intended removal is implemented.
- The public pricing copy and older plan comments already said no Personal
  sharing, while these source gates still allow it.

The capability table is configurable at runtime. No live hosted configuration
or released app behavior was queried here. Before publishing, Joshua must verify
his backend correction and the actual intended iOS build, including the offline
fallback and beta/launch flags. Verify Personal cannot create/join/collaborate on
shared lists as intended, Community still can, downgrade handling agrees with
copy, and private church access remains separately constrained. The new copy
avoids promising a blanket read-only downgrade or continuing church access.

## Publication coordination

1. Joshua reviews the combined website branch and the companion App pricing copy
   PR, along with policy source #70/#72 and the Personal sharing correction.
2. Confirm the intended build includes offline-policy fix #148 and church/access,
   deletion/cleanup and removed-request retention behavior. Verify runtime plan
   grants, flags, offered prices and trial eligibility before rollout.
3. Publish approved Privacy and Terms through the existing versioned owner-only
   policy workflow; preserve old receipts and immutable published text. Do not
   overwrite an occupied version containing other bytes. Verify exact hashes
   and explicit acceptance in both agreement flows.
4. Coordinate marketing pages, product pricing page and serving policy bundle.
   Keep the user-facing October 8 dates only if appropriate for that rollout.
5. Confirm deployed purge jobs, provider cleanup and operational retention settings
   documented in the privacy review before claiming final operational signoff.

No merge, deployment, hosted migration, activation, production mutation, purchase,
form submission or external message is performed by this task. Joshua handles
review and rollout. Local source checks do not prove a live configuration.

## Local verification

- Website `npm test`: 48 analytics tests passed, all nine pages passed local link,
  anchor, canonical URL and sitemap checks, plus new visible legal HTML/TXT parity.
- Canonical Privacy and Terms assets match their App candidates byte-for-byte;
  the prior October 5 assets remain unchanged. A negative parity check detects
  altered legal wording.
- Local browser: all nine pages at 1440, 390 and 320 pixels (27 combinations),
  including expanded support FAQs, legal download endpoints and no Personal
  sharing feature bullet. No page errors or horizontal overflow after the narrow
  hero grid fix. External requests were blocked; no forms/purchases submitted.
- Companion App pricing copy: `npm run verify:full` passed typecheck, lint,
  824 tests in 70 files and production build. Lint retains 12 existing warnings.
  The first run found one wording expectation in the existing pricing test;
  provider-review wording was preserved and the final run passed all tests.
- Companion App `PATH=/opt/homebrew/opt/libpq/bin:$PATH npm run db:test`:
  all 57 SQL files passed on the disposable local stack. The schema is unchanged
  and still tests the old Personal allowance; this is a known rollout dependency.
- Compiled product-pricing snapshot rendered at 1440, 390 and 320 pixels with
  local assets only. This is layout evidence, not a live checkout/provider test.
- Both feature branches passed `git diff --check`. No iOS source changed or native
  build was run. Hosted configuration and deployed behavior remain unverified.
