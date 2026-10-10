// WritingPower screens on the family app shell: profile picker, family sync, grown-ups page, preview, routing
// (from the shell) plus the game: grade map, levels, Endless Practice, shop with eggs, zoo.
// Screens render into #app; every click is routed through data-act="<action>" data-arg="<argument>" attributes.
(function () {
  const APP = globalThis.APP, U = APP.U, S = APP.store, CFG = APP.CONFIG, FX = APP.fx;
  const CONTENT = APP.CONTENT, SENT = APP.SENT, GRADES = APP.GRADES;
  const esc = U.esc;
  const WORD = CFG.profileWord;
  const Word = WORD[0].toUpperCase() + WORD.slice(1);

  let st = null; // APP.state: the open profile
  let sess = null; // the activity in progress
  let ui = {}; // small per-screen state (forms, "tap again to confirm" buttons, chosen grade, zoo tab…)
  let cur = ''; // screen that may be redrawn when another device changes the data ('' = leave it alone)
  let wanted = ''; // profile name from a link of our other app (…/#who=Mia): open that profile on start
  let timers = [];

  const $ = (sel) => document.querySelector(sel);
  const root = () => document.getElementById('app');
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const kindOf = (id) => CFG.kinds.find((k) => k.id === id) || CFG.kinds[0];
  const kindChip = (id) => `<span class="kchip" style="--pc:${kindOf(id).color}">${kindOf(id).label}</span>`;
  const pct = (c, a) => (a ? Math.round((c / a) * 100) : 0);
  // Links to our other apps (CFG.apps without this one). With a profile open, the link carries its name
  // (#who=Mia), so the other app opens the profile with the same name.
  const appLinks = () => {
    const other = (CFG.apps || []).filter((a) => a.id !== CFG.id);
    const who = st ? '#who=' + encodeURIComponent(st.name) : '';
    return other.length ? `<nav class="apps" aria-label="Our other apps"><span>Our other apps:</span>${other.map((a) => `<a class="appbtn" href="${esc(a.url + who)}">${a.icon} ${esc(a.name)}</a>`).join('')}</nav>` : '';
  };
  const starsText = (n) => '⭐'.repeat(n) + '☆'.repeat(3 - n);
  const live = () => !S.preview; // nothing is earned, spent or recorded in the grown-up preview
  const inPlay = () => !!sess && root().classList.contains('is-play');

  function render(html, cls = '') {
    timers.forEach(clearTimeout);
    timers = [];
    cur = '';
    const r = root();
    r.className = cls;
    r.innerHTML = previewBar() + html;
    document.body.dataset.theme = (st && st.equipped && st.equipped.theme) || 'sunny';
    window.scrollTo(0, 0);
  }
  const pill = () => (st ? `<button class="pill" id="pts" data-act="go" data-arg="shop" aria-label="Points, open the shop">⭐ ${st.points}</button>` : '');
  function header(title, back = 'home') {
    return `<header class="bar"><button class="iconbtn" data-act="go" data-arg="${back}" aria-label="Back">←</button><h1>${title}</h1>${pill()}
      <button class="mini-av" data-act="go" data-arg="who" aria-label="Switch ${WORD} (now ${esc(st.name)})" title="Switch ${WORD}">${st.avatar}</button></header>`;
  }
  function showPoints() {
    const p = $('#pts');
    if (!p) return;
    p.textContent = '⭐ ' + st.points;
    p.classList.remove('bump');
    void p.offsetWidth;
    p.classList.add('bump');
  }
  function toast(html) {
    let box = $('#toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = html;
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  }
  // sticky: a celebration that must be answered with its own buttons (no closing by tapping outside or Escape).
  function modal(html, sticky = false) {
    closeModal();
    const m = document.createElement('div');
    m.className = 'modal' + (sticky ? ' sticky' : '');
    m.id = 'modal';
    m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true">${html}</div>`;
    if (!sticky) m.addEventListener('click', (e) => { if (e.target === m) closeModal(); });
    document.body.appendChild(m);
  }
  function closeModal() { const m = $('#modal'); if (m) m.remove(); }

  // ---------------------------------------------------------------- points and badges
  const POINTS = { letter: 1, sentence: 10, perfect: 5, level: [0, 25, 50, 75], daily: 30, peek: 5 };
  const nLevels = (p) => Object.keys(p.levels).length;
  const bestStreak = (p) => Math.max(0, ...Object.values(p.bestStreak));
  const found = (p) => Object.keys(p.creatures).length;
  const BADGES = [
    { id: 'first_sentence', icon: '✏️', name: 'First Sentence', desc: 'Write your first sentence', reward: 20, test: (p) => p.stats.sentences >= 1 },
    { id: 'sent_25', icon: '📝', name: 'Busy Writer', desc: 'Write 25 sentences', reward: 75, test: (p) => p.stats.sentences >= 25 },
    { id: 'sent_100', icon: '📚', name: 'Super Writer', desc: 'Write 100 sentences', reward: 250, test: (p) => p.stats.sentences >= 100 },
    { id: 'letters_100', icon: '🔤', name: '100 Letters', desc: 'Type 100 correct letters', reward: 30, test: (p) => p.stats.letters >= 100 },
    { id: 'letters_1000', icon: '🅰️', name: '1,000 Letters', desc: 'Type 1,000 correct letters', reward: 100, test: (p) => p.stats.letters >= 1000 },
    { id: 'letters_5000', icon: '🏅', name: '5,000 Letters', desc: 'Type 5,000 correct letters', reward: 300, test: (p) => p.stats.letters >= 5000 },
    { id: 'perfect_10', icon: '💯', name: 'Perfect Ten', desc: '10 sentences with no oops', reward: 60, test: (p) => p.stats.perfect >= 10 },
    { id: 'first_level', icon: '🚩', name: 'Level Up', desc: 'Finish a level', reward: 25, test: (p) => nLevels(p) >= 1 },
    { id: 'levels_10', icon: '🗺️', name: 'Explorer', desc: 'Finish 10 levels', reward: 100, test: (p) => nLevels(p) >= 10 },
    { id: 'levels_50', icon: '🧭', name: 'Adventurer', desc: 'Finish 50 levels', reward: 400, test: (p) => nLevels(p) >= 50 },
    { id: 'three_star', icon: '🌟', name: 'Star Student', desc: 'Get 3 stars on a level', reward: 40, test: (p) => Object.values(p.levels).some((l) => l.stars >= 3) },
    { id: 'first_creature', icon: '🥚', name: 'Hatchling', desc: 'Hatch your first creature', reward: 30, test: (p) => found(p) >= 1 },
    { id: 'creatures_10', icon: '🐾', name: 'Zookeeper', desc: 'Find 10 different creatures', reward: 150, test: (p) => found(p) >= 10 },
    { id: 'legendary', icon: '🦄', name: 'Legend Finder', desc: 'Find a legendary creature', reward: 200, test: (p) => APP.CREATURES.some((c) => c.rarity === 'legendary' && p.creatures[c.id]) },
    { id: 'all_creatures', icon: '👑', name: 'Master Collector', desc: 'Find every creature', reward: 1000, test: (p) => found(p) >= APP.CREATURES.length },
    { id: 'streak_10', icon: '🔥', name: 'On Fire', desc: '10 perfect sentences in a row in Endless', reward: 60, test: (p) => bestStreak(p) >= 10 },
    { id: 'streak_25', icon: '☄️', name: 'Unstoppable', desc: '25 perfect sentences in a row in Endless', reward: 200, test: (p) => bestStreak(p) >= 25 },
    { id: 'grade_done', icon: '🏆', name: 'Grade Champion', desc: 'Finish all levels in a grade', reward: 250, test: (p) => Object.keys(p.trophies).length >= 1 },
    { id: 'shopper', icon: '🛍️', name: 'Style Star', desc: 'Buy a keyboard theme or celebration', reward: 20, test: (p) => p.owned.theme.length + p.owned.effect.length > 2 },
    { id: 'days_5', icon: '📅', name: 'Five Days', desc: 'Write on 5 different days', reward: 100, test: (p) => Object.keys(p.days).length >= 5 },
  ];
  // Every award goes through earn(): in the preview it gives nothing.
  function earn(n) {
    if (!live() || n <= 0) return 0;
    st.points += n;
    st.stats.pointsEarned += n;
    return n;
  }
  function checkBadges() {
    if (!live()) return;
    for (const b of BADGES) {
      if (st.badges[b.id] || !b.test(st)) continue;
      st.badges[b.id] = U.dateKey();
      earn(b.reward);
      toast(`🏅 New badge: <b>${b.icon} ${b.name}</b> +${b.reward} ⭐`);
      FX.sfx.coin();
    }
    showPoints();
  }
  function dailyBonus() {
    const today = U.dateKey();
    if (!live() || st.lastDaily === today) return;
    st.lastDaily = today;
    earn(POINTS.daily);
    S.save();
    toast(`🌞 Daily bonus! <b>+${POINTS.daily} ⭐</b>`);
  }

  // ---------------------------------------------------------------- grown-up preview
  // Everything unlocked on a copy of the profile, nothing saved. A bar on every screen says so.
  const previewBar = () => (S.preview ? '<div class="pvbar" role="status"><span>👀 <b>Grown-up preview</b> · everything is open · nothing is saved</span><button class="btn" data-act="exitPreview">Exit</button></div>' : '');
  function endPreview() {
    if (!S.preview) return;
    sess = null;
    st = S.endPreview();
  }

  // ---------------------------------------------------------------- profiles
  function who() {
    endPreview();
    const list = S.profiles();
    if (!list.length) return newProfile();
    sess = null;
    st = null;
    APP.state = null;
    render(`<main class="who-screen">
      <h1 class="title center">Who’s writing?</h1>
      <div class="profiles">${list.map((p) => `<button class="profile" data-act="openProfile" data-arg="${p.id}" style="--pc:${kindOf(p.kind).color}">
          <span class="pav">${p.avatar}</span><b>${esc(p.name)}</b>${kindChip(p.kind)}<small>${p.stats.sentences} sentences · ⭐ ${p.points}</small></button>`).join('')}
        <button class="profile add" data-act="go" data-arg="new"><span class="pav">＋</span><b>New ${WORD}</b><small>Add a brother or sister</small></button>
      </div>
      <p class="muted center">Each ${WORD} has their own levels, points and creatures.</p>
      ${syncLine()}
      ${appLinks()}
    </main>`, 'is-who');
    cur = 'who';
  }
  function newProfile() {
    const first = !S.profiles().length;
    const k = (ui.newKid = ui.newKid || { name: '', kind: CFG.kinds[0].id, avatar: CFG.avatars[0] });
    render(`<main class="onboard">
      ${first ? `<h1 class="title">✏️ ${esc(CFG.name)}</h1><p class="lead">Hear it. Write it. Win prizes!</p>` : `<header class="bar"><button class="iconbtn" data-act="go" data-arg="who" aria-label="Back">←</button><h1>New ${WORD}</h1></header>`}
      ${first && CL() && !APP.cloud.family ? '<p class="muted">Already use this app on another device? <button class="linkbtn" data-act="go" data-arg="family">Connect your family ☁️</button></p>' : ''}
      <label for="ob-name">Name</label>
      <input id="ob-name" class="field" maxlength="16" autocomplete="off" value="${esc(k.name)}" placeholder="Name">
      <div class="label">Which grade?</div>
      <div class="kinds">${CFG.kinds.map((g) => `<button class="kind-pick ${k.kind === g.id ? 'sel' : ''}" data-act="pickKind" data-arg="${g.id}" style="--pc:${g.color}"><span class="gi">${g.icon}</span><b>${g.label}</b><small>${g.about}</small></button>`).join('')}</div>
      <div class="label">Pick a picture</div>
      <div class="avatars">${CFG.avatars.map((a) => `<button class="avatar-pick ${k.avatar === a ? 'sel' : ''}" data-act="pickAvatar" data-arg="${a}">${a}</button>`).join('')}</div>
      <button class="btn big" data-act="createProfile">Start →</button>
    </main>`, 'is-onboard');
  }
  const keepNewKid = () => { if ($('#ob-name')) ui.newKid.name = $('#ob-name').value.trim(); };
  function openProfile(id) {
    endPreview();
    st = S.open(id);
    if (!st) return who();
    sess = null;
    ui = {};
    remember('home');
    home();
  }

  // ---------------------------------------------------------------- family sync
  const CL = () => (APP.cloud && APP.cloud.configured() ? APP.cloud : null);
  function syncLine() {
    const C = CL();
    if (!C) return '';
    if (!C.family) {
      const sib = C.sibling();
      return `<div id="sync" class="sync off">📱 Progress is saved on this device only. <button class="linkbtn" data-act="go" data-arg="family">${sib ? `Use family ${esc(sib.name)} ☁️` : 'Connect family ☁️'}</button></div>`;
    }
    const label = { connecting: 'connecting…', saving: 'saving…', synced: 'synced ✓', offline: 'offline — saved here, will sync later', error: 'sync problem, will retry' }[C.status] || 'synced ✓';
    return `<div id="sync" class="sync s-${C.status}">☁️ Family <b>${esc(C.family.name)}</b> · ${label}</div>`;
  }
  const FAM_ERRORS = {
    'short-code': 'The family code needs at least 6 letters or numbers.',
    'bad-pin': 'The PIN must be 4 to 6 digits.',
    'pin-mismatch': 'The two PINs are different. Type the same PIN twice.',
    exists: 'This family code and PIN are already used. Choose “I already have a family” to join it, or pick a different code.',
    'not-found': 'No family found with this code and PIN. Check both and try again.',
    offline: 'No internet connection. Connect to Wi-Fi and try again.',
    denied: 'The server refused access. Check the Firebase setup.',
    unavailable: 'Online sync is not available in this copy of the app. Open the website version.',
  };
  function family() {
    const f = (ui.fam = ui.fam || { mode: 'choose', code: '', error: '' });
    const hasKids = S.profiles().length > 0;
    const back = f.mode !== 'choose' ? '<button class="iconbtn" data-act="famMode" data-arg="choose" aria-label="Back">←</button>'
      : hasKids ? '<button class="iconbtn" data-act="go" data-arg="who" aria-label="Back">←</button>' : '';
    const title = f.mode === 'create' ? 'Create a family' : f.mode === 'join' ? 'Join your family' : 'Save progress online';
    let body;
    if (f.mode === 'choose') {
      const sib = APP.cloud.sibling();
      body = `<p class="lead center">Connect this device to your family, and every phone, tablet and computer shows the same ${WORD}s, levels and creatures.</p>
        <div class="kinds">
          ${sib ? `<button class="kind-pick" id="fam-sib" data-act="famSibling" style="--pc:#5b3fa8"><span class="gi">🔗</span><b>Use family ${esc(sib.name)}</b><small>Already connected in ${esc(sib.app)} on this device · no PIN needed</small></button>` : ''}
          <button class="kind-pick" data-act="famMode" data-arg="create" style="--pc:#2bb3a3"><span class="gi">🏡</span><b>Create a family</b><small>First device: choose a family code and PIN</small></button>
          <button class="kind-pick" data-act="famMode" data-arg="join" style="--pc:#e0a21b"><span class="gi">🔑</span><b>I already have a family</b><small>Another device: type the same code and PIN</small></button>
          ${hasKids ? '' : '<button class="kind-pick" data-act="localOnly" style="--pc:#c4ccd6"><span class="gi">📱</span><b>Use this device only</b><small>You can connect later in For grown-ups</small></button>'}
        </div>
        <p class="famerr" id="fam-err" role="alert">${esc(f.error)}</p>`;
    } else {
      const create = f.mode === 'create';
      body = `<p class="muted">${create ? 'Pick a family code you will remember (at least 6 letters, for example <b>smith-tigers</b>) and a 4–6 digit PIN. Write them down: you type them once on every new device.' : 'Type the family code and PIN you chose on the first device.'}${hasKids && create ? ` The ${WORD}s already on this device will be added to the family.` : ''}</p>
        <label for="fam-code">Family code</label>
        <input id="fam-code" class="field" maxlength="40" autocomplete="off" autocapitalize="none" spellcheck="false" value="${esc(f.code)}" placeholder="family code">
        <label for="fam-pin">PIN</label>
        <input id="fam-pin" class="field" type="password" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="4–6 digits">
        ${create ? '<label for="fam-pin2">PIN again</label><input id="fam-pin2" class="field" type="password" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="same PIN">' : ''}
        <p class="famerr" id="fam-err" role="alert">${esc(f.error)}</p>
        <button class="btn big" id="fam-go" data-act="famSubmit">${create ? 'Create family' : 'Connect'}</button>`;
    }
    render(`<main class="onboard"><header class="bar">${back}<h1>${title}</h1></header>${body}</main>`, 'is-onboard');
  }
  async function famSubmit() {
    const f = ui.fam, btn = $('#fam-go'), err = $('#fam-err');
    f.code = $('#fam-code').value;
    const pin = $('#fam-pin').value.trim();
    const showErr = (code) => { f.error = FAM_ERRORS[code] || 'Something went wrong. Try again.'; err.textContent = f.error; btn.disabled = false; btn.textContent = f.mode === 'create' ? 'Create family' : 'Connect'; };
    if (f.mode === 'create' && pin !== $('#fam-pin2').value.trim()) return showErr('pin-mismatch');
    btn.disabled = true;
    btn.textContent = 'Connecting…';
    err.textContent = '';
    try { await APP.cloud.connect({ code: f.code, pin, create: f.mode === 'create' }); } catch (e) { return showErr(e.code); }
    ui.fam = null;
    toast('☁️ Family connected');
    startScreen();
  }
  async function famSibling() {
    const btn = $('#fam-sib'), err = $('#fam-err');
    btn.disabled = true;
    err.textContent = '';
    try { await APP.cloud.connectSibling(); } catch (e) { btn.disabled = false; ui.fam.error = FAM_ERRORS[e.code] || 'Something went wrong. Try again.'; err.textContent = ui.fam.error; return; }
    ui.fam = null;
    toast('☁️ Family connected');
    startScreen();
  }
  // The first screen: the profile a link asked for (#who=), else the only profile, else the picker.
  // Right after joining a family, its profiles can arrive a moment later: until then the new-profile form
  // is the 'start' screen, and onCloud runs startScreen again when they come.
  function startScreen() {
    const list = S.profiles();
    const name = wanted.trim();
    if (name) {
      const p = list.find((x) => x.name.trim().toLowerCase() === name.toLowerCase());
      if (p) { wanted = ''; return openProfile(p.id); }
      ui.newKid = { name: name.slice(0, 16), kind: CFG.kinds[0].id, avatar: CFG.avatars[0] }; // not here yet: offer to add
      newProfile();
      cur = 'start';
      return;
    }
    if (!list.length) { ui.newKid = null; newProfile(); cur = 'start'; return; }
    if (list.length === 1) return openProfile(list[0].id);
    who();
  }
  // Another device changed something: refresh the screen if it only shows data
  // (never in the middle of an activity or while a window such as a hatching egg is open).
  function onCloud(what) {
    if (what === 'status') { const el = $('#sync'); if (el) el.outerHTML = syncLine(); return; }
    if (root().classList.contains('is-play')) return;
    if (st && APP.state !== st) { st = null; return who(); } // this profile was deleted on another device
    if (cur === 'start') { if (S.profiles().length) startScreen(); return; }
    if (!cur || $('#modal')) return;
    const redraw = { who, home, shop, zoo }[cur];
    if (redraw) redraw();
  }

  // ---------------------------------------------------------------- home: grade map
  const levelKey = (g, i) => g + '-' + i;
  const isOpen = (g, i) => st.settings.unlockAll || i === 0 || !!st.levels[levelKey(g, i - 1)];
  const gradeDone = (g) => U.range(0, SENT.LEVELS - 1).filter((i) => st.levels[levelKey(g, i)]).length;
  const gradeStars = (g) => U.sum(U.range(0, SENT.LEVELS - 1).map((i) => (st.levels[levelKey(g, i)] || { stars: 0 }).stars));

  function home() {
    if (!st) return who();
    dailyBonus();
    const g = (ui.grade = ui.grade || st.kind);
    const info = CONTENT[g];
    const today = st.days[U.dateKey()] || { a: 0 };
    const map = U.range(0, SENT.LEVELS - 1).map((i) => {
      const open = isOpen(g, i), lv = st.levels[levelKey(g, i)];
      return `<button class="lvl ${open ? '' : 'locked'} ${lv ? 'done' : ''} ${open && !lv ? 'next' : ''}" data-act="level" data-arg="${i}" ${open ? '' : 'disabled'} aria-label="Level ${i + 1}${open ? '' : ' locked'}">
        <b>${open ? i + 1 : '🔒'}</b><small>${lv ? starsText(lv.stars) : ''}</small></button>`;
    }).join('');
    render(`<main class="home" style="--gc:${info.color}">
      <header class="bar"><button class="mini-av big" data-act="go" data-arg="who" aria-label="Switch ${WORD}">${st.avatar}</button><h1>Hi, ${esc(st.name)}!</h1>${pill()}</header>
      <p class="lead">${kindChip(st.kind)} Today: ${today.a} sentence${today.a === 1 ? '' : 's'} written.</p>
      <div class="gchips" role="tablist">${GRADES.map((id) => `<button class="gchip ${id === g ? 'sel' : ''}" data-act="grade" data-arg="${id}" style="--pc:${CONTENT[id].color}">${CONTENT[id].emoji} ${CONTENT[id].short}${st.trophies[id] ? ' ' + APP.TROPHIES[id].emoji : ''}</button>`).join('')}</div>
      <button class="endless" data-act="endless">♾️ Endless Practice<small>${st.bestStreak[g] ? `Best streak 🔥 ${st.bestStreak[g]}` : 'Keep going as long as you like!'}</small></button>
      <h2 class="maptitle">🗺️ ${info.name} levels <small>${gradeDone(g)}/${SENT.LEVELS} · ⭐ ${gradeStars(g)}</small></h2>
      <div class="levels">${map}</div>
      <div class="tiles">
        <button class="tile t-shop" data-act="go" data-arg="shop"><span>🛒</span><b>Shop</b><small>Eggs, themes and more</small></button>
        <button class="tile t-zoo" data-act="go" data-arg="zoo"><span>🐾</span><b>My Zoo</b><small>${found(st)} / ${APP.CREATURES.length} creatures</small></button>
        <button class="tile" data-act="go" data-arg="who"><span>👥</span><b>Switch</b><small>Another ${WORD}</small></button>
        <button class="tile" data-act="go" data-arg="parent"><span>🔒</span><b>For grown-ups</b><small>Report and settings</small></button>
      </div>
      ${syncLine()}
      ${appLinks()}
    </main>`, 'is-home wide');
    cur = 'home';
  }

  // ---------------------------------------------------------------- play: hear it, type it
  const LAYOUTS = { abc: ['abcdefg', 'hijklmn', 'opqrstu', 'vwxyz'], qwerty: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'] };
  const layoutFor = (g) => st.settings.layout[g] || (g === 'k' || g === 'g1' ? 'abc' : 'qwerty');
  const rate = () => CONTENT[sess.grade].rate * (st.settings.slowVoice ? 0.85 : 1);
  const PRAISE = ['Great job!', 'Awesome!', 'You did it!', 'Super!', 'Fantastic!', 'Way to go!', 'Amazing!'];

  function startLevel(i) {
    const g = ui.grade || st.kind;
    if (!isOpen(g, i)) return;
    sess = { mode: 'level', grade: g, level: i, list: SENT.levelSentences(g, i), idx: 0, stars: [], streak: 0 };
    remember('play');
    showSentence();
  }
  function startEndless() {
    sess = { mode: 'endless', grade: ui.grade || st.kind, idx: 0, streak: 0, recent: [] };
    remember('play');
    showSentence();
  }

  function keyboardHtml() {
    const layout = layoutFor(sess.grade);
    let n = 0;
    return `<div class="keyboard" id="keyboard" data-layout="${layout}">${LAYOUTS[layout].map((row) => `<div class="krow">${row.split('').map((ch) => `<button class="key" data-k="${ch}" style="--i:${n++}">${ch}</button>`).join('')}</div>`).join('')}</div>
      <button class="linkbtn layout" data-act="layout">${layout === 'abc' ? '⌨️ Switch to QWERTY' : '🔤 Switch to ABC'}</button>`;
  }

  function showSentence() {
    if (sess.mode === 'level') sess.target = sess.list[sess.idx];
    else {
      sess.target = SENT.endlessSentence(sess.grade, sess.recent);
      sess.recent.push(sess.target);
      if (sess.recent.length > 25) sess.recent.shift();
    }
    Object.assign(sess, { pos: 0, mistakes: 0, done: false, missed: new Set(), letters: [], wordOf: [] });
    const words = sess.target.split(' ');
    const boxes = words.map((w, wi) => `<span class="word">${w.split('').map((ch) => {
      if (!/[a-z]/i.test(ch)) return `<span class="punct">${esc(ch)}</span>`;
      sess.letters.push(ch);
      sess.wordOf.push(wi);
      return '<span class="box"></span>';
    }).join('')}</span>`).join('');
    const n = sess.letters.length;
    const info = CONTENT[sess.grade];
    const title = sess.mode === 'level' ? `${info.short} · Level ${sess.level + 1}` : `${info.short} · Endless #${sess.idx + 1}`;
    const dots = sess.mode === 'level' ? `<span class="dots">${U.range(0, SENT.PER_LEVEL - 1).map((i) => `<i class="${i < sess.idx ? 'done' : i === sess.idx ? 'now' : ''}"></i>`).join('')}</span>` : '';
    render(`<main class="play">
      <header class="bar"><button class="iconbtn" data-act="quit" aria-label="Stop">✕</button><h1>${title}</h1>${dots}${pill()}</header>
      <div class="tools">
        <button class="say" data-act="say">🔊 Say it!</button>
        <button class="tool" data-act="slow">🐢<small>Slow</small></button>
        <button class="tool" data-act="word">💬<small>Word</small></button>
        <button class="tool" data-act="peek">👀<small>Peek <b>${sess.grade === 'k' || !live() ? 'free' : POINTS.peek + '⭐'}</b></small></button>
      </div>
      <div class="boxes" id="boxes" data-size="${n > 40 ? 's' : n > 22 ? 'm' : 'l'}">${boxes}</div>
      <p class="tip" id="tip">Press 🔊, listen, then type the letters!</p>
      <p class="pstats">Oops: <b id="oops">0</b>${sess.mode === 'endless' ? ` &nbsp; 🔥 Streak: <b id="streak">${sess.streak}</b>` : ''}</p>
      ${keyboardHtml()}
    </main>`, 'is-play wide');
    sess.boxes = [...document.querySelectorAll('#boxes .box')];
    markCurrent();
    later(() => FX.speak(sess.target, rate()), 350);
  }
  function markCurrent() { sess.boxes.forEach((b, i) => b.classList.toggle('current', i === sess.pos)); }
  function flashKey(ch, cls) {
    const k = document.querySelector(`.key[data-k="${ch}"]`);
    if (!k) return;
    k.classList.remove(cls);
    void k.offsetWidth;
    k.classList.add(cls);
  }
  function type(ch) {
    if (!inPlay() || sess.done || $('#modal')) return;
    const want = sess.letters[sess.pos];
    if (!want) return;
    const box = sess.boxes[sess.pos];
    const tip = $('#tip');
    if (tip) tip.hidden = true;
    if (live()) st.stats.keys++;
    if (want.toLowerCase() === ch) {
      box.textContent = want;
      box.classList.remove('peek', 'shake');
      box.classList.add('ok');
      sess.pos++;
      if (live()) st.stats.letters++;
      earn(POINTS.letter);
      showPoints();
      flashKey(ch, 'hit');
      FX.sfx.good();
      markCurrent();
      if (sess.pos >= sess.letters.length) sentenceDone();
      else S.save();
    } else {
      sess.mistakes++;
      sess.missed.add(sess.target.split(' ')[sess.wordOf[sess.pos]].replace(/[^a-z]/gi, '').toLowerCase());
      $('#oops').textContent = sess.mistakes;
      flashKey(ch, 'miss');
      box.classList.remove('shake');
      void box.offsetWidth;
      box.classList.add('shake');
      FX.sfx.bad();
    }
  }
  function currentWord() {
    const i = Math.min(sess.pos, sess.letters.length - 1);
    return sess.target.split(' ')[sess.wordOf[i]].replace(/[^a-z]/gi, '');
  }
  function peek() {
    if (!inPlay() || sess.done) return;
    const box = sess.boxes[sess.pos];
    if (!box) return;
    if (sess.grade !== 'k' && live()) {
      if (st.points < POINTS.peek) return toast(`You need ${POINTS.peek} ⭐ to peek. Try 💬 Word!`);
      st.points -= POINTS.peek;
      S.save();
      showPoints();
    }
    box.textContent = sess.letters[sess.pos];
    box.classList.add('peek');
    setTimeout(() => { if (!box.classList.contains('ok')) { box.textContent = ''; box.classList.remove('peek'); } }, 1500);
  }
  const starsFor = (m) => (m === 0 ? 3 : m <= 2 ? 2 : 1);

  function sentenceDone() {
    sess.done = true;
    const stars = starsFor(sess.mistakes), perfect = sess.mistakes === 0;
    let earned = 0, extra = '';
    if (live()) {
      st.stats.sentences++;
      if (perfect) st.stats.perfect++;
      S.tally(perfect);
      for (const w of sess.missed) if (w) st.missed[w] = (st.missed[w] || 0) + 1;
      const words = Object.keys(st.missed);
      if (words.length > 300) words.sort((a, b) => st.missed[a] - st.missed[b]).slice(0, words.length - 300).forEach((w) => delete st.missed[w]);
      earned = earn(POINTS.sentence + (perfect ? POINTS.perfect : 0));
    }
    if (sess.mode === 'endless') {
      sess.streak = perfect ? sess.streak + 1 : 0;
      if (live() && sess.streak > (st.bestStreak[sess.grade] || 0)) st.bestStreak[sess.grade] = sess.streak;
      if (sess.streak > 0 && sess.streak % 5 === 0) {
        const bonus = earn(20 * (sess.streak / 5));
        extra = `<p class="bonus">🔥 ${sess.streak} in a row!${bonus ? ` +${bonus} ⭐` : ''}</p>`;
      }
      const s = $('#streak');
      if (s) s.textContent = sess.streak;
    } else sess.stars.push(stars);
    checkBadges();
    S.save();
    FX.sfx.done();
    const praise = U.pick(PRAISE);
    const last = sess.mode === 'level' && sess.idx === SENT.PER_LEVEL - 1;
    later(() => {
      FX.speak(praise, 1);
      FX.celebrate(last ? 160 : 60);
      modal(`<div class="m-emoji">🎉</div><h2 class="m-title">${praise}</h2>
        <div class="m-stars">${starsText(stars)}</div>
        <p class="said">${esc(sess.target)}</p>
        <p class="earned">${live() ? `+${earned} ⭐${perfect ? ' <small>(no oops bonus!)</small>' : ''}` : '<small>Preview · nothing is saved</small>'}</p>${extra}
        <div class="row">${sess.mode === 'endless' ? '<button class="btn ghost" data-act="leave">Stop</button>' : ''}
          <button class="btn" data-act="nextSentence" data-enter>${last ? 'Finish ➜' : 'Next ➜'}</button></div>`, true);
    }, 450);
  }
  function nextSentence() {
    if (!sess) return;
    closeModal();
    sess.idx++;
    if (sess.mode === 'level' && sess.idx >= SENT.PER_LEVEL) return levelDone();
    showSentence();
  }
  function levelDone() {
    const { grade: g, level: i } = sess;
    const stars = Math.max(1, Math.round(U.sum(sess.stars) / sess.stars.length));
    const key = levelKey(g, i), prev = st.levels[key];
    const replay = !!prev;
    let bonus = 0, trophy = '';
    if (live()) {
      bonus = earn(replay ? Math.round(POINTS.level[stars] / 2) : POINTS.level[stars]);
      if (!prev || stars > prev.stars) st.levels[key] = { stars };
      if (!replay) st.stats.levelsDone++;
      if (gradeDone(g) >= SENT.LEVELS && !st.trophies[g]) {
        st.trophies[g] = U.dateKey();
        const t = APP.TROPHIES[g];
        trophy = `<p class="bonus">${t.emoji} You won the <b>${t.name}</b> trophy!</p>`;
      }
    }
    checkBadges();
    S.save();
    sess = null;
    ui.grade = g;
    FX.sfx.hatch();
    FX.speak(stars === 3 ? 'Wow! Three stars!' : 'Level complete!', 1);
    const hasNext = i + 1 < SENT.LEVELS;
    render(`<main class="result">
      <div class="m-emoji">🏁</div>
      <h1 class="title center">Level ${i + 1} complete!</h1>
      <div class="m-stars big">${starsText(stars)}</div>
      <p class="earned center">${live() ? `Level bonus +${bonus} ⭐${replay ? ' <small>(replay)</small>' : ''}` : '<small>Preview · nothing is saved</small>'}</p>
      ${replay && prev.stars < stars ? '<p class="bonus center">New best!</p>' : ''}${trophy}
      <div class="row"><button class="btn ghost" data-act="go" data-arg="home">🗺️ Map</button>
        <button class="btn ghost" data-act="level" data-arg="${i}">🔁 Again</button>
        ${hasNext ? `<button class="btn" data-act="level" data-arg="${i + 1}">Next level ➜</button>` : ''}</div>
    </main>`, 'is-result');
    FX.celebrate(260);
  }
  function quit() {
    modal(`<p class="lead">${sess && sess.mode === 'endless' ? 'Stop practicing now?' : 'Leave this level? You will start it again next time.'} Points you earned are kept.</p>
      <div class="row"><button class="btn ghost" data-act="closeModal">Keep going</button><button class="btn" data-act="leave">Stop</button></div>`);
  }

  // ---------------------------------------------------------------- shop
  function oddsText(odds) {
    return Object.keys(odds).filter((r) => odds[r] > 0).map((r) => `<span style="color:${APP.RARITY[r].color}">${APP.RARITY[r].name} ${odds[r]}%</span>`).join(' · ');
  }
  function shop() {
    if (!st) return who();
    const pv = !live();
    const card = (icon, title, sub, label, enabled, act, arg, cls = '') => `<div class="scard ${cls}"><div class="sicon">${icon}</div><b>${title}</b><small>${sub}</small>
      <button class="sbuy" data-act="${act}" data-arg="${arg}" ${enabled && !pv ? '' : 'disabled'}>${label}</button></div>`;
    const eggs = APP.EGGS.map((e) => card(`<span class="egg" style="--hue:${e.hue}deg">🥚</span>`, e.name, oddsText(e.odds),
      st.points >= e.price ? `Hatch for ⭐ ${e.price}` : `Need ⭐ ${e.price}`, st.points >= e.price, 'buyEgg', e.id, 'egg-' + e.id)).join('');
    const items = (kind, list) => list.map((it) => {
      const owned = st.owned[kind].includes(it.id), using = st.equipped[kind] === it.id;
      const label = using ? '✔ Using' : owned ? 'Use' : st.points >= it.price ? `Buy ⭐ ${it.price}` : `Need ⭐ ${it.price}`;
      return card(it.icon, it.name, owned ? 'Yours!' : `⭐ ${it.price}`, label, !using && (owned || st.points >= it.price), 'buyItem', kind + ':' + it.id, using ? 'using' : '');
    }).join('');
    render(header('🛒 Shop') + `<main class="shop">
      <p class="lead center">You have <b>⭐ ${st.points}</b> points to spend.</p>
      ${pv ? '<p class="muted center">Preview: nothing is saved, so the shop is closed.</p>' : '<p class="muted center">Earn points by writing sentences, finishing levels and winning badges.</p>'}
      <h2>🥚 Creature eggs</h2><div class="sgrid">${eggs}</div>
      <h2>🎹 Keyboard themes</h2><div class="sgrid">${items('theme', APP.THEMES)}</div>
      <h2>🎉 Celebrations</h2><div class="sgrid">${items('effect', APP.EFFECTS)}</div>
    </main>`, 'is-shop wide');
    cur = 'shop';
  }
  function rollRarity(odds) {
    let r = Math.random() * 100;
    for (const k of ['common', 'rare', 'epic', 'legendary']) { if (r < odds[k]) return k; r -= odds[k]; }
    return 'common';
  }
  function buyEgg(id) {
    const egg = APP.EGGS.find((e) => e.id === id);
    if (!egg || !live() || st.points < egg.price) return;
    st.points -= egg.price;
    const rarity = rollRarity(egg.odds);
    const c = U.pick(APP.CREATURES.filter((x) => x.rarity === rarity));
    const isNew = !st.creatures[c.id];
    st.creatures[c.id] = (st.creatures[c.id] || 0) + 1;
    const refund = isNew ? 0 : APP.RARITY[rarity].refund;
    st.points += refund;
    S.save();
    showPoints();
    modal(`<div class="hatch-stage"><span class="egg hatching" style="--hue:${egg.hue}deg">🥚</span></div><p class="muted center">Something is hatching…</p>`, true);
    FX.sfx.knock();
    later(() => {
      const r = APP.RARITY[rarity];
      FX.sfx.hatch();
      FX.celebrate(rarity === 'legendary' ? 300 : 150);
      FX.speak((isNew ? 'You found ' : 'Level up, ') + c.name + '!', 1);
      modal(`<div class="hatch-stage"><span class="creature pop" style="--glow:${r.color}">${c.emoji}</span></div>
        <span class="rtag" style="background:${r.color}">${r.name}</span><h2 class="m-title">${c.name}</h2>
        ${isNew ? '<p class="bonus">✨ NEW creature for your zoo!</p>' : `<p class="bonus">Already had one, so it leveled up to ★${st.creatures[c.id]}! +${refund} ⭐</p>`}
        <div class="row"><button class="btn ghost" data-act="go" data-arg="zoo">🐾 See Zoo</button><button class="btn" data-act="hatched" data-enter>Yay! ➜</button></div>`, true);
      checkBadges();
      S.save();
    }, 2000);
  }
  function buyItem(arg) {
    const [kind, id] = arg.split(':');
    const it = (kind === 'theme' ? APP.THEMES : APP.EFFECTS).find((x) => x.id === id);
    if (!it || !live()) return;
    if (!st.owned[kind].includes(id)) {
      if (st.points < it.price) return;
      st.points -= it.price;
      st.owned[kind].push(id);
      FX.sfx.coin();
      toast(`🛍️ You got <b>${it.name}</b>!`);
    }
    st.equipped[kind] = id;
    checkBadges();
    S.save();
    shop();
    if (kind === 'effect') FX.celebrate(80);
  }

  // ---------------------------------------------------------------- zoo: creatures, trophies, badges
  function zoo() {
    if (!st) return who();
    const tab = ui.zooTab || 'creatures';
    let body;
    if (tab === 'creatures') {
      body = `<p class="muted center">You found ${found(st)} of ${APP.CREATURES.length} creatures. Hatch eggs in the shop to find more!</p>
        <div class="zgrid">${APP.CREATURES.map((c) => {
          const n = st.creatures[c.id], r = APP.RARITY[c.rarity];
          return n ? `<button class="zcard" style="--r:${r.color}" data-act="sayName" data-arg="${c.id}"><span class="ze">${c.emoji}</span><b>${c.name}</b><small>${r.name}${n > 1 ? ' · ★' + n : ''}</small></button>`
            : `<div class="zcard unknown" style="--r:${r.color}"><span class="ze">${c.emoji}</span><b>???</b><small>${r.name}</small></div>`;
        }).join('')}</div>`;
    } else if (tab === 'trophies') {
      body = `<div class="trophies">${GRADES.map((g) => `<div class="trophy ${st.trophies[g] ? '' : 'unknown'}"><span>${APP.TROPHIES[g].emoji}</span><b>${APP.TROPHIES[g].name}</b><small>${st.trophies[g] ? 'Won!' : `${gradeDone(g)}/${SENT.LEVELS} levels`}</small></div>`).join('')}</div>
        <div class="kpis">
          <div><b>${st.stats.sentences}</b><small>sentences</small></div><div><b>${st.stats.letters}</b><small>letters</small></div>
          <div><b>${st.stats.perfect}</b><small>perfect</small></div><div><b>🔥 ${bestStreak(st)}</b><small>best streak</small></div>
        </div>`;
    } else {
      body = `<div class="badges">${BADGES.map((b) => `<div class="badge ${st.badges[b.id] ? '' : 'unknown'}"><span>${b.icon}</span><span class="bt"><b>${b.name}</b><small>${b.desc}</small></span><em>${st.badges[b.id] ? '✔' : '+' + b.reward + ' ⭐'}</em></div>`).join('')}</div>`;
    }
    render(header('🐾 My Zoo') + `<main class="zoo">
      <div class="tabs">${[['creatures', 'Creatures'], ['trophies', 'Trophies'], ['badges', 'Badges']].map(([id, label]) => `<button class="tab ${tab === id ? 'sel' : ''}" data-act="zooTab" data-arg="${id}">${label}</button>`).join('')}</div>
      ${body}</main>`, 'is-zoo wide');
    cur = 'zoo';
  }

  // ---------------------------------------------------------------- grown-ups
  function parentGate() {
    ui.gate = { a: U.rnd(13, 29), b: U.rnd(6, 9) };
    render(header('For grown-ups') + `<main class="gate"><p class="lead">Grown-ups only. Please solve:</p>
      <div class="eqline">${ui.gate.a} × ${ui.gate.b} = </div>
      <input id="gate-in" class="field center" inputmode="numeric" autocomplete="off" aria-label="answer">
      <button class="btn big" data-act="gate">Open</button><p class="muted center" id="gate-msg"></p></main>`);
    const inp = $('#gate-in');
    inp.focus();
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') act('gate'); });
  }
  function parent() {
    const s = st.stats;
    const days = U.range(0, 13).map((i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); const k = U.dateKey(d); return { k, n: (st.days[k] || {}).a || 0, wd: 'SMTWTFS'[d.getDay()] }; });
    const maxN = Math.max(10, ...days.map((d) => d.n));
    const tricky = Object.entries(st.missed).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const kids = S.profiles().map((p) => `<li class="kid"><span class="kav">${p.avatar}</span>
        <span class="kname"><b>${esc(p.name)}</b><small>${p.stats.sentences} sentences${p.lastPlayed ? ' · last played ' + p.lastPlayed : ''}</small></span>
        <span class="chips">${CFG.kinds.map((g) => `<button class="chip ${p.kind === g.id ? 'sel' : ''}" data-act="setKind" data-arg="${p.id}:${g.id}">${CONTENT[g.id].short}</button>`).join('')}</span>
        <button class="linkbtn" data-act="delProfile" data-arg="${p.id}">${ui.delArmed === p.id ? 'Tap again to delete' : 'Delete'}</button></li>`).join('');
    const synced = CL() && APP.cloud.family;
    const lay = layoutFor(st.kind);
    render(header('For grown-ups') + `<main class="parent">
      <p class="lead">Report for <b>${esc(st.name)}</b> ${kindChip(st.kind)}</p>
      <section class="kpis">
        <div><b>${s.sentences}</b><small>sentences</small></div>
        <div><b>${pct(s.letters, s.keys)}%</b><small>letters right first time</small></div>
        <div><b>${days.filter((d) => d.n).length}/14</b><small>active days</small></div>
        <div><b>${bestStreak(st)}</b><small>best streak</small></div>
      </section>
      <section><h2>Sentences, last 14 days</h2><div class="days">${days.map((d) => `<div class="day" title="${d.k}: ${d.n}"><span style="height:${Math.round((d.n / maxN) * 100)}%"></span><small>${d.wd}</small></div>`).join('')}</div>
        <p class="muted">${s.perfect} of ${s.sentences} sentences had no mistakes. ${s.pointsEarned} ⭐ earned in total, ${st.points} ⭐ to spend.</p></section>
      <section><h2>Levels</h2><ul class="glist">${GRADES.map((g) => `<li><span>${CONTENT[g].emoji} ${CONTENT[g].name}</span><b>${gradeDone(g)}/${SENT.LEVELS}</b><small>⭐ ${gradeStars(g)}${st.bestStreak[g] ? ` · Endless best 🔥 ${st.bestStreak[g]}` : ''}${st.trophies[g] ? ' · ' + APP.TROPHIES[g].emoji : ''}</small></li>`).join('')}</ul></section>
      <section><h2>Words to practice</h2>
        ${tricky.length ? `<p class="muted">Words with a mistyped letter, most often first. Tap a word to hear it.</p><div class="chips">${tricky.map(([w, n]) => `<button class="chip" data-act="sayWord" data-arg="${esc(w)}">${esc(w)} <small>×${n}</small></button>`).join('')}</div>` : '<p class="muted">No mistakes yet.</p>'}</section>
      <section><h2>👀 Look at everything</h2>
        <p class="muted">Open every level in every grade to see what ${esc(st.name)} will meet later. Nothing is saved in the preview. It ends when you tap <b>Exit</b>, come back here, or switch ${WORD}.</p>
        <button class="btn" data-act="startPreview">Start preview 👀</button></section>
      <section class="settings"><h2>Settings</h2>
        <label class="toggle"><input type="checkbox" data-act="setting" data-arg="sound" ${st.settings.sound ? 'checked' : ''}> Sound effects</label>
        <label class="toggle"><input type="checkbox" data-act="setting" data-arg="slowVoice" ${st.settings.slowVoice ? 'checked' : ''}> Slower reading voice</label>
        <label class="toggle"><input type="checkbox" data-act="setting" data-arg="unlockAll" ${st.settings.unlockAll ? 'checked' : ''}> Unlock every level</label>
        <div class="label">Keyboard for ${CONTENT[st.kind].name}</div>
        <div class="chips"><button class="chip ${lay === 'abc' ? 'sel' : ''}" data-act="setLayout" data-arg="abc">ABC order</button><button class="chip ${lay === 'qwerty' ? 'sel' : ''}" data-act="setLayout" data-arg="qwerty">QWERTY</button></div>
        <label for="set-name">Name</label><input id="set-name" class="field" maxlength="16" value="${esc(st.name)}">
        <button class="btn ghost" data-act="saveName">Save name</button>
      </section>
      ${famSection()}
      <section><h2>${synced ? 'Backup save code' : 'Move progress to another device'}</h2>
        <p class="muted">${synced ? 'Progress already syncs through your family. A save code is an extra backup.' : 'Copy the save code here and paste it on the other device.'}</p>
        <textarea id="savecode" class="field code" rows="3" placeholder="Save code appears here, or paste one to load it"></textarea>
        <div class="row left"><button class="btn ghost" data-act="exportSave">Show & copy save code</button><button class="btn ghost" data-act="importSave">Load pasted code</button></div>
        <p class="muted" id="save-msg"></p></section>
      <section><h2>${synced ? `${Word}s in your family` : `${Word}s on this device`}</h2>
        <ul class="kids">${kids}</ul>
        <button class="btn ghost" data-act="go" data-arg="new">Add a ${WORD}</button></section>
      <section><h2>Start over</h2><button class="btn danger" data-act="reset">${ui.resetArmed ? `Tap again to erase ${esc(st.name)}’s progress` : `Erase ${esc(st.name)}’s progress`}</button></section>
    </main>`);
  }
  function famSection() {
    const C = CL();
    if (!C) return '<section><h2>Family sync</h2><p class="muted">Online sync works in the website version.</p></section>';
    if (!C.family) return `<section><h2>Family sync</h2>${syncLine()}<p class="muted">Connect to keep the same ${WORD}s and progress on every device.</p><button class="btn" data-act="go" data-arg="family">Connect family ☁️</button></section>`;
    return `<section><h2>Family sync</h2>${syncLine()}
      <p>To add a phone, tablet or computer: open <b>${esc(location.origin + location.pathname)}</b>, choose <b>I already have a family</b>, and type the family code <b>${esc(C.family.name)}</b> and your PIN.</p>
      <p class="muted">The PIN is not stored on devices. If you forget it, create a new family on this device: the ${WORD}s here move into it.</p>
      <button class="btn ghost" data-act="famDisconnect">${ui.discArmed ? 'Tap again to disconnect this device' : 'Disconnect this device'}</button></section>`;
  }

  // ---------------------------------------------------------------- routing
  // Browser back (Safari swipe, Android back) moves between screens instead of leaving the app.
  const useHistory = (() => { try { return window.top === window && !!history.pushState; } catch (e) { return false; } })();
  let fromPop = false;
  function remember(where) {
    if (!useHistory || fromPop) return;
    try { history.pushState({ where }, ''); } catch (e) { /* ignore */ }
  }
  function onPop(e) {
    if (inPlay()) { // leaving an activity asks first (but never on top of a "well done" window)
      remember('play');
      return $('#modal.sticky') ? undefined : quit();
    }
    closeModal();
    const where = (e.state && e.state.where) || (st ? 'home' : 'who');
    fromPop = true;
    go(where === 'play' || where === 'start' ? (st ? 'home' : 'who') : where);
    fromPop = false;
  }
  function go(where) {
    remember(where);
    wanted = '';
    closeModal();
    FX.hush();
    if (where !== 'parent') { ui.resetArmed = false; ui.delArmed = null; ui.discArmed = false; }
    const [scr] = where.split(':');
    sess = null;
    if (scr === 'who') return who();
    if (scr === 'new') { ui.newKid = null; return newProfile(); }
    if (scr === 'family') { ui.fam = null; return family(); }
    if (!st) return who();
    if (scr === 'parent' && S.preview) { endPreview(); toast('Preview ended'); }
    ({ home, shop, zoo, parent: parentGate }[scr] || home)();
  }

  const ACTIONS = {
    go: (a) => go(a),
    closeModal: () => closeModal(),
    openProfile: (a) => openProfile(a),
    pickKind: (a) => { keepNewKid(); ui.newKid.kind = a; newProfile(); },
    pickAvatar: (a) => { keepNewKid(); ui.newKid.avatar = a; newProfile(); },
    createProfile: () => {
      keepNewKid();
      const k = ui.newKid;
      if (!k.name) { $('#ob-name').focus(); $('#ob-name').classList.add('shake'); return; }
      endPreview();
      wanted = '';
      st = S.create({ name: k.name.slice(0, 16), kind: k.kind, avatar: k.avatar });
      ui = {};
      remember('home');
      home();
    },
    famMode: (a) => { ui.fam = ui.fam || {}; if ($('#fam-code')) ui.fam.code = $('#fam-code').value; ui.fam.mode = a; ui.fam.error = ''; family(); },
    famSubmit: () => famSubmit(),
    famSibling: () => famSibling(),
    localOnly: () => { try { localStorage.setItem(CFG.id + '-localonly', '1'); } catch (e) { /* ignore */ } ui.newKid = null; startScreen(); },
    famDisconnect: () => {
      if (!ui.discArmed) { ui.discArmed = true; return parent(); }
      ui.discArmed = false;
      APP.cloud.disconnect();
      toast('This device is no longer synced');
      parent();
    },
    // game
    grade: (a) => { ui.grade = a; home(); },
    level: (a) => startLevel(+a),
    endless: () => startEndless(),
    say: () => sess && FX.speak(sess.target, rate()),
    slow: () => sess && FX.speak(sess.target, 0.55),
    word: () => sess && FX.speak(currentWord(), 0.7),
    peek: () => peek(),
    layout: () => {
      if (!sess) return;
      st.settings.layout[sess.grade] = layoutFor(sess.grade) === 'abc' ? 'qwerty' : 'abc';
      S.save();
      const kb = $('#keyboard');
      kb.nextElementSibling.remove();
      kb.outerHTML = keyboardHtml();
    },
    nextSentence: () => nextSentence(),
    quit: () => quit(),
    leave: () => { closeModal(); sess = null; FX.hush(); home(); },
    buyEgg: (a) => buyEgg(a),
    buyItem: (a) => buyItem(a),
    hatched: () => { closeModal(); shop(); },
    zooTab: (a) => { ui.zooTab = a; zoo(); },
    sayName: (a) => { const c = APP.CREATURES.find((x) => x.id === a); if (c) FX.speak(c.name, 1); },
    sayWord: (a) => FX.speak(a, 0.7),
    setLayout: (a) => { st.settings.layout[st.kind] = a; S.save(); parent(); },
    // grown-ups
    gate: () => {
      if (Number($('#gate-in').value) === ui.gate.a * ui.gate.b) parent();
      else { $('#gate-msg').textContent = 'Not quite — try again.'; $('#gate-in').value = ''; }
    },
    setting: (a, el) => { st.settings[a] = el.checked; S.save(); },
    saveName: () => { st.name = $('#set-name').value.trim().slice(0, 16) || st.name; S.save(); toast('Saved'); },
    setKind: (a) => {
      const [id, kind] = a.split(':');
      S.update(id, { kind });
      if (st.id === id) { st = S.open(id); ui.grade = kind; }
      parent();
    },
    delProfile: (a) => {
      if (ui.delArmed !== a) { ui.delArmed = a; return parent(); }
      ui.delArmed = null;
      const self = st.id === a;
      S.remove(a);
      if (self) { st = null; return who(); }
      parent();
    },
    startPreview: () => { st = S.startPreview(); ui = {}; toast('👀 Preview: everything is open, nothing is saved'); go('home'); },
    exitPreview: () => { endPreview(); ui = {}; toast('Preview ended. Nothing was saved.'); go('home'); },
    exportSave: () => {
      const code = S.exportCode(), ta = $('#savecode');
      ta.value = code;
      const done = () => ($('#save-msg').textContent = 'Copied. Paste it on the other device.');
      const fallback = () => { ta.focus(); ta.select(); $('#save-msg').textContent = 'Select the code above and copy it.'; };
      try { navigator.clipboard.writeText(code).then(done, fallback); } catch (e) { fallback(); }
    },
    importSave: () => {
      try { endPreview(); st = S.importCode($('#savecode').value); toast('Progress loaded'); parent(); } catch (e) { $('#save-msg').textContent = 'That code did not work. Copy the whole code and try again.'; }
    },
    reset: () => {
      if (!ui.resetArmed) { ui.resetArmed = true; return parent(); }
      ui.resetArmed = false;
      S.reset();
      st = APP.state;
      toast('Progress erased');
      home();
    },
  };
  function act(name, arg, el) { if (ACTIONS[name]) ACTIONS[name](arg, el); }

  function init() {
    S.init();
    if (APP.cloud) { APP.cloud.init(); APP.cloud.onUpdate(onCloud); }
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      if (el.type === 'checkbox') return; // handled on change
      act(el.dataset.act, el.dataset.arg, el);
    });
    document.addEventListener('change', (e) => {
      const el = e.target.closest('input[type=checkbox][data-act]');
      if (el) act(el.dataset.act, el.dataset.arg, el);
    });
    // Letter keys react on touch-down, so fast typing on a tablet does not lose letters.
    document.addEventListener('pointerdown', (e) => {
      const k = e.target.closest('.key');
      if (!k) return;
      e.preventDefault();
      type(k.dataset.k);
    });
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const m = $('#modal');
      if (m) {
        if (e.key === 'Escape' && !m.classList.contains('sticky')) return closeModal();
        if (e.key === 'Enter' || e.key === ' ') {
          const b = m.querySelector('[data-enter]');
          if (b) { e.preventDefault(); b.click(); }
        }
        return;
      }
      if (e.key === 'Enter' && $('#fam-go') && !$('#fam-go').disabled) return famSubmit();
      if (!inPlay()) return;
      if (/^[a-z]$/i.test(e.key)) { e.preventDefault(); type(e.key.toLowerCase()); }
      else if (e.key === 'Enter') { e.preventDefault(); FX.speak(sess.target, rate()); }
    });
    window.addEventListener('popstate', onPop);
    const m = /^#who=(.+)$/.exec(location.hash);
    if (m) { try { wanted = decodeURIComponent(m[1]); } catch (e) { /* broken link: ignore */ } }
    try {
      if (useHistory) history.replaceState({ where: 'start' }, '', location.pathname + location.search); // drop #who= from the address
    } catch (e) { /* ignore */ }
    // A brand-new device first offers to join the family, so progress is shared from the start.
    // Then: the profile a link asked for, the only profile, or the picker.
    let localOnly = false;
    try { localOnly = localStorage.getItem(CFG.id + '-localonly') === '1'; } catch (e) { /* ignore */ }
    if (!S.profiles().length && CL() && !APP.cloud.family && !localOnly) return family();
    startScreen();
  }

  APP.app = { init, go, session: () => sess }; // session() is used by the browser tests
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
