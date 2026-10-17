// Reading Puzzles: the picture words, the reading problems, the pictures (drawn from code), the jigsaw cut and the album.
//   RD.WORDS    short words a kindergartner can sound out (consonant-vowel-consonant), each with one clear picture
//   RD.problem  a word or a little phrase to read, with three pictures to choose from
//   RD.PICS     the 42 creatures of the zoo, each in a little scene: every right answer brings a piece of one
//   RD.cut(n)   jigsaw pieces of a picture on a grid of n cells
// The screens are in js/reading-ui.js. Everything here is plain data and math, so the tests run it in node.
//
// How the problems keep it real reading, not guessing:
//   - the word is shown, never read aloud, until the second miss;
//   - the wrong pictures are words one letter away (cat → cap, hat), and at least one starts with the same letter
//     whenever the list has one, so the first letter alone is not enough;
//   - a phrase ("two little pigs") changes one thing in each wrong picture: how many, the size, or the word;
//   - words read wrong come back more often until they are read right.
(function () {
  const APP = (globalThis.APP = globalThis.APP || {});
  const U = APP.U;
  const RD = {};
  const f1 = (x) => +(+x).toFixed(2);
  const chance = (p) => Math.random() < p;
  let uid = 0;

  // ---------------------------------------------------------------- words
  // Only pictures a child names with this word and no other (no 🥤 "cup or drink", no 🧹 "mop or broom").
  RD.WORDS = {
    cat: '🐈', bat: '🦇', hat: '🎩', rat: '🐀', cap: '🧢', map: '🗺️', can: '🥫', van: '🚐', pan: '🍳', man: '👨', bag: '👜', cab: '🚕', ram: '🐏', ant: '🐜',
    bed: '🛏️', hen: '🐔', pen: '🖊️', ten: '🔟', leg: '🦵', web: '🕸️', egg: '🥚',
    pig: '🐖', pin: '📌', bin: '🗑️', six: '6️⃣',
    dog: '🐕', fox: '🦊', box: '📦', ox: '🐂', pot: '🍲', log: '🪵',
    bus: '🚌', bug: '🐛', sun: '☀️', nut: '🥜', hut: '🛖', tub: '🛁', run: '🏃',
    sad: '😢', mad: '😠',
  };
  RD.LIST = Object.keys(RD.WORDS);
  // Pictures that the other word could also name: never in the same problem (🧢 is a hat too, 🗑️ is a can, 🚐 looks like a bus).
  RD.CLASH = [['hat', 'cap'], ['can', 'bin'], ['van', 'bus'], ['van', 'cab']];
  const clash = (a, b) => RD.CLASH.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  // Words that can be counted in a phrase ("two pigs"): the plural only adds -s, and two of the picture still look like two.
  RD.COUNTABLE = ['cat', 'bat', 'hat', 'rat', 'cap', 'map', 'can', 'van', 'pan', 'bag', 'cab', 'ram', 'ant', 'bed', 'hen', 'pen', 'leg', 'web', 'egg', 'pig', 'pin', 'bin', 'dog', 'log', 'pot', 'bug', 'hut', 'tub'];
  RD.NUM = { 1: 'a', 2: 'two', 3: 'three' };
  RD.SIZES = ['big', 'little'];

  // Where two words of the same length differ, when it is in exactly one letter (else -1).
  RD.diffAt = (a, b) => {
    if (a.length !== b.length || a === b) return -1;
    let at = -1;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { if (at >= 0) return -1; at = i; }
    return at;
  };
  // Two wrong words for a word: one letter away when possible, in two different places, and at least one with the same
  // first letter when the list has one, so the child has to read past the first letter.
  RD.distractors = (word, pool = RD.LIST) => {
    const ok = pool.filter((w) => w !== word && !clash(w, word));
    const near = U.shuffle(ok.filter((w) => RD.diffAt(word, w) >= 0));
    const sameFirst = U.shuffle(ok.filter((w) => w[0] === word[0]));
    const out = [];
    const add = (w) => { if (w && !out.includes(w) && !out.some((o) => clash(o, w))) out.push(w); };
    add(near.find((w) => RD.diffAt(word, w) > 0) || sameFirst.find((w) => w.length === word.length) || sameFirst[0]);
    const d1 = out[0] ? RD.diffAt(word, out[0]) : -2;
    add(near.find((w) => !out.includes(w) && RD.diffAt(word, w) !== d1));
    add(near.find((w) => !out.includes(w)));
    // Nothing one letter away: words that share the most letters in the same places.
    const alike = (w) => [...w].filter((c, i) => c === word[i]).length + (w.length === word.length ? 0.5 : 0);
    for (const w of U.shuffle(ok).sort((a, b) => alike(b) - alike(a))) { if (out.length >= 2) break; add(w); }
    return out.slice(0, 2);
  };

  // ---------------------------------------------------------------- problems
  // opt: { w: word, n: how many (phrases), s: 'big' | 'little' | '' (phrases) }; a word problem's opts have no n.
  const plural = (w, n) => (n > 1 ? w + 's' : w);
  const article = (w) => (/^[aeiou]/.test(w) ? 'an' : 'a');
  RD.phraseText = ({ w, n, s }) => {
    const first = n === 1 ? article(s || w) : RD.NUM[n];
    return [first, s, plural(w, n)].filter(Boolean).join(' ');
  };
  RD.optText = (o) => (o.n ? RD.phraseText(o) : o.w);
  // The picture word of a word or phrase: "three little pigs" → pig.
  RD.wordOf = (text) => {
    const last = String(text).split(' ').pop();
    return RD.WORDS[last] ? last : last.replace(/s$/, '');
  };
  const sameOpt = (a, b) => a.w === b.w && (a.n || 0) === (b.n || 0) && (a.s || '') === (b.s || '');

  function wordProblem(word) {
    const opts = [{ w: word }, ...RD.distractors(word).map((w) => ({ w }))];
    return { kind: 'word', text: word, word, opts };
  }
  // A phrase: "a big cat", "two dogs", "three little hens". Each wrong picture changes one thing: how many, the size, or the word.
  function phraseProblem(word) {
    const n = U.pick([1, 2, 2, 3, 3]), s = n === 1 ? U.pick(RD.SIZES) : U.pick(['', '', ...RD.SIZES]);
    const t = { w: word, n, s };
    const changes = U.shuffle(['n', 'w', ...(s ? ['s'] : [])]).slice(0, 2);
    const opts = [t];
    for (const c of changes) {
      let o;
      if (c === 'n') o = { ...t, n: U.pick([1, 2, 3].filter((k) => k !== n)) };
      else if (c === 's') o = { ...t, s: s === 'big' ? 'little' : 'big' };
      else {
        const [w] = RD.distractors(word, RD.COUNTABLE);
        o = { ...t, w };
      }
      if (!opts.some((x) => sameOpt(x, o))) opts.push(o);
    }
    while (opts.length < 3) { // the extra wrong picture changes the word, so all three still differ in one thing
      const w = U.pick(RD.COUNTABLE.filter((x) => x !== word && !clash(x, word) && !opts.some((o) => o.w === x)));
      opts.push({ ...t, w });
    }
    return { kind: 'phrase', text: RD.phraseText(t), word, opts };
  }

  // level: 'words' or 'phrases' (phrases mixed with some words). recent: texts asked in this puzzle (not asked again).
  // review: words read wrong before; one of them comes back in about every fourth problem.
  RD.problem = (level, recent = [], review = []) => {
    const used = recent.map(RD.wordOf);
    const fresh = (w) => !used.includes(w);
    const phrase = level === 'phrases' && chance(0.7);
    const pool = phrase ? RD.COUNTABLE : RD.LIST;
    const back = review.filter((w) => pool.includes(w) && fresh(w));
    const word = back.length && chance(0.25) ? U.pick(back) : U.pick(pool.filter(fresh).length ? pool.filter(fresh) : pool);
    const p = phrase ? phraseProblem(word) : wordProblem(word);
    const order = U.shuffle(U.range(0, p.opts.length - 1));
    p.opts = order.map((i) => p.opts[i]);
    p.answer = order.indexOf(0);
    p.review = back.includes(word);
    return p;
  };

  // ---------------------------------------------------------------- pictures of the answers
  // The picture of one answer inside a w × h box at (x, y) of an SVG: the word's emoji, as many as the phrase says, big or little.
  const SIZE = { big: 0.46, '': 0.38, little: 0.26 }; // little stays big enough to see what it is on a phone
  const SPOTS = { 1: [[0.5, 0.52]], 2: [[0.27, 0.52], [0.73, 0.52]], 3: [[0.27, 0.3], [0.73, 0.3], [0.5, 0.74]] };
  RD.optArt = (o, x = 0, y = 0, w = 100, h = 100) => {
    const S = Math.min(w, h), e = RD.WORDS[o.w];
    if (!o.n) return `<text class="rd-emo" x="${f1(x + w / 2)}" y="${f1(y + h * 0.53)}" font-size="${f1(S * 0.62)}">${e}</text>`;
    const fs = S * SIZE[o.s || ''];
    return SPOTS[o.n].map(([u, v]) => `<text class="rd-emo" x="${f1(x + w * u)}" y="${f1(y + h * v)}" font-size="${f1(fs)}">${e}</text>`).join('');
  };

  // ---------------------------------------------------------------- the creatures' pictures
  const SCENE_OF = {
    frog: 'pond', kitty: 'garden', pup: 'sky', bunny: 'garden', mouse: 'autumn', chick: 'sky', turtle: 'pond', bee: 'garden', ladybug: 'garden',
    snail: 'garden', hamster: 'autumn', piglet: 'sunset', calf: 'mountain', duck: 'pond', squirrel: 'autumn', worm: 'garden',
    fox: 'autumn', owl: 'night', panda: 'mountain', koala: 'sunset', raccoon: 'night', penguin: 'snow', hedgehog: 'autumn', otter: 'pond',
    dolphin: 'sea', parrot: 'rainbow', octopus: 'sea', butterfly: 'garden',
    lion: 'sunset', tiger: 'autumn', shark: 'sea', flamingo: 'pond', whale: 'sea', peacock: 'garden', croc: 'pond', sloth: 'autumn',
    unicorn: 'rainbow', dragon: 'mountain', trex: 'sunset', bronto: 'mountain', alien: 'night', fairy: 'rainbow',
  };
  RD.PICS = (APP.CREATURES || []).map((c) => ({ id: c.id, name: c.name, emoji: c.emoji, rarity: c.rarity, scene: SCENE_OF[c.id] || 'sky' }));
  const sky = (k, a, b) => `<defs><linearGradient id="${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="120" height="120" fill="url(#${k})"/>`;
  const cloud = (x, y, s) => `<g fill="#ffffff" opacity=".92"><ellipse cx="${x}" cy="${y}" rx="${12 * s}" ry="${5 * s}"/><ellipse cx="${f1(x - 4 * s)}" cy="${f1(y - 4 * s)}" rx="${6 * s}" ry="${5 * s}"/><ellipse cx="${f1(x + 4 * s)}" cy="${f1(y - 5 * s)}" rx="${7 * s}" ry="${6 * s}"/></g>`;
  const dots = (list, r, fill) => `<g fill="${fill}">${list.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`;
  // The scenes of Puzzle Time in Math Expedition (js/shapes.js), so the two apps' puzzles look like one family.
  RD.SCENES = {
    sunset: (k) => sky(k, '#ffd08f', '#ff9f8c') + '<circle cx="94" cy="28" r="14" fill="#fff0b8"/><circle cx="94" cy="28" r="20" fill="#fff0b8" opacity=".3"/>' + cloud(24, 26, 1) +
      '<path d="M0 90C30 76 62 84 120 72V120H0Z" fill="#9bd27f"/><path d="M0 104C40 94 82 100 120 90V120H0Z" fill="#62ae5f"/>',
    sky: (k) => sky(k, '#86cfff', '#dff3ff') + cloud(22, 24, 1.1) + cloud(98, 16, 0.9) + cloud(102, 70, 0.8) + cloud(16, 76, 0.7) + '<path d="M0 100C34 90 80 96 120 88V120H0Z" fill="#8fd47a"/>',
    sea: (k) => sky(k, '#7fdcf0', '#2a86c6') + '<path d="M0 18C20 12 40 24 60 18S100 12 120 18V0H0Z" fill="#ffffff" opacity=".25"/>' +
      '<g fill="none" stroke="#e8fbff" stroke-width="1.2" opacity=".8"><circle cx="18" cy="40" r="3"/><circle cx="24" cy="30" r="2"/><circle cx="102" cy="48" r="3.5"/><circle cx="96" cy="36" r="2"/></g>' +
      '<path d="M10 120C6 104 16 98 10 86M18 120C16 108 24 102 20 92M108 120C104 106 114 100 110 88" fill="none" stroke="#3fae6a" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M0 108C30 102 70 106 120 100V120H0Z" fill="#f2d59b"/>',
    night: (k) => sky(k, '#262b66', '#5a5fb0') + '<circle cx="96" cy="24" r="11" fill="#fff3c4"/><circle cx="92" cy="21" r="2.4" fill="#f0dd9e"/>' +
      dots([[14, 14], [34, 30], [60, 10], [76, 40], [12, 52], [108, 54], [46, 22], [24, 70]], 1, '#ffffff') + '<path d="M0 98C36 86 76 92 120 84V120H0Z" fill="#2f6b58"/>',
    autumn: (k) => sky(k, '#ffeab8', '#ffd59a') + '<rect x="10" y="62" width="4" height="30" fill="#8a5526"/><circle cx="12" cy="56" r="12" fill="#f08a3c"/><rect x="104" y="58" width="4" height="34" fill="#8a5526"/><circle cx="106" cy="50" r="13" fill="#e2553a"/>' +
      '<path d="M0 94C36 86 80 92 120 86V120H0Z" fill="#d9894a"/><path d="M0 108C40 102 84 106 120 100V120H0Z" fill="#b8693a"/>',
    rainbow: (k) => sky(k, '#e3f1ff', '#fdf0ff') + `<g fill="none" stroke-width="5" opacity=".85">${['#ff6b6b', '#ffb84d', '#ffe66d', '#7ed957', '#5ec8ff', '#a77bff'].map((c, i) => `<path d="M${-6 + i * 5} 100A${66 - i * 5} ${66 - i * 5} 0 0 1 ${126 - i * 5} 100" stroke="${c}"/>`).join('')}</g>` +
      cloud(14, 96, 1) + cloud(108, 96, 1) + '<path d="M0 104C40 96 80 102 120 96V120H0Z" fill="#a4e58f"/>',
    pond: (k) => sky(k, '#c4ecff', '#eaf8ff') + '<path d="M0 74C30 70 90 70 120 74V120H0Z" fill="#9bd27f"/><ellipse cx="60" cy="100" rx="58" ry="17" fill="#59b8de"/>' +
      '<path d="M8 76V52M112 76V50" stroke="#3f8f4a" stroke-width="2" stroke-linecap="round"/><ellipse cx="8" cy="52" rx="2" ry="5" fill="#8a5526"/><ellipse cx="112" cy="50" rx="2" ry="5" fill="#8a5526"/>',
    mountain: (k) => sky(k, '#a6d6ff', '#e6f4ff') + cloud(26, 20, 0.9) + '<path d="M-10 92L28 40L66 92Z" fill="#9aa8c4"/><path d="M28 40L18 54L24 52L28 58L33 52L38 54Z" fill="#ffffff"/><path d="M50 92L94 30L134 92Z" fill="#8494b5"/><path d="M94 30L82 47L89 45L94 51L99 45L106 47Z" fill="#ffffff"/>' +
      '<path d="M0 96C36 88 80 94 120 88V120H0Z" fill="#8fcf7a"/>',
    snow: (k) => sky(k, '#bfe3ff', '#eef8ff') + dots([[12, 14], [30, 34], [52, 12], [78, 26], [100, 12], [110, 40], [20, 60], [96, 64], [64, 44]], 1.6, '#ffffff') +
      '<path d="M0 92C32 80 70 88 120 78V120H0Z" fill="#ffffff"/><path d="M0 106C40 98 84 104 120 96V120H0Z" fill="#e3effb"/>',
    garden: (k) => sky(k, '#d8f3ff', '#f3fbff') + cloud(96, 20, 0.9) + '<path d="M0 92C36 84 80 90 120 84V120H0Z" fill="#8fd47a"/>' +
      [[14, 100, '#ff8fb1'], [32, 108, '#ffd23f'], [96, 102, '#b79bff'], [110, 112, '#ff8fb1']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="4" fill="${c}"/><circle cx="${x}" cy="${y}" r="1.5" fill="#fff3a6"/>`).join(''),
  };
  // The picture: its scene with the creature standing on it (the inside of an SVG with viewBox 0 0 120 120).
  RD.picArt = (pic) => RD.SCENES[pic.scene]('rs' + (++uid).toString(36)) +
    '<ellipse cx="60" cy="100" rx="30" ry="5" fill="#22304f" opacity=".14"/>' + `<text class="rd-emo" x="60" y="66" font-size="66">${pic.emoji}</text>`;

  // ---------------------------------------------------------------- the jigsaw cut
  // Every inside edge gets a knob to one side. The knob is symmetric, so the two pieces that share an edge draw
  // it the same way whichever direction they walk it. (The same cut as Puzzle Time in Math Expedition.)
  RD.GRID = { 4: [2, 2], 6: [3, 2], 9: [3, 3], 12: [4, 3] };
  function edge(P, Q, n, T) {
    if (!n) return `L${f1(Q[0])} ${f1(Q[1])}`;
    const dx = Q[0] - P[0], dy = Q[1] - P[1];
    const pt = (u, v) => f1(P[0] + dx * u + n[0] * v * T) + ' ' + f1(P[1] + dy * u + n[1] * v * T);
    return `L${pt(0.37, 0)}C${pt(0.42, 0)} ${pt(0.43, 0.06)} ${pt(0.4, 0.1)}C${pt(0.35, 0.17)} ${pt(0.39, 0.26)} ${pt(0.5, 0.26)}` +
      `C${pt(0.61, 0.26)} ${pt(0.65, 0.17)} ${pt(0.6, 0.1)}C${pt(0.57, 0.06)} ${pt(0.58, 0)} ${pt(0.63, 0)}L${f1(Q[0])} ${f1(Q[1])}`;
  }
  RD.cut = (n) => {
    const [cols, rows] = RD.GRID[n], W = 120 / cols, H = 120 / rows, T = Math.min(W, H);
    const hz = U.range(0, rows - 2).map(() => U.range(0, cols - 1).map(() => U.pick([1, -1]))); // +1: the knob points down
    const vt = U.range(0, rows - 1).map(() => U.range(0, cols - 2).map(() => U.pick([1, -1]))); // +1: the knob points right
    const pieces = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x0 = c * W, y0 = r * H, x1 = x0 + W, y1 = y0 + H, m = 0.28 * T;
      const d = `M${f1(x0)} ${f1(y0)}` +
        edge([x0, y0], [x1, y0], r > 0 ? [0, hz[r - 1][c]] : null, T) +
        edge([x1, y0], [x1, y1], c < cols - 1 ? [vt[r][c], 0] : null, T) +
        edge([x1, y1], [x0, y1], r < rows - 1 ? [0, hz[r][c]] : null, T) +
        edge([x0, y1], [x0, y0], c > 0 ? [vt[r][c - 1], 0] : null, T) + 'Z';
      const bx = Math.max(0, x0 - m), by = Math.max(0, y0 - m);
      pieces.push({ i: pieces.length, r, c, x0, y0, W, H, T, cx: x0 + W / 2, cy: y0 + H / 2, d,
        bb: [f1(bx), f1(by), f1(Math.min(120, x1 + m) - bx), f1(Math.min(120, y1 + m) - by)] });
    }
    return { cols, rows, pieces };
  };

  // ---------------------------------------------------------------- the album
  // st.puzzles = { n: pieces, level: 'words' | 'phrases', done: { '<creature id>': times made } }
  RD.ensure = (st) => {
    st.puzzles = st.puzzles || {};
    if (!RD.GRID[st.puzzles.n]) st.puzzles.n = 6;
    if (st.puzzles.level !== 'phrases') st.puzzles.level = 'words';
    st.puzzles.done = st.puzzles.done || {};
    return st.puzzles;
  };
  RD.count = (st) => RD.PICS.filter((p) => ((st.puzzles || {}).done || {})[p.id]).length;
  RD.total = () => RD.PICS.length;
  RD.REWARD = { right: 1, done: 15, guess: 1 }; // ⭐ for a first-try answer, a finished puzzle, each cloud left when Who's hiding? is guessed
  // Mark a picture made; returns true when it is new in the album.
  RD.finish = (st, id) => {
    const done = RD.ensure(st).done, fresh = !done[id];
    done[id] = (done[id] || 0) + 1;
    return fresh;
  };
  // The next picture: one not made yet (Common creatures first, Legendary last), else any but the one just played.
  const RANK = { common: 0, rare: 1, epic: 2, legendary: 3 };
  RD.nextPic = (st, last) => {
    const done = RD.ensure(st).done;
    const notYet = RD.PICS.filter((p) => !done[p.id] && p.id !== last);
    if (!notYet.length) return U.pick(RD.PICS.filter((p) => p.id !== last));
    const low = Math.min(...notYet.map((p) => RANK[p.rarity] || 0));
    return U.pick(notYet.filter((p) => (RANK[p.rarity] || 0) === low));
  };
  RD.find = (id) => RD.PICS.find((p) => p.id === id) || null;

  // Words read wrong: counted up on a miss, down when read right on the first try (gone at 0).
  RD.noteMiss = (st, text) => { st.readMissed[text] = (st.readMissed[text] || 0) + 1; };
  RD.noteRight = (st, text) => {
    if (!st.readMissed[text]) return;
    if (--st.readMissed[text] <= 0) delete st.readMissed[text];
  };
  RD.review = (st) => [...new Set(Object.keys(st.readMissed || {}).map(RD.wordOf))].filter((w) => RD.WORDS[w]);

  APP.reading = RD;
})();
