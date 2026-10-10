/*
 * Builds the sentences for each level and for Endless Practice.
 * Levels use a seeded random generator so a level always has the same
 * sentences; Endless Practice uses Math.random so it never runs out.
 */
(function () {
  var APP = globalThis.APP;
  var C = APP.CONTENT;
  var LEVELS = 30;
  var PER_LEVEL = 5;
  var HAND_PER_LEVEL = 3;

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  function pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function shuffle(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function letterCount(s) {
    return s.replace(/[^a-z]/gi, "").length;
  }

  // "a apple" -> "an apple", but keep "a unicorn", "a useful".
  function fixArticles(s) {
    return s.replace(/\b([Aa]) (?=[aeio]|u(?!ni|se|su|ro))/g, "$1n ");
  }

  function fillTemplate(tpl, words, rng) {
    var used = {};
    var out = tpl.replace(/\{(\w+)\}/g, function (_, key) {
      var list = words[key];
      if (!list) throw new Error("Unknown word list: " + key);
      used[key] = used[key] || [];
      var choice, tries = 0;
      do { choice = pick(list, rng); tries++; } while (used[key].indexOf(choice) !== -1 && tries < 30);
      used[key].push(choice);
      return choice;
    });
    out = fixArticles(out);
    return out.charAt(0).toUpperCase() + out.slice(1);
  }

  var sortedCache = {};
  function sortedHand(gradeId) {
    if (!sortedCache[gradeId]) {
      sortedCache[gradeId] = C[gradeId].sentences.slice().sort(function (a, b) {
        return letterCount(a) - letterCount(b);
      });
    }
    return sortedCache[gradeId];
  }

  function tierRange(levelIndex) {
    if (levelIndex < 10) return [1, 1];
    if (levelIndex < 20) return [1, 2];
    return [2, 3];
  }

  function levelSentences(gradeId, levelIndex) {
    var g = C[gradeId];
    var rng = mulberry32(hashStr(gradeId + ":" + levelIndex));
    var hand = sortedHand(gradeId);
    var n = hand.length;
    var w = Math.max(8, Math.round(n * 0.3));
    var start = Math.round((levelIndex / (LEVELS - 1)) * (n - w));
    var windowList = shuffle(hand.slice(start, start + w), rng);
    var result = windowList.slice(0, HAND_PER_LEVEL);

    var range = tierRange(levelIndex);
    var pool = g.templates.filter(function (t) { return t.t >= range[0] && t.t <= range[1]; });
    var tries = 0;
    while (result.length < PER_LEVEL && tries < 200) {
      var s = fillTemplate(pick(pool, rng).s, g.words, rng);
      if (result.indexOf(s) === -1) result.push(s);
      tries++;
    }
    return shuffle(result, rng);
  }

  function endlessSentence(gradeId, recent) {
    var g = C[gradeId];
    recent = recent || [];
    var s;
    for (var i = 0; i < 30; i++) {
      if (Math.random() < 0.5) s = pick(g.sentences, Math.random);
      else s = fillTemplate(pick(g.templates, Math.random).s, g.words, Math.random);
      if (recent.indexOf(s) === -1) break;
    }
    return s;
  }

  APP.SENT = {
    LEVELS: LEVELS,
    PER_LEVEL: PER_LEVEL,
    levelSentences: levelSentences,
    endlessSentence: endlessSentence,
    letterCount: letterCount,
    fillTemplate: fillTemplate
  };
})();
