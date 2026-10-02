'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/analytics/public-analytics.js'), 'utf8');
const TEST_ID = 'G-TEST123456';
const KEY = 'simplypray-public-analytics-consent-v1';
const TTL = 180 * 86400000;
const NOW = 1790971200000;
const encode = (choice, savedAt = NOW) => JSON.stringify({ version: 1, choice, savedAt });

class Element {
  constructor(tag = 'div') {
    this.tagName = tag;
    this.events = {};
    this.attributes = {};
    this.hidden = false;
    this.children = [];
    this.isConnected = true;
  }
  addEventListener(name, callback) { (this.events[name] ||= []).push(callback); }
  dispatch(name, event = {}) { for (const cb of this.events[name] || []) cb(event); }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name]; }
  appendChild(node) { this.children.push(node); }
  focus() { this.focused = true; }
  remove() { this.removed = true; this.isConnected = false; }
  set innerHTML(value) {
    this.html = value;
    this.nodes = {};
    for (const key of ['section', '.public-analytics__settings', '[data-choice="accepted"]', '[data-choice="rejected"]', '[data-close]', '.public-analytics__signal']) this.nodes[key] = new Element();
    this.nodes['[data-choice="accepted"]'].setAttribute('data-choice', 'accepted');
    this.nodes['[data-choice="rejected"]'].setAttribute('data-choice', 'rejected');
  }
  querySelector(selector) { return this.nodes[selector]; }
  querySelectorAll() { return [this.nodes['[data-choice="accepted"]'], this.nodes['[data-choice="rejected"]']]; }
}

function boot(options = {}) {
  const state = { readFails: !!options.readFails, writeFails: !!options.writeFails, removeFails: !!options.removeFails, noopWrites: !!options.noopWrites, now: NOW, reloads: 0, cookies: [], stored: options.consent ?? null, timers: new Map(), timerIndex: 0 };
  const window = new Element();
  const document = new Element();
  document.head = new Element('head');
  document.body = new Element('body');
  document.title = 'DO NOT SEND prayer content';
  document.referrer = 'https://private.example/counseling?email=secret';
  document.createElement = tag => new Element(tag);
  document.getElementById = id => document.head.children.find(node => node.id === id && !node.removed);
  Object.defineProperty(document, 'cookie', { set(value) { state.cookies.push(value); } });
  window.location = { protocol: 'https:', hostname: 'www.simplypray.io', port: '', pathname: '/', search: '?email=secret&utm_campaign=private', hash: '#prayer-request', href: 'https://www.simplypray.io/?email=secret#prayer-request', reload() { state.reloads++; }, ...options.location };
  window.localStorage = {
    getItem() { if (options.storageFails || state.readFails) throw Error('blocked'); return state.stored; },
    setItem(key, value) { assert.equal(key, KEY); if (options.storageFails || state.writeFails) throw Error('blocked'); if (!state.noopWrites) state.stored = value; },
    removeItem(key) { assert.equal(key, KEY); if (options.storageFails || state.removeFails) throw Error('blocked'); state.stored = null; }
  };
  window.setTimeout = (callback, delay) => { const id = ++state.timerIndex; state.timers.set(id, { callback, delay }); return id; };
  window.clearTimeout = id => state.timers.delete(id);
  const navigator = { ...options.navigator };
  class FakeDate extends Date { constructor(...args) { super(...(args.length ? args : [state.now])); } static now() { return state.now; } }
  let code = source;
  if (options.configured !== false) {
    code = code.replace(/const MEASUREMENT_ID = '[^']*';/, "const MEASUREMENT_ID = '" + (options.id || TEST_ID) + "';")
      .replace('const PRIVACY_SETTINGS_VERIFIED = false;', 'const PRIVACY_SETTINGS_VERIFIED = true;');
  }
  vm.runInNewContext(code, { window, document, navigator, Date: FakeDate });
  const ui = document.body.children[0];
  return {
    window, document, state, navigator, ui,
    click(choice) { ui.querySelector('[data-choice="' + choice + '"]').dispatch('click'); },
    queue() { return Array.from(window.dataLayer || [], args => Array.from(args)); },
    googleScripts() { return document.head.children.filter(node => node.src && node.src.includes('googletagmanager.com')); }
  };
}

test('checked-in code stays disabled until stream and settings are verified', () => {
  const h = boot({ configured: false, consent: encode('accepted') });
  assert.equal(h.googleScripts().length, 0);
  assert.equal(h.ui, undefined);
  assert.match(source, /const PRIVACY_SETTINGS_VERIFIED = false/);
});

test('unknown visitors have equal explicit choices and no Google queue or script', () => {
  const h = boot();
  assert.equal(h.googleScripts().length, 0);
  assert.equal(h.window.dataLayer, undefined);
  assert.equal(h.ui.querySelector('section').hidden, false);
  assert.equal(h.ui.querySelector('[data-choice="accepted"]').hidden, false);
  assert.equal(h.ui.querySelector('[data-choice="rejected"]').hidden, false);
});

for (const location of [
  { hostname: 'app.simplypray.io' }, { hostname: 'simplypray.io' }, { hostname: 'localhost' },
  { hostname: 'preview.vercel.app' }, { hostname: 'www.simplypray.io.attacker.example' },
  { protocol: 'http:' }, { port: '4433' }, { pathname: '/prayers' }, { pathname: '/confession' },
  { pathname: '/supplication' }, { pathname: '/thanksgiving' }, { pathname: '/__proto__' },
  { pathname: '/privacy/private' }, { pathname: '/support/' }, { pathname: '/index.html' }
]) test('fails closed for ' + JSON.stringify(location), () => {
  const h = boot({ location, consent: encode('accepted') });
  assert.equal(h.googleScripts().length, 0);
  assert.equal(h.ui, undefined);
});

for (const pathname of ['/', '/privacy', '/support']) test('acceptance sends one static canonical page view for ' + pathname, () => {
  const h = boot({ location: { pathname } });
  h.click('accepted');
  assert.equal(h.googleScripts().length, 1);
  assert.equal(h.googleScripts()[0].referrerPolicy, 'no-referrer');
  const q = h.queue();
  const config = q.find(args => args[0] === 'config')[2];
  assert.equal(config.page_location, 'https://www.simplypray.io' + pathname);
  assert.equal(config.page_referrer, '');
  assert.equal(config.send_page_view, false);
  assert.equal(config.cookie_domain, 'none');
  assert.equal(config.cookie_update, false);
  assert.equal(config.cookie_expires, TTL / 1000);
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
  assert.equal(config.ignore_referrer, true);
  assert.equal(config.user_id, null);
  for (const key of ['id','source','medium','name','term','content']) assert.equal(config['campaign_' + key], '');
  const consent = q.filter(args => args[0] === 'consent');
  assert.equal(consent[0][2].analytics_storage, 'denied');
  assert.equal(consent[1][2].analytics_storage, 'granted');
  for (const command of consent) for (const key of ['ad_storage','ad_user_data','ad_personalization']) assert.equal(command[2][key], 'denied');
  assert.equal(q.filter(args => args[0] === 'event').length, 1);
  assert.equal(q.find(args => args[0] === 'event')[1], 'page_view');
  assert.doesNotMatch(JSON.stringify(q), /secret|prayer-request|DO NOT SEND|private\.example|utm_campaign/);
  h.click('accepted');
  h.window.dispatch('pageshow');
  h.document.dispatch('visibilitychange');
  assert.equal(h.googleScripts().length, 1);
  assert.equal(h.queue().filter(args => args[0] === 'event').length, 1);
});

test('reject persists without creating any Google requests', () => {
  const h = boot(); h.click('rejected');
  assert.equal(JSON.parse(h.state.stored).choice, 'rejected');
  assert.equal(h.googleScripts().length, 0);
  assert.equal(h.window.dataLayer, undefined);
  assert.equal(h.ui.querySelector('section').hidden, true);
  assert.equal(boot({ consent: h.state.stored }).googleScripts().length, 0);
});

test('previously accepted valid consent is reused without changing its timestamp', () => {
  const consent = encode('accepted', NOW - 5000);
  const h = boot({ consent });
  assert.equal(h.googleScripts().length, 1);
  assert.equal(h.state.stored, consent);
});

for (const consent of ['invalid', 'null', '{}', encode('other'), encode('accepted', NOW + 1), encode('accepted', NOW - TTL), encode('rejected', NOW - TTL), JSON.stringify({ version: 2, choice: 'accepted', savedAt: NOW }), JSON.stringify({ version: 1, choice: 'accepted', savedAt: String(NOW) })]) test('invalid or expired consent fails closed: ' + consent, () => {
  const h = boot({ consent });
  assert.equal(h.googleScripts().length, 0);
  assert.equal(h.ui.querySelector('section').hidden, false);
});

for (const navigator of [{ globalPrivacyControl: true }, { doNotTrack: '1' }]) test('browser privacy signal overrides saved or attempted acceptance: ' + JSON.stringify(navigator), () => {
  const h = boot({ navigator, consent: encode('accepted') });
  assert.equal(h.googleScripts().length, 0);
  h.click('accepted');
  assert.equal(h.googleScripts().length, 0);
  h.ui.querySelector('.public-analytics__settings').dispatch('click');
  assert.equal(h.ui.querySelector('[data-choice="accepted"]').hidden, true);
  assert.equal(h.ui.querySelector('.public-analytics__signal').hidden, false);
});

test('withdrawal disables immediately, removes cookies/tag/queue and unloads the page', () => {
  const h = boot(); h.click('accepted'); h.click('rejected');
  assert.equal(h.window['ga-disable-' + TEST_ID], true);
  assert.equal(h.state.reloads, 1);
  assert.equal(h.googleScripts()[0].removed, true);
  assert.equal(h.queue().length, 0);
  assert.equal(JSON.parse(h.state.stored).choice, 'rejected');
  assert.ok(h.state.cookies.some(value => value.startsWith('_ga=;')));
  assert.ok(h.state.cookies.some(value => value.startsWith('_ga_TEST123456=;')));
  assert.ok(h.state.cookies.every(value => !value.toLowerCase().includes('domain=')));
  assert.equal(boot({ consent: h.state.stored }).googleScripts().length, 0);
});

test('cross-tab rejection and storage clearing stop an already accepted page', () => {
  for (const key of [KEY, null]) {
    const h = boot({ consent: encode('accepted') });
    h.state.stored = key ? encode('rejected') : null;
    h.window.dispatch('storage', { key });
    assert.equal(h.window['ga-disable-' + TEST_ID], true);
    assert.equal(h.state.reloads, 1);
  }
});

test('storage failures do not imply consent; explicit choices work only for this page', () => {
  const h = boot({ storageFails: true });
  assert.equal(h.googleScripts().length, 0);
  h.click('accepted');
  assert.equal(h.googleScripts().length, 1);
  assert.equal(h.state.stored, null);
  h.click('rejected');
  assert.equal(h.state.reloads, 0);
  assert.equal(h.window['ga-disable-' + TEST_ID], true);
  assert.equal(boot({ storageFails: true }).googleScripts().length, 0);
});

test('expiration is checked at its deadline without timer overflow', () => {
  const h = boot({ consent: encode('accepted') });
  assert.equal([...h.state.timers.values()][0].delay, 2147483647);
  h.state.now += TTL - 1;
  h.window.dispatch('focus');
  const timer = [...h.state.timers.values()][0];
  assert.equal(timer.delay, 1);
  h.state.now++;
  timer.callback();
  assert.equal(h.window['ga-disable-' + TEST_ID], true);
  assert.equal(h.state.reloads, 1);
  assert.equal(h.ui.querySelector('section').hidden, false);
});

test('back-forward cache restores revalidate expired consent', () => {
  const h = boot({ consent: encode('accepted') });
  h.state.now += TTL;
  h.window.dispatch('pageshow', { persisted: true });
  assert.equal(h.state.reloads, 1);
});

test('settings can open and close using Escape with focus restored', () => {
  const h = boot({ consent: encode('rejected') });
  const settings = h.ui.querySelector('.public-analytics__settings');
  const panel = h.ui.querySelector('section');
  settings.dispatch('click');
  assert.equal(panel.hidden, false);
  assert.equal(panel.focused, true);
  panel.dispatch('keydown', { key: 'Escape' });
  assert.equal(panel.hidden, true);
  assert.equal(settings.focused, true);
});

test('static integration is confined to the three public marketing routes', () => {
  for (const name of ['index','privacy','support']) {
    const html = fs.readFileSync(path.join(root, name + '.html'), 'utf8');
    assert.equal((html.match(/src="\/assets\/analytics\/public-analytics.js"/g) || []).length, 1);
    assert.ok(html.includes('defer src='));
    assert.doesNotMatch(html, /googletagmanager|google-analytics\.com/);
  }
  for (const name of ['confession','supplication','thanksgiving']) {
    const html = fs.readFileSync(path.join(root, name + '.html'), 'utf8');
    assert.doesNotMatch(html, /public-analytics\.js|googletagmanager|google-analytics\.com/);
  }
  assert.match(fs.readFileSync(path.join(root, 'privacy.html'), 'utf8'), /id="website-analytics"/);
  assert.doesNotMatch(source, /document\.(title|referrer)|location\.(search|hash|href)|addEventListener\(['"]submit/);
  assert.equal((source.match(/gtag\('event'/g) || []).length, 1);
});


test('a changed public-document route stops tracking on history restoration', () => {
  const h = boot({ consent: encode('accepted') });
  h.window.location.pathname = '/prayers/private';
  h.window.dispatch('popstate');
  assert.equal(h.window['ga-disable-' + TEST_ID], true);
  assert.equal(h.state.reloads, 0);
  assert.equal(h.ui.hidden, true);
});

test('invalid measurement IDs never bootstrap analytics', () => {
  for (const id of ['AW-123456', 'G-abc', 'G-TEST123<script>']) {
    const h = boot({ id, consent: encode('accepted') });
    assert.equal(h.googleScripts().length, 0);
    assert.equal(h.ui, undefined);
  }
});


test('withdrawal stays disabled without reload when readable old acceptance cannot be replaced or removed', () => {
  const consent = encode('accepted', NOW - 1000);
  const h = boot({ consent, writeFails: true, removeFails: true });
  assert.equal(h.googleScripts().length, 1);
  h.click('rejected');
  assert.equal(h.state.stored, consent);
  assert.equal(h.state.reloads, 0);
  assert.equal(h.window['ga-disable-' + TEST_ID], true);
  assert.equal(h.queue().length, 0);
  assert.equal(h.googleScripts()[0].removed, true);
  for (const event of ['focus', 'pageshow']) h.window.dispatch(event);
  h.window.dispatch('storage', { key: KEY });
  h.window.dispatch('storage', { key: null });
  assert.equal(h.state.reloads, 0);
  assert.equal(h.window['ga-disable-' + TEST_ID], true);
  assert.equal(h.queue().length, 0);
});

test('withdrawal can reload after failed write only when prior acceptance was removed', () => {
  const h = boot({ consent: encode('accepted'), writeFails: true });
  h.click('rejected');
  assert.equal(h.state.stored, null);
  assert.equal(h.state.reloads, 1);
  assert.equal(h.window['ga-disable-' + TEST_ID], true);
  assert.equal(boot({ consent: h.state.stored }).googleScripts().length, 0);
});

test('silent storage write failure also cannot revive an old accepted choice', () => {
  const h = boot({ consent: encode('accepted'), noopWrites: true, removeFails: true });
  h.click('rejected');
  assert.equal(h.state.reloads, 0);
  assert.equal(h.window['ga-disable-' + TEST_ID], true);
  assert.equal(JSON.parse(h.state.stored).choice, 'accepted');
});

test('reacceptance after non-reloading withdrawal requires verified storage and a fresh document', () => {
  const h = boot({ consent: encode('accepted', NOW - 1000), writeFails: true, removeFails: true });
  h.click('rejected');
  h.click('accepted');
  h.window.dispatch('storage', { key: KEY });
  h.window.dispatch('focus');
  assert.equal(h.state.reloads, 0);
  assert.equal(h.window['ga-disable-' + TEST_ID], true);
  assert.equal(h.queue().length, 0);
  assert.equal(h.googleScripts().length, 1);
  h.state.writeFails = false;
  h.click('accepted');
  assert.equal(h.state.reloads, 1);
  assert.equal(JSON.parse(h.state.stored).choice, 'accepted');
  assert.equal(h.window['ga-disable-' + TEST_ID], true);
  assert.equal(h.queue().length, 0);
  assert.equal(boot({ consent: h.state.stored }).googleScripts().length, 1);
});

test('storage read-back failure prevents unsafe withdrawal reload', () => {
  const h = boot({ consent: encode('accepted') });
  h.state.readFails = true;
  h.state.writeFails = true;
  h.state.removeFails = true;
  h.click('rejected');
  assert.equal(h.state.reloads, 0);
  assert.equal(h.window['ga-disable-' + TEST_ID], true);
});
