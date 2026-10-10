/* WritingPower game logic. */
(function () {
  "use strict";

  var C = window.WP_CONTENT;
  var S = window.WP_SENT;
  var GRADES = window.WP_GRADE_ORDER;
  var SAVE_KEY = "writingpower-save";

  var POINTS = {
    letter: 1,
    sentence: 10,
    perfect: 5,
    level: [0, 25, 50, 75],
    daily: 30,
    peek: 5
  };

  var ACHIEVEMENTS = [
    { id: "first_sentence", icon: "✏️", name: "First Sentence", desc: "Write your first sentence", reward: 20, test: function (s) { return s.sentencesDone >= 1; } },
    { id: "sent_25", icon: "📝", name: "Busy Writer", desc: "Write 25 sentences", reward: 75, test: function (s) { return s.sentencesDone >= 25; } },
    { id: "sent_100", icon: "📚", name: "Super Writer", desc: "Write 100 sentences", reward: 250, test: function (s) { return s.sentencesDone >= 100; } },
    { id: "letters_100", icon: "🔤", name: "100 Letters", desc: "Type 100 correct letters", reward: 30, test: function (s) { return s.totalLetters >= 100; } },
    { id: "letters_1000", icon: "🅰️", name: "1,000 Letters", desc: "Type 1,000 correct letters", reward: 100, test: function (s) { return s.totalLetters >= 1000; } },
    { id: "letters_5000", icon: "🏅", name: "5,000 Letters", desc: "Type 5,000 correct letters", reward: 300, test: function (s) { return s.totalLetters >= 5000; } },
    { id: "perfect_10", icon: "💯", name: "Perfect Ten", desc: "10 sentences with no oops", reward: 60, test: function (s) { return s.perfectSentences >= 10; } },
    { id: "first_level", icon: "🚩", name: "Level Up", desc: "Finish a level", reward: 25, test: function () { return levelsDone() >= 1; } },
    { id: "levels_10", icon: "🗺️", name: "Explorer", desc: "Finish 10 levels", reward: 100, test: function () { return levelsDone() >= 10; } },
    { id: "levels_50", icon: "🧭", name: "Adventurer", desc: "Finish 50 levels", reward: 400, test: function () { return levelsDone() >= 50; } },
    { id: "three_star", icon: "🌟", name: "Star Student", desc: "Get 3 stars on a level", reward: 40, test: function () { return anyLevelWith(3); } },
    { id: "first_creature", icon: "🥚", name: "Hatchling", desc: "Hatch your first creature", reward: 30, test: function () { return creaturesFound() >= 1; } },
    { id: "creatures_10", icon: "🐾", name: "Zookeeper", desc: "Find 10 different creatures", reward: 150, test: function () { return creaturesFound() >= 10; } },
    { id: "legendary", icon: "🦄", name: "Legend Finder", desc: "Find a legendary creature", reward: 200, test: function () { return hasRarity("legendary"); } },
    { id: "all_creatures", icon: "👑", name: "Master Collector", desc: "Find every creature", reward: 1000, test: function () { return creaturesFound() >= window.WP_CREATURES.length; } },
    { id: "streak_10", icon: "🔥", name: "On Fire", desc: "10 perfect sentences in a row in Endless", reward: 60, test: function (s) { return bestStreakAll(s) >= 10; } },
    { id: "streak_25", icon: "☄️", name: "Unstoppable", desc: "25 perfect sentences in a row in Endless", reward: 200, test: function (s) { return bestStreakAll(s) >= 25; } },
    { id: "grade_done", icon: "🏆", name: "Grade Champion", desc: "Finish all levels in a grade", reward: 250, test: function (s) { return s.trophies.length >= 1; } },
    { id: "shopper", icon: "🛍️", name: "Style Star", desc: "Buy a keyboard theme or celebration", reward: 20, test: function (s) { return s.owned.theme.length + s.owned.effect.length > 2; } },
    { id: "days_5", icon: "📅", name: "Five Days", desc: "Play on 5 different days", reward: 100, test: function (s) { return s.daysPlayed >= 5; } }
  ];

  /* ---------- Save data ---------- */

  function defaultSave() {
    return {
      points: 0,
      totalLetters: 0,
      sentencesDone: 0,
      perfectSentences: 0,
      levels: {},
      bestStreak: {},
      creatures: {},
      owned: { theme: ["sunny"], effect: ["confetti"] },
      equipped: { theme: "sunny", effect: "confetti" },
      achievements: [],
      trophies: [],
      lastDaily: null,
      daysPlayed: 0,
      settings: { sound: true, layout: {} }
    };
  }

  function loadSave() {
    var base = defaultSave();
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        Object.keys(base).forEach(function (k) {
          if (data[k] === undefined) return;
          if (base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) {
            base[k] = Object.assign(base[k], data[k]);
          } else {
            base[k] = data[k];
          }
        });
      }
    } catch (e) { /* storage blocked or bad data: start fresh */ }
    return base;
  }

  var save = loadSave();

  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ }
  }

  function levelsDone() {
    var n = 0;
    Object.keys(save.levels).forEach(function (g) { n += Object.keys(save.levels[g]).length; });
    return n;
  }
  function anyLevelWith(stars) {
    return Object.keys(save.levels).some(function (g) {
      return Object.keys(save.levels[g]).some(function (l) { return save.levels[g][l] >= stars; });
    });
  }
  function creaturesFound() { return Object.keys(save.creatures).length; }
  function hasRarity(r) {
    return window.WP_CREATURES.some(function (c) { return c.rarity === r && save.creatures[c.id]; });
  }
  function bestStreakAll(s) {
    var best = 0;
    Object.keys(s.bestStreak).forEach(function (g) { best = Math.max(best, s.bestStreak[g]); });
    return best;
  }
  function gradeLevels(g) { return save.levels[g] || {}; }
  function gradeStars(g) {
    var lv = gradeLevels(g);
    return Object.keys(lv).reduce(function (a, k) { return a + lv[k]; }, 0);
  }

  /* ---------- Helpers ---------- */

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function starsText(n, max) {
    var s = "";
    for (var i = 0; i < (max || 3); i++) s += i < n ? "⭐" : "☆";
    return s;
  }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  /* ---------- Sound ---------- */

  var audioCtx = null;
  function tone(freq, start, dur, type, vol) {
    if (!save.settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var t0 = audioCtx.currentTime + (start || 0);
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(vol || 0.15, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) { /* no audio */ }
  }
  var sfx = {
    good: function () { tone(880, 0, 0.09, "triangle", 0.12); tone(1320, 0.05, 0.08, "triangle", 0.08); },
    bad: function () { tone(180, 0, 0.18, "square", 0.06); },
    done: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.09, 0.2, "triangle", 0.12); }); },
    coin: function () { tone(988, 0, 0.08, "square", 0.05); tone(1319, 0.08, 0.15, "square", 0.05); },
    hatch: function () { [392, 523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, i * 0.07, 0.25, "sine", 0.12); }); }
  };

  /* ---------- Speech ---------- */

  var voice = null;
  var canSpeak = "speechSynthesis" in window;
  function pickVoice() {
    if (!canSpeak) return;
    var vs = window.speechSynthesis.getVoices();
    voice =
      vs.find(function (v) { return /^en[-_]US/i.test(v.lang) && /Samantha|Google US|Aria|Jenny|Ava|Allison/i.test(v.name); }) ||
      vs.find(function (v) { return /^en[-_]US/i.test(v.lang); }) ||
      vs.find(function (v) { return /^en/i.test(v.lang); }) ||
      null;
  }
  if (canSpeak) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }
  var warnedNoSpeech = false;
  function speak(text, rate) {
    if (!canSpeak) {
      if (!warnedNoSpeech) toast("🔇 This browser can't talk. Try Chrome, Edge or Safari.");
      warnedNoSpeech = true;
      return;
    }
    var synth = window.speechSynthesis;
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    if (voice) u.voice = voice;
    u.rate = rate || 0.85;
    u.pitch = 1.05;
    var wasBusy = synth.speaking || synth.pending;
    synth.cancel();
    // Some browsers drop an utterance queued right after cancel().
    if (wasBusy) setTimeout(function () { synth.speak(u); }, 80);
    else synth.speak(u);
  }

  /* ---------- Points, toasts, achievements ---------- */

  function renderPoints() {
    document.querySelectorAll(".points-value").forEach(function (e) { e.textContent = save.points; });
  }
  function bumpPill() {
    var p = $("points-pill");
    p.classList.remove("bump");
    void p.offsetWidth;
    p.classList.add("bump");
  }
  function addPoints(n, label) {
    if (n <= 0) return;
    save.points += n;
    renderPoints();
    bumpPill();
    if (label) toast(label + " <b>+" + n + " ⭐</b>");
    persist();
  }
  function spendPoints(n) {
    if (save.points < n) return false;
    save.points -= n;
    renderPoints();
    persist();
    return true;
  }

  function toast(html, cls) {
    var t = el("div", "toast " + (cls || ""), html);
    var box = $("toasts");
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(function () { t.classList.add("out"); }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  }

  function checkAchievements() {
    ACHIEVEMENTS.forEach(function (a) {
      if (save.achievements.indexOf(a.id) === -1 && a.test(save)) {
        save.achievements.push(a.id);
        save.points += a.reward;
        renderPoints();
        bumpPill();
        toast("🏅 New badge: <b>" + a.icon + " " + a.name + "</b> +" + a.reward + " ⭐", "badge");
        sfx.coin();
      }
    });
    persist();
  }

  function dailyBonus() {
    var today = todayStr();
    if (save.lastDaily === today) return;
    save.lastDaily = today;
    save.daysPlayed += 1;
    addPoints(POINTS.daily, "🌞 Daily bonus!");
    checkAchievements();
  }

  /* ---------- Screens ---------- */

  var currentScreen = "home";
  function show(name) {
    if (canSpeak && name !== "play") window.speechSynthesis.cancel();
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
    $("screen-" + name).classList.add("active");
    currentScreen = name;
    window.scrollTo(0, 0);
    if (name === "home") renderHome();
    if (name === "grade") renderGrade();
    if (name === "shop") renderShop();
    if (name === "zoo") renderZoo();
  }

  /* ---------- Home ---------- */

  function renderHome() {
    var grid = $("grade-grid");
    grid.innerHTML = "";
    GRADES.forEach(function (g) {
      var info = C[g];
      var done = Object.keys(gradeLevels(g)).length;
      var b = el("button", "grade-card");
      b.style.setProperty("--c", info.color);
      b.innerHTML =
        '<span class="grade-emoji">' + info.emoji + "</span>" +
        '<span class="grade-name">' + info.name + "</span>" +
        '<span class="grade-prog">' + done + "/" + S.LEVELS + " levels · ⭐ " + gradeStars(g) + "</span>" +
        (save.trophies.indexOf(g) !== -1 ? '<span class="grade-trophy">' + window.WP_TROPHIES[g].emoji + "</span>" : "");
      b.addEventListener("click", function () { state.grade = g; show("grade"); });
      grid.appendChild(b);
    });
  }

  /* ---------- Grade screen ---------- */

  function isUnlocked(g, i) {
    return i === 0 || gradeLevels(g)[i - 1] !== undefined;
  }

  function renderGrade() {
    var g = state.grade;
    var info = C[g];
    $("grade-title").textContent = info.emoji + " " + info.name;
    document.documentElement.style.setProperty("--grade", info.color);
    $("endless-best").textContent = save.bestStreak[g] ? "Best streak: 🔥 " + save.bestStreak[g] : "Play as long as you like!";
    var lv = gradeLevels(g);
    $("levels-progress").textContent = Object.keys(lv).length + "/" + S.LEVELS;
    var map = $("level-map");
    map.innerHTML = "";
    for (var i = 0; i < S.LEVELS; i++) {
      (function (i) {
        var unlocked = isUnlocked(g, i);
        var stars = lv[i];
        var b = el("button", "level-bubble" + (unlocked ? "" : " locked") + (stars ? " done" : "") +
          (unlocked && stars === undefined ? " next" : ""));
        b.innerHTML = unlocked
          ? '<span class="lvl-num">' + (i + 1) + '</span><span class="lvl-stars">' + (stars ? starsText(stars) : "") + "</span>"
          : '<span class="lvl-num">🔒</span>';
        b.disabled = !unlocked;
        b.setAttribute("aria-label", "Level " + (i + 1) + (unlocked ? "" : " locked"));
        b.addEventListener("click", function () { startLevel(i); });
        map.appendChild(b);
      })(i);
    }
  }

  /* ---------- Play ---------- */

  var state = {
    grade: null,
    mode: null, // "level" | "endless"
    levelIndex: 0,
    sentences: [],
    sentenceIndex: 0,
    sentenceStars: [],
    target: "",
    letters: [],
    pos: 0,
    mistakes: 0,
    streak: 0,
    recent: [],
    busy: false
  };

  function rate() { return C[state.grade].rate; }

  function startLevel(i) {
    state.mode = "level";
    state.levelIndex = i;
    state.sentences = S.levelSentences(state.grade, i);
    state.sentenceIndex = 0;
    state.sentenceStars = [];
    show("play");
    setupKeyboard();
    loadSentence();
  }

  function startEndless() {
    state.mode = "endless";
    state.streak = 0;
    state.recent = [];
    state.sentenceIndex = 0;
    show("play");
    setupKeyboard();
    loadSentence();
  }

  function loadSentence() {
    if (state.mode === "level") {
      state.target = state.sentences[state.sentenceIndex];
    } else {
      state.target = S.endlessSentence(state.grade, state.recent);
      state.recent.push(state.target);
      if (state.recent.length > 25) state.recent.shift();
    }
    state.pos = 0;
    state.mistakes = 0;
    state.busy = false;
    renderPlayHead();
    renderBoxes();
    $("mistakes").textContent = "0";
    $("play-tip").hidden = false;
    var peek = $("peek-cost");
    peek.textContent = state.grade === "k" ? "free" : POINTS.peek + "⭐";
    setTimeout(function () { speak(state.target, rate()); }, 350);
  }

  function renderPlayHead() {
    var info = C[state.grade];
    var dots = $("play-dots");
    dots.innerHTML = "";
    if (state.mode === "level") {
      $("play-info").textContent = info.short + " · Level " + (state.levelIndex + 1);
      for (var i = 0; i < S.PER_LEVEL; i++) {
        var d = el("span", "dot" + (i < state.sentenceIndex ? " done" : "") + (i === state.sentenceIndex ? " now" : ""));
        dots.appendChild(d);
      }
      $("streak-wrap").hidden = true;
    } else {
      $("play-info").textContent = info.short + " · Endless #" + (state.sentenceIndex + 1);
      $("streak-wrap").hidden = false;
      $("streak").textContent = state.streak;
    }
  }

  function renderBoxes() {
    var wrap = $("boxes");
    wrap.innerHTML = "";
    state.letters = [];
    var words = state.target.split(" ");
    words.forEach(function (w) {
      var wordEl = el("span", "word");
      for (var i = 0; i < w.length; i++) {
        var ch = w[i];
        if (/[a-z]/i.test(ch)) {
          var box = el("span", "box");
          state.letters.push({ ch: ch, el: box, word: w });
          wordEl.appendChild(box);
        } else {
          wordEl.appendChild(el("span", "punct", ch));
        }
      }
      wrap.appendChild(wordEl);
    });
    // Make boxes smaller for long sentences so they fit.
    var n = state.letters.length;
    wrap.dataset.size = n > 40 ? "s" : n > 22 ? "m" : "l";
    markCurrent();
  }

  function markCurrent() {
    state.letters.forEach(function (l, i) { l.el.classList.toggle("current", i === state.pos); });
  }

  function currentWord() {
    var l = state.letters[Math.min(state.pos, state.letters.length - 1)];
    return l ? l.word.replace(/[^a-z]/gi, "") : "";
  }

  function flashKey(ch, cls) {
    var k = document.querySelector('.key[data-k="' + ch + '"]');
    if (!k) return;
    k.classList.remove(cls);
    void k.offsetWidth;
    k.classList.add(cls);
  }

  function input(ch) {
    if (currentScreen !== "play" || state.busy || !$("modal").hidden) return;
    ch = ch.toLowerCase();
    var cur = state.letters[state.pos];
    if (!cur) return;
    $("play-tip").hidden = true;
    if (cur.ch.toLowerCase() === ch) {
      cur.el.textContent = cur.ch;
      cur.el.classList.add("ok");
      cur.el.classList.remove("peek", "shake");
      state.pos++;
      save.totalLetters++;
      save.points += POINTS.letter;
      renderPoints();
      flashKey(ch, "hit");
      sfx.good();
      markCurrent();
      if (state.pos >= state.letters.length) sentenceDone();
      else persist();
    } else {
      state.mistakes++;
      $("mistakes").textContent = state.mistakes;
      flashKey(ch, "miss");
      cur.el.classList.remove("shake");
      void cur.el.offsetWidth;
      cur.el.classList.add("shake");
      sfx.bad();
    }
  }

  function peek() {
    var cur = state.letters[state.pos];
    if (!cur || state.busy) return;
    if (state.grade !== "k") {
      if (!spendPoints(POINTS.peek)) {
        toast("You need " + POINTS.peek + " ⭐ to peek. Try 💬 Word!");
        return;
      }
    }
    cur.el.textContent = cur.ch;
    cur.el.classList.add("peek");
    setTimeout(function () {
      if (!cur.el.classList.contains("ok")) { cur.el.textContent = ""; cur.el.classList.remove("peek"); }
    }, 1500);
  }

  function starsFor(mistakes) {
    return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  }

  var PRAISE = ["Great job!", "Awesome!", "You did it!", "Super!", "Fantastic!", "Way to go!", "Amazing!"];

  function sentenceDone() {
    state.busy = true;
    var stars = starsFor(state.mistakes);
    var perfect = state.mistakes === 0;
    var earned = POINTS.sentence + (perfect ? POINTS.perfect : 0);
    save.sentencesDone++;
    if (perfect) save.perfectSentences++;
    addPoints(earned);
    sfx.done();
    var extra = "";

    if (state.mode === "endless") {
      state.streak = perfect ? state.streak + 1 : 0;
      $("streak").textContent = state.streak;
      if (state.streak > (save.bestStreak[state.grade] || 0)) save.bestStreak[state.grade] = state.streak;
      if (state.streak > 0 && state.streak % 5 === 0) {
        var bonus = 20 * (state.streak / 5);
        addPoints(bonus);
        extra = '<p class="bonus">🔥 ' + state.streak + " in a row! +" + bonus + " ⭐</p>";
      }
    } else {
      state.sentenceStars.push(stars);
    }
    persist();
    checkAchievements();

    var praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
    var lastInLevel = state.mode === "level" && state.sentenceIndex === S.PER_LEVEL - 1;
    setTimeout(function () {
      speak(praise, 1);
      celebrate(lastInLevel ? 160 : 60);
      openModal(
        '<div class="modal-emoji">🎉</div>' +
        "<h2>" + praise + "</h2>" +
        '<div class="modal-stars">' + starsText(stars) + "</div>" +
        '<p class="said">' + escapeHtml(state.target) + "</p>" +
        '<p class="earned">+' + earned + " ⭐" + (perfect ? " <small>(no oops bonus!)</small>" : "") + "</p>" +
        extra +
        '<div class="modal-actions">' +
        (state.mode === "endless" ? '<button class="big-btn ghost" data-act="stop">Stop</button>' : "") +
        '<button class="big-btn" data-act="next">' + (lastInLevel ? "Finish ➜" : "Next ➜") + "</button></div>",
        {
          next: function () { closeModal(); nextSentence(); },
          stop: function () { closeModal(); show("grade"); }
        }
      );
    }, 450);
  }

  function nextSentence() {
    state.sentenceIndex++;
    if (state.mode === "level" && state.sentenceIndex >= S.PER_LEVEL) {
      levelDone();
      return;
    }
    loadSentence();
  }

  function levelDone() {
    var g = state.grade, i = state.levelIndex;
    var avg = state.sentenceStars.reduce(function (a, b) { return a + b; }, 0) / state.sentenceStars.length;
    var stars = Math.max(1, Math.round(avg));
    var lv = save.levels[g] = save.levels[g] || {};
    var replay = lv[i] !== undefined;
    var bonus = POINTS.level[stars];
    if (replay) bonus = Math.round(bonus / 2);
    var improved = !replay || stars > lv[i];
    if (improved) lv[i] = stars;
    addPoints(bonus);

    var trophyHtml = "";
    if (Object.keys(lv).length >= S.LEVELS && save.trophies.indexOf(g) === -1) {
      save.trophies.push(g);
      var tr = window.WP_TROPHIES[g];
      trophyHtml = '<p class="bonus">' + tr.emoji + " You won the <b>" + tr.name + "</b> trophy!</p>";
    }
    persist();
    checkAchievements();
    sfx.hatch();
    celebrate(260);
    speak(stars === 3 ? "Wow! Three stars!" : "Level complete!", 1);

    var hasNext = i + 1 < S.LEVELS;
    openModal(
      '<div class="modal-emoji">🏁</div>' +
      "<h2>Level " + (i + 1) + " complete!</h2>" +
      '<div class="modal-stars big">' + starsText(stars) + "</div>" +
      '<p class="earned">Level bonus +' + bonus + " ⭐" + (replay ? " <small>(replay)</small>" : "") + "</p>" +
      (replay && improved ? '<p class="bonus">New best!</p>' : "") +
      trophyHtml +
      '<div class="modal-actions">' +
      '<button class="big-btn ghost" data-act="map">🗺️ Map</button>' +
      '<button class="big-btn ghost" data-act="again">🔁 Again</button>' +
      (hasNext ? '<button class="big-btn" data-act="next">Next level ➜</button>' : "") +
      "</div>",
      {
        map: function () { closeModal(); show("grade"); },
        again: function () { closeModal(); startLevel(i); },
        next: function () { closeModal(); startLevel(i + 1); }
      }
    );
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  /* ---------- Keyboard ---------- */

  var LAYOUTS = {
    abc: ["abcdefg", "hijklmn", "opqrstu", "vwxyz"],
    qwerty: ["qwertyuiop", "asdfghjkl", "zxcvbnm"]
  };

  function layoutFor(g) {
    return save.settings.layout[g] || (g === "k" || g === "g1" ? "abc" : "qwerty");
  }

  function setupKeyboard() {
    var kb = $("keyboard");
    var layout = layoutFor(state.grade);
    kb.innerHTML = "";
    kb.dataset.layout = layout;
    var idx = 0;
    LAYOUTS[layout].forEach(function (row) {
      var r = el("div", "krow");
      row.split("").forEach(function (ch) {
        var k = el("button", "key", ch);
        k.dataset.k = ch;
        k.style.setProperty("--i", idx++);
        k.addEventListener("pointerdown", function (e) { e.preventDefault(); input(ch); });
        r.appendChild(k);
      });
      kb.appendChild(r);
    });
    $("btn-layout").textContent = layout === "abc" ? "⌨️ Switch to QWERTY" : "🔤 Switch to ABC";
  }

  /* ---------- Modal ---------- */

  var modalActions = {};
  function openModal(html, actions) {
    $("modal-card").innerHTML = html;
    modalActions = actions || {};
    $("modal").hidden = false;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  function closeModal() {
    $("modal").hidden = true;
    $("modal-card").innerHTML = "";
    modalActions = {};
  }
  $("modal").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (b && modalActions[b.dataset.act]) modalActions[b.dataset.act]();
  });

  /* ---------- Shop ---------- */

  function shopCard(icon, title, sub, btnLabel, enabled, onClick, cls) {
    var c = el("div", "shop-card " + (cls || ""));
    c.innerHTML = '<div class="shop-icon">' + icon + '</div><div class="shop-title">' + title + "</div>" +
      '<div class="shop-sub">' + sub + "</div>";
    var b = el("button", "shop-buy", btnLabel);
    b.disabled = !enabled;
    b.addEventListener("click", onClick);
    c.appendChild(b);
    return c;
  }

  function oddsText(odds) {
    return Object.keys(odds).filter(function (r) { return odds[r] > 0; }).map(function (r) {
      return '<span style="color:' + window.WP_RARITY[r].color + '">' + window.WP_RARITY[r].name + " " + odds[r] + "%</span>";
    }).join(" · ");
  }

  function renderShop() {
    renderPoints();
    var eggs = $("shop-eggs");
    eggs.innerHTML = "";
    window.WP_EGGS.forEach(function (egg) {
      var afford = save.points >= egg.price;
      eggs.appendChild(shopCard(
        '<span class="egg" style="--hue:' + egg.hue + 'deg">🥚</span>',
        egg.name, oddsText(egg.odds),
        afford ? "Hatch for ⭐ " + egg.price : "Need ⭐ " + egg.price,
        afford, function () { buyEgg(egg); }, "egg-card egg-" + egg.id
      ));
    });

    [["theme", window.WP_THEMES, $("shop-themes")], ["effect", window.WP_EFFECTS, $("shop-effects")]].forEach(function (cfg) {
      var kind = cfg[0], list = cfg[1], box = cfg[2];
      box.innerHTML = "";
      list.forEach(function (item) {
        var owned = save.owned[kind].indexOf(item.id) !== -1;
        var equipped = save.equipped[kind] === item.id;
        var label = equipped ? "✔ Using" : owned ? "Use" : save.points >= item.price ? "Buy ⭐ " + item.price : "Need ⭐ " + item.price;
        var enabled = !equipped && (owned || save.points >= item.price);
        box.appendChild(shopCard(item.icon, item.name, owned ? "Yours!" : "⭐ " + item.price, label, enabled, function () {
          if (!owned) {
            if (!spendPoints(item.price)) return;
            save.owned[kind].push(item.id);
            sfx.coin();
            toast("🛍️ You got <b>" + item.name + "</b>!");
          }
          save.equipped[kind] = item.id;
          applyTheme();
          persist();
          checkAchievements();
          if (kind === "effect") celebrate(80);
          renderShop();
        }, equipped ? "equipped" : ""));
      });
    });
  }

  function rollRarity(odds) {
    var r = Math.random() * 100, acc = 0;
    var keys = ["common", "rare", "epic", "legendary"];
    for (var i = 0; i < keys.length; i++) {
      acc += odds[keys[i]];
      if (r < acc) return keys[i];
    }
    return "common";
  }

  function buyEgg(egg) {
    if (!spendPoints(egg.price)) return;
    var rarity = rollRarity(egg.odds);
    var pool = window.WP_CREATURES.filter(function (c) { return c.rarity === rarity; });
    var creature = pool[Math.floor(Math.random() * pool.length)];
    var isNew = !save.creatures[creature.id];
    save.creatures[creature.id] = (save.creatures[creature.id] || 0) + 1;
    persist();

    openModal(
      '<div class="hatch-stage"><span class="egg hatching" style="--hue:' + egg.hue + 'deg">🥚</span></div>' +
      '<p class="sub">Something is hatching…</p>'
    );
    tone(300, 0, 0.1); tone(300, 0.5, 0.1); tone(340, 1.0, 0.1); tone(380, 1.4, 0.1);

    setTimeout(function () {
      var rinfo = window.WP_RARITY[rarity];
      var refund = isNew ? 0 : rinfo.refund;
      if (refund) addPoints(refund);
      sfx.hatch();
      celebrate(rarity === "legendary" ? 300 : 150);
      speak((isNew ? "You found " : "Level up, ") + creature.name + "!", 1);
      openModal(
        '<div class="hatch-stage"><span class="creature pop" style="--glow:' + rinfo.color + '">' + creature.emoji + "</span></div>" +
        '<div class="rarity-tag" style="background:' + rinfo.color + '">' + rinfo.name + "</div>" +
        "<h2>" + creature.name + "</h2>" +
        (isNew
          ? '<p class="bonus">✨ NEW creature for your zoo!</p>'
          : '<p class="bonus">Already had one, so it leveled up to ★' + save.creatures[creature.id] + "! +" + refund + " ⭐</p>") +
        '<div class="modal-actions"><button class="big-btn ghost" data-act="zoo">🐾 See Zoo</button>' +
        '<button class="big-btn" data-act="next">Yay! ➜</button></div>',
        {
          zoo: function () { closeModal(); show("zoo"); },
          next: function () { closeModal(); renderShop(); }
        }
      );
      checkAchievements();
    }, 2000);
  }

  /* ---------- Zoo ---------- */

  function renderZoo() {
    var grid = $("zoo-grid");
    grid.innerHTML = "";
    $("zoo-count").textContent = "You found " + creaturesFound() + " of " + window.WP_CREATURES.length + " creatures. Hatch eggs in the shop to find more!";
    window.WP_CREATURES.forEach(function (c) {
      var n = save.creatures[c.id];
      var rinfo = window.WP_RARITY[c.rarity];
      var card = el("div", "zoo-card" + (n ? "" : " unknown"));
      card.style.setProperty("--r", rinfo.color);
      card.innerHTML = '<div class="zoo-emoji">' + c.emoji + "</div>" +
        '<div class="zoo-name">' + (n ? c.name : "???") + "</div>" +
        '<div class="zoo-rarity">' + rinfo.name + (n > 1 ? " · ★" + n : "") + "</div>";
      if (n) card.addEventListener("click", function () { speak(c.name, 1); card.classList.remove("wiggle"); void card.offsetWidth; card.classList.add("wiggle"); });
      grid.appendChild(card);
    });

    var tg = $("trophy-grid");
    tg.innerHTML = "";
    GRADES.forEach(function (g) {
      var t = window.WP_TROPHIES[g];
      var has = save.trophies.indexOf(g) !== -1;
      tg.appendChild(el("div", "trophy" + (has ? "" : " unknown"),
        '<div class="trophy-emoji">' + t.emoji + '</div><div class="trophy-name">' + t.name + "</div>" +
        '<div class="trophy-sub">' + (has ? "Won!" : Object.keys(gradeLevels(g)).length + "/" + S.LEVELS + " levels") + "</div>"));
    });
    $("stats").innerHTML =
      "<div><b>" + save.sentencesDone + "</b><span>sentences</span></div>" +
      "<div><b>" + save.totalLetters + "</b><span>letters</span></div>" +
      "<div><b>" + save.perfectSentences + "</b><span>perfect</span></div>" +
      "<div><b>" + levelsDone() + "</b><span>levels</span></div>" +
      "<div><b>🔥 " + bestStreakAll(save) + "</b><span>best streak</span></div>";

    var bl = $("badge-list");
    bl.innerHTML = "";
    ACHIEVEMENTS.forEach(function (a) {
      var has = save.achievements.indexOf(a.id) !== -1;
      bl.appendChild(el("div", "badge" + (has ? "" : " unknown"),
        '<div class="badge-icon">' + a.icon + '</div><div class="badge-text"><b>' + a.name + "</b><span>" + a.desc + "</span></div>" +
        '<div class="badge-reward">' + (has ? "✔" : "+" + a.reward + " ⭐") + "</div>"));
    });
  }

  /* ---------- Themes & celebration effects ---------- */

  function applyTheme() {
    document.body.dataset.theme = save.equipped.theme;
  }

  var fx = $("fx"), fxCtx = fx.getContext("2d"), particles = [], fxRunning = false;
  var COLORS = ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93", "#ff8fab"];

  function celebrate(count) {
    var kind = save.equipped.effect;
    var w = fx.width = window.innerWidth, h = fx.height = window.innerHeight;
    for (var i = 0; i < count; i++) {
      var p = { kind: kind, life: 0, max: 90 + Math.random() * 60, color: COLORS[i % COLORS.length], size: 6 + Math.random() * 8, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3 };
      if (kind === "bubbles") {
        p.x = Math.random() * w; p.y = h + 20; p.vx = (Math.random() - 0.5) * 1; p.vy = -2 - Math.random() * 3; p.size = 8 + Math.random() * 18;
      } else {
        p.x = w / 2 + (Math.random() - 0.5) * w * 0.3; p.y = h * 0.45;
        var a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
        p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp - 6;
      }
      particles.push(p);
    }
    if (!fxRunning) { fxRunning = true; requestAnimationFrame(fxLoop); }
  }

  function fxLoop() {
    fxCtx.clearRect(0, 0, fx.width, fx.height);
    particles = particles.filter(function (p) { return p.life < p.max; });
    particles.forEach(function (p) {
      p.life++;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.kind !== "bubbles") { p.vy += 0.3; p.vx *= 0.99; }
      fxCtx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      fxCtx.save();
      fxCtx.translate(p.x, p.y);
      fxCtx.rotate(p.rot);
      if (p.kind === "confetti") {
        fxCtx.fillStyle = p.color;
        fxCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.kind === "bubbles") {
        fxCtx.strokeStyle = p.color; fxCtx.lineWidth = 2;
        fxCtx.beginPath(); fxCtx.arc(0, 0, p.size, 0, Math.PI * 2); fxCtx.stroke();
      } else {
        fxCtx.font = (p.size * 2.4) + "px serif";
        fxCtx.fillText(p.kind === "stars" ? "⭐" : "💖", 0, 0);
      }
      fxCtx.restore();
    });
    fxCtx.globalAlpha = 1;
    if (particles.length) requestAnimationFrame(fxLoop);
    else { fxRunning = false; fxCtx.clearRect(0, 0, fx.width, fx.height); }
  }

  /* ---------- Wiring ---------- */

  document.querySelectorAll("[data-go]").forEach(function (b) {
    b.addEventListener("click", function () { show(b.dataset.go); });
  });
  $("btn-home").addEventListener("click", function () { closeModal(); show("home"); });
  $("points-pill").addEventListener("click", function () { if (currentScreen !== "play") show("shop"); });
  function renderSoundBtn() { $("btn-sound").textContent = save.settings.sound ? "🔊" : "🔈"; }
  $("btn-sound").addEventListener("click", function () {
    save.settings.sound = !save.settings.sound;
    renderSoundBtn();
    persist();
  });
  $("btn-endless").addEventListener("click", startEndless);
  $("btn-play-back").addEventListener("click", function () { show("grade"); });
  $("btn-say").addEventListener("click", function () { speak(state.target, rate()); });
  $("btn-slow").addEventListener("click", function () { speak(state.target, 0.55); });
  $("btn-word").addEventListener("click", function () { speak(currentWord(), 0.7); });
  $("btn-peek").addEventListener("click", peek);
  $("btn-layout").addEventListener("click", function () {
    save.settings.layout[state.grade] = layoutFor(state.grade) === "abc" ? "qwerty" : "abc";
    persist();
    setupKeyboard();
  });
  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.toggle("active", x === t); });
      document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.toggle("active", p.id === "tab-" + t.dataset.tab); });
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!$("modal").hidden) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (modalActions.next) modalActions.next();
      }
      return;
    }
    if (currentScreen !== "play") return;
    if (/^[a-z]$/i.test(e.key)) { e.preventDefault(); input(e.key); }
    else if (e.key === "Enter") { e.preventDefault(); speak(state.target, rate()); }
  });

  // Expose a tiny API for automated tests.
  window.WP_GAME = { state: state, save: function () { return save; }, input: input };

  applyTheme();
  renderSoundBtn();
  renderPoints();
  renderHome();
  dailyBonus();
})();
