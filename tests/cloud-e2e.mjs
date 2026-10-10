// End-to-end check of family sync against the real Firebase project in js/config.js.
// Two separate browser contexts play the part of two devices.
//   node tests/cloud-e2e.mjs        (needs Playwright and internet)
// Creates a test family with a random code; its profile is deleted at the end
// (the empty family record stays — the rules do not allow deleting families).
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(path.join(process.env.NODE_PATH || '/usr/local/lib/node_modules', 'playwright')); }
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
// The app's files are served from disk on a made-up https origin (a secure context, like GitHub Pages);
// only Firebase traffic goes over the network.
const ORIGIN = 'https://app.local', URL = ORIGIN + '/index.html';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); console.log((ok ? '✓ ' : '✗ ') + msg); };

const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const browser = await pw.chromium.launch({ proxy, executablePath: process.env.CHROMIUM || undefined });
const device = async (tag) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' });
  await ctx.route(ORIGIN + '/**', (route) => {
    const file = path.join(root, new globalThis.URL(route.request().url()).pathname);
    if (!file.startsWith(root) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
    route.fulfill({ path: file, contentType: TYPES[path.extname(file)] || 'application/octet-stream' });
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(tag + ': ' + e.message));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text()) && errors.push(tag + ' console: ' + m.text()));
  await page.goto(URL);
  return page;
};
// Start a level (or Endless) and type its first sentence on the computer keyboard.
async function writeOne(page) {
  if (!(await page.evaluate(() => APP.app.session()))) await page.click('[data-act=level][data-arg="0"]', { force: true });
  const t = await page.evaluate(() => APP.app.session().target);
  for (const c of t.replace(/[^a-z]/gi, '').toLowerCase()) await page.keyboard.press(c);
  await page.waitForSelector('#modal.sticky');
}
const code = 'e2e-test-' + Math.random().toString(36).slice(2, 8), pin = '4321';
try {
  // Device A: brand new, creates the family and a profile, writes one sentence
  const A = await device('A');
  check(await A.evaluate(() => APP.cloud.configured()), 'Firebase is configured');
  await A.click('[data-act=famMode][data-arg=create]');
  await A.fill('#fam-code', code);
  await A.fill('#fam-pin', pin);
  await A.fill('#fam-pin2', pin);
  await A.click('#fam-go');
  await A.waitForSelector('#ob-name', { timeout: 20000 });
  await A.fill('#ob-name', 'Cloudy');
  await A.click('[data-act=createProfile]');
  await writeOne(A);
  await A.click('#modal [data-act=nextSentence]');
  await A.click('[data-act=quit]');
  await A.click('#modal [data-act=leave]');
  await A.waitForFunction(() => APP.cloud.status === 'synced', null, { timeout: 20000 });
  check(true, 'device A uploaded its progress');

  // Device B: joins with the same code and PIN and sees the same profile
  const B = await device('B');
  await B.click('[data-act=famMode][data-arg=join]');
  await B.fill('#fam-code', code.toUpperCase());
  await B.fill('#fam-pin', pin);
  await B.click('#fam-go');
  await B.waitForSelector('text=Hi, Cloudy!', { timeout: 20000 });
  check(await B.evaluate(() => APP.state.stats.sentences === 1), 'device B got the same progress');

  // A change on B arrives on A live
  await B.click('[data-act=endless]');
  await writeOne(B);
  await A.waitForFunction(() => APP.state && APP.state.stats.sentences === 2, null, { timeout: 20000 });
  check(true, 'a change on device B arrives on device A');

  // Wrong PIN finds nothing
  const C = await device('C');
  await C.click('[data-act=famMode][data-arg=join]');
  await C.fill('#fam-code', code);
  await C.fill('#fam-pin', '9999');
  await C.click('#fam-go');
  await C.waitForFunction(() => document.querySelector('#fam-err').textContent.length > 0, null, { timeout: 20000 });
  check(/No family found/.test(await C.textContent('#fam-err')), 'a wrong PIN finds no family');

  // Clean up: delete the test profile (removed on A, gone on B)
  await A.evaluate(() => APP.store.remove(APP.state.id));
  await B.waitForFunction(() => APP.store.profiles().length === 0, null, { timeout: 20000 });
  check(true, 'deleting the profile on A removes it on B');
} catch (e) {
  errors.push(String(e));
}
await browser.close();
if (errors.length) { console.error('\nFAILED:\n' + errors.join('\n')); process.exit(1); }
console.log('cloud sync test passed');
