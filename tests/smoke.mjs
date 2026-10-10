// Browser smoke test: node tests/smoke.mjs   (needs Playwright; uses Chromium)
// A profile plays a level and Endless Practice, hatches an egg, buys a theme, visits the zoo; the grown-ups gate and
// report; preview saves nothing; back gesture; a second profile; reload. Fails on any console error.
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(path.join(process.env.NODE_PATH || '/usr/local/lib/node_modules', 'playwright')); }
const dir = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(dir, '..', 'index.html');
const errors = [];
const ok = (cond, msg) => { if (!cond) throw new Error('FAILED: ' + msg); console.log('ok -', msg); };

const browser = await pw.chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
// Speech cannot be heard in a headless browser: record what would be said instead.
await page.addInitScript(() => {
  window.__said = [];
  if (window.speechSynthesis) window.speechSynthesis.speak = (u) => window.__said.push(u.text);
});
await page.goto(url);
const state = (fn) => page.evaluate(fn);
const target = () => state(() => APP.app.session().target);
// Type the sentence on screen with the computer keyboard; optionally one wrong key first on the on-screen keyboard.
async function write({ wrong = false } = {}) {
  const letters = (await target()).replace(/[^a-z]/gi, '').toLowerCase();
  if (wrong) {
    const bad = 'abcdefghijklmnopqrstuvwxyz'.split('').find((c) => c !== letters[0]);
    await page.click(`.key[data-k="${bad}"]`);
  }
  for (const c of letters) await page.keyboard.press(c);
  await page.waitForSelector('#modal.sticky [data-act=nextSentence]');
}

// First profile
await page.fill('#ob-name', 'Mia');
await page.click('[data-act=pickKind][data-arg=k]');
await page.click('[data-act=createProfile]');
ok(await page.isVisible('text=Hi, Mia!'), 'first profile opens its home');
ok(await state(() => APP.state.points === 30), 'daily bonus: 30 points');
ok(await page.locator('.lvl').count() === 30, 'the Kindergarten map has 30 levels');
ok(await page.locator('.lvl:not(.locked)').count() === 1, 'only level 1 is open');

// Level 1: one wrong key, then five sentences
await page.click('[data-act=level][data-arg="0"]', { force: true });
await page.waitForTimeout(500);
const first = await target();
ok((await state(() => window.__said)).includes(first), 'the sentence is read aloud');
ok(await page.locator('#boxes .box').count() === first.replace(/[^a-z]/gi, '').length, 'one box per letter');
const shown = await page.locator('.play').innerText();
ok(first.split(/\W+/).filter((w) => w.length > 2).every((w) => !new RegExp('\\b' + w + '\\b', 'i').test(shown)), 'the words are not shown');
await write({ wrong: true });
ok(await page.textContent('#oops') === '1', 'a wrong key counts an oops');
for (let i = 1; i < 5; i++) {
  await page.click('[data-act=nextSentence]');
  await write();
}
await page.click('[data-act=nextSentence]');
ok(await page.isVisible('text=Level 1 complete!'), 'level finished');
const afterLevel = await state(() => ({ ...APP.state.stats, stars: APP.state.levels['k-0'].stars, points: APP.state.points, missed: Object.keys(APP.state.missed).length, days: Object.values(APP.state.days)[0] }));
ok(afterLevel.stars === 3 && afterLevel.sentences === 5 && afterLevel.perfect === 4, 'stars and sentences recorded');
ok(afterLevel.points > 30 + afterLevel.letters, 'points for letters, sentences, the level and badges');
ok(afterLevel.missed === 1 && afterLevel.days.a === 5 && afterLevel.days.c === 4, 'the mistyped word and the day are recorded for the report');
await page.click('[data-act=go][data-arg=home]');
ok(await page.locator('.lvl:not(.locked)').count() === 2, 'level 2 is open');

// Endless Practice: 5 perfect sentences in a row pay a streak bonus
await page.click('[data-act=endless]');
for (let i = 0; i < 5; i++) {
  if (i) await page.click('[data-act=nextSentence]');
  await write();
}
ok(/5 in a row/.test(await page.textContent('#modal')), 'streak bonus after 5 in a row');
await page.click('#modal [data-act=leave]');
ok(await state(() => APP.state.bestStreak.k === 5 && APP.state.stats.sentences === 10), 'best streak saved');

// Back gesture inside a level asks first
await page.click('[data-act=level][data-arg="1"]', { force: true });
await page.goBack();
ok(await page.isVisible('#modal [data-act=leave]'), 'back during a level asks before leaving');
await page.click('#modal [data-act=leave]');

// Shop: hatch an egg, buy and use a theme
await state(() => { APP.state.points = 2000; APP.store.save(); });
await page.click('[data-act=go][data-arg=shop] >> nth=0');
await page.click('.egg-common .sbuy');
await page.waitForSelector('#modal .creature', { timeout: 5000 });
ok(await state(() => Object.keys(APP.state.creatures).length === 1 && APP.state.points === 2000 - 150 + 30), 'an egg hatched a creature (price paid, Hatchling badge earned)');
await page.click('[data-act=hatched]');
await page.click('[data-act=buyItem][data-arg="theme:rainbow"]');
ok(await state(() => APP.state.equipped.theme === 'rainbow' && document.body.dataset.theme === 'rainbow'), 'theme bought and used');

// Zoo
await page.click('[data-act=go][data-arg=home]');
await page.click('.tile[data-arg=zoo]');
ok(await page.locator('.zcard:not(.unknown)').count() === 1, 'the creature is in the zoo');
await page.click('[data-act=zooTab][data-arg=badges]');
ok(await page.locator('.badge:not(.unknown)').count() >= 3, 'badges are listed');

// Grown-ups gate
await page.click('[data-act=go][data-arg=home]');
await page.click('[data-act=go][data-arg=parent]');
const g = await page.evaluate(() => [...document.querySelector('.eqline').textContent.matchAll(/\d+/g)].map(Number));
await page.fill('#gate-in', '1');
await page.click('[data-act=gate]');
ok(await page.isVisible('text=Not quite'), 'wrong answer keeps the gate closed');
await page.fill('#gate-in', String(g[0] * g[1]));
await page.click('[data-act=gate]');
ok(await page.isVisible('text=Report for'), 'grown-ups page opens');
ok(await page.locator('[data-act=sayWord]').count() === 1, 'words to practice are listed');

// Preview saves nothing
const before = await state(() => JSON.stringify(APP.state));
await page.click('[data-act=startPreview]');
ok(await page.isVisible('.pvbar'), 'preview bar shows');
ok(await page.locator('.lvl.locked').count() === 0, 'every level is open in the preview');
await page.click('[data-act=level][data-arg="20"]', { force: true });
await write();
ok(/nothing is saved/.test(await page.textContent('#modal')), 'the preview says nothing is saved');
await page.click('[data-act=nextSentence]');
await page.click('[data-act=quit]');
await page.click('#modal [data-act=leave]');
await page.click('[data-act=exitPreview]');
ok(await state(() => JSON.stringify(APP.state)) === before, 'nothing from the preview was saved');

// Second profile and the picker
await page.click('[data-act=go][data-arg=who] >> nth=0');
await page.click('[data-act=go][data-arg=new]');
await page.fill('#ob-name', 'Leo');
await page.click('[data-act=pickKind][data-arg=g2]');
await page.click('[data-act=createProfile]');
ok(await page.isVisible('text=Hi, Leo!'), 'second profile opens');
ok(await state(() => APP.state.stats.sentences === 0 && APP.state.kind === 'g2'), 'profiles do not share progress');
await page.reload();
ok(await page.isVisible('text=Who’s writing?'), 'with two profiles the app asks who is writing');
await page.click('.profile >> text=Mia');
ok(await state(() => APP.state.stats.sentences === 10 && APP.state.equipped.theme === 'rainbow'), 'progress survives a reload');

await browser.close();
if (errors.length) { console.error('Console errors:\n' + errors.join('\n')); process.exit(1); }
console.log('smoke test passed');
