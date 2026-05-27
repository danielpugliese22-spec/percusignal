// PercuSignal Service Worker — soporte offline + actualizaciones
const VERSION = 'v1.0.0';
const CACHE_NAME = `percusignal-${VERSION}`;

// Recursos críticos (se cachean al instalar)
const CORE_ASSETS = [
  '/',
  '/app/',
  '/manifest.json',
  '/assets/logo.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/favicon.png'
];

// Install: precachear el core
self.addEventListener('install', (event) => {
  console.log('[SW] Installing', VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS).catch(e => console.warn('[SW] Cache failed:', e)))
      .then(() => self.skipWaiting())
  );
});

// Activate: borrar caches viejos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating', VERSION);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first para API y HTML, cache-first para assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET
  if (event.request.method !== 'GET') return;

  // API calls: siempre network, no cachear
  if (url.pathname.startsWith('/api/')) return;

  // HTML pages: network-first (para tener siempre la última versión)
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          // Cachear copia para offline
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('/app/')))
    );
    return;
  }

  // Assets (imágenes, JS, CSS, fuentes): cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Fetch en background para actualizar el cache
        fetch(event.request).then(fresh => {
          if (fresh.ok) caches.open(CACHE_NAME).then(c => c.put(event.request, fresh));
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request).then(fresh => {
        if (fresh.ok) {
          const copy = fresh.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
        }
        return fresh;
      });
    })
  );
});

// Mensaje desde el cliente (para forzar update)
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
