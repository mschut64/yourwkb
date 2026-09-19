// ─────────────────────────────────────────────────────────────────────────────
// Openbare bronnen bij het lezen van een paspoort — online, offline, en daartussen
//
// In een kelder zonder bereik moet de viewer blijven werken: met de laatst
// opgehaalde index en feeds, of zonder, maar nooit met een foutmelding.
//
// Voer uit met:  node tests/test-mkp-bronnen.js
// ─────────────────────────────────────────────────────────────────────────────

import { MKP_INDEX_URL, MKP_DEMO_FEED_URL } from "meterkastpaspoort";
import { haalMkpBronnen } from "../components/wkb/mkp-bronnen.js";

let passed = 0, failed = 0;
const failures = [];
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; failures.push(`❌ ${label}\n     verwacht: ${e}\n     kreeg:    ${a}`); }
}

// localStorage en fetch nagebootst, met een logboek van wat er is opgevraagd.
const opslag = new Map();
globalThis.localStorage = {
  getItem: (k) => (opslag.has(k) ? opslag.get(k) : null),
  setItem: (k, v) => opslag.set(k, String(v)),
  removeItem: (k) => opslag.delete(k),
};
let online = true, gevraagd = [];
const INDEX = { uitgevers: [
  { naam: "A", feed: "https://a.example/.well-known/meterkastpaspoort-veldnotities.json", sleutel_id: "a" },
  { naam: "B", feed: "http://onveilig.example/feed.json", sleutel_id: "b" },
] };
const FEED_A = { uitgever: { sleutel_id: "a" }, notities: [] };
const FEED_DEMO = { uitgever: { sleutel_id: "vbe-2026-01" }, notities: [] };
globalThis.fetch = async (url) => {
  gevraagd.push(url);
  if (!online) throw new TypeError("Failed to fetch");
  const body = url === MKP_INDEX_URL ? INDEX : url === INDEX.uitgevers[0].feed ? FEED_A : url === MKP_DEMO_FEED_URL ? FEED_DEMO : null;
  return { ok: !!body, json: async () => body };
};

console.log("▶ CATEGORIE 1: online");
{
  const b = await haalMkpBronnen();
  eq([!!b.index, b.feeds.length, b.uitCache], [true, 2, false], "1.1 index en twee feeds opgehaald (uitgever A + demo)");
  eq(gevraagd.includes("http://onveilig.example/feed.json"), false, "1.2 een feed zonder https wordt niet opgehaald");
  eq(MKP_INDEX_URL.startsWith("https://www."), true, "1.3 index rechtstreeks op www (de doorverwijzing draagt geen CORS-kop)");
  eq(!!opslag.get("ywkb_mkp_bronnen"), true, "1.4 bewaard voor gebruik zonder bereik");
}

console.log("▶ CATEGORIE 2: offline");
{
  online = false;
  const b = await haalMkpBronnen();
  eq([!!b.index, b.feeds.length, b.uitCache, typeof b.opgehaald], [true, 2, true, "string"], "2.1 zonder bereik: de bewaarde versie, met datum");
  opslag.clear();
  const leeg = await haalMkpBronnen();
  eq([leeg.index, leeg.feeds, leeg.uitCache], [null, [], false], "2.2 zonder bereik en zonder bewaarde versie: leeg, geen fout");
}

console.log("\n═══════════════════════════════════════════════");
console.log(`RESULTAAT: ${passed} geslaagd · ${failed} mislukt · ${passed + failed} totaal`);
console.log("═══════════════════════════════════════════════");
if (failures.length) {
  console.log("\n⚠️  MISLUKTE TESTS:");
  failures.forEach(f => console.log(f));
  process.exit(1);
}
