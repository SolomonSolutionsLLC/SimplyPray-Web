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
