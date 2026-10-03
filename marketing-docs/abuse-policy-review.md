# Community safety release handoff

Prepared October 3, 2026. SimplyPray is a trade name of SolomonSolutions LLC. Reporting contact: privacy@simplypray.io.

## Behavior and ownership

Shared requests and list names/descriptions/cadence are screened by the database before publication. Accepted requests appear immediately, including submissions from older clients that request pending status. No routine human preapproval is required. The starter screening rules detect selected direct threats, sexual solicitation/exploitation phrases, self-harm commands, and credential scams. They are a conservative English phrase filter, not comprehensive detection. SolomonSolutions owns the standards and must review/refine the rules for its actual audience before release.

Members can submit an in-app report and immediately block a post's author. A receipt appears only after the database confirms submission. Blocking hides shared requests in both directions for signed-in users and prevents targeted invitations/open-list joins between the blocked member and list owner. Anonymous public visitors have no personal block state. Unblock is available in Safety & Reports.

List administrators handle routine reports and can remove a post and record a resolution. The existing database list-owner authorization includes applicable active Church administrators. Reports about an administrator, administrator-submitted reports, and reports explicitly escalated by a member go to SolomonSolutions staff. Members may escalate a previously resolved report. Administrators cannot resolve escalated reports or reports about themselves. Staff can remove content, resolve escalations, and suspend/restore shared-service access through the web safety center. Suspension also hides that author's shared requests from public visitors. Personal account deletion remains available while suspended; other authors' posts survive deletion.

Reports retain identifiers and the reporter's chosen explanation, not a copied prayer body. Authorized reviewers can see the referenced post subject to database access controls. Staff membership, screening rules, reports, blocks, suspensions, and audit actions are protected from ordinary direct writes. Safety & Reports displays up to 100 recent authorized reports; pagination and outbound report alerts are not implemented.

## Joshua's release sequence

1. Review the backend migration `20261003120000_community_safety.sql` and companion iOS/website PRs. Apply the migration through the approved release process before shipping clients that call the new RPCs. No hosted migration has been run here.
2. Provision only verified SolomonSolutions staff UUIDs in `public.safety_staff` using an authorized administrative process. Membership is never self-service. Verify an ordinary member cannot access staff actions.
3. Approve/refine `public.safety_screening_rules`. The filter covers shared requests and list text; it does not newly screen Church landing text, member display names, or historical content. Review those surfaces and existing content before claiming overall content compliance.
4. Assign an accountable staff reviewer and backup to monitor the web `/safety` queue and privacy@simplypray.io. List administrators must monitor their queues. There are no automatic email notifications or overdue-report escalations. Adopt timely triage/follow-up, coverage, and access/retention procedures; a policy alone does not establish those operations.
5. Test on staging with member, administrator, and staff accounts: accepted/rejected submission; report receipt/error; immediate block/unblock; administrator removal and resolution; administrator conflict escalation; reporter reopening/escalation; staff suspension/restoration; suspended-account deletion. Use synthetic content. Verify private/history visibility and anonymous public behavior.
6. Verify the published `/abuse`, privacy, and support pages after the approved website deployment. Prepare App Review accounts and notes showing where reporting, blocking, administration, and staff enforcement are located.

Apple Guideline 1.2 requires submission filtering, reporting with timely responses, abusive-user blocking, and published contact information: https://developer.apple.com/app-store/review/guidelines/#user-generated-content . These changes implement the shared-list controls; launch operations, screening suitability, unfiltered surfaces, deployment, and Apple's review remain necessary. Do not claim guaranteed approval.

No main-branch push, merge, deployment, TestFlight upload, hosted migration, or production-data operation was performed. Joshua owns review and release decisions.

## Website verification

`python3 scripts/check_site.py` passed the seven HTML pages, internal links/anchors, canonicals, rewrites, and sitemap. The nine policy sections match the native offline policy. `git diff --check` passed. A rendered browser preview was not verified because the available browser rejected local-file URLs. The website documents controls implemented by the companion backend/native PRs; publishing this page alone does not deploy those controls.
