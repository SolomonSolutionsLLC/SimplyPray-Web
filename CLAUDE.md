# SimplyPray-Web

Static marketing site for **simplypray.io** / **www.simplypray.io**.

The product app (dashboard, auth, Supabase, Stripe) lives in a **separate repo**:
`SolomonSolutionsLLC/SimplyPray-App` → deployed to `app.simplypray.io`.

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
