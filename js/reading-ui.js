// Reading Puzzles screens: the album page, and the puzzle in play. Three kinds of puzzles, like Puzzle Time in Math Expedition:
//   🧲 Snap!           read the word, tap its picture: a piece of a creature's picture snaps into place
//   ✋ Find the piece  the word is in the hole; drag in the piece with its picture (single words only)
//   ☁️ Who's hiding?   every word read blows a cloud off a picture; guessing early earns stars
// Words, problems, pictures and the cut are in js/reading.js. The app (js/app.js) lends render, points and badges via APP.app.kit.
(function () {
  const APP = globalThis.APP, U = APP.U, RD = APP.reading, FX = APP.fx;
  const esc = U.esc;
  const K = () => APP.app.kit;
  const st = () => K().state();
  const $ = (sel, el = document) => el.querySelector(sel);
  const f1 = (x) => +(+x).toFixed(2);
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const MODES = {
    snap: { icon: '🧲', title: 'Snap!', blurb: 'Read the word, tap its picture, and a piece snaps into place.', say: 'Read the word. Then tap its picture!' },
    find: { icon: '✋', title: 'Find the piece', blurb: 'A word is in the hole. Drag in the piece with its picture! (Always single words.)', say: 'Read the word. Then drag its picture into the hole!' },
    hide: { icon: '☁️', title: 'Who’s hiding?', blurb: 'Every word you read blows a cloud away. Guess who is under them!', say: 'Read the word. Then tap its picture to blow a cloud away!' },
  };
  const LEVELS = { words: ['🔤', 'Words', 'cat, sun, pig'], phrases: ['📝', 'Phrases', 'two big pigs'] };
  let G = null; // the puzzle in play
  let lastPic = '';
  let boards = 0; // makes the board's ids unique

  // Timers of a puzzle only fire while that puzzle is still on screen.
  const later = (fn, ms) => { const g = G; setTimeout(() => { if (g && G === g && g.svg && g.svg.isConnected) fn(); }, reduced() ? Math.min(ms, 60) : ms); };
  const speak = (t, rate = 0.9) => { if (t) FX.speak(t, rate); };
  const svgBox = (inner, cls = '') => `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">${inner}</svg>`;
  const optSvg = (o) => `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${RD.optArt(o)}</svg>`;

  // ---------------------------------------------------------------- the album page
  function hub() {
    G = null;
    const s = st(), pz = RD.ensure(s), done = pz.done;
    const thumb = (p) => (done[p.id]
      ? `<button class="pz-thumb got" data-act="rdPlay" data-arg="snap:${p.id}" aria-label="${esc(p.name)}: make it again">${svgBox(RD.picArt(p))}<i aria-hidden="true">✓</i></button>`
      : '<span class="pz-thumb mystery" role="img" aria-label="not made yet">?</span>');
    const head = (mode) => `<div class="pzc-h"><span class="pzc-i" aria-hidden="true">${MODES[mode].icon}</span><div><h2>${MODES[mode].title}</h2><p>${MODES[mode].blurb}</p></div></div>`;
    K().render(K().header('🧩 Reading Puzzles') + `<main class="pzhub">
      <p class="pz-intro">Read a word, find its picture, and make a puzzle of a creature. Your album: <b>${RD.count(s)} of ${RD.total()}</b></p>
      <div class="pz-set"><span>Read</span><div class="chips">${Object.entries(LEVELS).map(([id, [icon, name, eg]]) => `<button class="chip ${pz.level === id ? 'sel' : ''}" data-act="rdLevel" data-arg="${id}" aria-pressed="${pz.level === id}">${icon} ${name} <small>${eg}</small></button>`).join('')}</div></div>
      <div class="pz-set"><span>Pieces</span><div class="chips">${Object.keys(RD.GRID).map((n) => `<button class="chip ${+n === pz.n ? 'sel' : ''}" data-act="rdSize" data-arg="${n}" aria-pressed="${+n === pz.n}">${n}</button>`).join('')}</div></div>
      <div class="pz-modes">${Object.keys(MODES).map((m) => `<section class="pzcard pz-mode">${head(m)}<button class="btn" data-act="rdPlay" data-arg="${m}">Play ▶</button></section>`).join('')}</div>
      <section class="pzcard"><h2 class="pz-sub">Pictures you made: ${RD.count(s)} of ${RD.total()}</h2><div class="pz-thumbs">${RD.PICS.map(thumb).join('')}</div>
        ${RD.count(s) ? '<p class="pz-tip left">Tap a picture to make it again.</p>' : ''}</section>
    </main>`, 'is-pzhub wide');
    K().setCur('puzzles');
  }

  // ---------------------------------------------------------------- a puzzle
  // key: 'snap', 'find', 'hide' (a picture not made yet), or 'snap:<creature id>' (that picture again)
  function start(key) {
    const s = st(), [mode, id] = String(key).split(':');
    if (!MODES[mode]) return hub();
    const item = id && mode !== 'hide' ? RD.find(id) : RD.nextPic(s, lastPic); // who is hiding is always a surprise
    if (!item) return hub();
    lastPic = item.id;
    const pz = RD.ensure(s);
    G = { mode, item, level: pz.level, prob: null, tries: 0, busy: false, done: false, target: -1, locked: true, asked: [], cut: RD.cut(pz.n) };
    G.left = G.cut.pieces.map((p) => p.i);
    G.total = G.left.length;
    const M = MODES[mode];
    K().render(K().header(`${M.icon} ${M.title}`, 'puzzles') + `<main class="pzplay pz-${mode}">
      <div class="pz-board" id="pzboard"></div><section class="pz-panel" id="pzpanel" aria-live="polite"></section></main>`, 'is-pz wide');
    drawBoard();
    next();
    later(() => speak(M.say, 1), 300);
  }

  function drawBoard() {
    const el = $('#pzboard'), k = 'rdb' + ++boards, ps = G.cut.pieces;
    const defs = `<defs><g id="${k}p">${RD.picArt(G.item)}</g><clipPath id="${k}all"><rect width="120" height="120" rx="4"/></clipPath>` +
      ps.map((p) => `<clipPath id="${k}c${p.i}"><path d="${p.d}"/></clipPath>`).join('') + '</defs>';
    let svg;
    if (G.mode === 'hide') svg = defs + `<g clip-path="url(#${k}all)"><use href="#${k}p"/>${ps.map(cloud).join('')}</g>`;
    else {
      svg = defs + '<rect width="120" height="120" rx="4" class="pz-bg"/>' + ps.map((p) => `<path class="pz-slot" d="${p.d}"/>`).join('') +
        ps.map((p) => `<g class="pz-pc off" data-i="${p.i}" style="transform-origin:${f1(p.cx)}px ${f1(p.cy)}px"><g clip-path="url(#${k}c${p.i})"><use href="#${k}p"/></g><path class="pz-seam" d="${p.d}"/></g>`).join('') +
        `<g clip-path="url(#${k}all)"><use class="pz-full" href="#${k}p"/></g><g class="pz-hole"></g>`;
    }
    el.innerHTML = `<svg class="pz-svg" viewBox="0 0 120 120" role="img" aria-label="${esc(MODES[G.mode].title)}">${svg}</svg>`;
    G.svg = el.firstElementChild;
  }
  // ☁️ a puffy cloud over one cell; its puffs reach over the edges so no gap shows between clouds
  function cloud(p) {
    const { x0, y0, W, H, cx, cy } = p, R = Math.min(W, H);
    const puffs = [[x0, y0], [cx, y0], [x0 + W, y0], [x0, cy], [x0 + W, cy], [x0, y0 + H], [cx, y0 + H], [x0 + W, y0 + H]].map(([x, y]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(R * 0.2)}"/>`).join('');
    return `<g class="pz-cloud" data-i="${p.i}" style="transform-origin:${f1(cx)}px ${f1(cy)}px"><g fill="#f1f5ff"><rect x="${f1(x0 - 0.5)}" y="${f1(y0 - 0.5)}" width="${f1(W + 1)}" height="${f1(H + 1)}"/>${puffs}</g>` +
      `<circle cx="${f1(cx + R * 0.16)}" cy="${f1(cy + R * 0.1)}" r="${f1(R * 0.2)}" fill="#e2e9fb"/><circle cx="${f1(cx - R * 0.1)}" cy="${f1(cy - R * 0.08)}" r="${f1(R * 0.24)}" fill="#ffffff"/>` +
      `<text class="pz-qm" x="${f1(cx)}" y="${f1(cy)}" font-size="${f1(R * 0.3)}">?</text></g>`;
  }

  const placed = () => G.total - G.left.length;
  const takeRandom = () => G.left.splice(Math.floor(Math.random() * G.left.length), 1)[0];

  function next() {
    // Find the piece: always a single word, which fits in the hole; a phrase's pictures would be too small on a piece.
    G.prob = RD.problem(G.mode === 'find' ? 'words' : G.level, G.asked, RD.review(st()));
    G.asked.push(G.prob.text);
    G.tries = 0;
    if (G.mode === 'find') G.target = U.pick(G.left);
    panel();
  }

  const progHtml = () => `<div class="pz-prog" role="img" aria-label="${placed()} of ${G.total} done">${U.range(1, G.total).map((i) => `<i class="${i <= placed() ? 'on' : ''}"></i>`).join('')}</div>`;
  // The word to read, one letter in a box each (a phrase: one word each), so "Sound it out" can light them up in turn.
  const wordHtml = (p) => `<div class="rd-read ${p.kind}" id="rdread">${p.text.split(' ').map((w) => `<span class="rd-w">${p.kind === 'word' ? [...w].map((c) => `<span class="rd-l">${esc(c)}</span>`).join('') : esc(w)}</span>`).join(' ')}</div>`;
  const tools = '<div class="rd-tools"><button class="tool" data-act="rdSound">👆<small>Sound it out</small></button><button class="tool" data-act="rdSay">🔊<small>What to do</small></button></div>';
  function panel() {
    const p = G.prob;
    const review = p.review ? '<span class="rd-review">🔁 Again</span>' : '';
    if (G.mode === 'find') {
      $('#pzpanel').innerHTML = progHtml() + `<div class="pz-q">${review}${wordHtml(p)}</div>${tools}<div id="pzhint"></div>` +
        '<div class="pz-tray" id="pztray"></div><p class="pz-tip">Drag the right picture into the hole, or just tap it.</p>';
      hole();
      tray();
      return;
    }
    $('#pzpanel').innerHTML = progHtml() + `<div class="pz-q">${review}${wordHtml(p)}</div>${tools}<div id="pzhint"></div>` +
      `<div class="pz-answers">${p.opts.map((o, i) => `<button class="pz-ans rd-ans" data-act="rdAns" data-arg="${i}" aria-label="Picture ${'ABC'[i]}">${optSvg(o)}</button>`).join('')}</div>` +
      (G.mode === 'hide' ? `<button class="pz-guess" data-act="rdGuess"${G.locked ? ' disabled' : ''}>🙋 I know who it is!</button>` : '');
  }
  // 👆 Sound it out: the letters light up one after another (a phrase: word by word), so the child blends them.
  // The word itself is not said: that would turn reading into listening.
  function soundOut() {
    const parts = [...document.querySelectorAll(G.prob.kind === 'word' ? '#rdread .rd-l' : '#rdread .rd-w')];
    if (!parts.length) return;
    const g = G, step = G.prob.kind === 'word' ? 550 : 750;
    parts.forEach((el) => el.classList.remove('lit'));
    parts.forEach((el, i) => setTimeout(() => { if (G === g) el.classList.add('lit'); }, i * step));
    setTimeout(() => { if (G === g) parts.forEach((el) => el.classList.remove('lit')); }, parts.length * step + 900);
  }

  // One problem is recorded once, when it is finally solved: right on the first try, or not.
  function solved() {
    const s = st(), first = G.tries === 0;
    if (K().live()) {
      s.stats.read++;
      if (first) { s.stats.readRight++; RD.noteRight(s, G.prob.text); }
      s.lastPlayed = U.dateKey();
    }
    if (first) K().earn(RD.REWARD.right);
    K().showPoints();
    K().save();
  }
  function missed() {
    G.tries++;
    FX.sfx.bad();
    if (G.tries === 1) {
      if (K().live()) RD.noteMiss(st(), G.prob.text);
      $('#pzhint').innerHTML = '<p class="pz-hint">💡 Look at every letter. Sound it out!</p>';
      soundOut();
      speak('Oops! Sound it out and try again.', 1);
      return false;
    }
    // Second miss: now the word is read to the child, and the right picture glows.
    $('#pzhint').innerHTML = `<p class="pz-hint">It says <b>${esc(G.prob.text)}</b>.</p>`;
    speak(`It says: ${G.prob.text}.`, 0.8);
    return true;
  }
  const moveOn = (ms = 1000) => later(() => { G.busy = false; if (!G.left.length) finish(0); else next(); }, ms);

  function answer(arg, btn) {
    if (!G || G.busy || G.done) return;
    const i = +arg;
    if (i !== G.prob.answer) {
      btn.disabled = true;
      btn.classList.add('nope');
      if (missed()) { const c = $(`.pz-ans[data-arg="${G.prob.answer}"]`); if (c) c.classList.add('show'); }
      return;
    }
    G.busy = true;
    btn.classList.add('right');
    document.querySelectorAll('.pz-ans, .pz-guess').forEach((b) => { b.disabled = true; });
    FX.sfx.good();
    solved();
    if (G.mode === 'hide') blow(takeRandom());
    else flyIn(takeRandom(), btn);
    speak(U.pick(['Great reading!', 'Yes!', 'You got it!', 'Awesome!', 'Super!']), 1);
    moveOn();
  }

  function updateProg() {
    document.querySelectorAll('.pz-prog i').forEach((el, i) => el.classList.toggle('on', i < placed()));
  }
  const toUser = (x, y) => new DOMPoint(x, y).matrixTransform(G.svg.getScreenCTM().inverse());
  const toScreen = (x, y) => new DOMPoint(x, y).matrixTransform(G.svg.getScreenCTM());
  const screenBox = ([x, y, w, h]) => { const a = toScreen(x, y), b = toScreen(x + w, y + h); return { l: a.x, t: a.y, r: b.x, b: b.y }; };

  // 🧲 a piece flies from the answer button into its place
  function flyIn(i, from) {
    const p = G.cut.pieces[i], g = $(`.pz-pc[data-i="${i}"]`, G.svg);
    g.classList.remove('off');
    const r = from.getBoundingClientRect(), u = toUser(r.left + r.width / 2, r.top + r.height / 2);
    if (!reduced()) {
      g.animate([
        { transform: `translate(${f1(u.x - p.cx)}px, ${f1(u.y - p.cy)}px) scale(.35) rotate(-30deg)`, opacity: 0.3 },
        { transform: 'translate(0px, 0px) scale(1.1) rotate(4deg)', opacity: 1, offset: 0.78 },
        { transform: 'none', opacity: 1 },
      ], { duration: 750, easing: 'cubic-bezier(.25,.8,.35,1)' });
    }
    later(updateProg, 620);
  }

  // ☁️ a cloud blows away; after the first one the child may guess
  function blow(i) {
    const c = $(`.pz-cloud[data-i="${i}"]`, G.svg);
    G.locked = false;
    updateProg();
    if (!c) return;
    if (reduced()) return c.remove();
    c.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${U.pick([-8, 8])}px, -10px) scale(1.5)`, opacity: 0 }], { duration: 650, easing: 'ease-out', fill: 'forwards' }).onfinish = () => c.remove();
  }
  function chooser() {
    if (!G || G.busy || G.done || G.locked) return;
    const others = U.shuffle(RD.PICS.filter((p) => p.id !== G.item.id && p.emoji !== G.item.emoji)).slice(0, 2);
    $('#pzpanel').innerHTML = progHtml() + '<div class="pz-q"><div class="pz-lead">Who is hiding?</div></div>' +
      `<div class="pz-choices">${U.shuffle([G.item, ...others]).map((p) => `<button class="pz-choice" data-act="rdWho" data-arg="${p.id}"><span class="rd-ce" aria-hidden="true">${p.emoji}</span><span>${esc(p.name)}</span></button>`).join('')}</div>` +
      '<button class="linkbtn pz-back" data-act="rdBack">← Back to the word</button>';
    speak('Who is hiding?', 1);
  }
  function guess(id, btn) {
    if (!G || G.busy || G.done) return;
    G.busy = true;
    if (id === G.item.id) {
      btn.classList.add('right');
      FX.sfx.good();
      const bonus = G.left.length * RD.REWARD.guess;
      G.left.splice(0).forEach((i, n) => setTimeout(() => blow(i), reduced() ? 0 : n * 90));
      later(() => { G.busy = false; finish(bonus); }, 500 + bonus * 90);
    } else {
      btn.classList.add('nope');
      FX.sfx.bad();
      G.locked = true; // one guess per cloud
      speak('Not this one! Read more words to see more.', 1);
      later(() => { G.busy = false; panel(); }, 1300);
    }
  }

  // ✋ the word in the hole, three pieces with pictures in the tray
  function hole() {
    const p = G.cut.pieces[G.target], text = G.prob.text;
    const fs = Math.min((p.W * 0.82) / (text.length * 0.56), p.H * 0.34);
    const inner = fs >= 6 ? `<text class="pz-heq rd-font" x="${f1(p.cx)}" y="${f1(p.cy)}" font-size="${f1(fs)}">${esc(text)}</text>`
      : `<text class="pz-heq" x="${f1(p.cx)}" y="${f1(p.cy)}" font-size="${f1(p.T * 0.45)}">?</text>`; // too small to read: the word is on the card
    const h = $('.pz-hole', G.svg);
    h.classList.remove('bad');
    h.innerHTML = `<path class="pz-holet" d="${p.d}"/>` + inner;
  }
  const TRAY = [['#ffd27a', '#c98f1f'], ['#8fe0d4', '#1f8f80'], ['#ffb9ae', '#d0604f']];
  function tray() {
    const p = G.cut.pieces[G.target], [, , bw, bh] = p.bb, box = $('#pztray');
    const avail = Math.max(240, box.clientWidth);
    const sc = Math.max(70 / Math.min(bw, bh), Math.min(G.svg.getBoundingClientRect().width / 120, (avail - 40) / (3 * bw), 150 / bh));
    const pic = Math.min(p.W, p.H) * 0.86; // the picture's box inside the piece
    box.innerHTML = G.prob.opts.map((o, j) => `<div class="pz-tp" data-v="${j}" tabindex="0" role="button" aria-label="Piece ${'ABC'[j]}" style="width:${f1(bw * sc)}px;height:${f1(bh * sc)}px">` +
      `<svg viewBox="${p.bb.join(' ')}" width="100%" height="100%" aria-hidden="true"><path d="${p.d}" fill="${TRAY[j][0]}" stroke="${TRAY[j][1]}" stroke-width="${f1(2.4 / sc)}" stroke-linejoin="round"/>` +
      `${RD.optArt(o, p.cx - pic / 2, p.cy - pic / 2, pic, pic)}</svg></div>`).join('');
    box.querySelectorAll('.pz-tp').forEach((el) => bindDrag(el, (el2, dx, dy, at) => (!at || near(at, screenBox(p.bb), 30) ? tryPiece(el2, dx, dy) : bounce(el2))));
  }
  function tryPiece(el, dx, dy) {
    if (G.busy || G.done) return;
    G.busy = true;
    const v = +el.dataset.v, p = G.cut.pieces[G.target];
    flyTo(el, dx, dy, p.bb, (nx, ny, sc) => {
      if (v !== G.prob.answer) {
        const h = $('.pz-hole', G.svg);
        h.classList.add('bad');
        bounce(el);
        el.classList.add('out');
        later(() => { h.classList.remove('bad'); G.busy = false; }, 500);
        if (missed()) { const c = $(`.pz-tp[data-v="${G.prob.answer}"]`); if (c) c.classList.add('show'); }
        return;
      }
      el.style.transition = 'transform .16s ease-in'; // the piece turns over and shows its part of the creature
      el.style.transform = `translate(${nx}px, ${ny}px) scale(.02, ${sc})`;
      later(() => {
        el.style.visibility = 'hidden';
        $('.pz-hole', G.svg).innerHTML = '';
        const g = $(`.pz-pc[data-i="${p.i}"]`, G.svg);
        g.classList.remove('off');
        if (!reduced()) g.animate([{ transform: 'scaleX(0)' }, { transform: 'scale(1.08)', offset: 0.7 }, { transform: 'none' }], { duration: 380, easing: 'ease-out' });
        FX.sfx.good();
        solved();
        G.left.splice(G.left.indexOf(p.i), 1);
        updateProg();
        speak(U.pick(['Great reading!', 'It fits!', 'You got it!', 'Awesome!']), 1);
        moveOn();
      }, 170);
    });
  }

  const near = (at, h, m) => at.x > h.l - m && at.x < h.r + m && at.y > h.t - m && at.y < h.b + m;
  // Drag with a finger or the mouse. onDrop(el, dx, dy, at): at is where it was dropped, or null for a tap (or Enter).
  function bindDrag(el, onDrop) {
    el.addEventListener('pointerdown', (e) => {
      if (!G || G.busy || G.done || e.button > 0) return;
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* fine without */ }
      const sx = e.clientX, sy = e.clientY;
      let dx = 0, dy = 0, moved = false;
      el.classList.add('drag');
      const mv = (ev) => {
        dx = ev.clientX - sx; dy = ev.clientY - sy;
        if (Math.hypot(dx, dy) > 8) moved = true;
        el.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
      };
      const up = (ev) => {
        el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
        el.classList.remove('drag');
        if (ev.type === 'pointercancel') { el.style.transform = ''; return; }
        onDrop(el, dx, dy, moved ? { x: ev.clientX, y: ev.clientY } : null);
      };
      el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDrop(el, 0, 0, null); } });
  }
  function bounce(el) {
    el.style.transition = 'transform .45s cubic-bezier(.3,1.4,.5,1)';
    el.style.transform = '';
  }
  // Fly a tray piece onto the board so its box lands on bb (board units) at the board's size; then done(nx, ny, scale).
  function flyTo(el, dx, dy, bb, done) {
    const r = el.getBoundingClientRect(), b = screenBox(bb);
    const nx = f1(dx + (b.l + b.r) / 2 - (r.left + r.width / 2)), ny = f1(dy + (b.t + b.b) / 2 - (r.top + r.height / 2)), sc = f1((b.r - b.l) / el.offsetWidth);
    el.style.transition = 'transform .32s cubic-bezier(.3,.9,.4,1)';
    el.style.transform = `translate(${nx}px, ${ny}px) scale(${sc})`;
    later(() => { el.style.transition = ''; done(nx, ny, sc); }, 330);
  }

  // ---------------------------------------------------------------- finished
  function finish(bonus) {
    G.done = true;
    G.svg.classList.add('done');
    const s = st(), fresh = K().live() && RD.finish(s, G.item.id);
    const stars = K().earn(RD.REWARD.done + bonus);
    K().showPoints();
    K().save();
    const title = G.mode === 'hide' ? `It’s ${G.item.name}!` : `You made ${G.item.name}!`;
    $('#pzpanel').innerHTML = `<div class="pz-win">${svgBox(RD.picArt(G.item), 'pz-winart')}<b>${esc(title)}</b>
      ${bonus && stars ? `<p>You guessed early: +${bonus} ⭐</p>` : ''}
      <p class="earned">${K().live() ? `+${stars} ⭐${fresh ? ' <small>· new in your album!</small>' : ''}` : '<small>Preview · nothing is saved</small>'}</p>
      <div class="row"><button class="btn ghost" data-act="go" data-arg="puzzles">All puzzles</button><button class="btn" data-act="rdNext">Next puzzle →</button></div></div>`;
    FX.sfx.hatch();
    FX.celebrate(120);
    later(() => speak(`Hooray! ${title.replace('’', "'")}`, 1), 300);
    setTimeout(() => { if (st() === s) K().checkBadges(); }, 1600); // even if the child has already left the puzzle
  }

  const A = {
    rdPlay: (a) => K().go('puzzles:' + a), // through go(), so the back gesture returns to the album page
    rdNext: () => K().go(G ? 'puzzles:' + G.mode : 'puzzles'),
    rdSize: (a) => { if (RD.GRID[a]) { RD.ensure(st()).n = +a; K().save(); } hub(); },
    rdLevel: (a) => { if (LEVELS[a]) { RD.ensure(st()).level = a; K().save(); } hub(); },
    rdAns: (a, el) => answer(a, el),
    rdSound: () => { if (G && !G.done) soundOut(); },
    rdSay: () => { if (G) speak(MODES[G.mode].say, 1); },
    rdGuess: () => chooser(),
    rdWho: (a, el) => guess(a, el),
    rdBack: () => { if (G && !G.done && !G.busy) panel(); },
  };
  // show(): the album page; show('snap') or show('snap:frog') starts a puzzle (used by links and the browser test)
  const show = (arg) => (arg ? start(arg) : hub());
  APP.readingUI = { show, actions: A, playing: () => G };
})();
