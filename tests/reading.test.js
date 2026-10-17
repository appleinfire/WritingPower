// Run: node tests/reading.test.js
// Reading Puzzles: the picture words, the problems (one right picture, wrong pictures one letter or one thing away),
// words read wrong coming back, the jigsaw cut, the creatures' pictures and the album.
const path = require('path');
const assert = require('assert');
for (const f of ['config', 'util', 'creatures', 'reading']) require(path.join(__dirname, '..', 'js', f + '.js'));
const APP = globalThis.APP, RD = APP.reading;
const RUNS = 400;

// ---------- words
assert.ok(RD.LIST.length >= 35, `${RD.LIST.length} picture words`);
for (const w of RD.LIST) assert.match(w, /^[a-z]{2,3}$/, `"${w}" is a short word to sound out`);
const pics = Object.values(RD.WORDS);
assert.strictEqual(new Set(pics).size, pics.length, 'every word has its own picture');
for (const [a, b] of RD.CLASH) assert.ok(RD.WORDS[a] && RD.WORDS[b], `clash ${a}/${b} names two words of the list`);
for (const w of RD.COUNTABLE) {
  assert.ok(RD.WORDS[w], `${w} (countable) is a picture word`);
  assert.ok(!/[sxz]$/.test(w), `${w}: the plural only adds -s`);
}
const clash = (a, b) => RD.CLASH.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

// ---------- wrong words: never the word or a picture it could also name, one letter away when the list has one,
// and with the same first letter when the list has one (so the first letter alone is not enough)
for (const w of RD.LIST) {
  const near = RD.LIST.filter((x) => RD.diffAt(w, x) >= 0 && !clash(w, x));
  const sameFirst = RD.LIST.filter((x) => x !== w && x[0] === w[0] && !clash(w, x));
  for (let i = 0; i < 60; i++) {
    const d = RD.distractors(w);
    assert.strictEqual(d.length, 2, `${w}: two wrong words`);
    assert.ok(!d.includes(w) && d[0] !== d[1], `${w}: ${d}`);
    assert.ok(!d.some((x) => clash(x, w)) && !clash(d[0], d[1]), `${w}: no picture that could have both names (${d})`);
    if (near.length) assert.ok(d.some((x) => RD.diffAt(w, x) >= 0), `${w}: a word one letter away (${d})`);
    if (sameFirst.length) assert.ok(d.some((x) => x[0] === w[0]), `${w}: a wrong word with the same first letter (${d})`);
  }
}
assert.strictEqual(RD.diffAt('cat', 'cap'), 2);
assert.strictEqual(RD.diffAt('cat', 'hut'), -1);

// ---------- problems
const key = (o) => `${o.w}|${o.n || 0}|${o.s || ''}`;
for (const level of ['words', 'phrases']) {
  let phrases = 0;
  for (let i = 0; i < RUNS; i++) {
    const p = RD.problem(level);
    assert.strictEqual(p.opts.length, 3, 'three pictures');
    assert.strictEqual(new Set(p.opts.map(key)).size, 3, `three different pictures: ${p.opts.map(RD.optText)}`);
    assert.strictEqual(RD.optText(p.opts[p.answer]), p.text, 'the right picture is the text');
    assert.match(p.text, /^[a-z]+( [a-z]+)*$/, p.text);
    if (p.kind === 'word') {
      assert.ok(p.opts.every((o) => !o.n), `${p.text}: one picture each`);
      continue;
    }
    phrases++;
    assert.strictEqual(level, 'phrases', 'phrases only when asked for');
    const t = p.opts[p.answer];
    assert.ok(RD.COUNTABLE.includes(t.w), `${p.text}: a countable word`);
    assert.ok(t.n > 1 || t.s, `${p.text}: one of something says its size ("a big cat"), else it is a word problem`);
    assert.match(p.text, /^(a|an|two|three) ((big|little) )?[a-z]+$/, p.text);
    if (t.n === 1) assert.strictEqual(p.text.split(' ')[0], /^[aeiou]/.test(p.text.split(' ')[1]) ? 'an' : 'a', p.text);
    for (const o of p.opts) {
      if (o === t) continue;
      const diffs = ['w', 'n', 's'].filter((k) => (o[k] || '') !== (t[k] || ''));
      assert.strictEqual(diffs.length, 1, `${p.text} / ${RD.optText(o)}: a wrong picture changes one thing`);
      assert.ok(!clash(o.w, t.w), `${p.text} / ${RD.optText(o)}`);
    }
  }
  if (level === 'phrases') assert.ok(phrases > RUNS * 0.5, `phrases mostly (${phrases} of ${RUNS})`);
}
assert.strictEqual(RD.phraseText({ w: 'ant', n: 1, s: '' }), 'an ant');
assert.strictEqual(RD.phraseText({ w: 'egg', n: 1, s: 'big' }), 'a big egg');
assert.strictEqual(RD.phraseText({ w: 'pig', n: 3, s: 'little' }), 'three little pigs');
assert.strictEqual(RD.wordOf('three little pigs'), 'pig');
assert.strictEqual(RD.wordOf('bus'), 'bus');

// Not the same word twice in one puzzle (while there are words left), and words read wrong come back.
for (let i = 0; i < 50; i++) {
  const asked = [];
  for (let k = 0; k < 12; k++) { const p = RD.problem('phrases', asked); assert.ok(!asked.map(RD.wordOf).includes(p.word), `${p.word} asked twice`); asked.push(p.text); }
}
let back = 0;
for (let i = 0; i < RUNS; i++) if (RD.problem('words', [], ['web']).word === 'web') back++;
assert.ok(back > RUNS * 0.15, `a word read wrong comes back often (${back} of ${RUNS})`);
assert.ok(RD.problem('words', ['web'], ['web']).word !== 'web', 'but not twice in one puzzle');

// ---------- words to read: up on a miss, down when read right on the first try
const kid = { readMissed: {}, puzzles: undefined };
RD.noteMiss(kid, 'web');
RD.noteMiss(kid, 'web');
RD.noteMiss(kid, 'two big pigs');
assert.deepStrictEqual(RD.review(kid).sort(), ['pig', 'web']);
RD.noteRight(kid, 'web');
assert.strictEqual(kid.readMissed.web, 1);
RD.noteRight(kid, 'web');
assert.ok(!('web' in kid.readMissed), 'made up: gone from the list');

// ---------- pictures and the cut
assert.strictEqual(RD.PICS.length, APP.CREATURES.length, 'a picture for every creature');
for (const p of RD.PICS) {
  assert.ok(RD.SCENES[p.scene], `${p.id} has a scene`);
  assert.ok(RD.picArt(p).includes(p.emoji), `${p.id} is in its picture`);
}
for (const n of Object.keys(RD.GRID)) {
  const c = RD.cut(+n);
  assert.strictEqual(c.pieces.length, +n, `${n} pieces`);
  for (const pc of c.pieces) assert.match(pc.d, /^M[\d.]+ [\d.]+.*Z$/, 'a closed outline');
}

// ---------- the album: Common creatures first, every picture once, then any but the one just played
const st = {};
assert.deepStrictEqual(RD.ensure(st), { n: 6, level: 'words', done: {} });
const seen = [];
for (let i = 0; i < RD.total(); i++) {
  const p = RD.nextPic(st, seen[seen.length - 1]);
  assert.ok(!st.puzzles.done[p.id], `${p.id}: not made yet`);
  if (seen.length < APP.CREATURES.filter((c) => c.rarity === 'common').length) assert.strictEqual(p.rarity, 'common', 'Common first');
  assert.strictEqual(RD.finish(st, p.id), true, 'new in the album');
  seen.push(p.id);
}
assert.strictEqual(RD.count(st), RD.total());
assert.strictEqual(RD.finish(st, seen[0]), false, 'made again: not new');
assert.notStrictEqual(RD.nextPic(st, 'frog').id, 'frog', 'never the same picture twice in a row');
console.log(`reading tests passed (${RD.LIST.length} words, ${RD.COUNTABLE.length} countable, ${RD.PICS.length} pictures)`);
