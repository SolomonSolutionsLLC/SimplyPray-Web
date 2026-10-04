/* Optional public-site GA4. BASIC consent: no Google tag or pings before opt-in.
 * Release gate: the real stream ID AND verified external privacy settings are required.
 * See docs/analytics-release-checklist.md. Never reuse this on app.simplypray.io.
 */
(function () {
  'use strict';
  const MEASUREMENT_ID = 'G-W4MGLLC11W';
  const PRIVACY_SETTINGS_VERIFIED = true;
  const STORAGE_KEY = 'simplypray-public-analytics-consent-v1';
  const CONSENT_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
  const CANONICAL_ORIGIN = 'https://www.simplypray.io';
  const PAGES = Object.freeze({
    '/': 'SimplyPray | Public website',
    '/privacy': 'SimplyPray | Privacy policy',
    '/support': 'SimplyPray | Product support'
  });
  const disableKey = 'ga-disable-' + MEASUREMENT_ID;
  window[disableKey] = true;

  // No localhost, preview, apex, app, unknown routes, query/hash-derived page names,
  // ACTS previews, authenticated pages, or visitor content enter this allowlist.
  if (!PRIVACY_SETTINGS_VERIFIED || !/^G-[A-Z0-9]{6,20}$/.test(MEASUREMENT_ID) ||
      window.location.protocol !== 'https:' || window.location.port ||
      window.location.hostname !== 'www.simplypray.io' ||
      !Object.prototype.hasOwnProperty.call(PAGES, window.location.pathname)) return;

  const page = Object.freeze({
    page_location: CANONICAL_ORIGIN + window.location.pathname,
    page_title: PAGES[window.location.pathname],
    page_referrer: ''
  });
  let initialized = false;
  let stopped = false;
  let reloadRequested = false;
  let memoryRecord = null;
  let expiryTimer = null;
  let settingsOpen = false;
  let previousFocus = null;

  function privacySignal() {
    return navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' ||
      window.doNotTrack === '1';
  }

  function parseRecord(raw) {
    try {
      const value = JSON.parse(raw);
      if (!value || value.version !== 1 ||
          (value.choice !== 'accepted' && value.choice !== 'rejected') ||
          !Number.isFinite(value.savedAt) || value.savedAt < 0 || value.savedAt > Date.now() ||
          Date.now() - value.savedAt >= CONSENT_LIFETIME_MS) return null;
      return value;
    } catch (_) { return null; }
  }

  function readRecord() {
    if (memoryRecord !== null) return parseRecord(memoryRecord);
    try { return parseRecord(window.localStorage.getItem(STORAGE_KEY)); }
    catch (_) { return null; }
  }

  function requestReload() {
    if (reloadRequested) return;
    reloadRequested = true;
    window.location.reload();
  }

  function canReloadWithoutAcceptance() {
    // A failed write can leave old accepted consent readable. Never reload into it.
    try {
      const stored = parseRecord(window.localStorage.getItem(STORAGE_KEY));
      return !stored || stored.choice !== 'accepted';
    } catch (_) { return false; }
  }

  function deleteAnalyticsCookies() {
    // Domain is deliberately absent: these are host-only, never app-domain cookies.
    ['_ga', '_ga_' + MEASUREMENT_ID.slice(2)].forEach(function (name) {
      document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax; Secure';
    });
  }

  function stop() {
    window[disableKey] = true;
    deleteAnalyticsCookies();
    if (initialized) {
      stopped = true;
      // Do not send a denied consent update, which could generate a cookieless
      // ping. Unload the document only when stored consent cannot restart GA.
      const script = document.getElementById('public-site-google-analytics');
      if (script) script.remove();
      if (window.dataLayer) window.dataLayer.length = 0;
      if (canReloadWithoutAcceptance()) requestReload();
    }
  }

  // gtag's API consumes Arguments objects, not arrays.
  function gtag() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }

  function start() {
    if (initialized) {
      // Never revive a stopped tag or its stale listeners/queued commands. A new
      // accepted choice must be verified in storage before a fresh document loads.
      if (stopped && memoryRecord === null) {
        const stored = readRecord();
        if (stored && stored.choice === 'accepted') requestReload();
      }
      return;
    }
    window[disableKey] = false;
    const options = Object.assign({}, page, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_domain: 'none',
      cookie_path: '/',
      cookie_expires: CONSENT_LIFETIME_MS / 1000,
      cookie_update: false,
      cookie_flags: 'SameSite=Lax;Secure',
      ignore_referrer: true,
      // Give up campaign attribution rather than forward arbitrary URL values.
      campaign_id: '', campaign_source: '', campaign_medium: '',
      campaign_name: '', campaign_term: '', campaign_content: '',
      user_id: null
    });
    gtag('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    gtag('set', 'ads_data_redaction', true);
    gtag('set', 'url_passthrough', false);
    gtag('consent', 'update', {
      analytics_storage: 'granted', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    gtag('js', new Date());
    gtag('set', options);
    gtag('config', MEASUREMENT_ID, options);
    gtag('event', 'page_view', Object.assign({}, page, { send_to: MEASUREMENT_ID }));
    const script = document.createElement('script');
    script.id = 'public-site-google-analytics';
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
    initialized = true;
    document.head.appendChild(script);
  }

  const root = document.createElement('div');
  root.className = 'public-analytics';
  root.innerHTML = '<section id="cookie-preferences" class="public-analytics__panel" aria-label="Cookie preferences" tabindex="-1" hidden>' +
    '<p class="public-analytics__signal" hidden>Your browser’s privacy preference is keeping optional cookies off.</p>' +
    '<div class="public-analytics__actions">' +
    '<button type="button" data-choice="rejected">Reject cookies</button>' +
    '<button type="button" data-choice="accepted">Accept cookies</button>' +
    '</div></section>' +
    '<button type="button" class="public-analytics__settings" aria-controls="cookie-preferences" aria-expanded="false">Cookies</button>';
  document.body.appendChild(root);
  const panel = root.querySelector('section');
  const settings = root.querySelector('.public-analytics__settings');
  const accept = root.querySelector('[data-choice="accepted"]');
  const signal = root.querySelector('.public-analytics__signal');

  function render() {
    const blocked = privacySignal();
    const open = settingsOpen;
    panel.hidden = !open;
    settings.hidden = false;
    settings.setAttribute('aria-expanded', String(open));
    accept.hidden = blocked;
    signal.hidden = !blocked;
  }

  function refresh() {
    window.clearTimeout(expiryTimer);
    // Static documents must stay on their original, allowlisted public route.
    if (window.location.protocol !== 'https:' || window.location.port ||
        window.location.hostname !== 'www.simplypray.io' ||
        CANONICAL_ORIGIN + window.location.pathname !== page.page_location) {
      root.hidden = true;
      stop();
      return;
    }
    const record = readRecord();
    if (record && record.choice === 'accepted' && !privacySignal()) start();
    else stop();
    render();
    if (record) {
      // setTimeout overflows after ~24 days. Recheck without renewing the choice.
      expiryTimer = window.setTimeout(refresh,
        Math.min(record.savedAt + CONSENT_LIFETIME_MS - Date.now(), 2147483647));
    }
  }

  function restoreFocus() {
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
    else settings.focus();
  }

  root.querySelectorAll('[data-choice]').forEach(function (button) {
    button.addEventListener('click', function () {
      const choice = button.getAttribute('data-choice');
      if (choice === 'accepted' && privacySignal()) return;
      memoryRecord = JSON.stringify({ version: 1, choice: choice, savedAt: Date.now() });
      try {
        window.localStorage.setItem(STORAGE_KEY, memoryRecord);
        if (window.localStorage.getItem(STORAGE_KEY) === memoryRecord) memoryRecord = null;
      } catch (_) { /* Keep the current-document choice if persistence fails. */ }
      if (choice === 'rejected' && memoryRecord !== null) {
        // Removal may still work when writes fail (for example, a full store).
        // stop() independently verifies storage before permitting any reload.
        try { window.localStorage.removeItem(STORAGE_KEY); } catch (_) { /* Stay disabled here. */ }
      }
      settingsOpen = false;
      refresh();
      restoreFocus();
    });
  });
  settings.addEventListener('click', function () {
    previousFocus = document.activeElement;
    settingsOpen = !settingsOpen;
    render();
    if (settingsOpen) panel.focus();
  });
  function closePanel() {
    if (!settingsOpen) return;
    settingsOpen = false;
    render();
    restoreFocus();
  }
  panel.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closePanel();
  });
  window.addEventListener('storage', function (event) {
    if (event.key === STORAGE_KEY || event.key === null) {
      // A failed-to-persist local withdrawal must survive unrelated storage events.
      const local = parseRecord(memoryRecord);
      if (!local) memoryRecord = null;
      else if (local.choice === 'accepted') {
        // A stored rejection/clear can revoke session-only acceptance, but old
        // stored acceptance must not erase an unpersisted current-document choice.
        try {
          const stored = parseRecord(window.localStorage.getItem(STORAGE_KEY));
          if (!stored || stored.choice === 'rejected') memoryRecord = null;
        } catch (_) { /* Keep the current-document choice. */ }
      }
      refresh();
    }
  });
  // Recheck after a suspended/background tab or Back/Forward cache restore.
  window.addEventListener('pageshow', refresh);
  window.addEventListener('focus', refresh);
  window.addEventListener('popstate', refresh);
  document.addEventListener('visibilitychange', refresh);
  refresh();
}());
