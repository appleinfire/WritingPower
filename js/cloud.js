// Family sync through Firebase (Firestore + anonymous sign-in, free Spark plan).
//
// A family is identified by a family code + PIN typed on each device. Both are turned into a long key
// in the browser (PBKDF2), and the family's data lives at families/<key>/profiles/<profileId>.
// Without the code and PIN nobody can find the key; the PIN itself is never stored or sent.
//
// The device keeps its own copy in localStorage (js/store.js), so the app opens instantly and works offline.
// Changes are uploaded a moment after they happen; changes from other devices arrive live and are merged.
(function () {
  const APP = (globalThis.APP = globalThis.APP || {});
  const LINK = APP.CONFIG.id + '-family'; // { fid, name } of the connected family on this device
  const C = { status: 'off', family: null, error: '' };
  const subs = [];
  C.onUpdate = (fn) => subs.push(fn);
  const emit = (what) => subs.forEach((fn) => { try { fn(what); } catch (e) { /* ignore */ } });
  const setStatus = (s) => { if (C.status !== s) { C.status = s; emit('status'); } };
  const fail = (code) => Object.assign(new Error(code), { code });

  C.normCode = (code) => String(code || '').trim().toLowerCase().replace(/\s+/g, '-');
  C.deriveId = async (code, pin) => {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(C.normCode(code) + '|' + String(pin).trim()), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(APP.CONFIG.id), iterations: 150000 }, key, 256);
    return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
  };
  C.configured = () =>
    !!APP.CONFIG.firebase && typeof firebase !== 'undefined' && typeof location !== 'undefined' && /^https?:$/.test(location.protocol) && !!(globalThis.crypto && crypto.subtle);

  const readLink = () => { try { return JSON.parse(localStorage.getItem(LINK) || 'null'); } catch (e) { return null; } };
  const writeLink = (v) => { try { v ? localStorage.setItem(LINK, JSON.stringify(v)) : localStorage.removeItem(LINK); } catch (e) { /* ignore */ } };

  let db = null, auth = null, unsub = null, ready = null;
  const timers = {};
  function boot() {
    if (db) return;
    // A named app: other apps on the same origin using the same Firebase project keep their own sign-in and cache.
    const fb = firebase.initializeApp(APP.CONFIG.firebase, APP.CONFIG.id);
    auth = fb.auth();
    db = fb.firestore();
    try { db.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) { /* offline cache unavailable (private mode) */ }
  }
  // Wait for the saved sign-in to load, then sign in anonymously if there is none yet.
  function ensureUser() {
    return new Promise((resolve, reject) => {
      const off = auth.onAuthStateChanged((u) => {
        off();
        if (u) resolve(u);
        else auth.signInAnonymously().then((cred) => resolve(cred.user), reject);
      }, reject);
    });
  }
  const famRef = () => db.collection('families').doc(C.family.fid);
  const now = () => firebase.firestore.FieldValue.serverTimestamp();

  function upload(id) {
    delete timers[id];
    const st = APP.store.raw(id);
    if (!st || !C.family || !ready) return;
    setStatus(navigator.onLine === false ? 'offline' : 'saving');
    ready
      .then(() => famRef().collection('profiles').doc(id).set({ json: JSON.stringify(st), rev: st.rev || 0, name: st.name || '', kind: st.kind || '', updatedAt: now() }))
      .then(() => { if (!Object.keys(timers).length) setStatus('synced'); })
      .catch((e) => { C.error = (e && e.code) || 'write'; setStatus(navigator.onLine === false ? 'offline' : 'error'); });
  }
  C.flushAll = () => Object.keys(timers).forEach((id) => { clearTimeout(timers[id]); upload(id); });

  function listen() {
    if (unsub) unsub();
    unsub = famRef().collection('profiles').onSnapshot({ includeMetadataChanges: true }, (snap) => {
      let any = false;
      snap.docChanges().forEach((ch) => {
        if (ch.doc.metadata.hasPendingWrites) return; // our own change on its way up
        if (ch.type === 'removed') { any = APP.store.removeRemote(ch.doc.id) || any; return; }
        let st;
        try { st = JSON.parse(ch.doc.data().json); } catch (e) { return; }
        any = APP.store.applyRemote(st) || any;
      });
      // A first answer from the device cache is normal while the server responds; only no network means "offline".
      if (snap.metadata.fromCache) setStatus(navigator.onLine === false ? 'offline' : 'connecting');
      else setStatus(snap.metadata.hasPendingWrites || Object.keys(timers).length ? 'saving' : 'synced');
      if (any) emit('data');
    }, (e) => { C.error = (e && e.code) || 'read'; setStatus('error'); });
  }

  // Every local change is uploaded ~1.5 s later (several quick answers become one write).
  function watchLocal() {
    APP.store.onChange((type, id) => {
      if (!C.family || !db) return;
      clearTimeout(timers[id]);
      if (type === 'remove') {
        delete timers[id];
        if (ready) ready.then(() => famRef().collection('profiles').doc(id).delete()).catch(() => {});
        return;
      }
      timers[id] = setTimeout(() => upload(id), 1500);
    });
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', C.flushAll);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') C.flushAll(); });
      window.addEventListener('online', () => { if (C.family && C.status !== 'synced') start(); });
      window.addEventListener('offline', () => { if (C.family) setStatus('offline'); });
    }
  }

  function start() {
    setStatus(navigator.onLine === false ? 'offline' : 'connecting');
    ready = ensureUser();
    ready.then(listen, () => setStatus('offline'));
    ready.catch(() => {});
  }

  // Called once when the app starts.
  C.init = () => {
    if (!APP.store) return;
    watchLocal();
    const link = readLink();
    if (!link || !C.configured()) return;
    C.family = link;
    boot();
    start();
  };

  // Connect this device to a family. create=true makes a new family with this code + PIN.
  // Everything already on this device is merged into the family, so nothing is lost.
  C.connect = async ({ code, pin, create }) => {
    if (!C.configured()) throw fail('unavailable');
    const name = C.normCode(code);
    pin = String(pin || '').trim();
    if (name.length < 6) throw fail('short-code');
    if (!/^\d{4,6}$/.test(pin)) throw fail('bad-pin');
    boot();
    const before = C.family;
    setStatus('connecting');
    try {
      await ensureUser();
      const fid = await C.deriveId(name, pin);
      const ref = db.collection('families').doc(fid);
      let snap;
      try { snap = await ref.get({ source: 'server' }); } catch (e) { throw fail(e && e.code === 'permission-denied' ? 'denied' : 'offline'); }
      if (create && snap.exists) throw fail('exists');
      if (!create && !snap.exists) throw fail('not-found');
      if (create) await ref.set({ name, created: now() });
      if (unsub) { unsub(); unsub = null; }
      C.family = { fid, name };
      writeLink(C.family);
      ready = Promise.resolve();
      const docs = await ref.collection('profiles').get({ source: 'server' });
      docs.forEach((d) => { try { APP.store.applyRemote(JSON.parse(d.data().json)); } catch (e) { /* skip a broken copy */ } });
      APP.store.profiles().forEach((p) => upload(p.id));
      listen();
      emit('data');
      return C.family;
    } catch (e) {
      C.family = before;
      setStatus(before ? 'offline' : 'off');
      throw e.code ? e : fail(navigator.onLine === false ? 'offline' : 'unknown');
    }
  };

  // Stop syncing on this device. Progress stays on this device and in the family.
  C.disconnect = () => {
    C.flushAll();
    if (unsub) { unsub(); unsub = null; }
    C.family = null;
    writeLink(null);
    setStatus('off');
  };

  APP.cloud = C;
})();
