# SimplyPray-Web Deployment Guide

Static marketing site for `simplypray.io` / `www.simplypray.io`.
The app (dashboard, auth, Supabase, Stripe) lives in a separate repo: `SolomonSolutionsLLC/SimplyPray-App`, deployed to `app.simplypray.io`.

## Vercel Setup

1. Vercel project: `simply-pray-web`
2. Framework preset: Other (static)
3. Root directory: `.`
4. No build command needed — Vercel serves HTML files directly
5. Output directory: `.` (default)

## Custom Domain

- `simplypray.io` + `www.simplypray.io` → this project
- `app.simplypray.io` → `simplypray-app` project (separate repo)

## Canonical URLs

- The canonical marketing host is `https://www.simplypray.io`.
- `vercel.json` permanently redirects only the apex host to `www`, preserving the path and query string. Preview hosts and the separate app host do not match this rule.
- Check the project's existing Domain Redirect settings before publishing: a dashboard-level redirect can take precedence over repository routing. Any apex-to-www domain redirect should also be permanent (308), with no reverse www-to-apex rule.
- Run `python3 scripts/check_site.py` before review. It checks page self-canonicals, sitemap/robots consistency, the apex redirect declaration, and local links.
- After an approved deployment, verify the actual apex response is 308, the destination preserves paths and query strings, and each www page serves its self-canonical. Host-based rules are not exercised by a plain local static server.
