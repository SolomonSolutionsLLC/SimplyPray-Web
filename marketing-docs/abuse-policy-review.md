# Abuse policy review and publication handoff

Prepared October 3, 2026 from main `32f2c0c` on `feat/abuse-policy-2026-10-03`.

The `/abuse` page identifies SimplyPray as a trade name of SolomonSolutions LLC and assigns support and abuse-report review to company staff. It covers prohibited content/conduct, email reporting, investigation/enforcement, report privacy, review requests, emergencies, and updates. Support and footer links expose it; the canonical URL, rewrite, and sitemap include it.

The policy uses the existing published support address, `joshua@solomonsolutions.tech`. Before publication, Joshua should confirm that authorized company staff monitor this address and adopt a restricted case register, assigned reviewer/backup, escalation and follow-up process, and privacy-appropriate retention. The companion iOS handoff provides a proposed procedure. The policy avoids an unverified fixed response deadline.

This is policy and contact access, not implementation of all Apple Guideline 1.2 safeguards. Filtering and abusive-user blocking still need product/backend implementation and verification. Staff suspension tools, report receipt, and production deployment were not verified. Do not represent this PR alone as complete Apple compliance. Apple’s primary requirements: https://developer.apple.com/app-store/review/guidelines/#user-generated-content

Validation: `python3 scripts/check_site.py` passes for seven HTML pages, local links/anchors, canonical URLs, redirects and sitemap consistency. All eight policy sections match the iOS offline text. `git diff --check` passes. A rendered browser preview was not verified because the available browser rejected local-file URLs; the command-line browser from the installed verification skill was unavailable.

No production deployment or hosted system operations were performed. Joshua owns review and publication.
