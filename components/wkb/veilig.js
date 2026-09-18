// ─────────────────────────────────────────────────────────────────────────────
// Ontsmetting van gebruikersinvoer
//
// Twee dingen uit de security-audit van 25-08-2026, die tot 11-09 niet te testen
// waren omdat ze midden in WkbApp.jsx stonden:
//
//   esc()          bevinding BEV-03 — HTML-escaping van invoer die in het
//                  rapport terechtkomt. Staat op 41 plekken in genereerRapport;
//                  één gemiste interpolatie is een XSS-gat in een document dat
//                  naar een klant gaat.
//
//   saneerProject  bevinding BEV-04 — validatie van geïmporteerde back-ups en
//                  gedeelde projecten. Een deelbestand komt via WhatsApp van een
//                  collega en is dus invoer van buiten, hoe vertrouwd de bron
//                  ook voelt.
//
// Juist beveiligingscode hoort getest, en juist die zat hier ongetest. Dat is
// geen toeval maar een gevolg van waar hij stond: wat niet te importeren is,
// valt niet te toetsen.
// ─────────────────────────────────────────────────────────────────────────────

// ─── HTML-escaping (BEV-03) ──────────────────────────────────────────────────
//
// De ampersand moet als eerste, anders escape je je eigen escapes: &lt; zou
// daarna nog eens tot &amp;lt; worden verminkt.
export function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ─── Sanering van geïmporteerde projecten (BEV-04) ───────────────────────────
//
// Onbekende velden blijven behouden — een back-up van een nieuwere versie mag
// niet stilletjes uitgekleed worden — maar ze worden wel gesaneerd. Alles is
// begrensd: strings, diepte, aantallen en de omvang van foto's.
export const MAX_STRING = 4000;
export const MAX_DIEPTE = 7;
export const MAX_ARRAY = 400;
export const MAX_SLEUTELS = 120;
export const MAX_FOTO_BYTES = 9_000_000;
export const MAX_PROJECTEN = 500;
export const MAX_BESTAND_BYTES = 60_000_000;

// Alleen rasterformaten, en alleen als data-URL. Geen SVG: dat kan script
// bevatten en zou via het rapport of de fotoweergave uitgevoerd kunnen worden.
const FOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export function saneerWaarde(v, diepte) {
  if (diepte > MAX_DIEPTE) return undefined;
  if (typeof v === "string") {
    if (v.startsWith("data:")) return FOTO_RE.test(v) && v.length < MAX_FOTO_BYTES ? v : undefined;
    return v.slice(0, MAX_STRING);
  }
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "boolean" || v == null) return v;
  if (Array.isArray(v)) return v.slice(0, MAX_ARRAY).map((x) => saneerWaarde(x, diepte + 1));
  if (typeof v === "object") {
    const uit = {};
    let n = 0;
    for (const k of Object.keys(v)) {
      if (++n > MAX_SLEUTELS) break;
      const w = saneerWaarde(v[k], diepte + 1);
      if (w !== undefined) uit[k.slice(0, 64)] = w;
    }
    return uit;
  }
  return undefined;
}

export function saneerProject(p) {
  if (!p || typeof p !== "object" || typeof p.id !== "string" || p.id.length > 64) return null;
  const schoon = saneerWaarde(p, 0);
  return schoon && schoon.id ? schoon : null;
}

// De hele weg van binnengekomen tekst naar een lijst schone projecten, zonder
// opslag aan te raken. De samenvoeging met wat er al op het toestel staat blijft
// in de app, want die kent de opslag; dít deel is de poort waar de invoer van
// buiten doorheen moet, en die hoort te toetsen zijn.
export function saneerImport(jsonText) {
  if (typeof jsonText !== "string" || jsonText.length > MAX_BESTAND_BYTES)
    throw new Error("Bestand is te groot om te importeren");
  let data;
  try { data = JSON.parse(jsonText); }
  catch { throw new Error("Ongeldig JSON-bestand"); }
  const rauw = Array.isArray(data) ? data : data && data.projecten;
  if (!Array.isArray(rauw)) throw new Error("Geen geldig YourWkb back-up bestand");
  const inkomend = rauw.slice(0, MAX_PROJECTEN).map(saneerProject).filter(Boolean);
  if (!inkomend.length) throw new Error("Geen geldige projecten in dit bestand");
  return inkomend;
}

// ─── Anoniem delen met een collega ───────────────────────────────────────────
//
// De klantgegevens gaan eruit, het gescande paspoort NIET in zijn geheel. Tot
// 18-09-2026 verdween mkpImport hier volledig, vanwege het adres. Wie het project
// overnam en een nieuwe QR maakte, wiste daarmee de materiaallijst, de erkenning,
// de zegels en de handtekeningen van eerdere installateurs — het stille verlies
// uit de featurespec paspoortbehoud. Alleen de velden die de kast aanwijzen gaan
// er nu uit: postcode, huisnummer en de EAN-codes van de aansluiting.
export const KLANT_VELDEN = ["naam","email","straat","plaats","postcode","huisnummer","toevoeging"];
export const PASPOORT_ADRESVELDEN = ["pc", "nr", "ean", "ean2"];

export function anonimiseerJob(job) {
  const schoon = { ...job };
  KLANT_VELDEN.forEach((k) => { delete schoon[k]; });
  delete schoon.mkpUrl; delete schoon.mkpQr;      // bevatten adres — ontvanger genereert opnieuw
  if (schoon.mkp) { const m = { ...schoon.mkp }; delete m.ean; delete m.ean2; schoon.mkp = m; }
  if (schoon.mkpImport && typeof schoon.mkpImport === "object") {
    const bron = JSON.parse(JSON.stringify(schoon.mkpImport));
    PASPOORT_ADRESVELDEN.forEach((k) => { delete bron[k]; });
    schoon.mkpImport = bron;
  } else {
    delete schoon.mkpImport;
  }
  return schoon;
}
