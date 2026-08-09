// YourWkb service worker — v2026-08-07-B
// Strategie: network-first voor pagina's/navigaties (altijd actueel bij verbinding,
// cache als vangnet offline), cache-first voor statische Next.js-assets (die hebben
// unieke buildnamen en zijn dus onveranderlijk). Bij een nieuwe deploy krijgt de
// cache een nieuwe naam; oude caches worden bij activatie opgeruimd.
const CACHE = "yourwkb-v1"; // ← ophogen bij bewuste cache-reset (zelden nodig)
const APP_PAGINAS = ["/app", "/"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_PAGINAS).catch(() => {}))
  );
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
  if (url.origin !== self.location.origin) return;           // externe calls (API's, EAN-codeboek) nooit cachen
  if (url.pathname.startsWith("/api/")) return;               // rapport/e-mail-API altijd live

  // Statische build-assets: cache-first (onveranderlijk door unieke namen)
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

  // Pagina's/navigaties en overige zelfde-origin GET's: network-first met cache-fallback
  e.respondWith(
    fetch(req).then((res) => {
      const kopie = res.clone();
      caches.open(CACHE).then((c) => c.put(req, kopie));
      return res;
    }).catch(() =>
      caches.match(req).then((hit) => hit || caches.match("/app"))
    )
  );
});
