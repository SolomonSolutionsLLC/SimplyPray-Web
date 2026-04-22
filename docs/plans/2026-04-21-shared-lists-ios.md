# Shared Lists — iOS Supabase Client Implementation Plan

> **For the executing agent (Codex):** This plan is meant to be executed inside the iOS repo `jdkirk12/simply-pray` (not this web repo). Clone it locally first. This plan and the web plan (`2026-04-21-shared-lists-web.md`) can proceed in parallel; the only hard sync point is Phase 1 — the iOS work can stub endpoints but cannot integration-test until the web plan's Phase 1 migrations are applied to the shared Supabase project.

**Goal:** Migrate the iOS shared-list code path from the current local Go/Node + E2EE backend to Supabase as a single source of truth, matching the schema defined in `2026-04-21-shared-lists-design.md`. Church-wide and group shared lists now come from Supabase and auto-appear in the member's prayer library via subscriptions.

**Architecture:** Add Supabase Swift SDK alongside the existing auth stack. Introduce `SupabaseSharedListRepository` replacing `SharedListService` for reads/writes of shared lists. Hydrate local `PrayerList` SwiftData rows from `list_subscriptions + shared_lists`. Subscribe to realtime changes on visible lists. Gate everything behind feature flag `sharedListsOnSupabase`. Personal (non-shared) lists stay local + E2EE.

**Tech Stack:** Swift 5.x, SwiftData, Combine, existing Firebase Auth + Sign In with Apple, `supabase-swift` (Swift Package Manager).

**Prerequisites:**
- Supabase project URL + anon key available in a secure configuration file (e.g. `Secrets.xcconfig` or scheme env). Service role key MUST NOT ship in the app.
- Web plan Phase 1 migrations applied to the target Supabase project (tables, triggers, RLS, RPCs all in place).
- Decide the auth bridging strategy in Task 0.2 below — this is the foundational fork.

**Conventions:**
- Every task ends with a commit using Conventional Commits.
- TDD where it fits: new pure helpers and repository methods get XCTest cases first. UI behavior validated through manual scripts at the end of each UI task.
- No direct SwiftData writes bypassing repositories — the repository is the single integration seam between Supabase and local persistence.

---

## Phase 0 — Setup and strategy

### Task 0.1: Add `supabase-swift` package

**Files:**
- Modify: Xcode project (Swift Package Manager dependencies)
- Modify: `SimplyPray/Config/Secrets.xcconfig` (if already present) — add `SUPABASE_URL` and `SUPABASE_ANON_KEY`; if not, create it and reference it from the scheme's build settings.

**Steps:**
1. In Xcode: File → Add Package Dependencies → enter `https://github.com/supabase/supabase-swift` → pin to the latest stable major (>= 2.x). Add `Supabase` product to the `SimplyPray` target.
2. Commit: `chore(deps): add supabase-swift SDK`.
3. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `Secrets.xcconfig`. Add an `Info.plist` entry reading them from `$(SUPABASE_URL)` / `$(SUPABASE_ANON_KEY)` so they surface to Swift via `Bundle.main.object(forInfoDictionaryKey:)`.
4. Commit: `chore(config): wire supabase env vars through xcconfig`.

---

### Task 0.2: Decide and implement the auth bridge

Two options; pick before writing any repository code:

- **Option A — Bridge JWT.** Keep Firebase Auth + Sign In with Apple as-is. Deploy a Supabase Edge Function `exchange-firebase-jwt` that verifies a Firebase ID token and returns a Supabase JWT (`sign(user_id=firebase_uid, role='authenticated')`). iOS calls it after login, stashes the returned Supabase JWT, attaches it as the bearer on every Supabase request. Users in `auth.users` are provisioned on first bridge using `supabaseAdmin.auth.admin.createUser` inside the edge function.
- **Option B — Move auth to Supabase.** Replace Firebase with Supabase Auth using the Apple provider. Migrates existing users by mapping Firebase UID → new Supabase UID (requires a one-time migration SQL job). Bigger lift, cleaner long-term.

**Recommendation:** **Option A for this phase.** Smaller blast radius; keeps Firebase migration as an independent decision. Option B can happen later without re-doing shared lists.

**Files (Option A):**
- Create: `supabase/functions/exchange-firebase-jwt/index.ts` (in **web** repo, not iOS) — coordinate with web plan. Add a Task 0.2b under that plan.
- Create: `SimplyPray/Services/SupabaseAuthBridge.swift` — calls the edge function, caches JWT, refreshes on 401.
- Create: `SimplyPrayTests/SupabaseAuthBridgeTests.swift` — unit test the JWT cache + refresh logic with a mocked URLSession.

**Steps:**
1. Deploy the edge function in staging. Verify via `curl` that a known Firebase ID token exchanges for a valid Supabase JWT.
2. Implement `SupabaseAuthBridge`. Public API: `func currentSupabaseToken() async throws -> String`.
3. Write tests: cache hit, cache expiry, refresh on 401, error propagation when Firebase token is missing.
4. Commit: `feat(auth): supabase jwt bridge for firebase identities`.

---

### Task 0.3: Configure a shared `SupabaseClient`

**Files:**
- Create: `SimplyPray/Services/SupabaseClientProvider.swift`
- Create: `SimplyPrayTests/SupabaseClientProviderTests.swift`

**Steps:**
1. Singleton wrapper around `SupabaseClient` that injects the bridged JWT into every request's `Authorization` header. Expose `func client() async throws -> SupabaseClient`.
2. On 401 responses, invalidate the cached token and retry once.
3. Tests: injection happens; refresh loop doesn't recurse infinitely.
4. Commit: `feat(supabase): shared client provider with auto-auth header`.

---

## Phase 1 — Repository layer

### Task 1.1: Extend `PrayerList` to identify shared sources

**Files:**
- Modify: `SimplyPray/Models/PrayerList.swift`

**Steps:**
1. Add:
   ```swift
   var sourceType: String = "local" // "local" | "shared_church" | "shared_group"
   var remoteListID: UUID?
   var remoteChurchID: UUID?
   var remoteGroupID: UUID?
   ```
2. Add a SwiftData schema version bump in `SchemaVersion.swift`. Write a migration plan entry that defaults `sourceType = "local"` for all existing rows. Don't drop any existing columns yet — the existing `isShared` / `groupID` / `accessLevel` fields stay for backward-compat with the Go/Node path until deprecation in Task 5.x.
3. Test: existing unit tests continue to pass. Add a new test asserting default `sourceType == "local"` for a fresh `PrayerList()`.
4. Commit: `feat(model): PrayerList source identity fields`.

---

### Task 1.2: `SupabaseSharedListRepository` — read side

**Files:**
- Create: `SimplyPray/Services/Repositories/SupabaseSharedListRepository.swift`
- Create: `SimplyPrayTests/Repositories/SupabaseSharedListRepositoryTests.swift`

**Steps:**
1. Public API (protocol first, then implementation):
   ```swift
   protocol SupabaseSharedListRepositoryType {
       func fetchSubscribedLists() async throws -> [SupabaseSharedList]
       func fetchRequests(listID: UUID) async throws -> [SupabaseSharedRequest]
       func fetchListStats(listID: UUID) async throws -> SharedListStats
   }
   ```
2. DTOs (`SupabaseSharedList`, `SupabaseSharedRequest`, `SharedListStats`) decode the exact columns returned by the web schema. `Codable`.
3. `fetchSubscribedLists` runs: `from("list_subscriptions").select("shared_lists(*)").eq("user_id", currentUserID)`. Flattens the nested `shared_lists` row into `SupabaseSharedList`. Filters out `hidden=true`.
4. `fetchRequests(listID:)` runs `from("shared_requests").select().eq("list_id", listID).in("status", ["active","answered"]).order("created_at", ascending: false)`.
5. `fetchListStats(listID:)` calls the `get_shared_list_stats` RPC: `client.rpc("get_shared_list_stats", params: ["p_list_id": listID.uuidString])`.
6. Tests against a stubbed Supabase client (protocol-oriented): asserts correct query construction and decoding. Do NOT integration-test against a real Supabase here — that happens in Phase 3.
7. Commit: `feat(repo): supabase shared list read APIs`.

---

### Task 1.3: `SupabaseSharedListRepository` — write side

**Files:**
- Modify: same repository file
- Modify: same tests file

**Steps:**
1. Add:
   ```swift
   func submitRequest(listID: UUID, title: String, body: String?) async throws -> SupabaseSharedRequest
   func hideSubscription(listID: UUID) async throws
   func unhideSubscription(listID: UUID) async throws
   func setSortOrder(listID: UUID, order: Int) async throws
   ```
2. `submitRequest` inserts into `shared_requests` with `status='pending'` for member-submit lists. Server RLS enforces the state; if the list is `admin_only` the insert will be rejected and we surface a localized error.
3. Hide/unhide update `list_subscriptions.hidden` for `user_id=auth.uid()`.
4. Unit tests: each method builds the expected query payload.
5. Commit: `feat(repo): supabase shared list member write APIs`.

---

### Task 1.4: Realtime subscription

**Files:**
- Modify: `SupabaseSharedListRepository`
- Create: `SimplyPray/Services/Repositories/SupabaseSharedListRealtime.swift`

**Steps:**
1. Expose `func subscribeToList(_ listID: UUID) -> AsyncStream<SharedListRealtimeEvent>`.
2. Under the hood: a single realtime channel per list listening on `public.shared_requests` with `filter: list_id=eq.<uuid>`. Map INSERT/UPDATE/DELETE payloads into `SharedListRealtimeEvent` cases.
3. Manage channel lifecycle: on subscribe, register; on AsyncStream termination, unsubscribe.
4. Unit tests: lifecycle — subscribe twice with the same listID reuses the channel; cancelling one stream does not tear down the channel for the other.
5. Commit: `feat(repo): realtime subscription for shared list requests`.

---

## Phase 2 — Local hydration + feature flag

### Task 2.1: Feature flag `sharedListsOnSupabase`

**Files:**
- Modify: `FeatureGateService.swift`

**Steps:**
1. Add a new boolean flag resolved from remote config (or hard-coded to `false` until ship-ready). Public accessor: `FeatureGateService.shared.sharedListsOnSupabase`.
2. Tests: default-off; flip-on via injection.
3. Commit: `feat(flag): sharedListsOnSupabase feature gate`.

---

### Task 2.2: Startup hydration

**Files:**
- Create: `SimplyPray/Services/SharedListSyncService.swift`
- Create: `SimplyPrayTests/Services/SharedListSyncServiceTests.swift`

**Steps:**
1. On app launch (and when the flag flips on), call `SupabaseSharedListRepository.fetchSubscribedLists()`. For each returned list:
   - Upsert a local `PrayerList` row keyed by `remoteListID`. Set `isShared=true`, `sourceType` from `scope`, `remoteChurchID`/`remoteGroupID` from the DTO. `accessLevel` = `"viewer"` unless the caller is admin/moderator.
   - Upsert `PrayerItem` rows for each active/answered `shared_request`.
2. Deletes: if a subscription is no longer returned (user removed from church, list archived and unsubscribed, etc.), soft-mark the local list as `deleted` (do not hard-delete — user may have local notes).
3. Guard: while the flag is off, service is a no-op.
4. Tests: with a stub repo returning three subscriptions, local store has three corresponding `PrayerList` rows after sync. A second sync with two removes the third.
5. Commit: `feat(sync): hydrate shared lists from supabase on launch`.

---

### Task 2.3: Realtime live updates

**Files:**
- Modify: `SharedListSyncService`

**Steps:**
1. For each currently-viewed shared list, subscribe to `SupabaseSharedListRealtime`. On INSERT: upsert `PrayerItem`. On UPDATE: update status/body. On DELETE: remove local item.
2. Subscription lifecycle tied to list-detail view appear/disappear. Background app stops listening.
3. Test: simulate INSERT event → local `PrayerItem` appears.
4. Commit: `feat(sync): realtime updates for visible shared lists`.

---

### Task 2.4: One-time migration for existing local shared lists

**Files:**
- Create: `SimplyPray/Services/SharedListMigrationService.swift`

**Steps:**
1. The first time `sharedListsOnSupabase` is `true` for a user, walk existing `PrayerList` rows where `isShared=true && remoteListID == nil`.
2. For each, create a matching group on Supabase (owner = current user, independent group — `church_id = NULL`), create a `shared_lists` row in that group (scope=`group`, status=`published`, write_mode=`admin_only`), copy active `PrayerItem`s as `shared_requests` with status `active`, stamp the local `PrayerList.remoteListID` / `remoteGroupID` / `sourceType = "shared_group"`.
3. Idempotent: retry-safe; keyed by a local `migrationState` column on `PrayerList`.
4. Test: migration runs twice → no duplicate rows on Supabase.
5. Commit: `feat(migration): one-time local shared list → supabase`.

---

## Phase 3 — UI wiring

### Task 3.1: Replace `SharedListService` consumers with repository

Find all call sites:
```bash
rg "SharedListService" SimplyPray/
```

Route each through `SupabaseSharedListRepository` when `sharedListsOnSupabase` is on; keep the old path when off. Protocol-inject the repository into views/viewmodels so tests can stub.

Commit: `refactor(shared-lists): route through feature-flagged supabase repo`.

---

### Task 3.2: Member submission flow

**Files:**
- Modify: `SimplyPray/Views/SupplicationListDetailView.swift`

**Steps:**
1. If the hydrated list's `write_mode == "member_submit"` and the caller is not an admin/moderator, show an "Add request" button.
2. Tapping it opens a compose sheet → posts to `repository.submitRequest`. Show a "Pending review" banner on success.
3. Disable the button for `admin_only` lists.
4. Manual test: simulate a member-submit list in staging, submit a request, verify it appears in web admin's Pending queue.
5. Commit: `feat(ui): member submission UI for shared lists`.

---

### Task 3.3: Hide / reorder per-user preferences

**Files:**
- Modify: list-library view
- Modify: repository

**Steps:**
1. Long-press → "Hide this list" (soft-hide via `list_subscriptions.hidden=true`). "Show hidden" toggle in settings.
2. Drag-to-reorder updates `sort_order` via `setSortOrder`.
3. Manual test: hide a list → disappears from default view. Toggle "show hidden" → reappears grayed.
4. Commit: `feat(ui): hide and reorder shared lists per-user`.

---

### Task 3.4: Group creation UI (minimal)

**Files:**
- Create: `SimplyPray/Views/Groups/CreateGroupView.swift`

**Steps:**
1. Form: name, description, visibility (`open` / `invite_only`). No church_id picker yet — default to `NULL` (independent).
2. On submit, insert into `public.groups` — trigger auto-adds the creator as admin.
3. Navigate to the new group's detail view (list its shared lists; empty state).
4. Manual test: create a group → row appears in Supabase → local library refreshes.
5. Commit: `feat(ui): minimal create-group screen`.

---

### Task 3.5: Join a church-sponsored group

**Files:**
- Modify: church dashboard view (discovery feed of sponsored groups).

**Steps:**
1. Query `public.groups where is_church_sponsored=true and church_id = <user's church>`.
2. Show a list; "Join" button inserts a `group_members` row with role=`member`. RLS allows self-insert only when the group visibility is `open` OR when the church admin has pre-approved (future enhancement — for MVP treat sponsored groups as `open` by default; surface this in Task 0.3 of web plan).
3. Manual test: admin creates sponsored group → member sees it → joins → list appears.
4. Commit: `feat(ui): join church-sponsored groups`.

---

## Phase 4 — Deprecation of Go/Node shared endpoints

### Task 4.1: Shadow-read dual-run

**Files:**
- Modify: `SharedListSyncService`

**Steps:**
1. When `sharedListsOnSupabase` is on, continue to call the legacy `APIClient` endpoints in parallel for 7 days, comparing results. Log any divergence.
2. Emit `SharedListDivergence` analytics events on mismatch.
3. After 7 days with no divergence on the staging and pilot populations, remove the legacy call.
4. Commit: `chore(shared-lists): shadow-compare legacy vs supabase for safety window`.

---

### Task 4.2: Delete legacy path

**Files:**
- Delete: `SharedListService.swift`, `GroupAPIClient.swift` (shared-list-specific methods only — keep personal/group E2EE flows that are out of scope).

**Steps:**
1. Remove any remaining call sites. Guard the `FeatureGateService.sharedListsOnSupabase` flag with a compile-time assert that it is enabled in production.
2. Run full test suite.
3. Commit: `feat(shared-lists): retire legacy go/node shared-list path`.

---

## Phase 5 — Verification

### Task 5.1: End-to-end manual UAT (mirror of web UAT)

Reference: `docs/uat/2026-04-21-shared-lists-uat.md` in the web repo. Run each step from the iOS side:
- As a member user, see a church list appear after admin publishes it on web.
- Submit a pending request from iOS → approve on web → see it transition to active on iOS without restart (realtime).
- Mark answered on web → iOS reflects it.
- Hide a list on iOS → web admin's subscriber count unchanged (aggregate-only; no per-user leak).
- Archive on web → iOS keeps the list but shows a "Archived" badge.
- Delete on web → iOS removes it from library.

Record outcomes inline. If anything fails, file a bug and pause the iOS ship.

Commit the result log: `docs(uat): ios shared lists verification run`.

---

### Task 5.2: Performance sanity check

Measure launch-time hydration on a staging user with 50 subscribed lists × 20 requests each. Target: under 500ms on Wi-Fi, no main-thread stalls.

If over budget: paginate `fetchRequests` (add `.limit(100)` and a "Load more" path).

Commit: `perf(shared-lists): hydration pagination if needed`.

---

### Task 5.3: Privacy audit

Confirm from the iOS client there is no code path that reads another user's `list_subscriptions` row. All subscriber counts must come from `get_shared_list_stats`. Grep the repo, document the audit:

```bash
rg "list_subscriptions" SimplyPray/
```

If any hit queries rows outside `user_id = currentUser`, rewrite through the RPC.

Commit audit results to `docs/audits/2026-04-21-shared-lists-privacy.md`.

---

## Out of scope (follow-ups)

- Push notifications for new requests / answered prayers.
- E2EE for shared lists.
- Invites by email or deep-link for groups.
- Cross-church group discovery.
- Option B (full Supabase Auth migration).
- Moderator delegation UI on web/iOS.

---

## Coordination with the web plan

- **Hard sync points:**
  - Web Task 1.6 (RLS) must land before iOS Task 1.2 is testable end-to-end.
  - Web Task 1.5 (`get_shared_list_stats`) must land before iOS Task 1.2 step 5.
  - Web Task 1.7 (church settings) must land before iOS Task 3.5 can fully respect admin intent.
- **Edge function** for auth bridging (iOS Task 0.2) is owned by the web repo — add a matching web task: deploy `exchange-firebase-jwt` edge function using `mcp__b28a1861-950c-4dd9-8a6d-5bb1ec638a9c__deploy_edge_function`.
- **Schema drift:** any schema change post-merge must be mirrored across both plans.

---

Plan complete. Hand to Codex with the iOS repo cloned and the Supabase project URL + anon key injected via scheme env vars.
