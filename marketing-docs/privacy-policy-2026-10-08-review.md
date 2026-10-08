# October 8 privacy policy review package

This is the candidate privacy policy dated October 8, 2026. It is not a hosted
migration, publication, acceptance, or release. The matching website branch is
`feat/privacy-policy-2026-10-08`; the native offline fix is iOS PR #148. The website
revision incorporates and supersedes the October 6 candidate in Web PR #37.
Earlier immutable policy text and receipts must remain available.

## Publication handoff

1. Review the policy text and the operational evidence below. Confirm the native
   offline fix is included in the intended app release and that the removed-request
   expiry migration and daily purge are active in the intended backend.
2. Compare the deployed current bundle with the intended release; retain its approved
   Terms version and any other approved policy documents and attestation. This package
   changes Privacy only. Stop if the deployed bundle differs from the reviewed state.
3. After Joshua approves these exact bytes, insert an operator-only Privacy draft with
   version `2026-10-08`, `content_type = 'text/plain'`, and the exact content file.
   Verify its SHA-256 against `policy-source-manifest.json`. If that version already
   exists with different text, choose a new reviewed version; do not overwrite it.
4. Use the existing owner-only `policy_private.publish_draft` with the draft ID,
   expected hash and a real approval reference. Activate one bundle with the approved
   Privacy version and preserved approved Terms/other policy IDs and attestation,
   using `policy_private.activate_bundle` in a serialized transaction. Do not write
   acceptance rows for users, fabricate dates, or reinterpret historical consent.
5. Coordinate website publication and the server bundle. Verify the anonymous
   `get_current_policy_bundle` response serves these exact Privacy bytes/hash/version
   and the intended unchanged Terms, and that both app agreement flows display them.
   Validate required explicit reacceptance and historical receipt links.

This task does not authorize hosted execution, merge, deployment or release.

## Retention and deletion evidence

| Category | Source-established rule | Still needed before final signoff |
| --- | --- | --- |
| Private device records | Remain until locally deleted; sign-out retains account storage | Device failure/retry and other-device instructions checked in release |
| Local activity events | Approximately 90-day pruning when cleanup runs; does not expire all devotional data | No additional fixed period claimed |
| Removed shared requests | 30 days from removal; read/restore denied after expiry, daily live-row purge | Deployed migration and job execution evidence; inspect deletion backlog without exposing prayer content |
| Church activity | 60-day roster indicator | This is a reporting window, not a data-erasure schedule |
| Public analytics choice/cookies | Up to 180 days; native app links can open public pages | Confirm Google property retention and identifier-reset settings; cookies do not establish provider retention |
| Agreement receipts | Account-bound versioned receipts; Auth deletion cascades them | Keep immutable policy text without retaining fabricated user acceptance |
| Safety reports/audits | Evidence-backed associations minimized at deletion; older unlinked moderation notes require review | Approved purpose, access owner, retention/review interval and legacy-note review process |
| Billing history | Minimal financial records preserved separately | Approved statutory/business retention period and deletion/minimization procedure |
| Provider cleanup identities/jobs | Survive Auth deletion to perform/verify cleanup; consolidated worker defaults held | Live activation, held-job reconciliation, monitoring/escalation, completion proof and eventual journal expiry |
| Support/privacy messages and operational logs | No complete fixed period established by this source review | Approved periods by system, access owner and execution evidence |
| Server/provider backups | Live deletion and backup expiry are separate | Actual plan, rolling retention, manual exports, restricted recovery access and replay of deletions after restore |

No fixed provider, billing, safety, support, log or backup deadline is invented in the
public policy. Its purpose-based retention language is an obligation to implement
and verify, not evidence that an operational schedule already exists. A code comment,
passing mocked provider test or provider's general plan documentation does not verify
this deployment's configuration. Do not claim final operational signoff until these
items have evidence.

Source checks: `20261006160230_removed_request_retention_release.sql`,
`20261005192529_account_lifecycle_private_church_release.sql`,
`20261005203320_policy_version_acceptance_history.sql`,
`docs/provider-cleanup-activation.md`, native `AnalyticsService.swift`,
`AuthenticationService.swift` and `PolicyAdmissionStore.swift`, and website
`assets/analytics/public-analytics.js`. Provider reference documentation:
[Supabase backups](https://supabase.com/docs/guides/platform/backups),
[Google Analytics data retention](https://support.google.com/analytics/answer/7667196),
[RevenueCat customer deletion](https://www.revenuecat.com/docs/dashboard-and-metrics/customer-profile).
Provider documentation explains capabilities, not SimplyPray's actual settings.

## Local validation, October 8, 2026

- Website `npm test`: 48 passed; integrity checks passed for 9 HTML pages.
- Backend `npm run verify:full`: typecheck, lint, 824 tests in 70 files and build passed.
- Backend `PATH=/opt/homebrew/opt/libpq/bin:$PATH npm run db:test`: 57 SQL files passed
  on the disposable local stack, including removed-request retention, policy history,
  safety/account erasure and provider cleanup boundaries. No hosted SQL was run.
- Website and backend canonical Privacy text match byte-for-byte, including the
  October 8 date, UTF-8 hash, byte count and final newline. `git diff --check` passed.

These checks validate source behavior and package consistency. Live retention settings,
provider activation, provider completion and production job execution remain unverified.
