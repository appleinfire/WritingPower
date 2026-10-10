// Saved progress, one profile per person, in localStorage on this device.
//   <id>-profiles   → { active, order: [profile ids] }
//   <id>-p-<pid>    → that profile's whole state
//   <id>-pause-<pid> → unfinished sessions that can be continued (kept on this device only)
// Profiles never share data: switching profile swaps the whole state object (APP.state).
// When the family is connected to the cloud (js/cloud.js), every change is reported through S.onChange,
// and changes from other devices come back through S.applyRemote / S.removeRemote.
(function () {
  const APP = (globalThis.APP = globalThis.APP || {});
  const U = APP.U;
  const PFX = APP.CONFIG.id;
  const INDEX = PFX + '-profiles';
  const PKEY = (id) => PFX + '-p-' + id;
  const PAUSE = (id) => PFX + '-pause-' + id;

  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  // Fill a saved profile into a fresh one, so fields added in later versions get their defaults.
  function deep(base, saved) {
    for (const k of Object.keys(saved)) {
      if (isObj(saved[k]) && isObj(base[k])) deep(base[k], saved[k]);
      else base[k] = saved[k];
    }
    return base;
  }
  const fresh = (kind) => deep({
    v: 1,
    id: newId(),
    kind,
    name: '',
    avatar: APP.CONFIG.avatars[0],
    created: U.dateKey(),
    lastPlayed: '',
    rev: 0, // last change time; the newer copy wins for anything that is not merged
    days: {}, // 'YYYY-MM-DD': { a, c } — answers and right answers that day
    settings: { sound: true, unlockAll: false },
  }, APP.schema.fresh(kind));

  const get = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: play without saving */ } };
  const del = (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };
  const readProfile = (id) => { const raw = get(PKEY(id)); return raw ? deep(fresh(raw.kind), raw) : null; };

  const S = {};
  let index = { active: null, order: [] };
  const memory = {}; // fallback when storage is blocked (private mode)
  const listeners = [];
  S.onChange = (fn) => listeners.push(fn);
  const changed = (type, id, st) => listeners.forEach((fn) => { try { fn(type, id, st); } catch (e) { /* a sync problem must never break the app */ } });
  const stamp = (st) => { st.rev = Math.max(Date.now(), (st.rev || 0) + 1); };

  S.init = () => {
    index = get(INDEX) || { active: null, order: [] };
    index.order = index.order.filter((id) => get(PKEY(id)) || memory[id]);
    APP.state = null;
    return index;
  };
  S.profiles = () => index.order.map((id) => readProfile(id) || memory[id]).filter(Boolean);
  S.lastActive = () => index.active;
  S.open = (id) => {
    const st = readProfile(id) || memory[id];
    if (!st) return null;
    APP.state = st;
    index.active = id;
    put(INDEX, index);
    return st;
  };
  S.create = ({ name, kind, avatar }) => {
    const st = fresh(kind);
    Object.assign(st, { name, avatar });
    index.order.push(st.id);
    memory[st.id] = st;
    APP.state = st;
    S.save();
    return S.open(st.id);
  };
  S.save = () => {
    const st = APP.state;
    if (!st || S.preview) return;
    stamp(st);
    memory[st.id] = st;
    put(PKEY(st.id), st);
    changed('save', st.id, st);
  };
  // Change any profile (name, kind…) from the grown-ups page.
  S.update = (id, fields) => {
    if (S.preview) return;
    const st = APP.state && APP.state.id === id ? APP.state : readProfile(id);
    if (!st) return;
    Object.assign(st, fields);
    stamp(st);
    memory[id] = st;
    put(PKEY(id), st);
    changed('save', id, st);
  };
  S.remove = (id) => {
    del(PKEY(id));
    del(PAUSE(id));
    delete memory[id];
    index.order = index.order.filter((x) => x !== id);
    if (index.active === id) index.active = null;
    put(INDEX, index);
    if (APP.state && APP.state.id === id) APP.state = null;
    changed('remove', id);
  };
  // Erase one profile's progress, keep who it is. resetAt stops an older copy on another device from bringing it back.
  S.reset = () => {
    const { id, name, kind, avatar } = APP.state;
    APP.state = Object.assign(fresh(kind), { id, name, kind, avatar, resetAt: Date.now() });
    del(PAUSE(id));
    S.save();
  };

  // Record one answer: daily activity for the grown-ups report.
  S.tally = (right) => {
    const st = APP.state, day = U.dateKey();
    const d = (st.days[day] = st.days[day] || { a: 0, c: 0 });
    d.a++;
    if (right) d.c++;
    st.lastPlayed = day;
    const keys = Object.keys(st.days).sort();
    while (keys.length > 730) delete st.days[keys.shift()]; // keep two years
  };

  // ---------- grown-up preview ----------
  // The app runs on a copy of the profile with everything unlocked, and nothing is saved
  // (no storage, no cloud upload, no unfinished sessions). Ending the preview reloads the real profile.
  S.preview = false;
  S.startPreview = () => {
    if (!APP.state || S.preview) return APP.state;
    const copy = clone(APP.state);
    copy.settings.unlockAll = true;
    S.preview = true;
    APP.state = copy;
    return copy;
  };
  S.endPreview = () => {
    if (!S.preview) return APP.state;
    S.preview = false;
    const id = APP.state && APP.state.id;
    APP.state = null;
    return id ? S.open(id) : null;
  };

  // ---------- unfinished sessions (a test, a long lesson), one per kind, on this device ----------
  S.paused = (what) => (!S.preview && APP.state && (get(PAUSE(APP.state.id)) || {})[what]) || null;
  S.setPaused = (what, data) => {
    if (!APP.state || S.preview) return;
    const all = get(PAUSE(APP.state.id)) || {};
    all[what] = data;
    put(PAUSE(APP.state.id), all);
  };
  S.clearPaused = (what) => {
    if (!APP.state || S.preview) return;
    const all = get(PAUSE(APP.state.id)) || {};
    if (!(what in all)) return;
    delete all[what];
    Object.keys(all).length ? put(PAUSE(APP.state.id), all) : del(PAUSE(APP.state.id));
  };

  // ---------- save code: move or back up one profile without the cloud ----------
  S.exportCode = () => btoa(unescape(encodeURIComponent(JSON.stringify(APP.state))));
  S.importCode = (code) => {
    const obj = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!obj || obj.v !== 1 || !obj.kind) throw new Error('Not a save code of this app.');
    const st = deep(fresh(obj.kind), obj);
    if (!index.order.includes(st.id)) index.order.push(st.id);
    stamp(st);
    memory[st.id] = st;
    put(PKEY(st.id), st);
    changed('save', st.id, st);
    return S.open(st.id);
  };

  // ---------- cloud sync support ----------
  const max = (x, y) => Math.max(x || 0, y || 0);
  // Keys from both objects; when both have a key, combine(older, newer) decides (default: newer).
  const union = (older, newer, combine = (o, n) => n) => {
    const out = Object.assign({}, older || {});
    for (const [k, v] of Object.entries(newer || {})) out[k] = k in out ? combine(out[k], v) : v;
    return out;
  };
  S.M = { max, union };
  // Combine two copies of the same profile. The newer copy is the base; APP.schema.mergeProgress keeps
  // everything earned on either device. A deliberate reset (resetAt) is not undone by an older copy.
  S.mergeProfiles = (a, b) => {
    if (!a) return b;
    if (!b) return a;
    const [nw, old] = (a.rev || 0) >= (b.rev || 0) ? [a, b] : [b, a];
    if ((nw.resetAt || 0) > (old.rev || 0)) return clone(nw);
    const out = clone(nw);
    out.days = union(old.days, nw.days, (x, y) => ({ a: max(x.a, y.a), c: max(x.c, y.c) }));
    if ((old.lastPlayed || '') > (out.lastPlayed || '')) out.lastPlayed = old.lastPlayed;
    APP.schema.mergeProgress(out, nw, old, S.M);
    out.rev = max(nw.rev, old.rev);
    return clone(out);
  };
  // A copy of a profile arrived from another device. Returns true if anything changed here.
  S.applyRemote = (remote) => {
    if (!remote || !remote.id || !remote.kind) return false;
    const id = remote.id;
    const live = APP.state && APP.state.id === id && !S.preview; // in a preview the copy on screen is left alone
    const local = (live ? APP.state : null) || readProfile(id) || memory[id];
    const merged = deep(fresh(remote.kind), S.mergeProfiles(local, remote));
    if (local && JSON.stringify(local) === JSON.stringify(merged)) return false;
    if (live) { // update in place so the screen keeps the same object
      for (const k of Object.keys(APP.state)) delete APP.state[k];
      Object.assign(APP.state, merged);
    }
    memory[id] = live ? APP.state : merged;
    put(PKEY(id), memory[id]);
    if (!index.order.includes(id)) index.order.push(id);
    put(INDEX, index);
    return true;
  };
  S.removeRemote = (id) => {
    if (!index.order.includes(id)) return false;
    del(PKEY(id));
    delete memory[id];
    index.order = index.order.filter((x) => x !== id);
    if (index.active === id) index.active = null;
    put(INDEX, index);
    if (APP.state && APP.state.id === id) APP.state = null;
    return true;
  };
  S.raw = (id) => (APP.state && APP.state.id === id && !S.preview ? APP.state : readProfile(id) || memory[id]);

  APP.store = S;
})();
