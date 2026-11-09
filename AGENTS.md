# SimplyPray-Web agent guide

Static marketing site for `simplypray.io` / `www.simplypray.io`, served by Vercel
project `simply-pray-web` with no build step. No product logic lives here: auth,
dashboard, Supabase and Stripe are in the sibling `SimplyPray-App` repository
(`app.simplypray.io`); the iOS app is `simply-pray`; Android is `SimplyPray-Android`.

Workspace rules live one directory up in the Simply Pray workspace: `../AGENTS.md`
(ownership, risk tiers, release rules) and `../docs/rules/CODING-PRINCIPLES.md`
(shared core). Before planning or editing anything beyond copy, read both in
full. If this repository is checked out alone and those files are absent, stop
and obtain them from Joshua before non-copy work.

## Layout

- Pages: `index.html` (landing with the Keila waitlist embed from
  `newsletter.solomonsolutions.tech`), `adoration.html`, `confession.html`,
  `supplication.html`, `thanksgiving.html` (ACTS previews), `faq.html`,
  `support.html`, `privacy.html`, `terms.html`, `abuse.html`.
- `vercel.json`: `cleanUrls`, permanent apex-to-www redirect, `/eula` to
  `/terms`, rewrites for the policy and support pages. `.vercelignore` keeps
  `docs/`, `supabase/`, `tests/`, `scripts/`, `marketing-docs/`, `screenshots/`
  and internal root files out of the deployment.
- `assets/` (`acts-preview.css`, `support-pages.css`, `analytics/`, `brand/`,
  `fonts/`, `legal/` reviewed policy source text, `shots/`), `public/fonts/`,
  `robots.txt`, `sitemap.xml`, `screenshots/` (marketing imagery).
- `scripts/check_site.py` validates links, document structure, self-canonicals,
  sitemap and robots consistency. `scripts/build_nov3_legal_pages.py` renders
  the reviewed legal text into the page shells (`--check` verifies).
- `tests/public-analytics.test.cjs` and `.browser.cjs` cover the public
  analytics script. `DEPLOYMENT.md` is the Vercel and domain setup.
- `docs/` (policy publication notes, analytics checklist, `plans/`, `uat/`) and
  `marketing-docs/` (retired Apps Script waitlist) are history, not live rules.
  `supabase/migrations/README.md` is a pointer; no SQL may be added here.

## Rules

- Most changes are Tier 0 (`../AGENTS.md`): edit, run the checks below, inspect
  the page at phone and desktop widths. Never add secrets, private keys, or
  non-public analytics identifiers to HTML or JS.
- Policy pages and `assets/legal/*.txt` are legal text. Change them only from a
  reviewed source package (currently the November 3, 2026 set, see
  `docs/november-3-policy-publication.md`, coordinated with
  `../SimplyPray-App/docs/policy/`) and keep `build_nov3_legal_pages.py --check` green.
- Pricing and plan copy must match the product app
  (`../SimplyPray-App/src/app/(public)/pricing/page.tsx`,
  `../SimplyPray-App/docs/website-pricing-alignment-2026-10-08.md`). Do not invent
  prices, trial terms, or feature claims.
- Keep `https://www.simplypray.io` canonical: every page self-canonical, the
  apex redirect declared in `vercel.json`, sitemap and robots in step.
- No new third-party scripts or embeds without Joshua's approval.

## Verify

```bash
npm test            # legal --check + node tests + scripts/check_site.py
npm run test:browser  # when assets/analytics changes
```

CI: `.github/workflows/site-integrity.yml` runs `check_site.py`; `ioc-gate.yml`
scans for worm markers. On an `ioc-gate` finding stop and escalate; never add
ignore rules.

## Release

- Pushing `main` deploys to production through Vercel. Never push to `main` or
  deploy without explicit go-ahead from Joshua. Christinel may push feature
  branches and open PRs; she must not push to `main` (`../AGENTS.md`).
- After an approved deployment verify the apex responds 308 to `www` preserving
  path and query, and each page serves its self-canonical (`DEPLOYMENT.md`).
  A dashboard-level domain redirect can override repository routing; check it.

## Tooling (jCodeMunch MCP)

- When jCodeMunch is available, call `jcodemunch_guide` and follow the
  version-current tool guidance.
- Use jCodeMunch before native search/read tools when tracing functions, locating
  files or code pieces, understanding architecture, planning changes, refactoring,
  or assessing impact.
- Start with `list_repos`; if this repo is indexed, prefer `search_symbols`,
  `search_text`, `get_file_outline`, `get_context_bundle`, `find_references`,
  `get_call_hierarchy`, `get_blast_radius`, and related jCodeMunch tools over
  full-file reads.
- Fall back to shell search/read tools only for files that are not indexed, exact
  working-tree status, diffs, test output, or cases jCodeMunch cannot answer.
