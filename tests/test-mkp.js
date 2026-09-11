// ─────────────────────────────────────────────────────────────────────────────
// Open Meterkastpaspoort — testsuite voor het formaat
//
// Deze code was tot 11-09-2026 niet te testen: hij zat in WkbApp.jsx en de
// Babel-extractor kon hem niet oppakken. Sinds het een module is kan het wél,
// en sinds Node 18 bestaan CompressionStream en btoa ook buiten de browser —
// dus het echte coderen wordt hier getoetst, niet een nabootsing ervan.
//
// Voer uit met:  node tests/test-mkp.js
// ─────────────────────────────────────────────────────────────────────────────

import {
  MKP_BASIS, MKP_SPEC_VERSIE, eanValide,
  mkpEncode, mkpDecode, mkpUrl, mkpSamenvatting,
  QR_TEKENS_GRENS, qrWaarschuwing,
} from "meterkastpaspoort";
import { mkpBouw } from "../components/wkb/mkp-bouw.js";

let passed = 0, failed = 0;
const failures = [];

function eq(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; failures.push(`❌ ${label}\n     verwacht: ${e}\n     kreeg:    ${a}`); }
}
async function gooit(fn, label) {
  try { await fn(); failed++; failures.push(`❌ ${label}\n     verwachtte een fout, kreeg er geen`); }
  catch { passed++; }
}

console.log("▶ CATEGORIE 1: EAN-18 controlecijfer (GS1 modulo-10)");

// Geldige Nederlandse EAN's: 18 cijfers, beginnen met 87, controlecijfer klopt.
eq(eanValide("871685920000000019"), true,  "1.1 geldige EAN (controlecijfer 9, narekenbaar)");
eq(eanValide("871685920000000018"), false, "1.2 verkeerd controlecijfer");
eq(eanValide("881685920000000019"), false, "1.3 begint niet met 87");
eq(eanValide("87168592000000001"),  false, "1.4 te kort (17 cijfers)");
eq(eanValide("8716859200000000191"), false,"1.5 te lang (19 cijfers)");
eq(eanValide("87168592000000001a"), false, "1.6 bevat een letter");
eq(eanValide("871000000000000013"), true,  "1.6b tweede geldige reeks");
eq(eanValide(""),                   false, "1.7 leeg");
eq(eanValide(null),                 false, "1.8 null");
eq(eanValide(" 8716 8592 0000 0000 19 "), true, "1.9 spaties worden genegeerd");

console.log("▶ CATEGORIE 2: coderen en decoderen (deflate-raw + base64url)");

const paspoort = {
  v: MKP_SPEC_VERSIE, d: "2026-09-11", pc: "2691JJ", nr: "72 a", bj: "1995",
  ha: { f: 3, a: 25 },
  kam: { mm2: 16, a: 63 },
  grp: [
    { t: "kook", rol: "af", f: 1, fn: [2], kw: 7.4, n: "Kookgroep" },
    { t: "lp",   rol: "af", f: 3, fn: [1,2,3], kw: 11 },
    { t: "pv",   rol: "voed", f: 1, fn: [1], kw: 4 },
  ],
  log: [{ d: "2026-09-11", b: "BlauweVisie", w: "laadpaal geplaatst" }],
};

const heen = await mkpEncode(paspoort);
const terug = await mkpDecode(heen);
eq(terug, paspoort, "2.1 heen en terug levert exact hetzelfde object");
eq(/^[A-Za-z0-9_-]+$/.test(heen), true, "2.2 uitvoer is base64url: geen +, / of =");

// De winst van comprimeren is de reden dat dit past op een sticker.
const ruw = JSON.stringify(paspoort).length;
eq(heen.length < ruw, true, `2.3 gecodeerd (${heen.length}) is korter dan ruw JSON (${ruw})`);

// De fase per apparaat is de toevoeging van v2 en moet de rit overleven.
eq(terug.grp[0].fn, [2], "2.4 fasenummer per apparaat blijft behouden");
eq(terug.grp[1].fn, [1,2,3], "2.5 3-fasegroep draagt alle drie de fasen");
eq(MKP_SPEC_VERSIE, 2, "2.6 spec-versie staat op 2 (v0.2)");

// Whitespace om het fragment heen komt voor bij plakken uit een bericht.
eq(await mkpDecode("  " + heen + "  "), paspoort, "2.7 spaties rond het fragment");

await gooit(() => mkpDecode("dit-is-geen-paspoort"), "2.8 onzin geeft een fout");
await gooit(() => mkpDecode(""), "2.9 leeg fragment geeft een fout");
await gooit(async () => {
  // Geldig gecomprimeerd, maar geen paspoort: `v` ontbreekt.
  const geen = await mkpEncode({ iets: "anders" });
  await mkpDecode(geen);
}, "2.10 geldige JSON zonder v wordt geweigerd");

console.log("▶ CATEGORIE 3: grote paspoorten (de stack-valkuil)");

// String.fromCharCode(...bytes) zet elke byte als los argument op de stack en
// loopt daarop stuk. Deze kast is groot maar niet onrealistisch: een verdeler
// met veertig eindgroepen en een vol logboek.
const groot = {
  v: MKP_SPEC_VERSIE, d: "2026-09-11", pc: "2691JJ", nr: "72",
  ha: { f: 3, a: 35 },
  grp: Array.from({ length: 40 }, (_, i) => ({
    t: "ov", rol: "af", f: 1, fn: [(i % 3) + 1], kw: 2.3,
    n: `Eindgroep ${i + 1} met een tamelijk lange omschrijving`,
  })),
  log: Array.from({ length: 8 }, (_, i) => ({
    d: `2026-0${(i % 9) + 1}-01`, b: `Installatiebedrijf nummer ${i}`,
    w: "werkzaamheden aan de verdeelinrichting uitgevoerd",
  })),
};
const grootHeen = await mkpEncode(groot);
eq(await mkpDecode(grootHeen), groot, "3.1 groot paspoort overleeft heen en terug");

console.log("▶ CATEGORIE 4: URL en leesbaarheidsgrens van de QR");

const url = await mkpUrl(paspoort);
eq(url.startsWith(MKP_BASIS), true, "4.1 url begint met de basis");
eq(url.startsWith("https://meterkastpaspoort.nl/p#"), true, "4.2 fragment achter /p#");
// De gegevens zitten ín het fragment: alles achter de # gaat nooit naar een
// server. Dat is de privacy-architectuur, dus die grens toetsen we.
eq(url.split("#")[1], heen, "4.3 de data staat volledig in het fragment");

eq(qrWaarschuwing(QR_TEKENS_GRENS), "", "4.4 precies op de grens: geen waarschuwing");
eq(qrWaarschuwing(QR_TEKENS_GRENS + 1) !== "", true, "4.5 erboven: wel een waarschuwing");
eq(url.length <= QR_TEKENS_GRENS, true, `4.6 een normale kast past ruim (${url.length} tekens)`);

console.log("▶ CATEGORIE 5: samenvatting voor de UI");

eq(mkpSamenvatting(paspoort), "2691JJ 72 a · 3×25A · kam 63A · aanleg 1995 · 3 groepen · laatst: BlauweVisie (2026-09-11)",
   "5.1 volledige samenvatting");
eq(mkpSamenvatting({}), "meterkastpaspoort", "5.2 leeg paspoort geeft de naam");
eq(mkpSamenvatting(null), "meterkastpaspoort", "5.3 null geeft de naam");
eq(mkpSamenvatting({ ha: { f: 1, a: 25 } }), "1×25A", "5.4 alleen aansluiting");

console.log("▶ CATEGORIE 6: van app-gegevens naar paspoort (mkpBouw)");

// Dit is de functie die bepaalt wát er in de QR belandt, en die tot 11-09-2026
// ongetest was omdat hij in WkbApp.jsx stond.
const appData = {
  postcode: "2691 JJ", huisnummer: "72", toevoeging: "a", bouwjaar: "1995",
  instMetingen: { hoofdzekering: "25", zDrieFase: true },
  aardlekgroepen: [
    { id: 1, naam: "Aardlek A", fase: "1", L: "L2", Lbron: "hand",
      eindgroepen: [{ id: 11, naam: "Kookgroep", type: "kook", ampere: "16A" }] },
    { id: 2, naam: "Aardlek B", fase: "3", L: "",
      eindgroepen: [{ id: 21, naam: "Laadgroep", type: "laad", ampere: "16A" }] },
    { id: 3, naam: "Aardlek C", fase: "1", L: "",
      eindgroepen: [{ id: 31, naam: "Wasmachine", type: "", ampere: "16A" }] },
  ],
  mkp: { kwById: { 11: "7.4", 21: "11" }, lbAan: false },
};
const gebouwd = mkpBouw(appData, "groepenkast");

eq(gebouwd.v, MKP_SPEC_VERSIE, "6.1 paspoort draagt de huidige spec-versie");
eq(gebouwd.pc, "2691JJ", "6.2 postcode zonder spaties, hoofdletters");
eq(gebouwd.ha, { f: 3, a: 25 }, "6.3 hoofdaansluiting uit de metingen");

// De kern van v0.2: de fase gaat mee, maar alleen waar hij is vastgelegd.
eq(gebouwd.grp[0].fn, [2], "6.4 vastgelegde fase gaat als fn mee in het paspoort");
eq(gebouwd.grp[1].fn, [1,2,3], "6.5 3-fasegroep krijgt alle drie de fasen");
eq(gebouwd.grp[1].f, 3, "6.6 wel het aantal fasen");
eq(gebouwd.grp[2].fn, undefined, "6.7 leeg gelaten fase wordt niet gegokt");

// Een gegokte fase is schadelijker dan een ontbrekende: onzin mag er niet in.
const metOnzin = JSON.parse(JSON.stringify(appData));
metOnzin.aardlekgroepen[0].L = "L9";
eq(mkpBouw(metOnzin, "groepenkast").grp[0].fn, undefined, "6.8 ongeldige fasewaarde wordt geweigerd");

// En het geheel moet door de codering passen.
const gebouwdHeen = await mkpEncode(gebouwd);
eq((await mkpDecode(gebouwdHeen)).grp[0].fn, [2], "6.9 fasenummer overleeft de QR-codering");

console.log("\n═══════════════════════════════════════════════");
console.log(`RESULTAAT: ${passed} geslaagd · ${failed} mislukt · ${passed + failed} totaal`);
console.log("═══════════════════════════════════════════════");
if (failures.length) {
  console.log("\n⚠️  MISLUKTE TESTS:");
  failures.forEach(f => console.log("  " + f));
  process.exit(1);
}
console.log("\n✅ Het paspoortformaat doet wat de specificatie belooft");

