# November 3 public policy update

Requested by Christine November 4, 2026. Branch
`docs/november-3-public-policies-2026-11-04`, based on website main `e893969`.
Existing website PRs #45/#46 propose October versions. This PR replaces those
policy proposals with the November 3 source documents; do not deploy an older
policy branch over this one. It does not include their superseded October drafts.

## Source and text fidelity

The companion SimplyPray-App branch
`docs/november-3-policy-package-2026-11-04` owns the coordinated package at
`docs/policy/2026-11-03`. Its provenance is reproduced in
`assets/legal/source-manifest-2026-11-03.json`, including Dropbox IDs/paths,
modification times, canonical UTF-8 hashes and sizes. The current v2 Privacy
Policy, not its archived draft, is used. No substantive legal text was rewritten.
Plain-text paragraph spacing is normalized and the extracted standalone `Page`
footer is excluded from Terms.

- `/privacy` and `/terms` render the exact November 3 text in the existing page
  shell; page titles, effective dates, metadata and download links are updated.
- `#account-deletion` and `#website-analytics` remain reachable.
- All five November 3 documents are downloadable versioned text assets: Privacy,
  Terms, Church Subscription Agreement, Church DPA and Church Join Notice.
- Historical October 5/8 downloads remain unchanged. The existing Abuse & Safety
  Policy is unchanged because no revised November 3 abuse document was supplied.
- Analytics code, cookie controls, page layout styles and deployment configuration
  are unchanged. Rendering and links do not accept any policy or execute a church
  contract.

## Checks

`python3 scripts/build_nov3_legal_pages.py --check` checks all five download hashes
and expected HTML renderings. `npm test` runs the existing analytics suite and
exact visible-legal-text/site-integrity checks. `scripts/check_site.py` now compares
the public legal pages with the November 3 sources.

## Publication handoff

Joshua reviews the exact text and handles merge/deployment. Coordinate the public
website publication with the shared app policy service activation in the companion
PR, then verify both Apple and Android show the November 3 Terms/Privacy and retain
historical acceptance records. A website deployment alone does not activate the
app's policy bundle. Native policy text is served dynamically; no client hardcoded
copy is added by this change. Store URLs should continue to use the canonical
`https://www.simplypray.io/privacy` and `/terms`; review any custom store EULA
separately. No App Store/Play metadata or privacy-label/Data safety answers were
changed. Church agreements still require the authorized contract/notice workflow.

No hosted publication, deployment, store edit, email, customer-data operation,
payment or account deletion was performed during preparation.
