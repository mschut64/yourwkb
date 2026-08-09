// YourWkb service worker — v2 (2026-08-09)
// Network-first voor pagina's (actueel mét verbinding, cache als vangnet offline),
// cache-first voor onveranderlijke build-assets. Gehard voor iOS:
// - navigaties matchen met ignoreSearch (start_url met queryparam ≠ cache-miss)
// - expliciete navigate-afhandeling met dubbele fallback
const CACHE = "yourwkb-v2";
const APP_PAGINAS = ["/app"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_PAGINAS).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((namen) =>
      Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navigaties (app openen / pagina laden): network-first, offline uit cache
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => {
        const kopie = res.clone();
        caches.open(CACHE).then((c) => c.put(req, kopie));
        return res;
      }).catch(async () => {
        return (await caches.match(req, { ignoreSearch: true }))
            || (await caches.match("/app", { ignoreSearch: true }))
            || Response.error();
      })
    );
    return;
  }

  // Onveranderlijke build-assets & media: cache-first
  if (url.pathname.startsWith("/_next/static/") || /\.(png|jpg|gif|svg|ico|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const kopie = res.clone();
        caches.open(CACHE).then((c) => c.put(req, kopie));
        return res;
      }))
    );
    return;
  }

  // Overig (zelfde origin): network-first met cache-fallback
  e.respondWith(
    fetch(req).then((res) => {
      const kopie = res.clone();
      caches.open(CACHE).then((c) => c.put(req, kopie));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
