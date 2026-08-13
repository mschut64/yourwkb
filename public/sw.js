// YourWkb service worker — v6 (2026-08-13)
// Network-first voor pagina's (actueel mét verbinding, cache als vangnet offline),
// cache-first voor onveranderlijke build-assets. Gehard voor iOS:
// - navigaties matchen met ignoreSearch (start_url met queryparam ≠ cache-miss)
// - expliciete navigate-afhandeling met dubbele fallback
const CACHE = "yourwkb-v6";
const APP_PAGINAS = ["/app"];

// Cruciaal voor offline app-start: een respons die via een redirect binnenkwam
// mag van de browser NIET uit de cache geserveerd worden aan een navigatie
// (redirect mode "manual") — dat geeft een eeuwig hangend opstartscherm.
// Daarom wassen we navigatie-responsen schoon vóór het cachen: zelfde inhoud
// en headers, maar zonder redirect-markering.
// Network-first met DEADLINE: zonder limiet wacht een offline/zwak-bereik-start
// op de volledige netwerk-timeout van het OS (tientallen seconden splash).
// Na 3 s wint de cache; het netwerkantwoord dat alsnog binnenkomt ververst de
// cache op de achtergrond voor de volgende keer.
function fetchMetDeadline(req, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("deadline")), ms);
    fetch(req).then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

async function schoonVoorCache(res) {
  if (!res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: 200, statusText: "OK", headers: res.headers });
}

self.addEventListener("install", (e) => {
  // Direct doorschakelen: een nieuwe worker wacht NIET tot alle vensters dicht
  // zijn. Veilig bij onze strategie (pagina's network-first, assets met unieke
  // buildnamen) en essentieel: anders blijft een oude worker de offline-start
  // afhandelen tot de gebruiker toevallig de update-balk aantikt.
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(async (c) => {
      for (const pad of APP_PAGINAS) {
        try {
          const res = await fetch(pad);
          if (res.ok) await c.put(pad, await schoonVoorCache(res));
        } catch { /* offline tijdens install — runtime-caching vangt het op */ }
      }
    })
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

  // Web Share Target: bestand gedeeld vanuit een andere app (bijv. WhatsApp).
  // We parkeren de inhoud in de cache en sturen de app door met een vlag;
  // de app haalt hem daar op en opent meteen het importscherm.
  if (req.method === "POST" && new URL(req.url).pathname === "/app/deel-ontvangst") {
    e.respondWith((async () => {
      try {
        const form = await req.formData();
        const bestand = form.get("bestand");
        const tekst = bestand ? await bestand.text() : "";
        const c = await caches.open(CACHE);
        await c.put("/app/__gedeeld-bestand", new Response(tekst, { headers: { "Content-Type": "text/plain" } }));
      } catch { /* leeg gedeeld — app toont dan gewoon het importscherm */ }
      return Response.redirect("/app?gedeeld=1", 303);
    })());
    return;
  }

  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navigaties (app openen / pagina laden): network-first, offline uit cache
  if (req.mode === "navigate") {
    // Trage/zwakke netwerkrespons ná de deadline cachet alsnog op de achtergrond:
    const achtergrond = fetch(req.clone()).then((res) => {
      const kopie = res.clone();
      caches.open(CACHE).then(async (c) => {
        const schoon = await schoonVoorCache(kopie);
        c.put(req, schoon.clone());
        c.put("/app", schoon);
      });
      return res;
    }).catch(() => null);

    e.respondWith(
      fetchMetDeadline(req.clone(), 3000).catch(async () => {
        const hit = (await caches.match(req, { ignoreSearch: true }))
                 || (await caches.match("/app", { ignoreSearch: true }));
        if (hit) return hit;
        // Geen cache (allereerste gebruik): dan tóch op het netwerk wachten.
        return achtergrond.then((res) => res || Response.error());
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
