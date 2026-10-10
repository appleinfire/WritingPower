// Offline cache: the app works without internet once it has been opened.
// The deploy workflow replaces 'v1' with the commit hash, so every deploy gets a fresh cache.
// PREFIX must be unique per app: all apps on <user>.github.io share one browser origin and one cache storage,
// so each app deletes only its own old caches. Use APP.CONFIG.id from js/config.js.
// Add every new js/css file to FILES (tests/shell.test.js checks that index.html and FILES agree).
const PREFIX = 'writing-power-cache-';
const CACHE = PREFIX + 'v1';
const FILES = ['./', 'index.html', 'css/style.css', 'js/config.js', 'js/util.js', 'js/schema.js', 'js/store.js', 'js/content.js', 'js/sentences.js', 'js/creatures.js', 'js/fx.js', 'js/vendor/firebase-app-compat.js', 'js/vendor/firebase-auth-compat.js', 'js/vendor/firebase-firestore-compat.js', 'js/cloud.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
// Network first (so updates arrive), cache as fallback when offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
