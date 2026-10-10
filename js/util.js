// Small helpers shared by every module. Each file attaches itself to the APP namespace,
// so the app runs from plain <script> tags (works from file://, GitHub Pages, or a single bundled file).
(function () {
  const APP = (globalThis.APP = globalThis.APP || {});
  const U = {};
  U.rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  U.range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };
  U.sum = (arr) => arr.reduce((s, x) => s + x, 0);
  U.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.dateKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  APP.U = U;
})();
