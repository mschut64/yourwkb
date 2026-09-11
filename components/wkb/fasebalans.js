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

import { toNum, GELIJKTIJDIGHEID, GROTE_VERBRUIKERS_MKP, FASE_RESERVE_KW } from "./model.js";

export const FASEN = ["L1", "L2", "L3"];

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

const isGroot = (t) => GROTE_VERBRUIKERS_MKP.includes(String(t || "").trim().toLowerCase());

// De fasenummers van een groep, volgens spec v0.2 §4.4. `fn` is leidend; zonder
// `fn` is alleen bij een driefasegroep zeker waar hij hangt — namelijk overal.
function fasenVan(g, aantalFasen) {
  if (aantalFasen === 1) return [1];
  if (Array.isArray(g.fn) && g.fn.length) {
    return g.fn.map(Number).filter((n) => n >= 1 && n <= 3);
  }
  if (toNum(g.f) === 3) return [1, 2, 3];
  return [];
}

/**
 * @param grp        groepen in paspoortvorm (spec v0.2 §4.4)
 * @param ha         hoofdaansluiting { f, a }
 * @param lbAan      gezamenlijke load balancing aanwezig
 * @param meting     optioneel { L1, L2, L3, bron, label } — gemeten piek in kW
 * @param pvTelling  "nul" | "negatief" | "positief"
 */
export function faseBalans({ grp, ha, lbAan, meting, pvTelling = "nul" } = {}) {
  const aantalFasen = toNum(ha && ha.f) === 3 ? 3 : 1;
  const ampere = toNum(ha && ha.a);
  if (!(ampere > 0)) return null;

  const fasen = aantalFasen === 3 ? FASEN : ["L1"];
  const capaciteit = (ampere * 230) / 1000; // per fase
  const lijst = Array.isArray(grp) ? grp : [];

  // Mét gezamenlijke sturing vervalt de korting. Load balancing is een
  // software-instelling en geen veiligheidsmaatregel — de installatie moet ook
  // bij falende sturing kloppen, en dan is vol vermogen de veilige kant.
  const factor = lbAan === true ? 1 : GELIJKTIJDIGHEID;

  const groot = { L1: 0, L2: 0, L3: 0 };
  const gewoon = { L1: 0, L2: 0, L3: 0 };
  const aantal = { L1: 0, L2: 0, L3: 0 };
  let onbekendKw = 0, onbekendAantal = 0;

  for (const g of lijst) {
    let kw = toNum(g && g.kw);
    if (!(kw > 0)) continue;

    if ((g.rol || "af") === "voed") {
      if (pvTelling === "nul") continue;
      if (pvTelling === "negatief") kw = -kw;
      // "positief": onveranderd meetellen
    }

    const nummers = fasenVan(g, aantalFasen);
    if (!nummers.length) { onbekendKw += kw; onbekendAantal += 1; continue; }

    const perFase = kw / nummers.length;
    for (const n of nummers) {
      const f = FASEN[n - 1];
      (isGroot(g.t) ? groot : gewoon)[f] += perFase;
      aantal[f] += 1;
    }
  }

  const gemeten = meting && ["L1", "L2", "L3"].some((f) => toNum(meting[f]) > 0);

  const rijen = fasen.map((f) => {
    // Bij een GEMETEN basisbelasting gaat de gelijktijdigheidsfactor er niet
    // overheen: wat de meter zag liep werkelijk tegelijk, dus de gelijktijdigheid
    // zit er al in. Hem er nogmaals overheen leggen strijkt 40% van een echte
    // meting weg — de verkeerde kant op voor een conservatieve toets.
    const belasting = gemeten ? toNum(meting[f]) : gewoon[f] + groot[f] * factor;
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
      aantal: aantal[f],
      groot: groot[f],
      gewoon: gewoon[f],
    };
  });

  const zwaarte = { ok: 0, "let-op": 1, afwijking: 2 };
  const ergste = rijen.reduce((b, r) => (zwaarte[r.niveau] > zwaarte[b.niveau] ? r : b), rijen[0]);
  const beste = rijen.reduce((b, r) => (r.vrijKw > b.vrijKw ? r : b), rijen[0]);

  return {
    rijen,
    bron: gemeten ? "gemeten" : "geschat",
    label: gemeten && meting.label ? meting.label : "indicatie o.b.v. schatting",
    factor: gemeten ? 1 : factor,
    sturing: lbAan === true,
    pvTelling,
    // Hoeveel er NIET is toegerekend omdat de fase onbekend is. Zolang dit boven
    // nul staat is de balans onvolledig, en dat moet zichtbaar zijn in plaats van
    // verstopt in een te gunstige uitkomst.
    onbekendKw,
    onbekendAantal,
    volledig: onbekendAantal === 0,
    niveau: ergste ? ergste.niveau : "ok",
    besteFase: beste ? beste.fase : "L1",
  };
}
