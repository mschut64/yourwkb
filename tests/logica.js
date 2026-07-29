// ─────────────────────────────────────────────────────────────────────────────
// YourWkb — Pure logica module (AUTO-GEGENEREERD — NIET HANDMATIG BEWERKEN)
// Gegenereerd uit: WkbApp-v2026-07-29-A.jsx
// Op: 2026-07-29 08:48:33
// Draai 'node extract-logica.js <WkbApp.jsx>' opnieuw na elke wijziging aan de
// norm-validatie in de app. De regressietest (test.js) draait hier direct op.
// ─────────────────────────────────────────────────────────────────────────────

// Robuuste numerieke parser — accepteert zowel komma als punt als decimaalteken.
// Zonder deze fix leest parseFloat("1,9") als 1 (stopt bij de komma) — dat veroorzaakte
// foutieve "Afwijking" meldingen bij correct ingevoerde waarden.
const toNum = v => {
  if (v === null || v === undefined || v === "") return NaN;
  return parseFloat(String(v).replace(",", "."));
};

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────

// ── gG-smeltzekering (trage patroon, D-patronen) — tijd-stroomkromme tabel ──
// In tegenstelling tot B/C/D-automaten (vaste factor × In) heeft een gG-zekering
// een niet-lineaire tijd-stroomkromme: de vereiste uitschakelstroom (Ia) per
// stroomwaarde moet per In en per tijdsduur worden opgezocht, niet berekend met
// een simpele factor. Bron: door Martin aangeleverde tabel "D-patronen Traag gG".
// Kolommen komen exact overeen met de vier afschakeltijden die de app al
// gebruikt (kastklasse × stelsel: Klasse1 TN=5s/TT=1s, Klasse2 TN=0,4s/TT=0,2s).
const GG_TABEL = {
  2: {
    5: 5.6,
    1: 6.6,
    0.4: 7.5,
    0.2: 8.3
  },
  4: {
    5: 11.1,
    1: 14.2,
    0.4: 15.7,
    0.2: 17.5
  },
  6: {
    5: 17.1,
    1: 22.0,
    0.4: 26.7,
    0.2: 33.7
  },
  10: {
    5: 39.4,
    1: 50.0,
    0.4: 58.8,
    0.2: 67.1
  },
  16: {
    5: 53.1,
    1: 73.3,
    0.4: 90.0,
    0.2: 110.5
  },
  // 20A/0,2s gecorrigeerd naar 153,3A (was 43,3 — fout in brontabel, gecorrigeerd
  // door Martin op 28-7-2026 via 230/1,5 = 153,3, consistent met de stijgende
  // trend van de rest van de rij).
  20: {
    5: 75.7,
    1: 105.3,
    0.4: 130.0,
    0.2: 153.3
  },
  25: {
    5: 92.0,
    1: 131.6,
    0.4: 164.3,
    0.2: 196.4
  },
  35: {
    5: 139.5,
    1: 196.4,
    0.4: 260.0,
    0.2: 328.0
  },
  50: {
    5: 206.6,
    1: 307.3,
    0.4: 362.5,
    0.2: 400.0
  },
  63: {
    5: 274.3,
    1: 362.5,
    0.4: 423.8,
    0.2: 486.5
  }
};

const GG_IN_WAARDEN = Object.keys(GG_TABEL).map(Number).sort((a, b) => a - b);

// Zoekt de dichtstbijzijnde In-waarde in de tabel (niet elke stroomwaarde is
// een standaard gG-maat) en geeft de vereiste Ia terug voor de gevraagde tijd.

// Zoekt de dichtstbijzijnde In-waarde in de tabel (niet elke stroomwaarde is
// een standaard gG-maat) en geeft de vereiste Ia terug voor de gevraagde tijd.
function ggIaVoorTijd(ampere, tijd) {
  const amp = toNum(ampere);
  if (isNaN(amp) || amp <= 0) return null;
  const dichtstbij = GG_IN_WAARDEN.reduce((best, cur) => Math.abs(cur - amp) < Math.abs(best - amp) ? cur : best, GG_IN_WAARDEN[0]);
  const rij = GG_TABEL[dichtstbij];
  if (!rij || rij[tijd] === undefined) return null;
  return {
    ia: rij[tijd],
    inGebruikt: dichtstbij
  };
}

// Voorgedefinieerde eindgroep-categorieën — snelkeuze die de naam automatisch invult.
// Laadgroep/thuisbatterij ook relevant wanneer die via de hoofdgroepenkast gevoed worden
// i.p.v. als losse discipline.

// ─── CROSS-CHECK LOGICA ───────────────────────────────────────────────────────

// Groepenkast cross-checks — werkt op aardlekgroepen (RCD-clusters), elk met 1+ eindgroepen.
// Norm is altijd de "bestaande installatie" norm (1000Ω/V): 0,23 MΩ bij 230V / 0,40 MΩ bij 400V.
// ΔT-norm is afhankelijk van het stelsel (TN of TT) — zie NEN1010 tabel 41.1:
//   TN-eindgroep ≤ 400ms · TT-eindgroep ≤ 200ms
function gkCrossChecks(aardlekgroepen, grpMeet, instMet) {
  const warnings = [];
  const stelsel = instMet.stelsel || "TN-C-S";
  const isTT = stelsel === "TT";
  const dtNorm = 300; // EN 61008: apparaatnorm altijd 300ms bij 1× In, ongeacht stelsel

  // B) ISOLATIEWEERSTAND — ISO totaal is de hoofdmeting (alle groepen aan, hoofdvoeding uit)
  // Twee losse metingen: Fase→Aarde en Nul→Aarde, beide getoetst aan 0,23 MΩ.
  const isoTotFA = toNum(instMet.isoTotFA);
  const isoTotNA = toNum(instMet.isoTotNA);
  if (!isNaN(isoTotFA) && isoTotFA < 0.23) warnings.push({
    level: "red",
    msg: `ISO totaal (Fase→Aarde) ${isoTotFA} MΩ — ONDER NORM (≥0,23 MΩ)`
  });
  if (!isNaN(isoTotNA) && isoTotNA < 0.23) warnings.push({
    level: "red",
    msg: `ISO totaal (Nul→Aarde) ${isoTotNA} MΩ — ONDER NORM (≥0,23 MΩ)`
  });

  // ISO per groep (dynamische lijst) — waarschuw bij een waarde onder de norm.
  (instMet.isoGroepen || []).forEach((g, idx) => {
    const naam = g.naam || `Groep ${idx + 1}`;
    const norm = g.driefase ? 0.40 : 0.23;
    const velden = g.driefase ? [["l1a", "L1→Aarde"], ["l2a", "L2→Aarde"], ["l3a", "L3→Aarde"], ["na", "N→Aarde"]] : [["fa", "Fase→Aarde"], ["na", "Nul→Aarde"]];
    velden.forEach(([k, label]) => {
      const iso = toNum(g[k]);
      if (!isNaN(iso) && iso < norm) warnings.push({
        level: "red",
        msg: `${naam} (${label}): ISO ${iso} MΩ — ONDER NORM (≥${norm} MΩ)`
      });
    });
  });
  (aardlekgroepen || []).forEach(ag => {
    const geenRcd = ag.rcdType === "geen";
    if (!geenRcd) {
      const dt = toNum(grpMeet[`${ag.id}_dt`]);
      if (!isNaN(dt) && dt > dtNorm) warnings.push({
        level: "red",
        msg: `${ag.naam}: ΔT ${dt}ms boven 300ms (EN 61008 apparaatnorm bij 1× In)`
      });

      // ΔI-norm per RCD-type (alleen bovengrens, geen ondergrens — fabrikantwaarden leidend):
      // Type AC: ≤ 1× In | Type A: ≤ 1,4× In (√2 factor pulserend DC) | Type B: ≤ 2× In
      const di = toNum(grpMeet[`${ag.id}_di`]);
      const mA = toNum(ag.rcdMa);
      if (!isNaN(di) && !isNaN(mA)) {
        const diMax = ag.rcdType === "B" ? mA * 2 : ag.rcdType === "AC" ? mA * 1 : mA * 1.4;
        if (di > diMax) warnings.push({
          level: "red",
          msg: `${ag.naam}: ΔI ${di}mA boven norm voor type-${ag.rcdType} (≤${diMax.toFixed(0)}mA bij ${mA}mA RCD)`
        });
      }

      // Testknop NOK betekent dat de RCD niet mechanisch/elektrisch reageert op de
      // ingebouwde testfunctie — dit is een directe afkeuring, RCD moet vervangen worden.
      const testknop = grpMeet[`${ag.id}_testknop`];
      if (testknop === "NOK") warnings.push({
        level: "red",
        msg: `${ag.naam}: Testknop RCD geeft NOK — RCD reageert niet op de testfunctie, vervang de RCD`
      });
    }
  });

  // Spanning asymmetrie
  const l1 = toNum(instMet["span_L1/N"]);
  const l2 = toNum(instMet["span_L2/N"]);
  const l3 = toNum(instMet["span_L3/N"]);
  if (!isNaN(l1) && !isNaN(l2) && !isNaN(l3)) {
    const diff = Math.max(l1, l2, l3) - Math.min(l1, l2, l3);
    if (diff > 6) warnings.push({
      level: "orange",
      msg: `Fasespanning asymmetrie ${diff.toFixed(1)}V — controleer netaansluiting`
    });
  }

  // A) IMPEDANTIE — Z L-N/L-PE check op basis van hoogst afgaande groep (EN 60898/60269)
  // Z_max = 230 / Icc_min. Voor B/C/D: Icc_min = factor × In (B=5, C=10, D=20).
  // Voor gG (trage smeltzekering): Icc_min komt uit de tijd-stroomkromme tabel
  // (GG_TABEL), afhankelijk van de max. afschakeltijd (die zelf weer afhangt van
  // kastklasse × stelsel — zie maxAfschakeltijd-logica). Geldt voor ELK stelsel,
  // dus ook TT — de fysica van de automaat/zekering verandert niet door het stelsel.
  {
    const karFac = {
      B: 5,
      C: 10,
      D: 20
    };
    const vKar = instMet.hoogstKar || "B";
    const vA = toNum(instMet.hoogstAmpere);
    const isKlasse1Chk = instMet.kastType === "klasse1";
    const isTTChk = (instMet.stelsel || "TN-C-S") === "TT";
    const maxAfschakeltijdChk = isKlasse1Chk ? isTTChk ? 1 : 5 : isTTChk ? 0.2 : 0.4;
    let zMax = null;
    if (vKar === "gG") {
      const ggLookupChk = ggIaVoorTijd(vA, maxAfschakeltijdChk);
      if (ggLookupChk) zMax = Math.round(230 / ggLookupChk.ia * 100) / 100;
    } else if (!isNaN(vA) && vA > 0 && karFac[vKar]) {
      zMax = Math.round(230 / (karFac[vKar] * vA) * 100) / 100;
    }
    {
      const rcdAanwezig = instMet.rcdAanwezig ?? true;
      const zlpe = toNum(instMet.zlpe);
      const zln = toNum(instMet.zln);
      if (rcdAanwezig) {
        // Achter een aardlekschakelaar geldt de aanraakspanningsnorm Ra ≤166Ω i.p.v. de foutstroom-norm.
        if (!isNaN(zlpe) && zlpe > 166) warnings.push({
          level: "red",
          msg: `Z L-PE ${zlpe}Ω boven 166Ω (aanraakspanningsnorm achter aardlekschakelaar)`
        });
      } else if (zMax) {
        if (!isNaN(zlpe) && zlpe > zMax * 0.9 && zlpe <= zMax) warnings.push({
          level: "orange",
          msg: `Z L-PE ${zlpe}Ω nadert maximum voor ${vKar}${vA}A (Z_max=${zMax.toFixed(2)}Ω) — bij uitbreiding opnieuw meten`
        });
        if (!isNaN(zlpe) && zlpe > zMax) warnings.push({
          level: "red",
          msg: `Z L-PE ${zlpe}Ω boven Z_max (${zMax.toFixed(2)}Ω voor ${vKar}${vA}A) — Icc te laag voor kortsluitbeveiliging`
        });
      }
      if (zMax && !isNaN(zln) && zln > zMax) warnings.push({
        level: "red",
        msg: `Z L-N ${zln}Ω boven Z_max (${zMax.toFixed(2)}Ω voor ${vKar}${vA}A) — Icc te laag voor kortsluitbeveiliging`
      });
    }
  }

  // Visuele inspectiepunten — bij NOK is dit een directe afwijking
  const inspectieLabels = {
    beschermingscontacten: "Beschermingscontacten wandcontactdozen/metalen gestellen",
    potentiaalvereffening: "Hoofd- en aanvullende potentiaalvereffening",
    leidingberekeningen: "Leidingberekeningen",
    beveiligingen: "Beveiligingen (incl. selectiviteit)"
  };
  Object.entries(inspectieLabels).forEach(([k, label]) => {
    if (instMet[k] === "NOK") warnings.push({
      level: "red",
      msg: `${label}: NIET in orde bevonden — herstel vereist vóór ingebruikname`
    });
  });
  return warnings;
}

// PV cross-checks

// PV cross-checks
function pvCrossChecks(strings, instMet, materiaal) {
  const warnings = [];
  // String spanning vergelijken
  const spanningen = strings.map(s => toNum(s.spanning)).filter(v => !isNaN(v));
  if (spanningen.length > 1) {
    const max = Math.max(...spanningen);
    const min = Math.min(...spanningen);
    if (max - min > 30) warnings.push({
      level: "orange",
      msg: `Stringspanning verschil ${(max - min).toFixed(0)}V — mogelijke schaduw, defect paneel of mismatch`
    });
  }
  // ISO per string
  strings.forEach((s, i) => {
    const iso = toNum(s.iso);
    if (!isNaN(iso) && iso > 1 && iso < 1.5) warnings.push({
      level: "orange",
      msg: `String ${i + 1}: ISO ${iso} MΩ — net boven minimum, controleer aansluitingen`
    });
    if (!isNaN(iso) && iso <= 1) warnings.push({
      level: "red",
      msg: `String ${i + 1}: ISO ${iso} MΩ — ONDER NORM, niet in bedrijf stellen`
    });
  });
  // Totaalvermogen vs omvormer
  const aantalPanelen = parseInt(materiaal.aantalPanelen);
  const paneelWp = parseInt(materiaal.paneelWp);
  const omvormerKw = toNum(materiaal.omvormerKw);
  if (!isNaN(aantalPanelen) && !isNaN(paneelWp) && !isNaN(omvormerKw)) {
    const totaalWp = aantalPanelen * paneelWp;
    const ratio = totaalWp / (omvormerKw * 1000);
    if (ratio > 1.35) warnings.push({
      level: "orange",
      msg: `DC/AC ratio ${ratio.toFixed(2)} is hoog (>${1.35}) — controleer omvormer specificaties`
    });
    if (ratio < 0.8) warnings.push({
      level: "orange",
      msg: `DC/AC ratio ${ratio.toFixed(2)} is laag (<0.8) — omvormer mogelijk te groot`
    });
  }
  // Aarding check
  if (instMet.aardingOk === "NOK") warnings.push({
    level: "red",
    msg: `Aarding draagconstructie NOK — installatie niet in bedrijf stellen`
  });
  return warnings;
}

// ─── GEDEELDE HELPERS ─────────────────────────────────────────────────────────

module.exports = { toNum, GG_TABEL, GG_IN_WAARDEN, ggIaVoorTijd, gkCrossChecks, pvCrossChecks };
