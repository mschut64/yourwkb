// ─────────────────────────────────────────────────────────────────────────────
// YourWkb — rekenkern
//
// De normlogica van de app, los van het scherm. Hier staat alles wat te toetsen
// is zonder React: grenswaarden, cross-checks en de belastingcheck.
//
// Waarom apart: tot 11-09-2026 stond dit midden in WkbApp.jsx, en werd het voor
// de tests met een Babel-extractor naar buiten gepeuterd. Dat werkte, maar het
// betekende ook dat alles wat de extractor NIET kon pakken — esc(), mkpBouw,
// saneerProject, genereerRapport — per definitie ongetest bleef. Een module is
// gewoon te importeren, door de tests én door een andere app.
//
// Zelfde opzet als het zusterproject Kastscan (components/kastscan/model.js).
// ─────────────────────────────────────────────────────────────────────────────

// Robuuste numerieke parser — accepteert zowel komma als punt als decimaalteken.
// Zonder deze fix leest parseFloat("1,9") als 1 (stopt bij de komma) — dat veroorzaakte
// foutieve "Afwijking" meldingen bij correct ingevoerde waarden.
export const toNum = (v) => {
  if (v === null || v === undefined || v === "") return NaN;
  return parseFloat(String(v).replace(",", "."));
};

// ── gG-smeltzekering (trage patroon, D-patronen) — tijd-stroomkromme tabel ──
// In tegenstelling tot B/C/D-automaten (vaste factor × In) heeft een gG-zekering
// een niet-lineaire tijd-stroomkromme: de vereiste uitschakelstroom (Ia) per
// stroomwaarde moet per In en per tijdsduur worden opgezocht, niet berekend met
// een simpele factor. Bron: door Martin aangeleverde tabel "D-patronen Traag gG".
// Kolommen komen exact overeen met de vier afschakeltijden die de app al
// gebruikt (kastklasse × stelsel: Klasse1 TN=5s/TT=1s, Klasse2 TN=0,4s/TT=0,2s).
export const GG_TABEL = {
  2:  { 5:5.6,   1:6.6,   0.4:7.5,   0.2:8.3   },
  4:  { 5:11.1,  1:14.2,  0.4:15.7,  0.2:17.5  },
  6:  { 5:17.1,  1:22.0,  0.4:26.7,  0.2:33.7  },
  10: { 5:39.4,  1:50.0,  0.4:58.8,  0.2:67.1  },
  16: { 5:53.1,  1:73.3,  0.4:90.0,  0.2:110.5 },
  // 20A/0,2s gecorrigeerd naar 153,3A (was 43,3 — fout in brontabel, gecorrigeerd
  // door Martin op 28-7-2026 via 230/1,5 = 153,3, consistent met de stijgende
  // trend van de rest van de rij).
  20: { 5:75.7,  1:105.3, 0.4:130.0, 0.2:153.3 },
  25: { 5:92.0,  1:131.6, 0.4:164.3, 0.2:196.4 },
  35: { 5:139.5, 1:196.4, 0.4:260.0, 0.2:328.0 },
  50: { 5:206.6, 1:307.3, 0.4:362.5, 0.2:400.0 },
  63: { 5:274.3, 1:362.5, 0.4:423.8, 0.2:486.5 },
};

export const GG_IN_WAARDEN = Object.keys(GG_TABEL).map(Number).sort((a,b)=>a-b);

// Zoekt de dichtstbijzijnde In-waarde in de tabel (niet elke stroomwaarde is
// een standaard gG-maat) en geeft de vereiste Ia terug voor de gevraagde tijd.
export function ggIaVoorTijd(ampere, tijd) {
  const amp = toNum(ampere);
  if (isNaN(amp) || amp <= 0) return null;
  const dichtstbij = GG_IN_WAARDEN.reduce((best,cur) =>
    Math.abs(cur-amp) < Math.abs(best-amp) ? cur : best
  , GG_IN_WAARDEN[0]);
  const rij = GG_TABEL[dichtstbij];
  if (!rij || rij[tijd] === undefined) return null;
  return { ia: rij[tijd], inGebruikt: dichtstbij };
}

// ─── BELASTINGCHECK (roadmap 2.1) ─────────────────────────────────────────────
//
// Overgenomen uit Kastscan, 03-09-2026. Daar is de rekenkern gebouwd en met
// tests vastgelegd; hier stond hij al beschreven maar nog niet berekend — overal
// "(volgt)", en `p.chk` werd alleen GETOOND uit een gescand paspoort.
//
// De regel is die van dit bestand zelf: "Zonder gezamenlijke sturing rekent de
// belastingcheck conservatief met gelijktijdigheidsfactor 0,6 over de grote
// verbruikers (richtlijn NEN-EN-IEC 61439)." De factor gaat dus OP die
// verbruikers en niet eromheen.
//
// EEN VERSCHIL MET KASTSCAN, en dat is de data en niet de keuze. Kastscan kent
// per groep een fase (L1/L2/L3) en rekent daarom PER FASE. Hier dragen groepen
// alleen `f: 1|3` — welke fase een eenfasegroep pakt, staat nergens. Deze check
// toetst dus de TOTALE belasting tegen de hele aansluiting. Per fase rekenen
// hoort bij R3b (Fasecheck), en dát is ook precies waar het verschil zit:
// fasecompensatie is boekhouding, stroom is fysiek.
export const GROTE_VERBRUIKERS_MKP = ["lp", "wp", "kook", "bat"];

export const GELIJKTIJDIGHEID = 0.6;

// Terugval als het vermogen niet is ingevuld. Alleen voor de vier grote
// verbruikers: bij een lichtgroep zou een aangenomen waarde de uitkomst sturen
// zonder dat iemand het ziet, en die groepen tellen hier toch al licht.
export const GROOT_STANDAARD_KW = { lp: 7.4, wp: 6.9, kook: 7.4, bat: 5.0 };

export function isGroteVerbruikerMkp(t) {
  return GROTE_VERBRUIKERS_MKP.includes(String(t || "").trim().toLowerCase());
}

// Het vermogen van één paspoortgroep in kW, of NaN als het onbekend is.
export function groepVermogenKw(g) {
  const kw = toNum(g && g.kw);
  if (kw > 0) return kw;
  return isGroteVerbruikerMkp(g && g.t) ? GROOT_STANDAARD_KW[String(g.t).toLowerCase()] : NaN;
}

// ── Herkomst van de basisbelasting (fasecheck v1, stap 1) ───────────────────
// De basisbelasting komt uit een van twee bronnen, en dat verschil verandert de
// rekenregel — niet alleen het etiket.
//
//   'geschat'  De som van de paspoortgroepen, met de gelijktijdigheidsfactor
//              0,6 over de grote verbruikers. Zo rekent deze app het nu.
//
//   'gemeten'  De gemeten piek uit een P1-meting IS de basisbelasting. Hier
//              gaat de factor er NIET overheen: wat de meter zag, is wat er
//              werkelijk tegelijk liep — de gelijktijdigheid zit er al in. Hem
//              er nogmaals overheen leggen zou 40% van een echte meting
//              wegstrepen en de installatie kunstmatig licht rekenen. Dat is
//              precies de verkeerde kant op voor een toets die conservatief
//              hoort te zijn. De factor blijft wél gelden voor een apparaat dat
//              er nog bij komt en dus niet in de meting zat.
//
// Zonder bruikbare meting valt hij terug op de schatting: beoordeelMeetkwaliteit
// levert bij te weinig dekking of te korte looptijd geen piek, en een half
// gemeten week mag niet als "gemeten" door het leven gaan.
export const FASE_RESERVE_KW = 1.0;

export function periodeLabel(van, tot) {
  const dd = (sec) => {
    // Let op: Number(null) is 0 en epoch 0 is een geldige datum (01-01-1970).
    // Zonder deze grens wordt "geen periode" stilzwijgend een periode in het
    // rapport. Een meetperiode ligt altijd ruim na 1970.
    const n = Number(sec);
    if (!Number.isFinite(n) || n <= 0) return null;
    const d = new Date(n * 1000);
    if (isNaN(d.getTime())) return null;
    return String(d.getDate()).padStart(2, "0") + "-" + String(d.getMonth() + 1).padStart(2, "0");
  };
  const a = dd(van), b = dd(tot);
  return a && b ? `${a} t/m ${b}` : null;
}

export function basisbelastingKw(groepen, lbAan, meting) {
  const piek = toNum(meting && meting.piekKw);
  const dagen = toNum(meting && meting.dagen);
  if (piek > 0) {
    const periode = periodeLabel(meting.van, meting.tot);
    const dagdeel = dagen > 0 ? `over ${dagen} ${dagen === 1 ? "dag" : "dagen"}` : null;
    return {
      kw: piek,
      bron: "gemeten",
      label: ["gemeten", dagdeel, periode ? `(${periode})` : null].filter(Boolean).join(" "),
    };
  }

  const lijst = Array.isArray(groepen) ? groepen : [];
  let groot = 0, gewoon = 0, voeding = 0, bekend = 0;
  for (const g of lijst) {
    const kw = groepVermogenKw(g);
    if (isNaN(kw) || kw <= 0) continue;
    bekend += 1;
    if ((g && g.rol) === "voed") voeding += kw;
    else if (isGroteVerbruikerMkp(g.t)) groot += kw;
    else gewoon += kw;
  }
  if (!bekend) return null;

  // Mét gezamenlijke sturing vervalt de korting. Load balancing is een
  // software-instelling en geen veiligheidsmaatregel — de installatie moet ook
  // bij falende sturing kloppen, en dan is vol vermogen de veilige kant.
  const factor = lbAan === true ? 1 : GELIJKTIJDIGHEID;
  const afname = gewoon + groot * factor;
  return {
    kw: Math.max(afname, voeding),
    bron: "geschat",
    label: "indicatie o.b.v. schatting",
    richting: voeding > afname ? "voed" : "af",
  };
}

// ─── BELASTING PER FASE ──────────────────────────────────────────────────────
//
// De optelling per fase, gedeeld door de belastingcheck en de fasebalans. Eén
// bron, want twee optellingen van dezelfde installatie lopen vroeg of laat
// uiteen — precies wat er tussen YourWkb en Kastscan gebeurd is.
export const FASEN = ["L1", "L2", "L3"];

// Dezelfde fasekleuren als Kastscan (components/kastscan/model.js › FASE_KLEUR),
// tot op de hexwaarde. Ze staan in de app, in het rapport en in het
// groepenoverzicht van het zusterproject voor dezelfde fase, zodat een
// installateur die beide gebruikt niet twee kleurtalen hoeft te leren.
//
// De regel bij een balk komt eveneens uit Kastscan: de fasekleur mag, want een
// balk is een grafiek en geen aanduiding op een kast. Knelt het, dan wint het
// oordeel van de kleur — oranje bij weinig ruimte, rood boven de capaciteit.
export const FASE_KLEUR = { L1: "#2196F3", L2: "#9B59B6", L3: "#14B8A6" };

// De fasenummers van een groep, volgens spec v0.2 §4.4. `fn` is leidend; zonder
// `fn` is alleen bij een driefasegroep zeker waar hij hangt — namelijk overal.
export function fasenVanGroep(g, aantalFasen) {
  if (aantalFasen === 1) return [1];
  if (Array.isArray(g && g.fn) && g.fn.length) {
    return g.fn.map(Number).filter((n) => n >= 1 && n <= 3);
  }
  if (toNum(g && g.f) === 3) return [1, 2, 3];
  return [];
}

/**
 * Telt de paspoortgroepen op per fase.
 *
 * @param grp        groepen in paspoortvorm (spec v0.2 §4.4)
 * @param ha         hoofdaansluiting { f, a }
 * @param lbAan      gezamenlijke load balancing aanwezig
 */
// ─── TERUGLEVERING TELT MEE, MAAR TELT NIET OP ───────────────────────────────
//
// Besluit Martin, 12-09-2026: *"teruglevering telt positief mee, stroom is
// stroom — let wel op dat eigengebruik binnen de meter blijft en niet de fasen
// zal raken."*
//
// Twee regels in één zin, en ze wijzen niet dezelfde kant op:
//
//   Teruglevering IS belasting. Een omvormer van 5 kW op L2 duwt die stroom door
//   de kam en door de hoofdzekering van L2. De richting doet er voor een
//   zekering niet toe — een smeltdraad kent geen plus en min.
//
//   Maar eigengebruik raakt de fasen NIET. Wat de PV levert en de wasmachine op
//   hetzelfde moment opneemt, loopt van de ene groep naar de andere over de kam
//   en passeert de hoofdzekering nooit. Afname en teruglevering bij elkaar
//   optellen zou dus stroom tellen die er niet is.
//
// Daarom per fase de ZWAARSTE van twee richtingen, niet hun som:
//
//   afname        het ongunstigste moment zonder zon en met een lege accu
//   teruglevering het ongunstigste moment met volle zon en geen verbruik
//
// Die twee kunnen per definitie niet tegelijk optreden. Precies het geval dat
// geen van de drie eerdere antwoorden toetste.
//
// Op de voedende kant gaat GEEN gelijktijdigheidsfactor. De specificatie van het
// meterkastpaspoort (§ kam) zegt: "de som van de voedende groepen, op het deel
// van de kam waar hun stromen kunnen cumuleren, mag de kamcapaciteit niet
// overschrijden" — een som, geen korting. Dat is ook fysisch te volgen: de zon
// schijnt op alle panelen tegelijk, waar vier apparaten zelden tegelijk vol
// draaien.
//
// Bekende beperking: `mkpBouw` zet een thuisbatterij altijd op rol "voed", dus
// hij telt hier aan de leverende kant en nooit als ladende afnemer. De spec
// erkent dat ("een batterij kan beide rollen hebben; noteer de rol met de
// hoogste stroom of twee regels"). Zolang laden en ontladen even zwaar zijn
// maakt het voor de zwaarste-van-twee geen verschil.
export function belastingPerFase(grp, ha, lbAan) {
  const aantalFasen = toNum(ha && ha.f) === 3 ? 3 : 1;
  const fasen = aantalFasen === 3 ? FASEN : ["L1"];

  // Mét gezamenlijke sturing vervalt de korting. Load balancing is een
  // software-instelling en geen veiligheidsmaatregel — de installatie moet ook
  // bij falende sturing kloppen, en dan is vol vermogen de veilige kant.
  const factor = lbAan === true ? 1 : GELIJKTIJDIGHEID;

  const groot = { L1: 0, L2: 0, L3: 0 };
  const gewoon = { L1: 0, L2: 0, L3: 0 };
  const voeding = { L1: 0, L2: 0, L3: 0 };
  const aantal = { L1: 0, L2: 0, L3: 0 };
  // Ook het niet-toegerekende vermogen kent twee richtingen, en ook daar geldt
  // de zwaarste en niet de som. Anders telt een thuisbatterij zonder vastgelegde
  // fase voor laden én ontladen mee, terwijl hij nooit allebei tegelijk doet.
  let onbekendAf = 0, onbekendVoed = 0, onbekendAantal = 0;

  for (const g of Array.isArray(grp) ? grp : []) {
    // Dezelfde terugvalwaarde als basisbelastingKw gebruikt: een laadpaal
    // zonder ingevuld vermogen telt als 11 kW en niet als nul. Anders zou
    // dezelfde groep in de totaaltoets wél en in de fasetoets níét meewegen.
    const kw = groepVermogenKw(g);
    if (isNaN(kw) || kw <= 0) continue;

    const nummers = fasenVanGroep(g, aantalFasen);
    if (!nummers.length) {
      if ((g.rol || "af") === "voed") onbekendVoed += kw; else onbekendAf += kw;
      onbekendAantal += 1;
      continue;
    }

    const perGroep = kw / nummers.length;
    const pot = (g.rol || "af") === "voed" ? voeding
              : isGroteVerbruikerMkp(g.t)  ? groot
              :                              gewoon;
    for (const n of nummers) {
      pot[FASEN[n - 1]] += perGroep;
      aantal[FASEN[n - 1]] += 1;
    }
  }

  const afname = { L1: 0, L2: 0, L3: 0 };
  const belasting = { L1: 0, L2: 0, L3: 0 };
  const richting = { L1: "af", L2: "af", L3: "af" };
  for (const f of FASEN) {
    afname[f] = gewoon[f] + groot[f] * factor;
    belasting[f] = Math.max(afname[f], voeding[f]);
    richting[f] = voeding[f] > afname[f] ? "voed" : "af";
  }

  return {
    fasen, belasting, afname, voeding, richting, groot, gewoon, aantal, factor,
    onbekendKw: Math.max(onbekendAf, onbekendVoed), onbekendAantal,
  };
}

// De uitkomst voor `p.chk`. Woorden en vorm volgen wat deze app zelf uitleest
// in chkKleur: "groen", "oranje" of "rood".
//
// `meting` is optioneel en verandert de vorm van de uitkomst NIET: p.chk gaat
// rechtstreeks het meterkastpaspoort in, en dat is een open standaard. Een veld
// toevoegen is een spec-wijziging (v0.2) en geen bijvangst van deze functie.
// Wie de herkomst wil tonen, roept basisbelastingKw apart aan.
export function belastingcheck(grp, ha, lbAan, datum, meting) {
  const fasen = toNum(ha && ha.f) === 3 ? 3 : 1;
  const ampere = toNum(ha && ha.a);
  if (!(ampere > 0)) return null;

  // Alleen AFNEMENDE groepen tellen mee in de geschatte basis; dat zit in
  // basisbelastingKw. Een PV-omvormer of een ontladende batterij verlaagt de
  // piek door de hoofdzekering niet: het slechtste geval is geen zon en een
  // lege accu. PV als negatieve belasting hoort bij de Fasecheck (R3b), waar
  // het over saldering per fase gaat en niet over deze toets.
  //
  // Geen enkele bekende belasting: dan valt er niets te toetsen, en "groen"
  // zou hier een uitspraak zijn die nergens op steunt.
  const basis = basisbelastingKw(grp, lbAan, meting);
  if (!basis) return null;

  const capTotaal = (fasen * ampere * 230) / 1000;
  const capFase = (ampere * 230) / 1000;
  let bezet = capTotaal > 0 ? basis.kw / capTotaal : 0;

  // PER FASE TOETSEN, net als Kastscan (besluit Martin, 11-09-2026).
  //
  // Fasecompensatie is boekhouding, stroom is fysiek: de slimme meter saldeert
  // over drie fasen, de hoofdzekering niet. Drie zware groepen die toevallig
  // allemaal op L2 zitten passen ruim binnen 3 x 25 A en laten toch de zekering
  // van L2 komen. Een toets op het totaal ziet dat niet.
  //
  // De totaaltoets hierboven blijft staan en dat is geen halfheid. Is elke groep
  // aan een fase toegewezen, dan is de zwaarst belaste fase per definitie al
  // minstens zo streng als het totaal — de totaaltoets voegt dan niets toe. Is
  // een deel NIET toegewezen, dan is zij het enige wat dat vermogen nog ziet.
  // De strengste van de twee wint, zodat een half ingevulde kast niet groen
  // wordt door wat er ontbreekt.
  //
  // Alleen bij een geschatte basis: een gemeten piek is nu nog één totaalgetal
  // zonder faseverdeling (basisbelastingKw › meting.piekKw). Zodra de P1-meting
  // per fase binnenkomt, hoort die hier op dezelfde manier per fase getoetst.
  if (fasen === 3 && basis.bron === "geschat") {
    const pf = belastingPerFase(grp, ha, lbAan);
    for (const f of FASEN) bezet = Math.max(bezet, capFase > 0 ? pf.belasting[f] / capFase : 0);
  }

  const r = bezet > 1 ? "rood" : bezet > 0.7 ? "oranje" : "groen";
  return { r, d: String(datum || "") };
}

// ─── CROSS-CHECK LOGICA ───────────────────────────────────────────────────────

// Groepenkast cross-checks — werkt op aardlekgroepen (RCD-clusters), elk met 1+ eindgroepen.
// Norm bestaande installatie (1000Ω/V), gemeten NAAR AARDE: altijd ≥0,23 MΩ.
// Elke fase staat t.o.v. aarde op 230V (ook bij 3-fase); de 0,40 MΩ hoort bij
// 400V fase-tegen-fase, wat we hier niet meten.
// ΔT-norm is afhankelijk van het stelsel (TN of TT) — zie NEN1010 tabel 41.1:
//   TN-eindgroep ≤ 400ms · TT-eindgroep ≤ 200ms
export function gkCrossChecks(aardlekgroepen, grpMeet, instMet) {
  const warnings = [];
  const stelsel = instMet.stelsel || "TN-C-S";
  const isTT = stelsel === "TT";
  const dtNorm = 300; // EN 61008: apparaatnorm altijd 300ms bij 1× In, ongeacht stelsel

  // B) ISOLATIEWEERSTAND — ISO totaal is de hoofdmeting (alle groepen aan, hoofdvoeding uit)
  // Twee losse metingen: Fase→Aarde en Nul→Aarde, beide getoetst aan 0,23 MΩ.
  const isoTotFA = toNum(instMet.isoTotFA);
  const isoTotNA = toNum(instMet.isoTotNA);
  if (!isNaN(isoTotFA) && isoTotFA < 0.23)
    warnings.push({ level:"red", msg:`ISO totaal (Fase→Aarde) ${isoTotFA} MΩ — ONDER NORM (≥0,23 MΩ)` });
  if (!isNaN(isoTotNA) && isoTotNA < 0.23)
    warnings.push({ level:"red", msg:`ISO totaal (Nul→Aarde) ${isoTotNA} MΩ — ONDER NORM (≥0,23 MΩ)` });

  // ISO per groep (dynamische lijst) — waarschuw bij een waarde onder de norm.
  (instMet.isoGroepen || []).forEach((g, idx) => {
    const naam = g.naam || `Groep ${idx+1}`;
    const norm = 0.23; // naar aarde: elke fase staat t.o.v. aarde op 230V → ≥0,23 MΩ, ook bij 3-fase
    const velden = g.driefase
      ? [["l1a","L1→Aarde"],["l2a","L2→Aarde"],["l3a","L3→Aarde"],["na","N→Aarde"]]
      : [["fa","Fase→Aarde"],["na","Nul→Aarde"]];
    velden.forEach(([k,label]) => {
      const iso = toNum(g[k]);
      if (!isNaN(iso) && iso < norm)
        warnings.push({ level:"red", msg:`${naam} (${label}): ISO ${iso} MΩ — ONDER NORM (≥${norm} MΩ)` });
    });
  });

  (aardlekgroepen||[]).forEach(ag => {
    const geenRcd = ag.rcdType === "geen";

    if (!geenRcd) {
      const dt = toNum(grpMeet[`${ag.id}_dt`]);
      if (!isNaN(dt) && dt > dtNorm)
        warnings.push({ level:"red", msg:`${ag.naam}: ΔT ${dt}ms boven 300ms (EN 61008 apparaatnorm bij 1× In)` });

      // ΔI-norm per RCD-type (alleen bovengrens, geen ondergrens — fabrikantwaarden leidend):
      // Type AC: ≤ 1× In | Type A: ≤ 1,4× In (√2 factor pulserend DC) | Type B: ≤ 2× In
      const di = toNum(grpMeet[`${ag.id}_di`]);
      const mA = toNum(ag.rcdMa);
      if (!isNaN(di) && !isNaN(mA)) {
        const diMax = ag.rcdType==="B" ? mA*2 : ag.rcdType==="AC" ? mA*1 : mA*1.4;
        if (di > diMax)
          warnings.push({ level:"red", msg:`${ag.naam}: ΔI ${di}mA boven norm voor type-${ag.rcdType} (≤${diMax.toFixed(0)}mA bij ${mA}mA RCD)` });
      }

      // Testknop NOK betekent dat de RCD niet mechanisch/elektrisch reageert op de
      // ingebouwde testfunctie — dit is een directe afkeuring, RCD moet vervangen worden.
      const testknop = grpMeet[`${ag.id}_testknop`];
      if (testknop === "NOK")
        warnings.push({ level:"red", msg:`${ag.naam}: Testknop RCD geeft NOK — RCD reageert niet op de testfunctie, vervang de RCD` });
    }
  });

  // Spanning asymmetrie
  const l1 = toNum(instMet["span_L1/N"]);
  const l2 = toNum(instMet["span_L2/N"]);
  const l3 = toNum(instMet["span_L3/N"]);
  if (!isNaN(l1) && !isNaN(l2) && !isNaN(l3)) {
    const diff = Math.max(l1,l2,l3) - Math.min(l1,l2,l3);
    if (diff > 6) warnings.push({ level:"orange", msg:`Fasespanning asymmetrie ${diff.toFixed(1).replace(".",",")}V — controleer netaansluiting` });
  }

  // A) IMPEDANTIE — Z L-N/L-PE check op basis van hoogst afgaande groep (EN 60898/60269)
  // Z_max = 230 / Icc_min. Voor B/C/D: Icc_min = factor × In (B=5, C=10, D=20).
  // Voor gG (trage smeltzekering): Icc_min komt uit de tijd-stroomkromme tabel
  // (GG_TABEL), afhankelijk van de max. afschakeltijd (die zelf weer afhangt van
  // kastklasse × stelsel — zie maxAfschakeltijd-logica). Geldt voor ELK stelsel,
  // dus ook TT — de fysica van de automaat/zekering verandert niet door het stelsel.
  {
    const karFac = { B:5, C:10, D:20 };
    const vKar = instMet.hoogstKar || "B";
    const vA   = toNum(instMet.hoogstAmpere);
    const isKlasse1Chk = instMet.kastType === "klasse1";
    const isTTChk = (instMet.stelsel||"TN-C-S") === "TT";
    const maxAfschakeltijdChk = isKlasse1Chk ? (isTTChk ? 1 : 5) : (isTTChk ? 0.2 : 0.4);

    let zMax = null;
    if (vKar === "gG") {
      const ggLookupChk = ggIaVoorTijd(vA, maxAfschakeltijdChk);
      if (ggLookupChk) zMax = Math.round((230 / ggLookupChk.ia) * 100) / 100;
    } else if (!isNaN(vA) && vA > 0 && karFac[vKar]) {
      zMax = Math.round((230 / (karFac[vKar] * vA)) * 100) / 100;
    }

    {
      const rcdAanwezig = instMet.rcdAanwezig ?? true;
      const zlpe = toNum(instMet.zlpe);
      const zln  = toNum(instMet.zln);
      if (rcdAanwezig) {
        // Achter een aardlekschakelaar geldt de aanraakspanningsnorm Ra ≤166Ω i.p.v. de foutstroom-norm.
        if (!isNaN(zlpe) && zlpe > 166)
          warnings.push({ level:"red", msg:`Z L-PE ${zlpe}Ω boven 166Ω (aanraakspanningsnorm achter aardlekschakelaar)` });
      } else if (zMax) {
        if (!isNaN(zlpe) && zlpe > zMax * 0.9 && zlpe <= zMax)
          warnings.push({ level:"orange", msg:`Z L-PE ${zlpe}Ω nadert maximum voor ${vKar}${vA}A (Z_max=${zMax.toFixed(2).replace(".",",")}Ω) — bij uitbreiding opnieuw meten` });
        if (!isNaN(zlpe) && zlpe > zMax)
          warnings.push({ level:"red", msg:`Z L-PE ${zlpe}Ω boven Z_max (${zMax.toFixed(2).replace(".",",")}Ω voor ${vKar}${vA}A) — Icc te laag voor kortsluitbeveiliging` });
      }
      if (zMax && !isNaN(zln) && zln > zMax)
        warnings.push({ level:"red", msg:`Z L-N ${zln}Ω boven Z_max (${zMax.toFixed(2).replace(".",",")}Ω voor ${vKar}${vA}A) — Icc te laag voor kortsluitbeveiliging` });
    }
  }

  // Visuele inspectiepunten — bij NOK is dit een directe afwijking
  const inspectieLabels = {
    beschermingscontacten: "Beschermingscontacten wandcontactdozen/metalen gestellen",
    potentiaalvereffening: "Hoofd- en aanvullende potentiaalvereffening",
    leidingberekeningen:   "Leidingberekeningen",
    beveiligingen:         "Beveiligingen (incl. selectiviteit)",
  };
  Object.entries(inspectieLabels).forEach(([k,label]) => {
    if (instMet[k] === "NOK")
      warnings.push({ level:"red", msg:`${label}: NIET in orde bevonden — herstel vereist vóór ingebruikname` });
  });

  return warnings;
}

// PV cross-checks
export function pvCrossChecks(strings, instMet, materiaal) {
  const warnings = [];
  // String spanning vergelijken
  const spanningen = strings.map(s => toNum(s.spanning)).filter(v => !isNaN(v));
  if (spanningen.length > 1) {
    const max = Math.max(...spanningen);
    const min = Math.min(...spanningen);
    if (max - min > 30) warnings.push({ level:"orange", msg:`Stringspanning verschil ${(max-min).toFixed(0)}V — mogelijke schaduw, defect paneel of mismatch` });
  }
  // ISO per string
  strings.forEach((s,i) => {
    const iso = toNum(s.iso);
    if (!isNaN(iso) && iso > 1 && iso < 1.5)
      warnings.push({ level:"orange", msg:`String ${i+1}: ISO ${iso} MΩ — net boven minimum, controleer aansluitingen` });
    if (!isNaN(iso) && iso <= 1)
      warnings.push({ level:"red", msg:`String ${i+1}: ISO ${iso} MΩ — ONDER NORM, niet in bedrijf stellen` });
  });
  // Totaalvermogen vs omvormer
  const aantalPanelen = parseInt(materiaal.aantalPanelen);
  const paneelWp      = parseInt(materiaal.paneelWp);
  const omvormerKw    = toNum(materiaal.omvormerKw);
  if (!isNaN(aantalPanelen) && !isNaN(paneelWp) && !isNaN(omvormerKw)) {
    const totaalWp = aantalPanelen * paneelWp;
    const ratio    = totaalWp / (omvormerKw * 1000);
    if (ratio > 1.35) warnings.push({ level:"orange", msg:`DC/AC ratio ${ratio.toFixed(2).replace(".",",")} is hoog (>1,35) — controleer omvormer specificaties` });
    if (ratio < 0.8)  warnings.push({ level:"orange", msg:`DC/AC ratio ${ratio.toFixed(2).replace(".",",")} is laag (<0,8) — omvormer mogelijk te groot` });
  }
  // Aarding check
  if (instMet.aardingOk === "NOK")
    warnings.push({ level:"red", msg:`Aarding draagconstructie NOK — installatie niet in bedrijf stellen` });
  return warnings;
}
