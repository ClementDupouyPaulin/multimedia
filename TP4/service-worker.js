const CACHE = 'tp4-pwa-v1';
const OFFLINE_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './compass.js',
  './vision.js',
  './ui.js',
  './assets/icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(OFFLINE_FILES)));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k!==CACHE ? caches.delete(k) : null))));
});
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then(resp => resp || fetch(request).catch(() => caches.match('./')))
  );
});
