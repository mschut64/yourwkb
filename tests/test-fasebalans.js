// ─────────────────────────────────────────────────────────────────────────────
// Fasebalans — testsuite
//
// Hier hangt advies aan: "waar komt de uitbreiding het beste" en "staan de fasen
// scheef". Een fout hier leidt niet tot een zichtbare storing maar tot een
// verkeerd advies, en dat is erger — niemand merkt het tot de zekering eruit
// vliegt.
//
// Voer uit met:  node tests/test-fasebalans.js
// ─────────────────────────────────────────────────────────────────────────────

import { faseBalans, FASEN } from "../components/wkb/fasebalans.js";
import { GELIJKTIJDIGHEID, FASE_RESERVE_KW } from "../components/wkb/model.js";

let passed = 0, failed = 0;
const failures = [];
function eq(actual, expected, label) {
  const gelijk = typeof expected === "number" && typeof actual === "number"
    ? Math.abs(actual - expected) < 0.001
    : JSON.stringify(actual) === JSON.stringify(expected);
  if (gelijk) passed++;
  else { failed++; failures.push(`❌ ${label}\n     verwacht: ${JSON.stringify(expected)}\n     kreeg:    ${JSON.stringify(actual)}`); }
}
const rij = (b, f) => b.rijen.find((r) => r.fase === f);
const ha3 = { f: 3, a: 25 };  // 5,75 kW per fase
const ha1 = { f: 1, a: 25 };

console.log("▶ CATEGORIE 1: capaciteit en de kern van het verhaal");

const leeg = faseBalans({ grp: [], ha: ha3 });
eq(leeg.rijen.length, 3, "1.1 drie fasen bij een 3-fase aansluiting");
eq(rij(leeg, "L1").capaciteitKw, 5.75, "1.2 capaciteit per fase is A x 230 V");
eq(faseBalans({ grp: [], ha: ha1 }).rijen.length, 1, "1.3 één fase bij 1-fase aansluiting");
eq(faseBalans({ grp: [], ha: { f: 3, a: 0 } }), null, "1.4 zonder hoofdzekering valt er niets te toetsen");

// DIT is waarom de Fasecheck bestaat. Drie zware groepen op één fase: het
// TOTAAL past ruim binnen 3 x 25 A, maar L2 loopt over. Een toets op het totaal
// ziet dit niet, een toets per fase wel.
const alleOpL2 = [
  { t: "kook", rol: "af", kw: 7.4, f: 1, fn: [2] },
  { t: "wp",   rol: "af", kw: 6.9, f: 1, fn: [2] },
];
const scheef = faseBalans({ grp: alleOpL2, ha: ha3 });
eq(rij(scheef, "L2").belastingKw, (7.4 + 6.9) * GELIJKTIJDIGHEID, "1.5 beide groepen op L2, met factor");
eq(rij(scheef, "L1").belastingKw, 0, "1.6 L1 draagt niets");
eq(rij(scheef, "L2").niveau, "afwijking", "1.7 L2 loopt over");
eq(scheef.niveau, "afwijking", "1.8 het oordeel volgt de zwaarst belaste fase");
eq(scheef.besteFase, "L1", "1.9 beste fase voor iets nieuws");
// Ter contrast: opgeteld over de hele aansluiting zou dit ruim passen.
eq((7.4 + 6.9) * GELIJKTIJDIGHEID < 3 * 5.75, true, "1.10 hetzelfde totaal past wél op de hele aansluiting");

console.log("▶ CATEGORIE 2: gelijktijdigheid en load balancing");

const eenGroot = [{ t: "lp", rol: "af", kw: 11, f: 1, fn: [1] }];
eq(rij(faseBalans({ grp: eenGroot, ha: ha3 }), "L1").belastingKw, 11 * GELIJKTIJDIGHEID,
   "2.1 grote verbruiker krijgt de factor 0,6");
eq(rij(faseBalans({ grp: eenGroot, ha: ha3, lbAan: true }), "L1").belastingKw, 11,
   "2.2 mét sturing vervalt de korting — vol vermogen is de veilige kant");

// Een gewone groep is geen grote verbruiker en krijgt de korting niet.
const gewoon = [{ t: "alg", rol: "af", kw: 2, f: 1, fn: [1] }];
eq(rij(faseBalans({ grp: gewoon, ha: ha3 }), "L1").belastingKw, 2, "2.3 gewone groep telt vol mee");

// Driefasegroep verdeelt zich over drie fasen.
const drie = [{ t: "lp", rol: "af", kw: 11, f: 3, fn: [1, 2, 3] }];
const b3 = faseBalans({ grp: drie, ha: ha3 });
eq(rij(b3, "L1").belastingKw, (11 / 3) * GELIJKTIJDIGHEID, "2.4 driefasegroep gelijk over drie fasen");
eq(rij(b3, "L3").belastingKw, (11 / 3) * GELIJKTIJDIGHEID, "2.5 ook op L3");

console.log("▶ CATEGORIE 3: gemeten belasting (P1)");

// De kern van stap 1, nu per fase: op een GEMETEN piek gaat de factor niet.
const meting = { L1: 4.2, L2: 1.1, L3: 0.8, bron: "gemeten", label: "gemeten over 7 dagen" };
const gemeten = faseBalans({ grp: eenGroot, ha: ha3, meting });
eq(rij(gemeten, "L1").belastingKw, 4.2, "3.1 gemeten piek wordt onverkort overgenomen");
eq(gemeten.bron, "gemeten", "3.2 bron is gemeten");
eq(gemeten.factor, 1, "3.3 geen gelijktijdigheidsfactor over een meting");
eq(gemeten.label, "gemeten over 7 dagen", "3.4 het label komt uit de meting");
eq(rij(gemeten, "L1").belastingKw !== 4.2 * GELIJKTIJDIGHEID, true,
   "3.5 regressie: een gemeten piek wordt nooit met 0,6 vermenigvuldigd");

// Zonder bruikbare meting wint de schatting — een halve week mag niet als
// "gemeten" door het leven gaan.
eq(faseBalans({ grp: eenGroot, ha: ha3, meting: { L1: 0, L2: 0, L3: 0 } }).bron, "geschat",
   "3.6 meting zonder waarden valt terug op schatting");
eq(faseBalans({ grp: eenGroot, ha: ha3, meting: null }).bron, "geschat", "3.7 geen meting");
eq(faseBalans({ grp: eenGroot, ha: ha3 }).label, "indicatie o.b.v. schatting", "3.8 label bij schatting");

console.log("▶ CATEGORIE 4: onbekende fase wordt niet verzwegen");

const halfBekend = [
  { t: "kook", rol: "af", kw: 7.4, f: 1, fn: [1] },
  { t: "wp",   rol: "af", kw: 6.9, f: 1 },            // geen fn: fase onbekend
];
const half = faseBalans({ grp: halfBekend, ha: ha3 });
eq(half.onbekendKw, 6.9, "4.1 niet-toegerekend vermogen wordt opgeteld");
eq(half.onbekendAantal, 1, "4.2 en geteld");
eq(half.volledig, false, "4.3 de balans is onvolledig");
eq(rij(half, "L1").belastingKw, 7.4 * GELIJKTIJDIGHEID, "4.4 alleen de bekende groep is toegerekend");
eq(faseBalans({ grp: [halfBekend[0]], ha: ha3 }).volledig, true, "4.5 volledig als alles bekend is");

// Bij een 1-fase aansluiting is de fase per definitie bekend.
eq(faseBalans({ grp: halfBekend, ha: ha1 }).volledig, true, "4.6 op 1-fase valt niets te verdelen");

console.log("▶ CATEGORIE 5: vrije ruimte en reserve");

const vrij = faseBalans({ grp: [{ t: "kook", rol: "af", kw: 5, f: 1, fn: [1] }], ha: ha3 });
eq(rij(vrij, "L1").vrijKw, 5.75 - 5 * GELIJKTIJDIGHEID - FASE_RESERVE_KW,
   "5.1 vrije ruimte is capaciteit min belasting min reserve");
eq(rij(vrij, "L2").vrijKw, 5.75 - FASE_RESERVE_KW, "5.2 lege fase houdt de reserve over");
eq(vrij.besteFase !== "L1", true, "5.3 de belaste fase is niet de beste keuze");

console.log("▶ CATEGORIE 6: drempels");

const bij = (kw) => faseBalans({ grp: [{ t: "alg", rol: "af", kw, f: 1, fn: [1] }], ha: ha3 });
eq(rij(bij(4.0), "L1").niveau, "ok", "6.1 4,0 van 5,75 kW (70%) is nog ok");
eq(rij(bij(4.1), "L1").niveau, "let-op", "6.2 net boven 70% is let-op");
eq(rij(bij(5.75), "L1").niveau, "let-op", "6.3 precies vol is nog geen afwijking");
eq(rij(bij(5.8), "L1").niveau, "afwijking", "6.4 erboven is afwijking");

console.log("▶ CATEGORIE 7: teruglevering telt mee, maar telt niet op");
// Besluit Martin 12-09-2026: "teruglevering telt positief mee, stroom is stroom
// — let wel op dat eigengebruik binnen de meter blijft en niet de fasen zal
// raken." Dus per fase de zwaarste van twee richtingen, niet hun som.

const metPv = [{ t: "pv", rol: "voed", kw: 4, f: 1, fn: [1] }];
eq(rij(faseBalans({ grp: metPv, ha: ha3 }), "L1").belastingKw, 4,
   "7.1 teruglevering belast de zekering net zo goed als afname");
// Op de voedende kant gaat geen gelijktijdigheidsfactor: de zon schijnt op alle
// panelen tegelijk. Spec § kam spreekt van "de som van de voedende groepen".
eq(rij(faseBalans({ grp: metPv, ha: ha3 }), "L1").belastingKw !== 4 * GELIJKTIJDIGHEID, true,
   "7.2 geen 0,6 over teruglevering");

// DE KERN VAN HET BESLUIT. 4 kW PV en 3 kW verbruik op dezelfde fase is geen
// 7 kW: wat de panelen leveren en de wasmachine opneemt loopt over de kam van de
// ene groep naar de andere en passeert de hoofdzekering nooit. Het zwaarste
// moment is volle zon zonder verbruik — 4 kW.
{
  const beide = [...metPv, { t: "alg", rol: "af", kw: 3, f: 1, fn: [1] }];
  const r = rij(faseBalans({ grp: beide, ha: ha3 }), "L1");
  eq(r.belastingKw, 4, "7.3 eigengebruik telt niet op bij de teruglevering");
  eq(r.belastingKw !== 4 + 3, true, "7.4 regressie: nooit de som van twee richtingen");
  eq(r.afnameKw, 3, "7.5 de afnamekant blijft apart zichtbaar");
  eq(r.voeding, 4, "7.6 en de voedende kant ook");
  eq(r.richting, "voed", "7.7 de teruglevering bepaalt deze fase");
}
// Meer verbruik dan opwek: dan bepaalt de afname weer.
{
  const meerAf = [...metPv, { t: "alg", rol: "af", kw: 5, f: 1, fn: [1] }];
  const r = rij(faseBalans({ grp: meerAf, ha: ha3 }), "L1");
  eq(r.belastingKw, 5, "7.8 de zwaarste richting wint, hier de afname");
  eq(r.richting, "af", "7.9 en dat staat er ook bij");
}
eq(FASEN, ["L1", "L2", "L3"], "7.10 fasenamen gelijk aan Kastscan");

console.log("\n═══════════════════════════════════════════════");
console.log(`RESULTAAT: ${passed} geslaagd · ${failed} mislukt · ${passed + failed} totaal`);
console.log("═══════════════════════════════════════════════");
if (failures.length) {
  console.log("\n⚠️  MISLUKTE TESTS:");
  failures.forEach(f => console.log("  " + f));
  process.exit(1);
}
console.log("\n✅ De fasebalans rekent per fase, zoals de stroom loopt");
