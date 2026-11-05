# Optional iCloud sync policy

Privacy and Individual Terms were revised October 16, 2026 to describe optional
personal iCloud sync. The October 8 downloads remain byte-for-byte unchanged.

Canonical text and church agreement candidates belong to the companion
SimplyPray-App branch `docs/icloud-sync-agreements-2026-10-16`, under
`docs/policy/sync-2026-10-16/`. This website branch mirrors those exact Privacy
and Terms bytes, updates both visible pages/download links, and points the
existing legal-text parity check at the new versions. The separate review
manifest records hashes; historical manifests are not rewritten.

The canonical README records the remaining account-deletion and
provider-verification conditions. In particular, no separate delete-cloud button
or verified Apple-settings walkthrough is promised. Disabling sync retains
existing cloud data.

The App package adds new versioned sources only; it neither changes the serving
bundle nor runs a hosted migration. Current policy text/receipts must remain
immutable.

## Local validation

`npm test` passed 48 tests and integrity checks for 10 HTML pages. Both new
downloads match the canonical bytes and hashes. Historical sources remain
unchanged. `git diff --check` passed.
