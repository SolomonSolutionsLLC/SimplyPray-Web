# SimplyPray-Web

Static marketing site for **simplypray.io** / **www.simplypray.io**.

The product app (dashboard, auth, Supabase, Stripe) lives in a **separate repo**:
`SolomonSolutionsLLC/SimplyPray-App` → deployed to `app.simplypray.io`.

## jCodeMunch MCP

- When jCodeMunch is available, call `jcodemunch_guide` and follow the version-current tool guidance.
- Use jCodeMunch before native search/read tools when tracing functions, locating files or code pieces, understanding architecture, planning changes, refactoring, or assessing impact.
- Start with `list_repos`; if this repo is indexed, prefer `search_symbols`, `search_text`, `get_file_outline`, `get_context_bundle`, `find_references`, `get_call_hierarchy`, `get_blast_radius`, and related jCodeMunch tools over full-file reads.
- Fall back to shell search/read tools only for files that are not indexed, exact working-tree status, diffs, test output, or cases jCodeMunch cannot answer.

## Stack

- Plain HTML + CSS + vanilla JS
- Google Apps Script waitlist endpoint (see `marketing-docs/`)
- Vercel static hosting

## Repo layout

- `index.html` — landing page (hero + waitlist capture)
- `confession.html`, `supplication.html`, `thanksgiving.html` — ACTS preview pages
- `screenshots/` — marketing imagery
- `marketing-docs/` — Apps Script source + integration notes
- `docs/plans`, `docs/uat` — historical planning docs (kept for reference)
- `DEPLOYMENT.md` — Vercel setup

## Deploy

- Vercel project: `simply-pray-web`
- Root dir: `.` (no build — static)
- Push to `main` → auto-deploy
- Never push without explicit go-ahead from Kirk

## Related repos

- App: https://github.com/SolomonSolutionsLLC/SimplyPray-App
