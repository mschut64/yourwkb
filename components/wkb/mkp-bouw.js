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
    (ag.eindgroepen||[]).map(e => {
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
      return r;
    })
  );
  if (!grp.length && Array.isArray(data.mkpImport?.grp)) grp = [...data.mkpImport.grp];  // gescand paspoort als basis
  // Startmodus (laadpaal/batterij): eigen apparaat + ter plekke gesignaleerde verbruikers toevoegen
  if (discipline === "laadpaal") {
    const kw = toNum(String(data.lpVermogen||"").replace(/[^0-9,\.]/g,""));
    const r = { t:"lp", rol:"af", f: toNum(data.lpFasen)||1 };
    if (kw>0) r.kw = kw; if (data.lpMerk) r.n = String(data.lpMerk).slice(0,40);
    grp = [...grp, r];
  } else if (discipline === "batterij") {
    const r = { t:"bat", rol:"voed" };
    if (toNum(data.batKw)>0) r.kw = toNum(data.batKw);
    if (data.batMerk) r.n = String(data.batMerk).slice(0,40);
    grp = [...grp, r];
  } else if (discipline === "pv") {
    const r = { t:"pv", rol:"voed" };
    if (toNum(data.omvormerKw)>0) r.kw = toNum(data.omvormerKw);
    if (data.aantalPanelen) r.n = `PV ${data.aantalPanelen} panelen`.slice(0,40);
    grp = [...grp, r];
  } else if (discipline === "wp") {
    const r = { t:"wp", rol:"af" };
    if (data.wpType) r.n = String(data.wpType).slice(0,40);
    grp = [...grp, r];
  }
  (m.extraGrp||[]).filter(g=>g.t).forEach(g=>{
    const r = { t:g.t, rol:g.rol || ((g.t==="pv"||g.t==="bat")?"voed":"af") };
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
