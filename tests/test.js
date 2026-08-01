// ─────────────────────────────────────────────────────────────────────────────
// YourWkb — Geautomatiseerde regressietest — versie 2026-08-01-A
// Test de ECHTE app-logica (tests/logica.js wordt met extract-logica.js uit
// WkbApp.jsx gegenereerd, zodat test en app niet uit elkaar kunnen lopen).
//
// Dekt de veldtest-wijzigingen t/m 29-7-2026:
//   • gG-smeltzekering via tijd-stroomkromme-tabel (GG_TABEL) i.p.v. vaste 4×
//   • Z_max obv de HOOGST afgaande groep (hoogstKar/hoogstAmpere), niet meer
//     de voorzekering; kastklasse × stelsel bepaalt de max. afschakeltijd
//   • Z_max-toetsing geldt nu óók bij TT (was eerder overgeslagen)
//   • Z L-PE aardlekschakelaar-keuze: ≤166Ω achter aardlek, anders foutstroom-norm
//   • ISO totaal Fase→Aarde / Nul→Aarde, norm 0,23 MΩ (rood-only, geen oranje)
//   • ISO per groep als dynamische lijst (instMet.isoGroepen)
//   • Testknop-RCD NOK → directe afkeuring
//
// Voer uit met:  node test.js
// ─────────────────────────────────────────────────────────────────────────────

const { toNum, ggIaVoorTijd, gkCrossChecks, pvCrossChecks } = require("./logica");

let passed = 0, failed = 0;
const failures = [];

function eq(actual, expected, label) {
  const beideNaN = typeof expected === "number" && typeof actual === "number" && isNaN(expected) && isNaN(actual);
  const match = beideNaN ? true
    : typeof expected === "number" ? Math.abs(actual - expected) < 0.001
    : actual === expected;
  if (match) passed++;
  else { failed++; failures.push(`❌ ${label}\n     verwacht: ${expected}\n     kreeg:    ${actual}`); }
}
function bevat(warnings, substring, label) {
  if (warnings.some(w => w.msg.includes(substring))) passed++;
  else { failed++; failures.push(`❌ ${label}\n     verwachtte waarschuwing met: "${substring}"\n     kreeg: ${JSON.stringify(warnings.map(w=>w.msg))}`); }
}
function bevatNiet(warnings, substring, label) {
  if (!warnings.some(w => w.msg.includes(substring))) passed++;
  else { failed++; failures.push(`❌ ${label}\n     ONVERWACHTE waarschuwing met: "${substring}"\n     kreeg: ${JSON.stringify(warnings.map(w=>w.msg))}`); }
}
function aantalWarnings(warnings, expected, label) {
  if (warnings.length === expected) passed++;
  else { failed++; failures.push(`❌ ${label}\n     verwachtte ${expected} waarschuwingen, kreeg ${warnings.length}\n     ${JSON.stringify(warnings.map(w=>w.msg))}`); }
}
function niveauVan(warnings, substring) {
  const w = warnings.find(x => x.msg.includes(substring));
  return w ? w.level : null;
}

// Scenario-helpers met de HUIDIGE veldnamen.
function ag(o = {}) {
  return {
    id: o.id || 1, naam: o.naam || "Aardlek A",
    rcdType: o.rcdType || "A", rcdMa: o.rcdMa || "30", fase: o.fase || "1",
    eindgroepen: o.eindgroepen || [{ id: 11, naam: "Test", kar: "B", ampere: "16A" }],
    hoogstId: o.hoogstId || 11,
  };
}
// gk(instMet, aardlekgroepen, grpMeet) → warnings
const gk = (instMet = {}, aardlekgroepen = [], grpMeet = {}) =>
  gkCrossChecks(aardlekgroepen, grpMeet, instMet);

// ═════════════════════════════════════════════════════════════════════════════
console.log("▶ CATEGORIE 1: toNum (decimaal parsing)");
// ═════════════════════════════════════════════════════════════════════════════
eq(toNum("1,9"), 1.9, "1.1 komma als decimaal");
eq(toNum("1.9"), 1.9, "1.2 punt als decimaal");
eq(toNum("0,23"), 0.23, "1.3 0,23 → 0.23");
eq(toNum("0"), 0, "1.4 \"0\" → 0 (niet NaN)");
eq(toNum(""), NaN, "1.5 leeg → NaN");
eq(toNum(null), NaN, "1.6 null → NaN");
eq(toNum(undefined), NaN, "1.7 undefined → NaN");
eq(toNum("230"), 230, "1.8 geheel getal");

// ═════════════════════════════════════════════════════════════════════════════
console.log("▶ CATEGORIE 2: gG tijd-stroomkromme (GG_TABEL lookup)");
// ═════════════════════════════════════════════════════════════════════════════
eq(ggIaVoorTijd("25", 0.4).ia, 164.3, "2.1 gG25A @0,4s → Ia 164,3A");
eq(ggIaVoorTijd("25", 5).ia,   92.0,  "2.2 gG25A @5s → Ia 92,0A");
eq(ggIaVoorTijd("25", 5).inGebruikt, 25, "2.3 gG25A → exacte In-match 25");
eq(ggIaVoorTijd("63", 0.2).ia, 486.5, "2.4 gG63A @0,2s → Ia 486,5A");
eq(ggIaVoorTijd("20", 0.2).ia, 153.3, "2.5 gG20A @0,2s → 153,3A (gecorrigeerde celwaarde, was 43,3)");
// Dichtstbijzijnde In-waarde bij niet-standaard maat:
eq(ggIaVoorTijd("13", 5).inGebruikt, 10, "2.6 gG13A → dichtstbij 10A (gelijke afstand → lagere)");
eq(ggIaVoorTijd("48", 5).inGebruikt, 50, "2.7 gG48A → dichtstbij 50A");
// Ongeldige invoer:
eq(ggIaVoorTijd("0", 5), null,  "2.8 gG0A → null");
eq(ggIaVoorTijd("", 5),  null,  "2.9 lege ampère → null");
eq(ggIaVoorTijd("25", 99), null, "2.10 onbekende tijd → null");

// ═════════════════════════════════════════════════════════════════════════════
console.log("▶ CATEGORIE 3: ISO totaal Fase→Aarde / Nul→Aarde (norm 0,23 MΩ, rood-only)");
// ═════════════════════════════════════════════════════════════════════════════
bevat(gk({ isoTotFA: "0,15" }), "ISO totaal (Fase→Aarde)", "3.1 isoTotFA 0,15 → onder 0,23 → rood");
bevat(gk({ isoTotNA: "0,20" }), "ISO totaal (Nul→Aarde)",  "3.2 isoTotNA 0,20 → onder 0,23 → rood");
eq(niveauVan(gk({ isoTotFA: "0,15" }), "ISO totaal"), "red", "3.3 ISO totaal onder norm → niveau rood");
aantalWarnings(gk({ isoTotFA: "0,23" }), 0, "3.4 isoTotFA precies 0,23 → geen waarschuwing (op norm = OK)");
aantalWarnings(gk({ isoTotFA: "0,5", isoTotNA: "0,5" }), 0, "3.5 0,5 MΩ → geen waarschuwing (nieuwe norm 0,23, niet meer 1,0)");
aantalWarnings(gk({ isoTotFA: "5,0", isoTotNA: "4,8" }), 0, "3.6 ruim boven norm → geen waarschuwing");

// ═════════════════════════════════════════════════════════════════════════════
console.log("▶ CATEGORIE 4: ISO per groep — dynamische lijst (instMet.isoGroepen)");
// ═════════════════════════════════════════════════════════════════════════════
bevat(gk({ isoGroepen: [{ id:1, naam:"WCD begane grond", driefase:false, fa:"0,15", na:"0,5" }] }),
  "WCD begane grond (Fase→Aarde): ISO 0.15", "4.1 1-fase groep fa 0,15 → onder 0,23 → rood");
aantalWarnings(gk({ isoGroepen: [{ id:1, naam:"WCD", driefase:false, fa:"0,23", na:"0,30" }] }), 0,
  "4.2 1-fase groep precies op norm 0,23 → geen waarschuwing (geen oranje meer)");
// 3-fase wordt naar aarde gemeten → norm is óók 0,23 MΩ (niet meer 0,40).
bevat(gk({ isoGroepen: [{ id:1, naam:"Kracht", driefase:true, l1a:"0,20", l2a:"0,5", l3a:"0,5", na:"0,5" }] }),
  "Kracht (L1→Aarde): ISO 0.2", "4.3 3-fase groep L1 0,20 → onder 0,23 → rood");
aantalWarnings(gk({ isoGroepen: [{ id:1, naam:"Kracht", driefase:true, l1a:"0,30", l2a:"0,5", l3a:"0,5", na:"0,5" }] }), 0,
  "4.4 3-fase groep L1 0,30 → boven 0,23 → geen waarschuwing (voorheen fout onder 0,40)");
aantalWarnings(gk({ isoGroepen: [{ id:1, naam:"Kracht", driefase:true, l1a:"0,23", l2a:"0,23", l3a:"0,23", na:"0,23" }] }), 0,
  "4.4b 3-fase groep precies op 0,23 → geen waarschuwing (norm naar aarde, ook 3-fase)");
bevat(gk({ isoGroepen: [{ id:1, driefase:false, fa:"0,10", na:"0,5" }] }),
  "Groep 1 (Fase→Aarde)", "4.5 groep zonder naam → 'Groep 1' fallback in melding");
aantalWarnings(gk({ isoGroepen: [] }), 0, "4.6 lege groepenlijst → geen waarschuwing");

// ═════════════════════════════════════════════════════════════════════════════
console.log("▶ CATEGORIE 5: ΔT / ΔI / Testknop per RCD-type");
// ═════════════════════════════════════════════════════════════════════════════
bevat(gk({}, [ag()], { "1_dt": "301" }), "ΔT 301ms boven 300ms", "5.1 ΔT 301 → rood");
aantalWarnings(gk({}, [ag()], { "1_dt": "300" }), 0, "5.2 ΔT 300 precies op norm → geen waarschuwing");
// ΔI per type (AC 1×, A 1,4×, B 2×):
bevat(gk({}, [ag({ rcdType:"AC", rcdMa:"30" })], { "1_di":"31" }), "ΔI 31mA boven norm voor type-AC", "5.3 AC 30mA · ΔI 31 → boven 30 → rood");
aantalWarnings(gk({}, [ag({ rcdType:"AC", rcdMa:"30" })], { "1_di":"30" }), 0, "5.4 AC 30mA · ΔI 30 → op norm → geen waarschuwing");
bevat(gk({}, [ag({ rcdType:"A", rcdMa:"30" })], { "1_di":"43" }), "ΔI 43mA boven norm voor type-A", "5.5 A 30mA · ΔI 43 → boven 42 → rood");
aantalWarnings(gk({}, [ag({ rcdType:"A", rcdMa:"30" })], { "1_di":"42" }), 0, "5.6 A 30mA · ΔI 42 → op norm → geen waarschuwing");
bevat(gk({}, [ag({ rcdType:"B", rcdMa:"30" })], { "1_di":"61" }), "ΔI 61mA boven norm voor type-B", "5.7 B 30mA · ΔI 61 → boven 60 → rood");
bevat(gk({}, [ag({ rcdType:"F", rcdMa:"30" })], { "1_di":"43" }), "ΔI 43mA boven norm voor type-F", "5.8 F 30mA → als A-norm (1,4×) · ΔI 43 → rood");
// Testknop NOK:
bevat(gk({}, [ag()], { "1_testknop":"NOK" }), "Testknop RCD geeft NOK", "5.9 Testknop NOK → rood");
aantalWarnings(gk({}, [ag()], { "1_testknop":"OK" }), 0, "5.10 Testknop OK → geen waarschuwing");
// geen RCD → alle RCD-checks overgeslagen:
bevatNiet(gk({}, [ag({ rcdType:"geen" })], { "1_dt":"500", "1_di":"100", "1_testknop":"NOK" }), "ΔT", "5.11 geen RCD: ΔT overgeslagen");
bevatNiet(gk({}, [ag({ rcdType:"geen" })], { "1_dt":"500", "1_di":"100", "1_testknop":"NOK" }), "Testknop", "5.12 geen RCD: Testknop overgeslagen");

// ═════════════════════════════════════════════════════════════════════════════
console.log("▶ CATEGORIE 6: Z_max via HOOGST afgaande groep — B/C/D-automaten");
// ═════════════════════════════════════════════════════════════════════════════
// zMax(C16) = round(230/(10*16)) = 1,44Ω. rcdAanwezig moet false zijn om de foutstroom-norm op Z L-PE te toetsen.
bevat(gk({ hoogstKar:"C", hoogstAmpere:"16", zln:"1.5" }), "Z L-N 1.5Ω boven Z_max", "6.1 C16A (Z_max 1,44): Z L-N 1,5 → rood");
bevatNiet(gk({ hoogstKar:"C", hoogstAmpere:"16", zln:"1.4" }), "Z L-N", "6.2 C16A: Z L-N 1,4 → onder Z_max → geen waarschuwing");
bevat(gk({ hoogstKar:"B", hoogstAmpere:"16", zln:"3.0" }), "Z L-N 3Ω boven Z_max", "6.3 B16A (Z_max 2,88): Z L-N 3,0 → rood");
bevatNiet(gk({ hoogstKar:"B", hoogstAmpere:"16", zln:"2.8" }), "Z L-N", "6.4 B16A: Z L-N 2,8 → onder Z_max → geen waarschuwing");
// hoogstKar 'Anders' → geen Z_max → Z L-N niet getoetst:
bevatNiet(gk({ hoogstKar:"Anders", hoogstAmpere:"25", zln:"50" }), "Z L-N", "6.5 Anders-kar: geen Z_max → Z L-N niet getoetst");
// Ontbrekende hoogst afgaande groep → geen Z_max:
bevatNiet(gk({ zln:"50" }), "Z L-N", "6.6 geen hoogstAmpere → geen Z L-N-toetsing");

// ═════════════════════════════════════════════════════════════════════════════
console.log("▶ CATEGORIE 7: Z_max via gG-tabel — kastklasse beïnvloedt de norm");
// ═════════════════════════════════════════════════════════════════════════════
// gG25A klasse1 TN → 5s → Ia 92 → Z_max round(230/92)=2,50Ω
bevat(gk({ hoogstKar:"gG", hoogstAmpere:"25", kastType:"klasse1", stelsel:"TN-C-S", zln:"3.0" }),
  "Z L-N 3Ω boven Z_max", "7.1 gG25A Klasse1 (Z_max 2,50): Z L-N 3,0 → rood");
bevatNiet(gk({ hoogstKar:"gG", hoogstAmpere:"25", kastType:"klasse1", stelsel:"TN-C-S", zln:"2.0" }),
  "Z L-N", "7.2 gG25A Klasse1: Z L-N 2,0 → onder 2,50 → geen waarschuwing");
// gG25A klasse2 TN → 0,4s → Ia 164,3 → Z_max round(230/164,3)=1,40Ω → dezelfde 2,0Ω is nu WÉL fout
bevat(gk({ hoogstKar:"gG", hoogstAmpere:"25", kastType:"klasse2", stelsel:"TN-C-S", zln:"2.0" }),
  "Z L-N 2Ω boven Z_max", "7.3 gG25A Klasse2 (Z_max 1,40): zelfde Z L-N 2,0 → nu WÉL rood (kastklasse-afhankelijk)");

// ═════════════════════════════════════════════════════════════════════════════
console.log("▶ CATEGORIE 8: Z L-PE aardlekschakelaar-keuze (≤166Ω vs foutstroom-norm)");
// ═════════════════════════════════════════════════════════════════════════════
// Default: rcdAanwezig undefined → true → norm ≤166Ω
bevat(gk({ zlpe:"200" }), "Z L-PE 200Ω boven 166Ω", "8.1 default (aardlek aanwezig): Z L-PE 200 → boven 166 → rood");
aantalWarnings(gk({ zlpe:"120" }), 0, "8.2 aardlek aanwezig: Z L-PE 120 → onder 166 → geen waarschuwing");
// De ≤166Ω-norm hangt NIET af van de automaat: ook met hoogstKar Anders geldt 166:
bevat(gk({ hoogstKar:"Anders", zlpe:"200" }), "boven 166Ω", "8.3 aardlek aanwezig: 166-norm onafhankelijk van automaatkeuze");
// rcdAanwezig false → foutstroom-norm (Z_max) geldt op Z L-PE
bevat(gk({ rcdAanwezig:false, hoogstKar:"C", hoogstAmpere:"16", zlpe:"200" }),
  "Z L-PE 200Ω boven Z_max", "8.4 GEEN aardlek: Z L-PE 200 → foutstroom-norm (Z_max 1,44) → rood");
bevatNiet(gk({ rcdAanwezig:false, hoogstKar:"C", hoogstAmpere:"16", zlpe:"200" }),
  "boven 166Ω", "8.5 GEEN aardlek: 166-norm wordt NIET toegepast");
// Foutstroom-norm 'nadert maximum' (>90%): zMax C16=1,44 → 90% = 1,296 ; 1,40 zit ertussen
eq(niveauVan(gk({ rcdAanwezig:false, hoogstKar:"C", hoogstAmpere:"16", zlpe:"1.40" }), "nadert maximum"), "orange",
  "8.6 GEEN aardlek: Z L-PE 1,40 (>90% van 1,44) → oranje 'nadert maximum'");

// ═════════════════════════════════════════════════════════════════════════════
console.log("▶ CATEGORIE 9: TT-stelsel wordt NU óók op Z_max getoetst (regressie)");
// ═════════════════════════════════════════════════════════════════════════════
// Vroeger werd de Z-check bij TT volledig overgeslagen. Nu geldt de foutstroom-norm ook bij TT.
bevat(gk({ stelsel:"TT", hoogstKar:"C", hoogstAmpere:"16", zln:"5.0" }),
  "Z L-N 5Ω boven Z_max", "9.1 TT: hoge Z L-N wordt NU wél gemeld (was eerder overgeslagen)");
bevat(gk({ stelsel:"TT", rcdAanwezig:false, hoogstKar:"C", hoogstAmpere:"16", zlpe:"5.0" }),
  "Z L-PE 5Ω boven Z_max", "9.2 TT zonder aardlek: hoge Z L-PE wordt NU wél gemeld");

// ═════════════════════════════════════════════════════════════════════════════
console.log("▶ CATEGORIE 10: Spanning-asymmetrie + visuele inspectiepunten");
// ═════════════════════════════════════════════════════════════════════════════
bevat(gk({ "span_L1/N":"225", "span_L2/N":"230", "span_L3/N":"235" }), "asymmetrie 10", "10.1 225/230/235V (10V) → oranje asymmetrie");
bevatNiet(gk({ "span_L1/N":"228", "span_L2/N":"230", "span_L3/N":"232" }), "asymmetrie", "10.2 228/230/232V (4V) → geen waarschuwing");
bevat(gk({ potentiaalvereffening:"NOK" }), "potentiaalvereffening", "10.3 potentiaalvereffening NOK → rood");
bevat(gk({ beveiligingen:"NOK" }), "Beveiligingen", "10.4 beveiligingen NOK → rood");
aantalWarnings(gk({ beschermingscontacten:"OK", potentiaalvereffening:"OK", leidingberekeningen:"OK", beveiligingen:"OK" }), 0,
  "10.5 alle inspectiepunten OK → geen waarschuwing");

// ═════════════════════════════════════════════════════════════════════════════
console.log("▶ CATEGORIE 11: PV cross-checks (zonnepanelen)");
// ═════════════════════════════════════════════════════════════════════════════
bevat(pvCrossChecks([{ iso:"0,8" }], {}, {}), "ONDER NORM", "11.1 string ISO 0,8 → onder 1 MΩ → rood");
eq(niveauVan(pvCrossChecks([{ iso:"1,2" }], {}, {}), "net boven minimum"), "orange", "11.2 string ISO 1,2 → oranje 'net boven minimum'");
aantalWarnings(pvCrossChecks([{ iso:"2,0" }], {}, {}), 0, "11.3 string ISO 2,0 → geen waarschuwing");
bevat(pvCrossChecks([{ spanning:"400" },{ spanning:"360" }], {}, {}), "Stringspanning verschil 40", "11.4 stringspanning 400/360 (40V) → oranje");
bevat(pvCrossChecks([], {}, { aantalPanelen:"20", paneelWp:"400", omvormerKw:"5" }), "DC/AC ratio 1.60 is hoog", "11.5 8000Wp/5kW = 1,6 → oranje hoge ratio");
bevat(pvCrossChecks([], { aardingOk:"NOK" }, {}), "Aarding draagconstructie NOK", "11.6 aarding NOK → rood");
aantalWarnings(pvCrossChecks([{ spanning:"400", iso:"5,0" },{ spanning:"398", iso:"4,8" }], { aardingOk:"OK" }, { aantalPanelen:"20", paneelWp:"400", omvormerKw:"6" }), 0,
  "11.7 nette PV-installatie → geen waarschuwing");

// ═════════════════════════════════════════════════════════════════════════════
console.log("▶ CATEGORIE 12: Integratie — schone oplevering vs meervoudig defect");
// ═════════════════════════════════════════════════════════════════════════════
// Schone 1-fase oplevering: aardlek aanwezig (default), Z L-PE < 166, Z L-N < Z_max, ISO ruim boven norm.
const sOK = gk(
  {
    stelsel:"TN-C-S", kastType:"klasse2",
    hoogstKar:"B", hoogstAmpere:"25",           // Z_max = 1,84Ω
    zln:"0.5", zlpe:"0.6",                        // ruim onder norm (166 / 1,84)
    isoTotFA:"1.8", isoTotNA:"1.7",
    "span_L1/N":"230",
    beschermingscontacten:"OK", potentiaalvereffening:"OK", leidingberekeningen:"OK", beveiligingen:"OK",
  },
  [ ag({ id:1, naam:"Aardlek A", rcdType:"A", rcdMa:"30",
        eindgroepen:[{id:11,naam:"Licht",kar:"B",ampere:"16A"},{id:12,naam:"WCD",kar:"B",ampere:"16A"}], hoogstId:12 }),
    ag({ id:2, naam:"Aardlek B", rcdType:"A", rcdMa:"30",
        eindgroepen:[{id:21,naam:"Keuken",kar:"B",ampere:"16A"}], hoogstId:21 }) ],
  { "1_dt":"175", "1_di":"22", "1_testknop":"OK", "2_dt":"180", "2_di":"20", "2_testknop":"OK" }
);
aantalWarnings(sOK, 0, "12.1 Schone oplevering → 0 waarschuwingen");

// Meervoudig defect: ISO totaal te laag, ΔT te hoog, ΔI te hoog, Testknop NOK, Z L-N te hoog,
// Z L-PE > 166 (aardlek aanwezig), potentiaalvereffening NOK.
const sKapot = gk(
  {
    stelsel:"TN-C-S", kastType:"klasse2",
    hoogstKar:"B", hoogstAmpere:"25",           // Z_max 1,84Ω
    zln:"2.5", zlpe:"200",
    isoTotFA:"0.10",
    potentiaalvereffening:"NOK",
  },
  [ ag({ id:1, naam:"Aardlek A", rcdType:"A", rcdMa:"30" }) ],
  { "1_dt":"350", "1_di":"50", "1_testknop":"NOK" }
);
bevat(sKapot, "ISO totaal (Fase→Aarde) 0.1", "12.2a defect: ISO totaal onder norm");
bevat(sKapot, "ΔT 350ms boven",               "12.2b defect: ΔT te hoog");
bevat(sKapot, "ΔI 50mA boven norm voor type-A","12.2c defect: ΔI te hoog");
bevat(sKapot, "Testknop RCD geeft NOK",        "12.2d defect: testknop NOK");
bevat(sKapot, "Z L-N 2.5Ω boven Z_max",        "12.2e defect: Z L-N te hoog");
bevat(sKapot, "Z L-PE 200Ω boven 166Ω",        "12.2f defect: Z L-PE boven aanraakspanningsnorm");
bevat(sKapot, "potentiaalvereffening",         "12.2g defect: potentiaalvereffening NOK");

// ═════════════════════════════════════════════════════════════════════════════
console.log("\n═══════════════════════════════════════════════");
console.log(`RESULTAAT: ${passed} geslaagd · ${failed} mislukt · ${passed + failed} totaal`);
console.log("═══════════════════════════════════════════════");
if (failures.length > 0) {
  console.log("\n⚠️  MISLUKTE TESTS:");
  failures.forEach(f => console.log("  " + f));
  process.exit(1);
} else {
  console.log("\n✅ Alle tests geslaagd — norm-validatie v2026-08-01-A is correct geïmplementeerd");
  process.exit(0);
}
