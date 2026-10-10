// Run: node tests/content.test.js
// Builds every level of every grade and checks the sentences: 5 per level, all different, the same every time,
// only letters, spaces and end punctuation, getting longer from level 1 to level 30, and plenty of different words.
const path = require('path');
const assert = require('assert');
for (const f of ['content', 'sentences']) require(path.join(__dirname, '..', 'js', f + '.js'));
const APP = globalThis.APP, C = APP.CONTENT, S = APP.SENT;
const MIN_WORDS = { k: 140, g1: 200, g2: 300, g3: 300 };

for (const g of APP.GRADES) {
  const all = new Set(), words = new Set();
  for (let i = 0; i < S.LEVELS; i++) {
    const list = S.levelSentences(g, i);
    assert.strictEqual(list.length, S.PER_LEVEL, `${g} level ${i + 1} has ${S.PER_LEVEL} sentences`);
    assert.strictEqual(new Set(list).size, list.length, `${g} level ${i + 1} has no repeats`);
    assert.deepStrictEqual(S.levelSentences(g, i), list, `${g} level ${i + 1} is the same every time`);
    for (const s of list) {
      assert.match(s, /^[A-Z][A-Za-z ]*[a-z][.?!]$/, `${g} level ${i + 1}: "${s}"`);
      assert.ok(!/ {2}/.test(s), `${g}: double space in "${s}"`);
      all.add(s);
    }
  }
  for (let i = 0; i < 2000; i++) all.add(S.endlessSentence(g, []));
  for (const s of all) s.toLowerCase().replace(/[^a-z ]/g, '').split(' ').forEach((w) => words.add(w));
  const avg = (i) => S.levelSentences(g, i).reduce((n, s) => n + S.letterCount(s), 0) / S.PER_LEVEL;
  assert.ok(avg(S.LEVELS - 1) > avg(0), `${g}: level ${S.LEVELS} is longer than level 1`);
  assert.ok(words.size >= MIN_WORDS[g], `${g}: ${words.size} different words`);
  console.log(`${C[g].name}: ${all.size} different sentences, ${words.size} different words, letters per sentence L1 ${avg(0).toFixed(1)} → L${S.LEVELS} ${avg(S.LEVELS - 1).toFixed(1)}`);
}
console.log('content tests passed');
