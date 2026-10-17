// Run: node tests/shell.test.js
// Checks how two copies of one profile are merged, profile storage, the family key, and the offline file list.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const mem = {};
globalThis.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
for (const f of ['config', 'util', 'schema', 'store', 'content', 'sentences', 'creatures', 'cloud']) require(path.join(__dirname, '..', 'js', f + '.js'));
const APP = globalThis.APP, S = APP.store;

// The same child played offline on a tablet (A, older copy) and a laptop (B, newer copy).
S.init();
const kid = S.create({ name: 'Mia', kind: 'g1', avatar: '🐼' });
const a = JSON.parse(JSON.stringify(kid)), b = JSON.parse(JSON.stringify(kid));
Object.assign(a, {
  rev: 100, points: 400, levels: { 'g1-0': { stars: 3 }, 'g1-1': { stars: 1 } }, creatures: { frog: 2, fox: 1 },
  bestStreak: { g1: 7, k: 2 }, missed: { frog: 3, jump: 1 }, badges: { first_sentence: '2026-10-08' }, trophies: { k: '2026-10-08' },
  owned: { theme: ['sunny', 'space'], effect: ['confetti'] }, equipped: { theme: 'space', effect: 'confetti' },
  lastDaily: '2026-10-10', days: { '2026-10-09': { a: 10, c: 8 } },
  readMissed: { web: 2, 'two big pigs': 1 }, puzzles: { n: 9, level: 'phrases', done: { frog: 2, owl: 1 } },
});
Object.assign(a.stats, { pointsEarned: 900, letters: 500, keys: 560, sentences: 40, perfect: 30, levelsDone: 2, read: 80, readRight: 60 });
a.settings.sound = true;
Object.assign(b, {
  rev: 200, points: 150, levels: { 'g1-1': { stars: 3 }, 'g1-2': { stars: 2 } }, creatures: { frog: 1, owl: 1 },
  bestStreak: { g1: 4, g2: 5 }, missed: { frog: 1, swim: 2 }, badges: { sent_25: '2026-10-09' }, trophies: {},
  owned: { theme: ['sunny', 'ocean'], effect: ['confetti', 'stars'] }, equipped: { theme: 'ocean', effect: 'stars' },
  lastDaily: '2026-10-09', days: { '2026-10-09': { a: 4, c: 4 }, '2026-10-10': { a: 6, c: 5 } },
  readMissed: { web: 1, sun: 1 }, puzzles: { n: 4, level: 'words', done: { frog: 1, lion: 1 } },
});
Object.assign(b.stats, { pointsEarned: 700, letters: 450, keys: 600, sentences: 35, perfect: 33, levelsDone: 3, read: 90, readRight: 55 });
b.settings.sound = false;
const m = S.mergeProfiles(a, b);
assert.deepStrictEqual(m.levels, { 'g1-0': { stars: 3 }, 'g1-1': { stars: 3 }, 'g1-2': { stars: 2 } }, 'levels: union, best stars per level');
assert.deepStrictEqual(m.creatures, { frog: 2, fox: 1, owl: 1 }, 'creatures: union, higher count per creature');
assert.deepStrictEqual(m.bestStreak, { g1: 7, k: 2, g2: 5 }, 'Endless streaks: union, higher value per grade');
assert.deepStrictEqual(m.missed, { frog: 3, jump: 1, swim: 2 }, 'words to practice: union, higher count per word');
assert.deepStrictEqual(Object.keys(m.badges).sort(), ['first_sentence', 'sent_25'], 'badges from both devices are kept');
assert.deepStrictEqual(m.trophies, { k: '2026-10-08' }, 'trophies from both devices are kept');
assert.deepStrictEqual([...m.owned.theme].sort(), ['ocean', 'space', 'sunny'], 'themes bought on either device are kept');
assert.deepStrictEqual([...m.owned.effect].sort(), ['confetti', 'stars'], 'celebrations bought on either device are kept');
assert.deepStrictEqual(m.stats, { pointsEarned: 900, letters: 500, keys: 600, sentences: 40, perfect: 33, levelsDone: 3, read: 90, readRight: 60 }, 'counters keep the higher value');
assert.deepStrictEqual(m.puzzles.done, { frog: 2, owl: 1, lion: 1 }, 'puzzle album: pictures made on either device are kept');
assert.deepStrictEqual([m.puzzles.n, m.puzzles.level], [4, 'words'], 'puzzle pieces and what to read come from the newer copy');
assert.deepStrictEqual(m.readMissed, { web: 2, 'two big pigs': 1, sun: 1 }, 'words to read: union, higher count per word');
assert.strictEqual(m.lastDaily, '2026-10-10', 'the later daily bonus date wins, so the bonus is not paid twice');
assert.strictEqual(m.points, 150, 'points to spend come from the newer copy');
assert.deepStrictEqual(m.equipped, { theme: 'ocean', effect: 'stars' }, 'equipped theme and effect come from the newer copy');
assert.strictEqual(m.settings.sound, false, 'settings come from the newer copy');
assert.deepStrictEqual(m.days, { '2026-10-09': { a: 10, c: 8 }, '2026-10-10': { a: 6, c: 5 } });
assert.strictEqual(m.rev, 200);
assert.deepStrictEqual(S.mergeProfiles(b, a), m, 'merge order does not matter');

// A profile saved by an older version gets the new fields with their defaults.
const oldSave = JSON.parse(JSON.stringify(kid));
delete oldSave.missed;
delete oldSave.stats.perfect;
delete oldSave.puzzles;
delete oldSave.readMissed;
delete oldSave.stats.read;
mem[APP.CONFIG.id + '-p-' + kid.id] = JSON.stringify(oldSave);
S.init();
const reread = S.profiles()[0];
assert.deepStrictEqual(reread.missed, {});
assert.strictEqual(reread.stats.perfect, 0);
assert.deepStrictEqual([reread.puzzles, reread.readMissed, reread.stats.read], [{ n: 6, level: 'words', done: {} }, {}, 0], 'Reading Puzzles fields get their defaults');
// A copy from a device without Reading Puzzles yet merges with one that has them.
const noPz = JSON.parse(JSON.stringify(oldSave));
assert.deepStrictEqual(S.mergeProfiles(Object.assign(noPz, { rev: 999 }), a).puzzles.done, { frog: 2, owl: 1 });
S.open(kid.id);

// A deliberate reset is not undone by an older copy from another device.
const r = Object.assign(JSON.parse(JSON.stringify(b)), { rev: 300, resetAt: 300, points: 0, levels: {} });
assert.deepStrictEqual(S.mergeProfiles(a, r).levels, {});

// A copy from another device updates the open profile in place.
const before = APP.state;
assert.strictEqual(S.applyRemote(Object.assign(JSON.parse(JSON.stringify(kid)), { rev: Date.now() + 1000, points: 999 })), true);
assert.strictEqual(APP.state, before, 'same object stays on screen');
assert.strictEqual(APP.state.points, 999);
assert.strictEqual(S.applyRemote(JSON.parse(JSON.stringify(APP.state))), false, 'nothing new: no change');

// A new profile from another device appears; a deleted one disappears.
const other = Object.assign(JSON.parse(JSON.stringify(kid)), { id: 'zz1', name: 'Leo', rev: 5 });
S.applyRemote(other);
assert.deepStrictEqual(S.profiles().map((p) => p.name).sort(), ['Leo', 'Mia']);
S.removeRemote('zz1');
assert.deepStrictEqual(S.profiles().map((p) => p.name), ['Mia']);

// Preview: nothing is saved.
const saved = mem[APP.CONFIG.id + '-p-' + kid.id];
S.startPreview();
APP.state.points = 12345;
S.save();
assert.strictEqual(mem[APP.CONFIG.id + '-p-' + kid.id], saved);
S.endPreview();
assert.strictEqual(APP.state.points, 999);

// Save code round trip.
const code = S.exportCode();
S.remove(kid.id);
assert.strictEqual(S.profiles().length, 0);
S.importCode(code);
assert.strictEqual(S.profiles()[0].name, 'Mia');

// Every script in index.html is in the offline cache list of sw.js.
const root = path.join(__dirname, '..');
const scripts = [...fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"/g)].map((x) => x[1]);
const cached = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
for (const s of scripts.concat('css/style.css')) assert.ok(cached.includes(`'${s}'`), s + ' is missing from FILES in sw.js');

// Family key: same code + PIN → same key on every device, whatever the spacing and case.
(async () => {
  const k1 = await APP.cloud.deriveId('Smith Tigers', '1234');
  const k2 = await APP.cloud.deriveId(' smith-tigers ', ' 1234');
  assert.strictEqual(k1, k2);
  assert.match(k1, /^[a-f0-9]{64}$/, 'matches the pattern in firestore.rules');
  assert.notStrictEqual(k1, await APP.cloud.deriveId('smith-tigers', '1235'));

  // One family code + PIN for all our apps: the root is the key Math Expedition already uses,
  // and each app keeps its data under its own key derived from the root.
  const MATH_KEY = 'd359f955e02a16da5751505a2d0bc555a26c7a08f33ac7eb1a1469ded2b601e6'; // Math Expedition: smith-tigers + 1234
  const root = await APP.cloud.deriveRoot('smith-tigers', '1234');
  assert.strictEqual(root, MATH_KEY, 'same family root as Math Expedition');
  assert.strictEqual(await APP.cloud.appKey(root, 'math-expedition'), MATH_KEY, 'Math Expedition keeps its data under the root');
  assert.strictEqual(k1, await APP.cloud.appKey(root), 'this app: key from the root');
  assert.strictEqual(k1, await APP.cloud.appKey(root, 'writing-power'), 'this app is writing-power');
  assert.notStrictEqual(k1, root);
  assert.notStrictEqual(await APP.cloud.appKey(root, 'writing-power'), await APP.cloud.appKey(root, 'another-app'), 'apps do not share data');

  // A family another app connected on this device can be joined without the PIN.
  assert.strictEqual(APP.cloud.sibling(), null);
  localStorage.setItem('math-expedition-family', JSON.stringify({ fid: MATH_KEY, name: 'smith-tigers' })); // Math's older link: no root
  assert.deepStrictEqual(APP.cloud.sibling(), { root: MATH_KEY, name: 'smith-tigers', app: 'Math Expedition' });
  localStorage.setItem('math-expedition-family', JSON.stringify({ root: MATH_KEY, fid: MATH_KEY, name: 'smith-tigers' })); // newer link
  assert.deepStrictEqual(APP.cloud.sibling(), { root: MATH_KEY, name: 'smith-tigers', app: 'Math Expedition' });
  localStorage.removeItem('math-expedition-family');
  localStorage.setItem('writing-power-family', JSON.stringify({ root: MATH_KEY, fid: 'x', name: 'smith-tigers' }));
  assert.strictEqual(APP.cloud.sibling(), null, 'our own family link is never offered as another app');
  localStorage.removeItem('writing-power-family');

  // Catch-up on start: what never reached the server goes up; what was deleted elsewhere goes away here.
  const plan = (l, srv, syn) => { const p = APP.cloud.catchUpPlan(l, srv, syn); return [p.upload.join(), p.remove.join(), JSON.stringify(p.onServer)]; };
  assert.deepStrictEqual(plan([{ id: 'a', rev: 5 }], { a: 5 }, {}), ['', '', '{"a":5}'], 'in sync: nothing to do');
  assert.deepStrictEqual(plan([{ id: 'a', rev: 6 }], { a: 5 }, { a: 5 }), ['a', '', '{}'], 'a change that never went up is uploaded');
  assert.deepStrictEqual(plan([{ id: 'a', rev: 4 }], { a: 5 }, {}), ['', '', '{"a":5}'], 'the server is newer: the live update brings it');
  assert.deepStrictEqual(plan([{ id: 'n', rev: 3 }], {}, {}), ['n', '', '{}'], 'a new profile that never went up is uploaded');
  assert.deepStrictEqual(plan([{ id: 'd', rev: 3 }], {}, { d: 3 }), ['', 'd', '{}'], 'deleted on another device: removed here too');
  assert.deepStrictEqual(plan([{ id: 'd', rev: 4 }], {}, { d: 3 }), ['d', '', '{}'], 'changed here after it was deleted elsewhere: kept and uploaded');
  assert.deepStrictEqual(plan([{ id: 'd', rev: 3 }, { id: 'a', rev: 1 }], { a: 1 }, null), ['', '', '{"a":1}'], 'no record yet: a missing profile is left alone');
  console.log('shell tests passed');
})().catch((e) => { console.error(e); process.exit(1); });
