// What a WritingPower profile holds, and how two copies of the same profile (played offline on two
// devices) are combined. Nothing earned is ever lost:
//   collected (levels, creatures, themes, badges, trophies, streaks, missed words, puzzle album) → union, best value per key;
//   counters that only grow (stats)                                              → the higher value;
//   things spent or changed (points, equipped theme, settings)                   → the newer copy (the base of `out`).
(function () {
  const APP = (globalThis.APP = globalThis.APP || {});
  const STATS = ['pointsEarned', 'letters', 'keys', 'sentences', 'perfect', 'levelsDone', 'read', 'readRight'];
  APP.schema = {
    STATS,
    fresh: (kind) => ({
      points: 0, // ⭐ to spend in the shop
      stats: { pointsEarned: 0, letters: 0, keys: 0, sentences: 0, perfect: 0, levelsDone: 0, read: 0, readRight: 0 }, // read: words read in Reading Puzzles
      levels: {}, // '<grade>-<index>': { stars }
      bestStreak: {}, // grade: best Endless streak of perfect sentences
      creatures: {}, // creature id: how many hatched (★ level)
      owned: { theme: ['sunny'], effect: ['confetti'] },
      equipped: { theme: 'sunny', effect: 'confetti' },
      badges: {}, // badge id: date earned
      trophies: {}, // grade: date all levels were finished
      missed: {}, // word: times a letter in it was mistyped (for "Words to practice")
      readMissed: {}, // word or phrase: misses in Reading Puzzles not yet made up by reading it right (for "Words to read")
      puzzles: { n: 6, level: 'words', done: {} }, // Reading Puzzles: pieces, what to read, album (creature id: times made)
      lastDaily: '', // date of the last daily bonus
      settings: { sound: true, unlockAll: false, slowVoice: kind === 'k', layout: {} },
    }),
    // out = a copy of the newer profile `nw`; `old` is the other copy. M = helpers from the store (union, max).
    mergeProgress(out, nw, old, M) {
      out.levels = M.union(old.levels, nw.levels, (a, b) => ({ stars: M.max(a.stars, b.stars) }));
      out.creatures = M.union(old.creatures, nw.creatures, M.max);
      out.bestStreak = M.union(old.bestStreak, nw.bestStreak, M.max);
      out.missed = M.union(old.missed, nw.missed, M.max);
      out.readMissed = M.union(old.readMissed, nw.readMissed, M.max);
      out.puzzles = Object.assign({}, old.puzzles, nw.puzzles); // pieces and what to read: the newer copy
      out.puzzles.done = M.union((old.puzzles || {}).done, (nw.puzzles || {}).done, M.max);
      out.badges = M.union(old.badges, nw.badges, (a) => a);
      out.trophies = M.union(old.trophies, nw.trophies, (a) => a);
      for (const k of ['theme', 'effect']) {
        out.owned[k] = [...new Set([...((old.owned || {})[k] || []), ...((nw.owned || {})[k] || [])])];
      }
      for (const k of STATS) out.stats[k] = M.max(nw.stats[k], old.stats[k]);
      if ((old.lastDaily || '') > (out.lastDaily || '')) out.lastDaily = old.lastDaily;
    },
  };
})();
