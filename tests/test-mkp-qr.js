// ─────────────────────────────────────────────────────────────────────────────
// De meterkastpaspoort-QR in het rapport — heen en terug, via het plaatje
//
// test-mkp.js toetst de codering (JSON ↔ fragment). Deze test gaat een stap
// verder en leest de PNG zelf terug, zoals de camera van de volgende monteur
// dat doet: data-URI → pixels → QR-lezer (jsQR) → URL → mkpDecode. Pas dan is
// bewezen dat wat in het rapport, de PDF en de e-mail staat hetzelfde paspoort
// is als wat de app heeft opgebouwd.
//
// Voer uit met:  node tests/test-mkp-qr.js
// ─────────────────────────────────────────────────────────────────────────────

import jsQR from "jsqr";
import { PNG } from "pngjs";
import { MKP_BASIS, mkpDecode, QR_MODULES_GRENS } from "meterkastpaspoort";
import { mkpQrVoorRapport } from "../components/wkb/mkp-qr.js";
import { erkVanProfiel } from "../components/wkb/mkp-bouw.js";
import { faseBalans } from "../components/wkb/fasebalans.js";

let passed = 0, failed = 0;
const failures = [];
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; failures.push(`❌ ${label}\n     verwacht: ${e}\n     kreeg:    ${a}`); }
}

// Het plaatje terug naar tekst, zonder iets van de opbouw te weten.
function leesQr(dataUrl) {
  const png = PNG.sync.read(Buffer.from(dataUrl.split(",")[1], "base64"));
  const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return code ? code.data : null;
}

// Een groepenkastklus met vastgelegde fasen, een laadpaal op L3 uit de
// Fasecheck, PV op L1 en een erkenning met uitgever.
const klus = {
  postcode: "2691 JJ", huisnummer: "72", toevoeging: "a", bouwjaar: "1995",
  instNaam: "BlauweVisie", instErkenning: "14718", instErkUitgever: "installq",
  instMetingen: { hoofdzekering: "25", zDrieFase: true },
  aardlekgroepen: [
    { id: 1, naam: "Aardlek A", fase: "1", L: "L1", eindgroepen: [
      { id: 11, naam: "Kookgroep", type: "kook", ampere: "16A" },
      { id: 12, naam: "Zonnepanelen", type: "pv", ampere: "16A" } ] },
    { id: 2, naam: "Aardlek B", fase: "1", L: "L3", eindgroepen: [
      { id: 21, naam: "Laadpaal", type: "laad", ampere: "16A" } ] },
    { id: 3, naam: "Aardlek C", fase: "1", L: "L2", eindgroepen: [
      { id: 31, naam: "Wasmachine", type: "", ampere: "16A" } ] },
  ],
  mkp: { kwById: { 11: "7.4", 12: "4", 21: "3.7", 31: "2" }, lbAan: false },
};

console.log("▶ CATEGORIE 1: de QR in het rapport is het paspoort uit de app");
{
  const { paspoort, url, qr, modules } = await mkpQrVoorRapport(klus, "groepenkast");

  eq(qr.startsWith("data:image/png;base64,"), true, "1.1 de QR is een ingebedde PNG (data-URI), geen externe URL");
  eq(url.startsWith(MKP_BASIS), true, "1.2 de URL wijst naar meterkastpaspoort.nl/p# (het fragment reist mee)");

  const gelezen = leesQr(qr);
  eq(gelezen, url, "1.3 het plaatje leest terug als exact dezelfde URL");

  const terug = await mkpDecode(gelezen.slice(MKP_BASIS.length));
  eq(terug, paspoort, "1.4 teruggelezen JSON is gelijk aan de invoer (round-trip via het plaatje)");

  // Wat de volgende monteur met het teruggelezen paspoort kan
  eq(terug.grp.map(g => g.fn), [[1], [1], [3], [2]], "1.5 de fase per groep (fn) gaat mee");
  eq(terug.log[0].erk, "installq:14718", "1.6 de erkenning gaat mee als log[].erk = uitgever:nummer");
  eq(typeof terug.chk?.r, "string", "1.7 de uitkomst van de belastingcheck gaat mee");

  // De faseverdeling uit de Fasecheck: de lezer rekent haar uit grp[].fn + kw.
  // Geen apart L1/L2/L3-veld — dat bestaat niet in de standaard en zou een
  // tweede bron van waarheid naast grp[] zijn.
  const bal = p => faseBalans({ grp: p.grp, ha: p.ha, lbAan: false });
  eq(bal(terug), bal(paspoort), "1.8 de fasebalans uit de QR is gelijk aan die in de app");

  eq(modules <= QR_MODULES_GRENS, true, `1.9 past op de 50 mm-sticker (${modules} ≤ ${QR_MODULES_GRENS} modules)`);
}

console.log("▶ CATEGORIE 2: erk alleen met een gekozen uitgever");
eq(erkVanProfiel({ instErkenning: "14718", instErkUitgever: "installq" }), "installq:14718", "2.1 uitgever + nummer");
eq(erkVanProfiel({ instErkenning: " 14 718 ", instErkUitgever: "InstallQ" }), "installq:14718", "2.2 spaties en hoofdletters worden genormaliseerd");
eq(erkVanProfiel({ instErkenning: "14718" }), null, "2.3 zonder uitgever geen erk — het register gokken we niet");
eq(erkVanProfiel({ instErkenning: "14718", instErkUitgever: "kiwa" }), null, "2.4 een onbekende uitgever wordt niet geschreven");
eq(erkVanProfiel({ instErkenning: "", instErkUitgever: "installq" }), null, "2.5 zonder nummer geen erk");
eq(erkVanProfiel({ instErkenning: "installq:14718", instErkUitgever: "installq" }), null, "2.6 geen dubbele dubbele punt");
{
  const { paspoort } = await mkpQrVoorRapport({ ...klus, instErkUitgever: "" }, "groepenkast");
  eq("erk" in paspoort.log[0], false, "2.7 zonder uitgever staat er geen erk in de logregel");
}

console.log("▶ CATEGORIE 3: een eerder paspoort overleeft de nieuwe QR");
{
  const oud = { d: "2026-05-02", b: "Installatiebedrijf Jansen", w: "groepenkast vervangen",
                erk: "installq:20551", zeg: ["IQ-20551-000017"], sid: "jansen-2026-01", sig: "Q".repeat(86) };
  const { qr, paspoort } = await mkpQrVoorRapport({ ...klus, mkpImport: {
    v: 2, d: "2026-05-02", pc: "2691JJ", nr: "72a", ha: { f: 3, a: 25 }, grp: [], log: [oud] } }, "groepenkast");
  const terug = await mkpDecode(leesQr(qr).slice(MKP_BASIS.length));
  eq(terug, paspoort, "3.1 round-trip via het plaatje, ook met historie");
  eq(JSON.stringify(terug.log[1]), JSON.stringify(oud), "3.2 de regel van de voorganger komt byte-voor-byte terug, met handtekening");
}

console.log("\n═══════════════════════════════════════════════");
console.log(`RESULTAAT: ${passed} geslaagd · ${failed} mislukt · ${passed + failed} totaal`);
console.log("═══════════════════════════════════════════════");
if (failures.length) {
  console.log("\n⚠️  MISLUKTE TESTS:");
  failures.forEach(f => console.log(f));
  process.exit(1);
}
