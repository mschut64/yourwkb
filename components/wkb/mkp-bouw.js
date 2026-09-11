// ─────────────────────────────────────────────────────────────────────────────
// Van app-gegevens naar een meterkastpaspoort
//
// Dit is de VERTALING, niet de standaard. Het formaat zelf staat in mkp.js en is
// bedoeld om gedeeld te worden; deze vertaling is van YourWkb, omdat ze uitgaat
// van de datastructuur van deze app (aardlekgroepen met eindgroepen, de
// discipline-specifieke startmodus, een geïmporteerd paspoort als basis).
// Kastscan heeft zijn eigen variant, die uitgaat van modules op een DIN-rail.
//
// Apart bestand omdat dit bepaalt wát er in de QR belandt — en dat verdient
// tests. Zolang het in WkbApp.jsx stond, was dat onmogelijk.
// ─────────────────────────────────────────────────────────────────────────────

// Let op: expliciete .js-extensie. Webpack vindt het bestand ook zonder,
// maar Node niet — en de tests draaien op Node.
import { toNum, belastingcheck } from "./model.js";
import { MKP_SPEC_VERSIE, eanValide } from "meterkastpaspoort";

// ─── Een thuisbatterij is twee dingen tegelijk ───────────────────────────────
//
// Spec v0.2 §4.4 bij `rol`: "Een batterij kan beide rollen hebben; noteer de rol
// met de hoogste stroom of twee regels." Deze app schreef altijd alleen `voed`,
// en daarmee verdween de ladende kant volledig uit het paspoort — terwijl een
// accu die met 11 kW laadt en met 3 kW ontlaadt aan de afnemende kant het
// zwaarst is. Sinds 12-09-2026 dus twee regels (besluit Martin).
//
// Laden is een afname en telt als grote verbruiker mee in de
// gelijktijdigheidsfactor; ontladen levert aan de kam en krijgt die korting
// niet. Omdat de fasetoets per fase de zwaarste van beide richtingen neemt,
// verandert er niets zolang laden en ontladen even zwaar zijn — en dat is
// precies de bedoeling.
function batterijRegels({ kwOntladen, kwLaden, naam, f, fn }) {
  const basis = {};
  if (f !== undefined) basis.f = f;
  if (fn !== undefined) basis.fn = fn;
  if (naam) basis.n = String(naam).slice(0, 40);
  const regel = (rol, kw) => {
    const r = { t: "bat", rol, ...basis };
    if (toNum(kw) > 0) r.kw = toNum(kw);
    return r;
  };
  // Ontladen eerst: dat is de rol die deze app altijd al schreef, dus een lezer
  // die maar één regel verwerkt ziet hetzelfde als voorheen.
  return [regel("voed", kwOntladen), regel("af", kwLaden)];
}

// ─── Het apparaat van déze klus ──────────────────────────────────────────────
//
// In de startmodus (laadpaal, batterij, pv, wp) is er nog geen kastinventaris en
// vormt het eigen apparaat de kern van het paspoort. Apart exporteerbaar omdat
// de paspoortstap dezelfde regels als voorvertoning toont: "dit komt in de QR".
//
// Die voorvertoning bouwde het apparaat tot 12-09-2026 zélf op, met een eigen
// kopie van deze regels in WkbApp.jsx. Dat liep twee keer uiteen — het laatst
// toen de accu hier twee regels kreeg en het scherm nog één regel van 3 kW liet
// zien terwijl de belastingcheck eronder met 6,6 kW rekende. Eén definitie dus,
// en de voorvertoning laat letterlijk zien wat er wordt weggeschreven.
// De uitkomst van de Fasecheck (optioneel blok in de apparaatstap) als `fn`
// volgens spec v0.2 §4.4. Alleen schrijven wat de installateur daadwerkelijk
// heeft gekozen — een gegokte fase is schadelijker dan een ontbrekende, want het
// advies van de vólgende installateur bouwt erop voort.
function fcFase(data) {
  const fc = (data && data.fc) || {};
  if (toNum(fc.fasen) === 3) return { f: 3, fn: [1, 2, 3] };
  const L = fc.gekozen;
  if (["L1", "L2", "L3"].includes(L)) return { f: 1, fn: [Number(L.slice(1))] };
  return {};
}

export function eigenApparaatRegels(data, discipline) {
  if (discipline === "laadpaal") {
    const kw = toNum(String(data.lpVermogen||"").replace(/[^0-9,.]/g,""));
    const r = { t:"lp", rol:"af", f: toNum(data.lpFasen)||1, ...fcFase(data) };
    if (kw>0) r.kw = kw;
    if (data.lpMerk) r.n = String(data.lpMerk).slice(0,40);
    return [r];
  }
  if (discipline === "batterij") {
    // Hier is de accu de klus, dus is het redelijk om laden en ontladen apart te
    // vragen. Blijft het laadvermogen leeg, dan is hij symmetrisch — verreweg
    // het meest voorkomende geval — en gelden beide regels met dezelfde waarde.
    const ontladen = toNum(data.batKw);
    const laden = toNum(data.batKwLaad) > 0 ? toNum(data.batKwLaad) : ontladen;
    const fase = fcFase(data);
    return batterijRegels({ kwOntladen: ontladen, kwLaden: laden, naam: data.batMerk, f: fase.f, fn: fase.fn });
  }
  if (discipline === "pv") {
    const r = { t:"pv", rol:"voed", ...fcFase(data) };
    if (toNum(data.omvormerKw)>0) r.kw = toNum(data.omvormerKw);
    if (data.aantalPanelen) r.n = `PV ${data.aantalPanelen} panelen`.slice(0,40);
    return [r];
  }
  if (discipline === "wp") {
    const r = { t:"wp", rol:"af", ...fcFase(data) };
    if (data.wpType) r.n = String(data.wpType).slice(0,40);
    return [r];
  }
  return [];
}

// Bouwt het paspoort-object uit de app-data conform de spec-versie uit mkp.js (nu v0.2).
// Onbekende/lege velden worden weggelaten om de QR compact te houden.
export function mkpBouw(data, discipline) {
  const m = data.mkp || {};
  const p = { v: MKP_SPEC_VERSIE, d: new Date().toISOString().slice(0,10) };
  if (data.postcode)   p.pc = String(data.postcode).replace(/\s/g,"").toUpperCase();
  if (data.huisnummer) p.nr = String(data.huisnummer) + (data.toevoeging ? " " + String(data.toevoeging) : "");
  if (m.ean && eanValide(m.ean)) p.ean = String(m.ean).replace(/\s/g,"");
  if (m.ean2 && eanValide(m.ean2)) p.ean2 = String(m.ean2).replace(/\s/g,"");
  const bjBron = data.bouwjaar || m.bj || data.mkpImport?.bj;
  if (bjBron) p.bj = String(bjBron);
  const instB = data.instMetingen || {};
  const haA_inst = toNum(instB.hoofdzekering);
  if (haA_inst > 0) {
    p.ha = { f: instB.zDrieFase ? 3 : 1, a: haA_inst };
  } else if (m.haF || m.haA) {
    p.ha = {}; if (m.haF) p.ha.f = toNum(m.haF); if (toNum(m.haA)>0) p.ha.a = toNum(m.haA);
  } else if (data.mkpImport?.ha) {
    p.ha = data.mkpImport.ha;
  }
  if (m.kamMm2 || m.kamA) { p.kam = {}; if (m.kamMm2) p.kam.mm2 = toNum(m.kamMm2); if (m.kamA) p.kam.a = toNum(m.kamA); }
  const EIND_NAAR_MKP_B = { kook:"kook", pv:"pv", laad:"lp", batterij:"bat", kracht:"ov" };
  const kwByIdB = m.kwById || {};
  let grp = (data.aardlekgroepen||[]).flatMap(ag =>
    (ag.eindgroepen||[]).flatMap(e => {
      const r = {
        t: e.type ? (EIND_NAAR_MKP_B[e.type] || "ov") : "alg",
        rol: e.type==="pv" || e.type==="batterij" ? "voed" : "af",
        f: ag.fase==="3" ? 3 : 1,
      };
      // Spec v0.2 §4.4: `fn` is de LIJST fasenummers waarop de groep is
      // aangesloten — [1], [2], [3] of [1,2,3]. Niet `fase` met "L2": dat
      // schrijven zowel Kastscan als een eerdere versie van deze code, maar de
      // specificatie en de referentielezer op meterkastpaspoort.nl kennen dat
      // veld niet. Een lezer die zich aan de standaard houdt, ziet het dus niet.
      //
      // Alleen meesturen als de fase is vastgelegd — een gegokte fase is
      // schadelijker dan een ontbrekende, want het advies bouwt erop voort.
      // Intern heet het veld `L` omdat `fase` hier het AANTAL fasen aanduidt.
      if (r.f === 3) r.fn = [1, 2, 3];
      else if (["L1","L2","L3"].includes(ag.L)) r.fn = [Number(ag.L.slice(1))];
      const kw = toNum(kwByIdB[e.id]);
      if (kw > 0) r.kw = kw;
      if (e.naam) r.n = String(e.naam).slice(0,40);
      // Eén ingevuld vermogen per eindgroep; laden en ontladen apart vragen zou
      // de groepenlijst verdubbelen voor een geval dat zelden asymmetrisch is.
      // In de batterij-discipline, waar de accu zélf de klus is, kan het wel.
      if (r.t === "bat") return batterijRegels({ kwOntladen: kw, kwLaden: kw, naam: e.naam, f: r.f, fn: r.fn });
      return [r];
    })
  );
  if (!grp.length && Array.isArray(data.mkpImport?.grp)) grp = [...data.mkpImport.grp];  // gescand paspoort als basis
  // Startmodus (laadpaal/batterij/pv/wp): het eigen apparaat van deze klus.
  grp = [...grp, ...eigenApparaatRegels(data, discipline)];
  (m.extraGrp||[]).filter(g=>g.t).forEach(g=>{
    if (g.t === "bat" && !g.rol) {
      grp = [...grp, ...batterijRegels({ kwOntladen: g.kw, kwLaden: g.kw })];
      return;
    }
    const r = { t:g.t, rol:g.rol || (g.t==="pv" ? "voed" : "af") };
    if (toNum(g.kw)>0) r.kw = toNum(g.kw);
    grp = [...grp, r];
  });
  if (grp.length) p.grp = grp;
  if (m.lbAan !== undefined) {
    p.lb = { aan: !!m.lbAan };
    if (m.lbAan) {
      if (m.lbTyp) p.lb.typ = m.lbTyp;
      if (m.lbMax) p.lb.max = toNum(m.lbMax);
      if (m.lbReg) p.lb.reg = String(m.lbReg).slice(0,40);
    }
  }
  // De belastingcheck wordt nu BEREKEND in plaats van met de hand ingevuld
  // (roadmap 2.1). Alleen meesturen als er iets te toetsen viel: zonder
  // hoofdaansluiting of zonder een enkele bekende belasting zou "groen" een
  // uitspraak zijn die nergens op steunt.
  const chkUitkomst = belastingcheck(grp, p.ha, m.lbAan, p.d);
  if (chkUitkomst) p.chk = chkUitkomst;
  // Logboek: nieuwe regel bovenaan, geïmporteerde historie eronder, max 8 regels.
  const nieuweRegel = {
    d: p.d,
    b: (data.instBedrijf || data.instNaam || "installateur").slice(0,40),
    w: (m.logOmschrijving || data.typeWerk || "werkzaamheden meterkast").slice(0,60),
  };
  const oudeLog = Array.isArray(data.mkpImport?.log) ? data.mkpImport.log : [];
  p.log = [nieuweRegel, ...oudeLog].slice(0,8);
  return p;
}
