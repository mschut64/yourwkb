// ─────────────────────────────────────────────────────────────────────────────
// Van een kastbeeld naar een paspoort — zegt YourWkb hetzelfde over dezelfde kast?
//
// De motor vertaalt modules op een rail naar aardlekgroepen (`aardlekgroepen.js`),
// en deze app vertaalt aardlekgroepen naar het paspoort (`mkp-bouw.js`). Die twee
// vertalingen staan los van elkaar en kunnen dus uit elkaar lopen — precies het
// patroon dat `faseBalans` en `belastingcheck` tussen de twee apps al eens
// overkwam.
//
// Wat hier getoetst wordt is de doorgang: een kast die via de fotoketen
// binnenkomt, moet in het paspoort staan zoals hij in de kast hangt. Loopt dat
// mis, dan draagt de QR op de kastdeur een andere kast dan de installateur ziet.
//
// De toets is nadrukkelijk op wat BEIDE kanten zeggen — type, rol, aantal fasen
// en fasenummers. Vermogen en materiaal komen elders vandaan en vallen erbuiten.
//
// Voer uit met:  node tests/test-kastbeeld-naar-groepen.js
// ─────────────────────────────────────────────────────────────────────────────

import {
  normaliseerAnalyse, koppelGroepenverklaring, aardlekgroepenUitPosities,
  isGroepsoort, isMeerpolig, mkpType, blokIndeling,
} from "yourwkb-core";
import { mkpBouw } from "../components/wkb/mkp-bouw.js";

let passed = 0, failed = 0;
const failures = [];
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; failures.push(`❌ ${label}\n     verwacht: ${e}\n     kreeg:    ${a}`); }
}

// Een kast met alles wat er mis kan gaan: een stop, een driefasige laadpaal
// achter een meerpolige aardlek, zonnepanelen (die leveren in plaats van af te
// nemen) en een gewone groep.
const RUW = { posities: [
  { rail: 1, positie: 0, breedteModules: 3, soort: "hoofdschakelaar", In: 40, polen: 4, zekerheid: 0.95 },
  { rail: 1, positie: 3, breedteModules: 2, soort: "aardlek", IAn: 30, aardlektype: "A", polen: 2, zekerheid: 0.9 },
  { rail: 1, positie: 5, breedteModules: 1, soort: "automaat", karakteristiek: "B", In: 16, polen: 1, groepstekst: "1", zekerheid: 0.9 },
  { rail: 1, positie: 6, breedteModules: 1, soort: "automaat", karakteristiek: "B", In: 20, polen: 1, groepstekst: "2", zekerheid: 0.9 },
  { rail: 1, positie: 7, breedteModules: 1, soort: "smeltveiligheid", In: 16, polen: 1, groepstekst: "3", zekerheid: 0.9 },
  { rail: 1, positie: 8, breedteModules: 2, soort: "aardlek", IAn: 30, aardlektype: "B", polen: 4, zekerheid: 0.9 },
  { rail: 1, positie: 10, breedteModules: 3, soort: "automaat", karakteristiek: "C", In: 16, polen: 3, groepstekst: "4", zekerheid: 0.9 },
] };
const VERKLARING = ["1 — Keuken", "2 — Kookplaat", "3 — Zonnepanelen", "4 — Laadpaal"];

const POSITIES = koppelGroepenverklaring(normaliseerAnalyse(RUW, "v1"), VERKLARING).posities;
const GROEPEN = aardlekgroepenUitPosities(POSITIES, { bron: "foto" });
const PASPOORT = mkpBouw({ postcode: "2691 JJ", huisnummer: "72", aardlekgroepen: GROEPEN,
                           instMetingen: { hoofdzekering: "25", zDrieFase: true } }, "groepenkast");

// Wat de kast zélf zegt, rechtstreeks uit de posities gelezen. Dit is de
// maatstaf: niet een tweede implementatie, maar de bron waar beide vertalingen
// vandaan komen.
const UIT_DE_KAST = blokIndeling(POSITIES).flatMap((blok) =>
  (blok.posities || []).map((p) => ({
    t: mkpType(p.functie) === "wp" ? "alg" : (["kook","pv","lp","bat","ov"].includes(mkpType(p.functie)) ? mkpType(p.functie) : "alg"),
    rol: ["pv", "bat"].includes(mkpType(p.functie)) ? "voed" : "af",
    f: blok.aardlek && isMeerpolig(blok.aardlek) ? 3 : 1,
  }))
);

console.log("▶ CATEGORIE 1: elke groep uit de kast komt in het paspoort");
eq(POSITIES.filter((p) => isGroepsoort(p.soort)).length, 4, "1.1 vier groepen in de kast");
eq(GROEPEN.flatMap((g) => g.eindgroepen).length, 4, "1.2 vier eindgroepen na de vertaling");
// Een thuisbatterij levert twee paspoortregels; die zit hier niet in, dus vier.
eq(PASPOORT.grp.length, 4, "1.3 en vier regels in het paspoort");

console.log("▶ CATEGORIE 2: het paspoort beschrijft dezelfde kast");
eq(PASPOORT.grp.map((g) => g.t), UIT_DE_KAST.map((g) => g.t), "2.1 het type per groep");
eq(PASPOORT.grp.map((g) => g.rol), UIT_DE_KAST.map((g) => g.rol), "2.2 de rol — wie levert en wie neemt af");
eq(PASPOORT.grp.map((g) => g.f), UIT_DE_KAST.map((g) => g.f), "2.3 het aantal fasen per groep");

console.log("▶ CATEGORIE 3: de laadpaal achter de meerpolige aardlek");
{
  const lp = PASPOORT.grp.find((g) => g.t === "lp");
  eq(!!lp, true, "3.1 de laadpaal is als laadgroep herkend");
  eq(lp.f, 3, "3.2 en staat op drie fasen, want zijn aardlek is meerpolig");
  eq(lp.fn, [1, 2, 3], "3.3 met alle drie de fasenummers");
  eq(lp.n, "Laadpaal", "3.4 en de naam van de kastdeur");
}

console.log("▶ CATEGORIE 4: de zonnepanelen leveren");
{
  const pv = PASPOORT.grp.find((g) => g.t === "pv");
  eq(!!pv, true, "4.1 zonnepanelen zijn als PV-groep herkend");
  eq(pv.rol, "voed", "4.2 met de voedende rol — anders telt teruglevering nergens mee");
}

console.log("▶ CATEGORIE 5: geen gegokte fase in de QR");
{
  // Uit een kastfoto komt geen L1/L2/L3. De eenfasige groepen mogen dus geen
  // `fn` krijgen: een gegokte fase is schadelijker dan een ontbrekende, want de
  // fasebalans bouwt erop voort.
  const eenfasig = PASPOORT.grp.filter((g) => g.f === 1);
  eq(eenfasig.length > 0, true, "5.1 er zijn eenfasige groepen");
  eq(eenfasig.some((g) => "fn" in g), false, "5.2 en geen ervan draagt een fasenummer");
}

console.log("▶ CATEGORIE 6: de stop blijft een stop");
{
  const stop = GROEPEN.flatMap((g) => g.eindgroepen).find((e) => e.naam === "Zonnepanelen");
  eq(stop.kar, "gG", "6.1 de smeltveiligheid houdt gG tot in de groepenlijst");
}

console.log("\n═══════════════════════════════════════════════");
console.log(`RESULTAAT: ${passed} geslaagd · ${failed} mislukt · ${passed + failed} totaal`);
console.log("═══════════════════════════════════════════════");
if (failures.length) {
  console.log("\n⚠️  MISLUKTE TESTS:");
  failures.forEach((f) => console.log(f));
  process.exit(1);
}
