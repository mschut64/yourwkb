// ─────────────────────────────────────────────────────────────────────────────
// Fasebalans — de belasting per fase
//
// Kernregel: fasecompensatie is boekhouding, stroom is fysiek. De slimme meter
// saldeert over drie fasen, de hoofdzekering niet. Drie groepen die toevallig
// allemaal op L2 zitten kunnen die fase overbelasten terwijl de meter netjes
// binnen de grenzen lijkt te blijven. Dus PER FASE rekenen.
//
// Overgenomen uit Kastscan (components/kastscan/model.js › faseBalans), waar
// deze boekhouding is gebouwd en met tests vastgelegd. Twee dingen bewust
// anders gedaan:
//
//   1. De invoer is de `grp[]` uit het meterkastpaspoort, niet het interne
//      datamodel van één app. Kastscan denkt in modules op een DIN-rail, YourWkb
//      in aardlekgroepen met eindgroepen — maar béíde bouwen een paspoort, en
//      daarin staat precies wat een fasebalans nodig heeft: type, rol, vermogen
//      en fasenummers. Daarmee is deze module deelbaar zonder vertaallaag, en
//      sluit hij naadloos aan op een P1-meting, die dezelfde vraag beantwoordt
//      met gemeten waarden.
//
//   2. Groepen met een ONBEKENDE fase worden apart geteld én opgeteld in kW, niet
//      stilzwijgend overgeslagen. Anders lijkt een kast waarvan de helft niet is
//      toegewezen ten onrechte licht belast. Dat getal is bovendien precies wat
//      de installateur motiveert om de aardlek-proef te doen.
//
// Deze module hoort NIET in het meterkastpaspoort-pakket: dat beschrijft een
// formaat en moet normneutraal blijven. Hier zitten Nederlandse normkeuzes in
// (230 V, gelijktijdigheid 0,6 uit NEN-EN-IEC 61439) en productkeuzes (de
// reserve). Zodra Kastscan hem ook gebruikt, verhuist hij naar een eigen
// gedeeld pakket — de vorm is daar al op gemaakt.
// ─────────────────────────────────────────────────────────────────────────────

import { toNum, FASE_RESERVE_KW, FASEN, belastingPerFase } from "./model.js";

export { FASEN };

// ─── De open normvraag: telt teruglevering mee als belasting? ────────────────
//
// Hier lopen drie bronnen uiteen, en dat is niet opgelost:
//
//   "nul"       Voedende groepen tellen niet mee. Het ongunstigste geval is geen
//               zon en een lege accu. Zo rekent YourWkb sinds v2026-09-03-A.
//   "negatief"  Teruglevering verlaagt de belasting. Zo rekent Kastscan
//               (INDICATIEF_KW["zonnepanelen"] = -3,0).
//   "positief"  Teruglevering belast de hoofdzekering net zo goed — de stroom
//               loopt er doorheen, richting daargelaten. Zo staat het in het
//               voorstel van augustus.
//
// Geen van drie toetst het geval dat fysiek het zwaarst kan zijn: maximale
// teruglevering zonder gelijktijdig verbruik. "positief" komt daar het dichtst
// bij. De keuze is aan Martin en Herman; daarom een parameter met de huidige
// YourWkb-gedragsregel als default, en niet een stilzwijgend besluit in code.
export const PV_TELLING = ["nul", "negatief", "positief"];

/**
 * @param grp        groepen in paspoortvorm (spec v0.2 §4.4)
 * @param ha         hoofdaansluiting { f, a }
 * @param lbAan      gezamenlijke load balancing aanwezig
 * @param meting     optioneel { L1, L2, L3, bron, label } — gemeten piek in kW
 * @param pvTelling  "nul" | "negatief" | "positief"
 */
export function faseBalans({ grp, ha, lbAan, meting, pvTelling = "nul" } = {}) {
  const ampere = toNum(ha && ha.a);
  if (!(ampere > 0)) return null;

  const capaciteit = (ampere * 230) / 1000; // per fase
  // De optelling per fase staat in model.js, zodat de belastingcheck en deze
  // balans met dezelfde getallen werken. Wat hier bovenop komt is de capaciteit,
  // de reserve, het oordeel en het advies.
  const pf = belastingPerFase(grp, ha, lbAan, pvTelling);
  const gemeten = meting && FASEN.some((f) => toNum(meting[f]) > 0);

  const rijen = pf.fasen.map((f) => {
    // Bij een GEMETEN basisbelasting gaat de gelijktijdigheidsfactor er niet
    // overheen: wat de meter zag liep werkelijk tegelijk, dus de gelijktijdigheid
    // zit er al in. Hem er nogmaals overheen leggen strijkt 40% van een echte
    // meting weg — de verkeerde kant op voor een conservatieve toets.
    const belasting = gemeten ? toNum(meting[f]) : pf.belasting[f];
    const bezet = capaciteit > 0 ? belasting / capaciteit : 0;
    return {
      fase: f,
      capaciteitKw: capaciteit,
      belastingKw: belasting,
      // De reserve gaat van de vrije ruimte af, niet bij de belasting op: een
      // week in september zegt niets over januari met een warmtepomp.
      vrijKw: capaciteit - belasting - FASE_RESERVE_KW,
      bezet,
      niveau: bezet > 1 ? "afwijking" : bezet > 0.7 ? "let-op" : "ok",
      aantal: pf.aantal[f],
      groot: pf.groot[f],
      gewoon: pf.gewoon[f],
    };
  });

  const zwaarte = { ok: 0, "let-op": 1, afwijking: 2 };
  const ergste = rijen.reduce((b, r) => (zwaarte[r.niveau] > zwaarte[b.niveau] ? r : b), rijen[0]);
  const beste = rijen.reduce((b, r) => (r.vrijKw > b.vrijKw ? r : b), rijen[0]);

  return {
    rijen,
    bron: gemeten ? "gemeten" : "geschat",
    label: gemeten && meting.label ? meting.label : "indicatie o.b.v. schatting",
    factor: gemeten ? 1 : pf.factor,
    sturing: lbAan === true,
    pvTelling,
    // Hoeveel er NIET is toegerekend omdat de fase onbekend is. Zolang dit boven
    // nul staat is de balans onvolledig, en dat moet zichtbaar zijn in plaats van
    // verstopt in een te gunstige uitkomst.
    onbekendKw: pf.onbekendKw,
    onbekendAantal: pf.onbekendAantal,
    volledig: pf.onbekendAantal === 0,
    niveau: ergste ? ergste.niveau : "ok",
    besteFase: beste ? beste.fase : "L1",
  };
}
