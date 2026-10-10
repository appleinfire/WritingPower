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
});
Object.assign(a.stats, { pointsEarned: 900, letters: 500, keys: 560, sentences: 40, perfect: 30, levelsDone: 2 });
a.settings.sound = true;
Object.assign(b, {
  rev: 200, points: 150, levels: { 'g1-1': { stars: 3 }, 'g1-2': { stars: 2 } }, creatures: { frog: 1, owl: 1 },
  bestStreak: { g1: 4, g2: 5 }, missed: { frog: 1, swim: 2 }, badges: { sent_25: '2026-10-09' }, trophies: {},
  owned: { theme: ['sunny', 'ocean'], effect: ['confetti', 'stars'] }, equipped: { theme: 'ocean', effect: 'stars' },
  lastDaily: '2026-10-09', days: { '2026-10-09': { a: 4, c: 4 }, '2026-10-10': { a: 6, c: 5 } },
});
Object.assign(b.stats, { pointsEarned: 700, letters: 450, keys: 600, sentences: 35, perfect: 33, levelsDone: 3 });
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
assert.deepStrictEqual(m.stats, { pointsEarned: 900, letters: 500, keys: 600, sentences: 40, perfect: 33, levelsDone: 3 }, 'counters keep the higher value');
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
mem[APP.CONFIG.id + '-p-' + kid.id] = JSON.stringify(oldSave);
S.init();
const reread = S.profiles()[0];
assert.deepStrictEqual(reread.missed, {});
assert.strictEqual(reread.stats.perfect, 0);
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
  console.log('shell tests passed');
})().catch((e) => { console.error(e); process.exit(1); });
