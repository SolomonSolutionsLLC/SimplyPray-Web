# Optional iCloud sync policy review

Privacy and Individual Terms are coordinated October 16, 2026 review candidates.
The proposed date must be confirmed before publication; these files are not
currently activated agreements or evidence that personal sync has shipped.
The October 8 downloads remain byte-for-byte unchanged.

Canonical text and church agreement candidates belong to the companion
SimplyPray-App branch `docs/icloud-sync-agreements-2026-10-16`, under
`docs/policy/sync-2026-10-16/`. This website branch mirrors those exact Privacy
and Terms bytes, updates both visible pages/download links, and points the
existing legal-text parity check at the new versions. The separate review
manifest records hashes; historical manifests are not rewritten.

Do not publish the website changes independently of Joshua's approved individual
policy-bundle rollout. Confirm the proposed effective date and exact bytes,
actual sync availability, native PR167 notices, signed-device behavior and
sensitive-data consent requirements first. The canonical README records the
remaining account-deletion and provider-verification conditions. In particular,
no separate delete-cloud button or verified Apple-settings walkthrough is
promised. Disabling sync retains existing cloud data.

The App package adds new versioned review sources only; it neither changes the
serving bundle nor runs a hosted migration. Current policy text/receipts must
remain immutable. This task stops at the PR handoff: no deployment, activation,
contract execution, merge or release is authorized.

## Local validation

`npm test` passed 48 tests and integrity checks for 10 HTML pages. Both new
downloads match the canonical candidate bytes and hashes. Historical sources
remain unchanged. `git diff --check` passed. Real CloudKit operation, account
deletion completion and policy activation require the separate owner handoff.
