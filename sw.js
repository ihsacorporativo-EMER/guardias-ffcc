// Guarda la app en el dispositivo para que abra rápido (service worker). Se publica al lado de index.html.
//  - La página: primero intenta traer la última versión, esperando como mucho ESPERA_MS; si no hay señal o tarda, abre
//    la copia guardada y la nueva se baja por detrás.
//  - Fuentes y librerías (Google Fonts, cdnjs): se bajan una vez y después salen de la copia guardada.
//  - Los datos (el script de Google) nunca pasan por acá: siempre van directo.
const CACHE = 'guardias-ffcc-v1';
const PAGINA = './';
const ESPERA_MS = 4000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.add(PAGINA)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') { e.respondWith(paginaConRespaldo(req)); return; }
  const host = new URL(req.url).hostname;
  if (host === 'cdnjs.cloudflare.com' || host === 'fonts.googleapis.com' || host === 'fonts.gstatic.com') e.respondWith(guardadaPrimero(req));
});

async function paginaConRespaldo(req) {
  const cache = await caches.open(CACHE);
  const red = fetch(req).then(r => { if (r && r.ok) cache.put(PAGINA, r.clone()); return r; });
  try {
    const r = await Promise.race([red, new Promise(ok => setTimeout(() => ok(null), ESPERA_MS))]);
    if (r && r.ok) return r;
  } catch (_) {}
  return (await cache.match(PAGINA)) || red;
}

async function guardadaPrimero(req) {
  const cache = await caches.open(CACHE);
  const guardada = await cache.match(req);
  if (guardada) return guardada;
  const r = await fetch(req);
  if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone());
  return r;
}
