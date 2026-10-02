# SimplyPray public-website analytics: release gates

Google account/tag privacy settings were verified on October 2, 2026, and the verified stream ID is G-W4MGLLC11W. The production code gate is enabled; analytics still requires each visitor’s affirmative consent. Use deployment evidence to determine whether this revision is live.

## Scope

- Only HTTPS `www.simplypray.io` on `/`, `/privacy`, and `/support`.
- No apex, app subdomain, preview hosts, localhost, arbitrary routes, ACTS preview screens, forms, outbound links, prayer/journal/shared-list content, account identifiers, or counseling content.
- Fixed page names and canonical page URLs are set before the first GA configuration. No query, hash, referrer, campaign, or visitor-provided values enter this integration's events.
- BASIC consent: Google Analytics is not requested at all until affirmative acceptance. Rejection is equally prominent and works without first enabling GA.
- 180-day local-storage choice, host-only 180-day GA cookies, no automatic cookie/choice renewal, DNT/GPC respected. Withdrawal disables the measurement ID, clears this integration's host-only cookies and queued commands, then reloads to unload Google's code only when storage read-back confirms no valid accepted choice remains. If rejection cannot be saved and old acceptance cannot be removed, the current document remains disabled without reloading. A later reacceptance never revives the stopped tag; it requires verified persistence and a fresh document. Previously transmitted data is not erased by withdrawal.
- The app's existing local-only analytics statement remains separate and unchanged in substance.
- Existing Google Fonts loading is outside GA consent and is explicitly disclosed. This work does **not** promise zero Google network requests overall.

## Required external settings before enabling

An authorized administrator must confirm all of the following for the actual SimplyPray public-site GA4 stream/property. Do not infer completion from client flags or from a stream existing.

1. Set the real `G-...` measurement ID in `assets/analytics/public-analytics.js`.
2. Turn **Enhanced measurement OFF**, including page changes based on browser history, scroll, outbound clicks, site search, video, file downloads, and form interactions. Client-side `send_page_view: false` does not independently disable Enhanced measurement.
3. Turn **Google Signals**, ads personalization, user-provided data collection, **granular location and device data collection**, and any connected Ads/remarketing features OFF. Do not enable User-ID, cross-domain measurement, connected destination tags, or automatic user-provided-data detection. There must be no extra tag-manager installation on these pages.
4. Review Google tag settings and account data-sharing choices for this limited website-only purpose. Confirm acceptance of any required Google terms by the account owner; repository edits do not accept terms.
5. Review and record event/user data retention. The 180-day browser cookie/consent lifetime is distinct from Google's server-side retention. This change makes no unverified server-retention promise.
6. Only after evidence of the above and the privacy review is complete, change `PRIVACY_SETTINGS_VERIFIED` to `true`. Keep it `false` if any gate is unresolved.
7. Review the privacy policy effective date against the actual authorized release date.
8. Scoped public-website analytics publication was approved on October 2, 2026. Production remains blocked on the unresolved settings and verification gates above. That approval does not authorize the separate SEO or marketing-launch changes.

## Checks

- `npm test`: Node built-in runtime fixtures plus existing Python site-integrity checks; no dependencies or Google access required.
- `node --check assets/analytics/public-analytics.js`: syntax check.
- `npm run test:browser`: optional Chromium + Playwright **offline fixture**, with a mocked origin and intercepted stub Google script. It verifies control sizing, viewport containment, focus, consent and withdrawal at 1440, 390 and 320 pixels. It does not visit a local server or production website and is not proof of actual GA network payloads. Requires Playwright available to Node and Chromium at `CHROMIUM_PATH` (defaults to `/usr/bin/chromium`). No test dependencies are installed by this repository.
- The browser fixture was attempted in the development VM but Chromium launch failed because socket creation was forbidden; browser layout assertions and screenshots have therefore **not run**. Do not present them as passed.

## Mandatory first-party deployment verification

After an approved deployment, use a test browser and the **real** stream to inspect actual requests and storage. Until then, live GA behavior is **unverified**; dataLayer assertions are not wire proof.

- Before opt-in, after rejection, with DNT/GPC, and on all excluded hosts/routes: no `gtag/js`, GA `collect` request, or analytics cookies from this integration.
- After opt-in: one deliberate `page_view` per allowed document; every event uses only its fixed canonical URL/title, with no query/hash/referrer/campaign/form content. Inspect URLs and request payloads, including auto session/engagement events.
- Use synthetic query strings and a synthetic referring page to verify no such values leak. Do not put real personal data in a QA URL.
- Inspect cookie host/path, expiry and secure flags; confirm host-only cookies are not sent to the app subdomain.
- Verify changing to Reject unloads GA without new cookieless consent pings; check another open tab, reload, expiry and Back/Forward restoration. Test a readable old accepted record with writes/removal blocked: rejection must disable the current document without reloading or reviving stale commands.
- Verify no form, search, click, scroll, download, video, prayer-content, or app events appear in the stream.
- Verify actual desktop/mobile layout and keyboard operation. Record the observed stream ID/settings and date before reporting analytics live.

## Sources

- Google GA4 configuration reference: https://developers.google.com/analytics/devguides/collection/ga4/reference/config
- Google tag API: https://developers.google.com/tag-platform/gtagjs/reference
- Enhanced measurement controls: https://support.google.com/analytics/answer/9216061

These references describe API behavior. They do not prove the specific account's settings.
