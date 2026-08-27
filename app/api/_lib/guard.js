// Gedeelde beveiliging voor de API-routes (audit 25-08, BEV-01/02/08).
// Rate limiting is in-memory en daarmee per serverless-instance: een best-effort
// rem op bulkmisbruik, geen waterdichte garantie. De combinatie met origin-check,
// strikte invoervalidatie en caps vormt samen de mitigatielaag; de structurele
// fix (server-side rapportbouw) staat gepland vóór de eerste betaalrelease.

const emmers = new Map(); // sleutel → { count, reset }

export function rateLimit(request, { max, perMs, naam }) {
  const ip = (request.headers.get("x-forwarded-for") || "onbekend").split(",")[0].trim();
  const nu = Date.now();
  const sleutel = `${naam}:${ip}`;
  const b = emmers.get(sleutel);
  if (!b || nu > b.reset) {
    emmers.set(sleutel, { count: 1, reset: nu + perMs });
    if (emmers.size > 5000) emmers.clear(); // geheugenrem
    return true;
  }
  b.count++;
  return b.count <= max;
}

export function origineOk(request) {
  // Blokkeert cross-site browsergebruik. Een kale curl kan headers vervalsen —
  // daarom staat dit nooit alleen, maar altijd samen met rate limit en caps.
  const bron = request.headers.get("origin") || request.headers.get("referer") || "";
  if (!bron) return false;
  try {
    const host = new URL(bron).hostname;
    return host === "yourwkb.nl" || host.endsWith(".yourwkb.nl") ||
           host === "localhost" || host.endsWith(".vercel.app");
  } catch { return false; }
}

export function fout(status, publiek, detail) {
  if (detail) console.error(`[api] ${publiek}:`, detail); // Vercel-logs, niet de client (BEV-08)
  return Response.json({ error: publiek }, { status });
}
