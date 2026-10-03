'use strict';
// Browser fixture, not a live-site or GA wire-payload test. Does not visit a local
// server, production host, or Google. The fixed location is injected only in memory.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'assets/analytics/public-analytics.js'), 'utf8')
  .replace(/const MEASUREMENT_ID = '[^']*';/, "const MEASUREMENT_ID = 'G-TEST123456';")
  .replace('const PRIVACY_SETTINGS_VERIFIED = false;', 'const PRIVACY_SETTINGS_VERIFIED = true;')
  .replaceAll('window.location', 'window.__analyticsFixtureLocation');
const css = fs.readFileSync(path.join(root, 'assets/analytics/public-analytics.css'), 'utf8');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 640 }]) {
      const page = await browser.newPage({ viewport });
      const requests = [];
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', async route => {
        if (route.request().resourceType() === 'document') {
          await route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><html><head><meta charset="UTF-8"><style>' + css + '</style></head><body><h1>SimplyPray</h1></body></html>'});
          return;
        }
        requests.push(route.request().url());
        await route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* Offline GA stub: no tag execution or collection. */' });
      });
      await page.goto('https://www.simplypray.io/');
      await page.evaluate(() => {
        window.__analyticsFixtureLocation = { protocol: 'https:', hostname: 'www.simplypray.io', port: '', pathname: '/', reload() { window.__reloads = (window.__reloads || 0) + 1; } };
        const store = {};
        Object.defineProperty(window, 'localStorage', { value: { getItem(key) { return store[key] || null; }, setItem(key, value) { store[key] = value; } } });
      });
      await page.addScriptTag({ content: js });
      const panel = page.locator('.public-analytics__panel');
      assert.equal(await panel.isVisible(), false, 'Starts collapsed without consent');
      await page.getByRole('button', { name: 'Cookies', exact: true }).click();
      await panel.waitFor({ state: 'visible' });
      assert.equal(await page.getByRole('button', { name: 'Cookies', exact: true }).getAttribute('aria-expanded'), 'true');
      assert.equal(requests.length, 0, 'No pre-consent requests');
      const bounds = await panel.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height);
      const buttons = await page.locator('[data-choice]').evaluateAll(buttons => buttons.map(button => {
        const s = getComputedStyle(button); return { width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height, background: s.backgroundColor, color: s.color, font: s.fontWeight };
      }));
      assert.deepEqual(buttons[0], buttons[1], 'Accept and Reject have equal prominence');
      assert.ok(buttons[0].height >= 44);
      if (process.env.ANALYTICS_SCREENSHOT_DIR) {
        fs.mkdirSync(process.env.ANALYTICS_SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: path.join(process.env.ANALYTICS_SCREENSHOT_DIR, 'consent-' + viewport.width + '.png') });
      }
      await page.getByRole('button', { name: 'Reject cookies', exact: true }).click();
      assert.equal(requests.length, 0);
      await page.getByRole('button', { name: 'Cookies', exact: true }).click();
      await page.keyboard.press('Escape');
      assert.equal(await panel.isVisible(), false);
      assert.equal(await page.getByRole('button', { name: 'Cookies', exact: true }).evaluate(el => el === document.activeElement), true);
      await page.getByRole('button', { name: 'Cookies', exact: true }).click();
      await page.getByRole('button', { name: 'Accept cookies', exact: true }).click();
      await page.waitForFunction(() => document.getElementById('public-site-google-analytics') !== null);
      await page.waitForTimeout(50);
      assert.equal(requests.length, 1);
      assert.equal(requests[0], 'https://www.googletagmanager.com/gtag/js?id=G-TEST123456');
      await page.getByRole('button', { name: 'Cookies', exact: true }).click();
      await page.getByRole('button', { name: 'Reject cookies', exact: true }).click();
      assert.equal(await page.evaluate(() => window['ga-disable-G-TEST123456']), true);
      assert.equal(await page.evaluate(() => window.__reloads), 1);
      assert.equal(await page.locator('#public-site-google-analytics').count(), 0);
      assert.deepEqual(errors, []);
      console.log('PASS browser fixture: ' + viewport.width + 'x' + viewport.height + ', no pre-consent requests, equal controls, withdrawal, focus and bounds');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
