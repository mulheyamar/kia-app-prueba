// Plantilla del service worker. Al construir, vite.config.ts escribe dist/sw.js
// cambiando la versión y la lista de archivos.
// Guarda la app entera al instalarse y la sirve desde el móvil, con o sin red.
// Cada versión nueva cambia sw.js; Chrome lo nota al abrir la app, guarda la
// versión nueva y la enseña en la apertura siguiente.

const VERSION = '__VERSION_SW__';
const ARCHIVOS = /*ARCHIVOS*/ [];
const CACHE = `kia-app-prueba-${VERSION}`;

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // cache: 'reload' para no coger copias viejas de la caché http de GitHub Pages.
      await cache.addAll(ARCHIVOS.map((archivo) => new Request(archivo, { cache: 'reload' })));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(nombres.filter((nombre) => nombre !== CACHE).map((nombre) => caches.delete(nombre)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET' || new URL(peticion.url).origin !== self.location.origin) return;

  // ignoreVary: lo guardado vale aunque el servidor respondiera «Vary: Origin»
  // (los scripts con crossorigin llevan Origin y la copia guardada no).
  if (peticion.mode === 'navigate') {
    // Cualquier pantalla (también ./?pantalla=repostaje) es la misma index.html.
    evento.respondWith(
      caches
        .match('./index.html', { cacheName: CACHE, ignoreVary: true })
        .then((guardada) => guardada || fetch(peticion)),
    );
    return;
  }

  evento.respondWith(
    caches
      .match(peticion, { cacheName: CACHE, ignoreSearch: true, ignoreVary: true })
      .then((guardada) => guardada || fetch(peticion)),
  );
});
