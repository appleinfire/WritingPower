// Generates every level for every grade and checks the sentences.
// Run with: node scripts/check-content.js
const path = require("path");
global.window = {};
require(path.join(__dirname, "../js/content.js"));
require(path.join(__dirname, "../js/sentences.js"));
const C = window.WP_CONTENT, S = window.WP_SENT;
let problems = 0;
for (const g of window.WP_GRADE_ORDER) {
  const all = new Set();
  const words = new Set();
  for (let i = 0; i < S.LEVELS; i++) {
    const list = S.levelSentences(g, i);
    if (list.length !== S.PER_LEVEL) { console.log(`${g} L${i + 1}: ${list.length} sentences`); problems++; }
    if (new Set(list).size !== list.length) { console.log(`${g} L${i + 1}: repeat`, list); problems++; }
    if (JSON.stringify(list) !== JSON.stringify(S.levelSentences(g, i))) { console.log(`${g} L${i + 1}: not stable`); problems++; }
    for (const s of list) {
      all.add(s);
      if (!/^[A-Z][A-Za-z ]*[.?!]$/.test(s) || /  /.test(s)) { console.log(`${g} L${i + 1}: bad text "${s}"`); problems++; }
    }
  }
  for (let i = 0; i < 2000; i++) all.add(S.endlessSentence(g, []));
  for (const s of all) s.toLowerCase().replace(/[^a-z ]/g, "").split(" ").forEach(w => words.add(w));
  const avg = [0, 29].map(i => (S.levelSentences(g, i).reduce((a, s) => a + S.letterCount(s), 0) / 5).toFixed(1));
  console.log(`${C[g].name}: ${all.size} distinct sentences seen, ${words.size} distinct words, avg letters L1=${avg[0]} L30=${avg[1]}`);
}
if (problems) { console.log(problems + " problem(s)"); process.exit(1); }
console.log("All levels OK");
