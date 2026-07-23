const CACHE_NAME = 'workout-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/storage.js',
  '/js/workout.js',
  '/js/session.js',
  '/js/timer.js',
  '/js/progress.js',
  '/js/statistics.js',
  '/js/settings.js',
  '/js/exportimport.js',
  '/js/app.js',
  '/manifest.json'
];

// Install event - cache all assets
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - network-first so a new deploy is picked up immediately
// whenever there's a connection; falls back to cache only when offline.
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
