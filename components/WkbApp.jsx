'use client'
// YourWkb WkbApp.jsx — versie 2026-07-21-F
// BUGFIX: Z_max-toetsing (Wet van Ohm + automaatkarakteristiek) sloeg volledig over
// bij Klasse 2 (kunststof) kast — Zln=6Ω gaf geen foutmelding. Dit was fout: de
// toetsing gaat over of de automaat/zekering snel genoeg afschakelt bij kortsluiting,
// wat NIETS te maken heeft met het materiaal van de kast (dat gaat over aanraak-
// beveiliging via de behuizing, een ander onderwerp). Toetsing geldt nu altijd,
// ongeacht kastklasse — alleen TT-stelsel en onbekende/"Anders" karakteristiek
// maken automatische toetsing onmogelijk (net als voorheen).
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { trackEvent } from "./analytics";

// Robuuste numerieke parser — accepteert zowel komma als punt als decimaalteken.
// Zonder deze fix leest parseFloat("1,9") als 1 (stopt bij de komma) — dat veroorzaakte
// foutieve "Afwijking" meldingen bij correct ingevoerde waarden.
const toNum = (v) => {
  if (v === null || v === undefined || v === "") return NaN;
  return parseFloat(String(v).replace(",", "."));
};

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const K = {
  bg:"#111318", surface:"#1A1D25", card:"#20242F", border:"#2E3347",
  yellow:"#F5C518", yellowDim:"#2A240A",
  green:"#27AE60",  greenDim:"#0C2418",
  orange:"#F59E0B", orangeDim:"#2A1E08",
  red:"#E53935",    redDim:"#2A0C0C",
  blue:"#2196F3",   blueDim:"#0A1A2A",
  purple:"#9B59B6", purpleDim:"#1E0A2A",
  text:"#ECEEF5",   muted:"#636880",
};
const S = {
  app:    { background:K.bg, minHeight:"100vh", maxWidth:430, margin:"0 auto", fontFamily:"'IBM Plex Sans',sans-serif", color:K.text },
  hdr:    { padding:"16px 18px 14px", display:"flex", alignItems:"center", gap:12, background:K.surface, borderBottom:`1px solid ${K.border}`, position:"sticky", top:0, zIndex:20 },
  body:   { padding:"18px 18px 100px" },
  card:   { background:K.card, borderRadius:14, padding:16, border:`1px solid ${K.border}`, marginBottom:12 },
  btn:    { width:"100%", padding:"15px", borderRadius:12, border:"none", cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", fontWeight:600, fontSize:15, marginBottom:10 },
  input:  { width:"100%", padding:"11px 13px", borderRadius:10, border:`1px solid ${K.border}`, background:K.surface, color:K.text, fontFamily:"'IBM Plex Sans',sans-serif", fontSize:14, boxSizing:"border-box", outline:"none" },
  select: { width:"100%", padding:"11px 13px", borderRadius:10, border:`1px solid ${K.border}`, background:K.surface, color:K.text, fontFamily:"'IBM Plex Sans',sans-serif", fontSize:14, boxSizing:"border-box", outline:"none", appearance:"none" },
  label:  { fontSize:11, color:"#A8B0C0", fontWeight:700, letterSpacing:0.5, textTransform:"uppercase", marginBottom:5, display:"block" },
  sTitle: { fontSize:11, color:K.muted, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", marginBottom:10 },
  backBtn:{ width:34, height:34, borderRadius:8, border:`1px solid ${K.border}`, background:"transparent", color:K.text, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 },
  tag:    { display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:20, fontSize:11, fontWeight:700 },
};

// ─── DISCIPLINE DEFINITIES ────────────────────────────────────────────────────
const DISCIPLINES = [
  { id:"groepenkast", label:"Groepenkast",    icon:"⚡", sub:"Plaatsen of vervangen",     color:K.yellow,  colorDim:K.yellowDim, norm:"NEN1010",     available:true  },
  { id:"pv",          label:"Zonnepanelen",   icon:"☀️", sub:"PV installatie",            color:"#F97316", colorDim:"#2A1000",   norm:"NEN1010:712", available:true  },
  { id:"cv",          label:"Combiketel",     icon:"🔥", sub:"Plaatsen of vervangen",     color:"#EF4444", colorDim:"#2A0808",   norm:"BRL6000-25",  available:true  },
  { id:"wp",          label:"Warmtepomp",     icon:"🌡️", sub:"Lucht/water of bodem",     color:"#06B6D4", colorDim:"#042020",   norm:"BRL6000-21",  available:true  },
  { id:"batterij",    label:"Thuisbatterij",  icon:"🔋", sub:"Energieopslag",             color:"#8B5CF6", colorDim:"#1A0A30",   norm:"SCIOS S10",   available:false },
];

// ─── GROEPENKAST DATA ─────────────────────────────────────────────────────────
const GK_FABRIKANTEN = {
  "Hager":     { "SX serie": ["B10","B16","B20","B25","C10","C16","C20"], "MX serie": ["B10","B16","B20","B25","C10","C16"] },
  "Schneider": { "Acti9 iC60": ["B10","B16","B20","B25","C10","C16","C20","C32"], "Resi9": ["B10","B16","B20","B25","C16","C20"] },
  "ABB":       { "System pro M": ["B10","B16","B20","B25","C10","C16","C20"], "S200": ["B10","B16","B20","B25"] },
  "Eaton":     { "PL7": ["B10","B16","B20","B25","C10","C16"], "FAZ": ["B10","B16","B20","B32"] },
};
const ALS_FABS  = ["Hager","Schneider","ABB","Eaton","Siemens","Doepke","Anders"];
const ALS_TYPES = ["40A/2p/30mA type-A","40A/4p/30mA type-A","63A/2p/30mA type-A","63A/4p/30mA type-A","25A/2p/10mA type-A (bad)","40A/2p/30mA type-B","63A/4p/30mA type-B"];
const RCD_MA = ["10","30","100","300","500"];
const RCD_TYPE = ["A","B","AC","F"];
const KAR_TYPE = ["B","C","D"];
const GROEP_A  = ["6A","10A","16A","20A","25A","32A"];
// Voorgedefinieerde eindgroep-categorieën — snelkeuze die de naam automatisch invult.
// Laadgroep/thuisbatterij ook relevant wanneer die via de hoofdgroepenkast gevoed worden
// i.p.v. als losse discipline.
const EINDGROEP_TYPES = [
  { id:"kook",   icon:"🍳", label:"Kookgroep" },
  { id:"pv",     icon:"☀️", label:"PV-groep" },
  { id:"kracht", icon:"⚡", label:"Krachtgroep" },
  { id:"laad",   icon:"🔌", label:"Laadgroep (auto)" },
  { id:"batterij", icon:"🔋", label:"Thuisbatterij" },
];

// Foto's vóór de werkzaamheden (bestaande situatie)
const GK_FOTO_CPS_VOOR = [
  { id:"voor_dicht", label:"Bestaande situatie — kast dicht", icon:"📦", required:true, optioneelInRapport:true },
  { id:"voor_open",  label:"Bestaande situatie — kast open",  icon:"🔓", required:true  },
];
// Foto's ná de werkzaamheden (nieuwe situatie)
const GK_FOTO_CPS_NA = [
  { id:"na_open",  label:"Nieuwe situatie — kast open (bedrading)", icon:"🔌", required:true  },
  { id:"na_dicht", label:"Nieuwe situatie — kast dicht (afgewerkt)",icon:"✅", required:true  },
  { id:"label",    label:"Groepenbordje / schema",                  icon:"🏷️", required:false },
];
// Voor het rapport: alle GK foto checkpoints samen
const GK_FOTO_CPS = [...GK_FOTO_CPS_VOOR, ...GK_FOTO_CPS_NA];

// ─── ZONNEPANELEN DATA ────────────────────────────────────────────────────────
const PV_OMVORMER_FABS = ["SMA","Fronius","Enphase","Huawei","Growatt","Solis","GoodWe","ABB/FIMER","Victron"];
const PV_PANEEL_FABS   = ["Jinko Solar","LONGi","Canadian Solar","Trina Solar","SunPower","REC Group","Risen","JA Solar","Q CELLS"];
const PV_BEVESTIGING   = ["Schletter","K2 Systems","Esdec","SolarEdge Mounting","Renusol","Van der Valk","IronRidge"];

// Foto's vóór de werkzaamheden (bestaande situatie)
const PV_FOTO_CPS_VOOR = [
  { id:"voor_overzicht", label:"Bestaande situatie dak — overzicht",              icon:"📦", required:true, optioneelInRapport:true },
  { id:"voor_detail",    label:"Bestaande dakconstructie — detail (vóór montage)",icon:"🔍", required:true },
];
// Foto's ná de werkzaamheden (nieuwe situatie)
const PV_FOTO_CPS_NA = [
  { id:"constructie", label:"Bevestigingssysteem gemonteerd",    icon:"🔩", required:true  },
  { id:"panelen",     label:"Panelen geplaatst (totaaloverzicht)",icon:"☀️", required:true  },
  { id:"mc4",         label:"MC4 connectoren aangebracht",       icon:"🔌", required:true  },
  { id:"dc_kabel",    label:"DC-kabels (klasse 2 dubbel isol.)", icon:"🔋", required:true  },
  { id:"doorvoer",    label:"Doorvoeringen brandcompartiment",   icon:"🧱", required:true  },
  { id:"aarding",     label:"Aarding draagconstructie",          icon:"⚡", required:true  },
  { id:"omvormer",    label:"Omvormer gemonteerd + aangesloten", icon:"📟", required:true  },
  { id:"ballast",     label:"Ballastplan aanwezig (foto)",       icon:"📋", required:true  },
  { id:"legplan",     label:"Legplan aanwezig (foto)",           icon:"📐", required:true  },
  { id:"na_afgewerkt",label:"Nieuwe situatie — eindresultaat dak (afgewerkt)", icon:"✅", required:true  },
  { id:"display",     label:"Omvormer display in bedrijf",       icon:"📺", required:false },
];
// Voor het rapport: alle PV foto checkpoints samen
const PV_FOTO_CPS = [...PV_FOTO_CPS_VOOR, ...PV_FOTO_CPS_NA];

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
  const isoTot = toNum(instMet.isoTot);
  if (!isNaN(isoTot)) {
    if (isoTot < 0.23)
      warnings.push({ level:"red", msg:`ISO totaal ${isoTot} MΩ — ONDER NORM (≥0,23 MΩ)` });
    else if (isoTot < 0.35)
      warnings.push({ level:"orange", msg:`ISO totaal ${isoTot} MΩ — net boven minimum (≥0,23 MΩ)` });
  }

  const probleemGroepen = instMet.isoTotProblemGroepen || [];
  (aardlekgroepen||[]).forEach(ag => {
    const geenRcd = ag.rcdType === "geen";
    const hoogst = (ag.eindgroepen||[]).find(e=>e.id===ag.hoogstId) || ag.eindgroepen?.[0];

    // ISO per aardlekgroep alleen toetsen als deze groep als probleemgroep is aangemerkt
    // (dus alleen relevant nadat de ISO totaal-meting een afwijking toonde)
    if (probleemGroepen.includes(ag.id)) {
      const norm = ag.fase==="3" ? 0.40 : 0.23;
      const isoKeys = ag.fase==="3"
        ? [["iso_l1a","L1→Aarde"],["iso_l2a","L2→Aarde"],["iso_l3a","L3→Aarde"],["iso_na","N→Aarde"]]
        : [["iso_fa","Fase→Aarde"],["iso_na","Nul→Aarde"]];
      isoKeys.forEach(([k,label]) => {
        const iso = toNum(grpMeet[`${ag.id}_${k}`]);
        if (!isNaN(iso)) {
          if (iso < norm)
            warnings.push({ level:"red", msg:`${ag.naam} (${label}): ISO ${iso} MΩ — ONDER NORM (≥${norm} MΩ)` });
          else if (iso < norm * 1.5)
            warnings.push({ level:"orange", msg:`${ag.naam} (${label}): ISO ${iso} MΩ — net boven minimum (≥${norm} MΩ), controleer bedrading` });
        }
      });
    }

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
    }
  });

  // Spanning asymmetrie
  const l1 = toNum(instMet["span_L1/N"]);
  const l2 = toNum(instMet["span_L2/N"]);
  const l3 = toNum(instMet["span_L3/N"]);
  if (!isNaN(l1) && !isNaN(l2) && !isNaN(l3)) {
    const diff = Math.max(l1,l2,l3) - Math.min(l1,l2,l3);
    if (diff > 6) warnings.push({ level:"orange", msg:`Fasespanning asymmetrie ${diff.toFixed(1)}V — controleer netaansluiting` });
  }

  // A) IMPEDANTIE — Z L-N/L-PE check op basis van hoogst afgaande groep (EN 60898)
  // Z_max = 230 / (factor × In)  factor: B=5, C=10, D=20, gG=4
  if (!isTT) {
    const karFac = { B:5, C:10, D:20, gG:4 };
    const vKar = instMet.hoogstKar || "B";
    const vA   = toNum(instMet.hoogstAmpere);
    if (!isNaN(vA) && vA > 0 && karFac[vKar]) {
      const zMax = 230 / (karFac[vKar] * vA);
      const zlpe = toNum(instMet.zlpe);
      const zln  = toNum(instMet.zln);
      if (!isNaN(zlpe) && zlpe > zMax * 0.9 && zlpe <= zMax)
        warnings.push({ level:"orange", msg:`Z L-PE ${zlpe}Ω nadert maximum voor ${vKar}${vA}A (Z_max=${zMax.toFixed(2)}Ω) — bij uitbreiding opnieuw meten` });
      if (!isNaN(zlpe) && zlpe > zMax)
        warnings.push({ level:"red", msg:`Z L-PE ${zlpe}Ω boven Z_max (${zMax.toFixed(2)}Ω voor ${vKar}${vA}A) — Icc te laag voor kortsluitbeveiliging` });
      if (!isNaN(zln) && zln > zMax)
        warnings.push({ level:"red", msg:`Z L-N ${zln}Ω boven Z_max (${zMax.toFixed(2)}Ω voor ${vKar}${vA}A) — Icc te laag voor kortsluitbeveiliging` });
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
  if (instMet.badkamerCAP === "Nee")
    warnings.push({ level:"orange", msg:`Badkamer niet voorzien van Centraal Aardpunt — controleer of dit vereist is` });
  if (instMet.rookmelder === "Ja" && instMet.rookmelderProjectie === "Nee")
    warnings.push({ level:"orange", msg:`Rookmelder niet juist geprojecteerd volgens NEN2555` });

  return warnings;
}

// PV cross-checks
function pvCrossChecks(strings, instMet, materiaal) {
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
    if (ratio > 1.35) warnings.push({ level:"orange", msg:`DC/AC ratio ${ratio.toFixed(2)} is hoog (>${1.35}) — controleer omvormer specificaties` });
    if (ratio < 0.8)  warnings.push({ level:"orange", msg:`DC/AC ratio ${ratio.toFixed(2)} is laag (<0.8) — omvormer mogelijk te groot` });
  }
  // Aarding check
  if (instMet.aardingOk === "NOK")
    warnings.push({ level:"red", msg:`Aarding draagconstructie NOK — installatie niet in bedrijf stellen` });
  return warnings;
}

// ─── GEDEELDE HELPERS ─────────────────────────────────────────────────────────
const Pill = ({ active, onClick, children, small }) => (
  <button onClick={onClick} style={{
    padding: small ? "6px 10px" : "8px 14px", borderRadius:20,
    border:`1px solid ${active ? K.yellow : K.border}`,
    background: active ? K.yellowDim : "transparent",
    color: active ? K.yellow : K.muted,
    fontFamily:"'IBM Plex Sans',sans-serif", fontWeight:600,
    fontSize: small ? 12 : 13, cursor:"pointer", whiteSpace:"nowrap",
  }}>{children}</button>
);

const StatusTag = ({ level }) => {
  const cfg = {
    ok:     { bg:K.greenDim,  color:K.green,   label:"✓ OK" },
    orange: { bg:K.orangeDim, color:K.orange,  label:"⚠ Let op" },
    red:    { bg:K.redDim,    color:K.red,     label:"✗ Afwijking" },
  };
  const c = cfg[level] || cfg.ok;
  return <span style={{ ...S.tag, background:c.bg, color:c.color }}>{c.label}</span>;
};

// ─── LEERVIDEO'S ──────────────────────────────────────────────────────────────
// Centrale plek voor alle uitlegvideo's. Vul hier de echte links in zodra ze
// beschikbaar zijn — de rest van de app hoeft dan niet aangepast te worden.
// Key = vrij te kiezen onderwerp-ID, gebruikt door <LeerIcoon onderwerp="..." />
// Korte tekstuele uitleg per onderwerp — vervangt de video's die er nog niet zijn.
// Blijft bruikbaar als aanvulling zodra er wel video's komen (url dan optioneel toevoegen).
const LEERUITLEG = {
  iso_meting: {
    titel: "Isolatieweerstand (ISO) meten",
    tekst: "De isolatieweerstand test of de bedrading nog goed geïsoleerd is tussen de aders onderling en naar aarde. Een lage waarde wijst op vochtdoordringing, beschadigde kabelisolatie of een defect apparaat. Meet bij voorkeur met alle apparatuur losgekoppeld en verlichting uit (anders meet je mee door aangesloten apparatuur, wat de waarde kunstmatig verlaagt). Norm bestaande installatie: ≥0,23 MΩ bij 1-fase, ≥0,40 MΩ bij 3-fase, gemeten op 250V. Voor de totale installatie (vanaf de hoofdschakelaar) geldt een strengere norm van ≥1 MΩ.",
  },
  stelsel_tn_tt: {
    titel: "TN vs. TT-stelsel",
    tekst: "Het verschil zit in hoe de installatie beveiligd is tegen een fout naar aarde. Bij een TN-stelsel (TN-C-S of TN-S, in Nederland het meest voorkomend) loopt de retourstroom bij een fout via een vaste PE-verbinding terug naar de bron — de automaat/zekering lost dan snel op door de hoge kortsluitstroom. Bij een TT-stelsel is er geen vaste PE-verbinding naar de bron; de beveiliging verloopt dan via de aardlekschakelaar (RCD), niet via de kortsluitstroom. Daardoor kan de lus-impedantie (Z L-PE) bij TT-installaties hoog zijn zonder dat dit een probleem is — dat is dan geen afwijking maar normaal voor dat stelsel.",
  },
  aardlekgroep: {
    titel: "Aardlekgroep & hoogst afgaande groep",
    tekst: "Een aardlekgroep is een cluster van eindgroepen die allemaal door dezelfde aardlekschakelaar (RCD) worden beveiligd. Binnen zo'n cluster meet je niet elke eindgroep apart door — je meet op de 'hoogst afgaande groep': de eindgroep met de hoogste stroomsterkte (bijvoorbeeld de 32A-groep in plaats van een 16A-lichtgroep). Als die hoogst belaste groep binnen de norm valt, geldt dat als representatief voor de rest van het cluster, omdat die minder zwaar belast worden.",
  },
  delta_t_i: {
    titel: "ΔT en ΔI van de aardlekschakelaar",
    tekst: "ΔT is de tijd die de aardlekschakelaar nodig heeft om uit te schakelen zodra er een lekstroom optreedt — de norm is altijd ≤300ms (EN 61008), ongeacht het stelsel. ΔI is de lekstroom waarbij de RCD daadwerkelijk afslaat, getoetst aan een percentage van de nominale waarde: bij type AC ≤1× In, type A ≤1,4× In (vanwege de extra marge voor pulserende gelijkstroom), en type B ≤2× In. Beide waarden meet je met de testfunctie van je installatietester.",
  },
  potentiaalvereffening: {
    titel: "Potentiaalvereffening — hoofd en aanvullend",
    tekst: "Potentiaalvereffening zorgt dat alle geleidende delen in een gebouw (waterleiding, cv-leidingen, metalen kozijnen, etc.) op hetzelfde elektrische potentiaal zitten, zodat er bij een fout geen gevaarlijk spanningsverschil kan ontstaan tussen bijvoorbeeld een kraan en een stopcontact. De hoofdpotentiaalvereffening verbindt de invoerende leidingen (water, gas, CV) bij binnenkomst met de aarde. Aanvullende potentiaalvereffening is verplicht in natte ruimtes zoals badkamers (NEN1010 art. 701) — daar moet ook het Centraal Aardpunt aanwezig zijn.",
  },
  selectiviteit: {
    titel: "Selectiviteit van beveiligingen",
    tekst: "Selectiviteit betekent dat bij een fout alleen de dichtstbijzijnde beveiliging (automaat/zekering) uitschakelt, en niet ook de groepen erboven in de installatie. Dit voorkom je door de karakteristieken en stroomwaarden goed op elkaar af te stemmen — bijvoorbeeld een B16 eindgroep-automaat onder een C32 hoofdautomaat, zodat de eindgroep-automaat altijd eerder reageert dan de hoofdautomaat. Zonder goede selectiviteit valt bij een enkele storing mogelijk de hele installatie uit in plaats van alleen de betreffende groep.",
  },
};

// Klein ⓘ-icoontje dat een popup met uitleg toont. Toon alleen als het
// onderwerp in LEERUITLEG bestaat — voorkomt lege popups per ongeluk.
const LeerIcoon = ({ onderwerp }) => {
  const [open, setOpen] = useState(false);
  const info = LEERUITLEG[onderwerp];
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!info) return null;
  return (
    <>
      <button type="button"
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        title={info.titel}
        style={{
          display:"inline-flex", alignItems:"center", justifyContent:"center",
          width:16, height:16, borderRadius:"50%",
          background:K.purpleDim, color:K.purple,
          fontSize:11, fontWeight:700, textDecoration:"none",
          marginLeft:5, flexShrink:0, verticalAlign:"middle",
          border:`1px solid ${K.purple}55`, cursor:"pointer", padding:0,
          fontFamily:"inherit",
        }}>
        ⓘ
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div onClick={()=>setOpen(false)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:1000,
          display:"flex", alignItems:"center", justifyContent:"center", padding:20,
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:K.card, borderRadius:14, padding:20, maxWidth:420, width:"100%",
            border:`1px solid ${K.border}`, maxHeight:"80vh", overflowY:"auto", position:"relative",
          }}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10, gap:12}}>
              <div style={{fontWeight:700, fontSize:15, color:K.purple}}>{info.titel}</div>
              <button type="button" onClick={(e)=>{e.stopPropagation(); setOpen(false);}} style={{
                background:K.surface, border:`1px solid ${K.border}`, color:K.text, fontSize:20,
                cursor:"pointer", lineHeight:1, padding:0, width:36, height:36, borderRadius:"50%",
                flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
              }}>×</button>
            </div>
            <div style={{fontSize:13, color:K.text, lineHeight:1.6}}>{info.tekst}</div>
            <button type="button" onClick={()=>setOpen(false)} style={{
              marginTop:16, width:"100%", padding:"10px 0", borderRadius:10,
              border:`1px solid ${K.border}`, background:K.surface, color:K.muted,
              fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
            }}>Sluiten</button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

const MiniInput = ({ value, onChange, placeholder, unit, width=80 }) => (
  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
    <input style={{ ...S.input, width, padding:"8px 10px", fontSize:13 }}
      value={value||""} onChange={e=>onChange(e.target.value)}
      onFocus={e=>e.target.select()}
      placeholder={placeholder||"—"}/>
    {unit && <span style={{ fontSize:11, color:K.muted, whiteSpace:"nowrap" }}>{unit}</span>}
  </div>

);

const MiniSelect = ({ value, onChange, options, width=90 }) => (
  <select style={{ ...S.select, width, padding:"8px 10px", fontSize:13 }}
    value={value||""} onChange={e=>onChange(e.target.value)}>
    <option value="">—</option>
    {options.map(o=><option key={o}>{o}</option>)}
  </select>
);

const WarnBox = ({ warnings }) => {
  if (!warnings || warnings.length === 0) return (
    <div style={{ ...S.card, background:K.greenDim, border:`1px solid ${K.green}44`, marginBottom:12 }}>
      <div style={{ fontSize:13, color:K.green, fontWeight:600 }}>✅ Alle cross-checks geslaagd — installatie ziet er goed uit</div>
    </div>
  );
  return (
    <div style={{ ...S.card, background:K.orangeDim, border:`1px solid ${K.orange}44`, marginBottom:12 }}>
      <div style={{ fontSize:12, color:K.orange, fontWeight:700, marginBottom:8 }}>⚠️ {warnings.length} aandachtspunt{warnings.length > 1 ? "en" : ""} gevonden</div>
      {warnings.map((w,i) => (
        <div key={i} style={{ fontSize:12, color: w.level==="red" ? K.red : K.orange, marginBottom:4, paddingLeft:8, borderLeft:`2px solid ${w.level==="red"?K.red:K.orange}` }}>
          {w.msg}
        </div>
      ))}
    </div>
  );
};

// AI technische analyse — redeneert over de combinatie van meetwaarden
function AIAnalyseBox({ prompt, analyse, onAnalyse }) {
  const [status, setStatus] = useState(analyse ? "done" : "idle");
  const [errMsg, setErrMsg] = useState("");

  const analyseer = async () => {
    setStatus("busy");
    setErrMsg("");
    try {
      const resp = await fetch("/api/rapport", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ prompt })
      });
      const json = await resp.json();
      if (json.error) throw new Error(json.error);
      if (!json.html) throw new Error("Geen antwoord ontvangen van de AI");
      onAnalyse(json.html);
      setStatus("done");
      trackEvent("ai_analyse_gebruikt", { success: true });
    } catch(e) {
      setErrMsg(e.message || "Onbekende fout");
      setStatus("error");
      trackEvent("ai_analyse_gebruikt", { success: false });
    }
  };

  return (
    <div style={{marginBottom:12}}>
      {status==="idle" && (
        <button style={{...S.btn,background:K.purpleDim,color:K.purple,border:`1px solid ${K.purple}55`,marginBottom:0}} onClick={analyseer}>
          🤖 Analyseer installatie (AI)
        </button>
      )}
      {status==="busy" && (
        <div style={{...S.card,background:K.purpleDim,border:`1px solid ${K.purple}44`,textAlign:"center",padding:20,marginBottom:0}}>
          <div style={{fontSize:24,marginBottom:8}}>🤖</div>
          <div style={{fontWeight:600,fontSize:13,color:K.purple}}>Installatie wordt geanalyseerd…</div>
        </div>
      )}
      {status==="error" && (
        <div style={{...S.card,background:K.redDim,border:`1px solid ${K.red}44`,marginBottom:0}}>
          <div style={{fontSize:12,color:K.red,marginBottom:4,fontWeight:600}}>⚠️ Analyse mislukt</div>
          {errMsg && <div style={{fontSize:11,color:K.red,marginBottom:8,opacity:0.85,fontFamily:"monospace"}}>{errMsg}</div>}
          <button style={{...S.btn,background:K.surface,color:K.text,border:`1px solid ${K.border}`,marginBottom:0}} onClick={analyseer}>Opnieuw proberen</button>
        </div>
      )}
      {status==="done" && analyse && (
        <div style={{...S.card,background:K.purpleDim,border:`1px solid ${K.purple}44`,marginBottom:0}}>
          <div style={{fontSize:12,color:K.purple,fontWeight:700,marginBottom:8}}>🤖 Technische beoordeling</div>
          <div style={{fontSize:12,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{analyse}</div>
          <button style={{marginTop:10,padding:"7px 12px",borderRadius:8,border:`1px solid ${K.purple}55`,background:"transparent",color:K.purple,fontFamily:"'IBM Plex Sans',sans-serif",fontSize:12,fontWeight:600,cursor:"pointer"}} onClick={analyseer}>
            🔄 Opnieuw analyseren
          </button>
        </div>
      )}
    </div>
  );
}

function StepBar({ step, steps, onJump }) {
  return (
    <div style={{ display:"flex", alignItems:"center", padding:"10px 14px", background:K.surface, borderBottom:`1px solid ${K.border}`, gap:0, overflowX:"auto" }}>
      {steps.map((s,i) => {
        const voltooid = i < step;
        const huidig = i === step;
        const klikbaar = voltooid && onJump; // alleen voltooide stappen zijn klikbaar
        return (
          <div key={s} style={{ display:"flex", alignItems:"center", flex: i<steps.length-1?1:0 }}>
            <div
              onClick={klikbaar ? () => onJump(i) : undefined}
              title={klikbaar ? `Terug naar: ${s}` : (huidig ? `Huidige stap: ${s}` : `${s} (nog niet bereikt)`)}
              style={{
                width:26, height:26, borderRadius:"50%", flexShrink:0,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontWeight:700, fontSize:11,
                background: voltooid ? K.green : huidig ? K.yellow : K.border,
                color: voltooid ? "#fff" : huidig ? "#000" : K.muted,
                cursor: klikbaar ? "pointer" : "default",
                transition: "transform 0.1s",
              }}
              onMouseEnter={klikbaar ? (e) => e.currentTarget.style.transform = "scale(1.15)" : undefined}
              onMouseLeave={klikbaar ? (e) => e.currentTarget.style.transform = "scale(1)" : undefined}
            >{voltooid ? "✓" : i+1}</div>
            {i<steps.length-1 && <div style={{ flex:1, height:2, background: voltooid?K.green:K.border, margin:"0 3px", minWidth:6 }}/>}
          </div>
        );
      })}
    </div>
  );
}

// ─── GEDEELDE STAPPEN ─────────────────────────────────────────────────────────

function StapKlant({ data, onChange, onNext, onBack, discipline }) {
  const disc = DISCIPLINES.find(d => d.id === discipline);
  const [pcStatus, setPcStatus] = useState(""); // "" | "loading" | "found" | "error"

  const buildId = (pc,nr) => {
    const c=(pc||"").replace(/\s/g,"").toUpperCase();
    const n=(nr||"").trim();
    return c&&n ? `${c}-${n}` : "";
  };

  // Postcode lookup via PDOK Locatieserver (gratis overheids-open-data, geen API key nodig)
  const lookupPostcode = async (pc, nr) => {
    const cleanPc = pc.replace(/\s/g,"").toUpperCase();
    const cleanNr = nr.trim().replace(/\D/g,""); // alleen cijfers voor de API
    if (cleanPc.length !== 6 || !cleanNr) return;
    setPcStatus("loading");
    try {
      const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?fq=postcode:${cleanPc}&fq=huisnummer:${cleanNr}&fl=straatnaam,woonplaatsnaam&rows=1`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error();
      const json = await resp.json();
      const doc = json?.response?.docs?.[0];
      if (doc?.straatnaam && doc?.woonplaatsnaam) {
        onChange("straat", doc.straatnaam);
        onChange("plaats", doc.woonplaatsnaam);
        setPcStatus("found");
      } else {
        setPcStatus("error");
      }
    } catch {
      setPcStatus("error");
    }
  };

  const handlePc = (v) => {
    onChange("postcode", v);
    onChange("projectId", buildId(v, data.huisnummer));
    if (v.replace(/\s/g,"").length === 6 && data.huisnummer) lookupPostcode(v, data.huisnummer);
  };

  const handleNr = (v) => {
    onChange("huisnummer", v);
    onChange("projectId", buildId(data.postcode, v));
    if (data.postcode?.replace(/\s/g,"").length === 6 && v) lookupPostcode(data.postcode, v);
  };

  const pid = data.projectId || buildId(data.postcode, data.huisnummer);
  const ok  = data.naam && data.postcode && data.huisnummer && data.email;

  const typeWerkOpties = {
    groepenkast: [], // bewust leeg — heeft geen impact op de rest van de app
    pv:          [], // idem — consistent gemaakt met groepenkast
    cv:          [], // idem
    wp:          [], // idem
  };

  return (
    <div>
      <div style={S.hdr}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:15 }}>Nieuw project — gegevens klant</div>
          <div style={{ fontSize:11, color:K.muted }}>Stap 1 van {disc?.label} · geen account nodig</div>
        </div>
        <div style={{ fontSize:22 }}>{disc?.icon}</div>
      </div>
      <div style={S.body}>
        <div style={{fontSize:11,color:K.muted,marginBottom:14,lineHeight:1.4}}>
          Vul hieronder de gegevens van de klant/het adres in waar je dit project uitvoert. Je hoeft je zelf nergens voor te registreren.
        </div>
        {pid && (
          <div style={{ ...S.card, background:K.yellowDim, border:`1px solid ${K.yellow}55`, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:20 }}>📁</span>
            <div>
              <div style={{ fontSize:10, color:K.yellow, fontWeight:700, textTransform:"uppercase" }}>Projectnummer</div>
              <div style={{ fontSize:20, fontWeight:800, color:K.yellow, letterSpacing:1 }}>{pid}</div>
            </div>
          </div>
        )}
        <div style={S.card}>
          {/* Postcode + huisnummer */}
          <div style={{ display:"flex", gap:10, marginBottom:4 }}>
            <div style={{ flex:2 }}>
              <label style={S.label}>Postcode</label>
              <input style={{ ...S.input, textTransform:"uppercase" }} placeholder="1234 AB"
                value={data.postcode||""} onChange={e=>handlePc(e.target.value)} maxLength={7}/>
            </div>
            <div style={{ flex:1 }}>
              <label style={S.label}>Huisnr.</label>
              <input style={S.input} placeholder="12A" value={data.huisnummer||""}
                onChange={e=>handleNr(e.target.value)}/>
            </div>
          </div>

          {/* Postcode status */}
          <div style={{ marginBottom:12, minHeight:20 }}>
            {pcStatus==="loading" && <div style={{ fontSize:11, color:K.muted }}>🔍 Adres opzoeken…</div>}
            {pcStatus==="found"   && <div style={{ fontSize:11, color:K.green }}>✓ Adres gevonden</div>}
            {pcStatus==="error"   && <div style={{ fontSize:11, color:K.orange }}>⚠ Adres niet gevonden — vul handmatig in</div>}
          </div>

          {/* Straat + plaats — automatisch ingevuld of handmatig */}
          <div style={{ display:"flex", gap:10, marginBottom:12 }}>
            <div style={{ flex:2 }}>
              <label style={S.label}>Straatnaam</label>
              <input style={{ ...S.input, color: pcStatus==="found" ? K.green : K.text }}
                placeholder="Kerkstraat" value={data.straat||""} onChange={e=>onChange("straat",e.target.value)}/>
            </div>
            <div style={{ flex:1 }}>
              <label style={S.label}>Plaats</label>
              <input style={{ ...S.input, color: pcStatus==="found" ? K.green : K.text }}
                placeholder="Utrecht" value={data.plaats||""} onChange={e=>onChange("plaats",e.target.value)}/>
            </div>
          </div>

          {[{k:"naam",l:"Naam klant",ph:"Familie De Groot"},{k:"email",l:"E-mail klant",ph:"klant@mail.nl"}].map(({k,l,ph})=>(
            <div key={k} style={{ marginBottom:12 }}>
              <label style={S.label}>{l}</label>
              <input style={S.input} placeholder={ph} value={data[k]||""} onChange={e=>onChange(k,e.target.value)}/>
            </div>
          ))}
          {typeWerkOpties[discipline]?.length > 0 && (
            <>
              <label style={S.label}>Type werk</label>
              <select style={S.select} value={data.typewerk||""} onChange={e=>onChange("typewerk",e.target.value)}>
                <option value="">Kies type</option>
                {typeWerkOpties[discipline].map(o=><option key={o}>{o}</option>)}
              </select>
            </>
          )}
        </div>
        <button style={{ ...S.btn, background:ok?K.yellow:K.border, color:ok?"#000":K.muted }}
          onClick={ok?onNext:undefined}>Volgende →</button>
        {!ok && <div style={{ fontSize:11, color:K.muted, textAlign:"center", marginTop:-4 }}>Vul alle velden in</div>}
      </div>
    </div>
  );
}

function StapInstallateur({ data, onChange, onNext, onBack }) {
  const [opgeslagen, setOpgeslagen] = useState(false);

  // Laad profiel uit localStorage bij eerste render
  useEffect(() => {
    try {
      const profiel = JSON.parse(localStorage.getItem("ywkb_installateur")||"{}");
      if (profiel.instNaam && !data.instNaam) {
        Object.entries(profiel).forEach(([k,v]) => onChange(k,v));
      }
    } catch {}
  }, []);

  const slaProfielOp = () => {
    try {
      const profiel = {
        instNaam:      data.instNaam||"",
        instAdres:     data.instAdres||"",
        instPlaats:    data.instPlaats||"",
        instTel:       data.instTel||"",
        instEmail:     data.instEmail||"",
        instErkenning: data.instErkenning||"",
      };
      localStorage.setItem("ywkb_installateur", JSON.stringify(profiel));
      setOpgeslagen(true);
      setTimeout(()=>setOpgeslagen(false), 2500);
    } catch {}
  };

  const ok = data.instNaam && data.instErkenning;

  return (
    <div>
      <div style={S.hdr}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:15 }}>Installateur</div>
          <div style={{ fontSize:11, color:K.muted }}>Stap 2 · wordt onthouden</div>
        </div>
        {/* Opslaan knop */}
        <button onClick={slaProfielOp} style={{
          padding:"6px 12px", borderRadius:8,
          border:`1px solid ${opgeslagen?K.green:K.border}`,
          background: opgeslagen?K.greenDim:"transparent",
          color: opgeslagen?K.green:K.muted,
          fontFamily:"'IBM Plex Sans',sans-serif", fontSize:12, fontWeight:600, cursor:"pointer",
        }}>
          {opgeslagen ? "✓ Opgeslagen" : "💾 Onthouden"}
        </button>
      </div>
      <div style={S.body}>
        {/* Info banner */}
        <div style={{ ...S.card, background:K.blueDim, border:`1px solid ${K.blue}33`, marginBottom:16, padding:"10px 14px" }}>
          <div style={{ fontSize:12, color:K.blue }}>
            💡 Tik <strong>"Onthouden"</strong> om je gegevens op te slaan. De volgende keer zijn ze automatisch ingevuld.
          </div>
        </div>
        <div style={S.card}>
          {[
            {k:"instNaam",      l:"Naam / bedrijf",        ph:"Kevin Elektro",    required:true  },
            {k:"instAdres",     l:"Adres",                 ph:"Werkstraat 5",     required:false },
            {k:"instPlaats",    l:"Plaats",                ph:"Amsterdam",        required:false },
            {k:"instTel",       l:"Telefoon",              ph:"06-12345678",      required:false },
            {k:"instEmail",     l:"E-mail",                ph:"kevin@elektro.nl", required:false },
            {k:"instErkenning", l:"Erkenningsnummer",      ph:"E-12345",          required:true  },
          ].map(({k,l,ph,required})=>(
            <div key={k} style={{ marginBottom:12 }}>
              <label style={S.label}>
                {l} {required && <span style={{ color:K.red }}>*</span>}
              </label>
              <input style={S.input} placeholder={ph} value={data[k]||""} onChange={e=>onChange(k,e.target.value)}/>
            </div>
          ))}
        </div>
        <button style={{ ...S.btn, background:ok?K.yellow:K.border, color:ok?"#000":K.muted }}
          onClick={ok?onNext:undefined}>Volgende →</button>
      </div>
    </div>
  );
}

function StapMeetapparatuur({ data, onChange, onNext, onBack, discipline }) {
  const [opgeslagen, setOpgeslagen] = useState(false);
  const velden = discipline === "pv"
    ? [{k:"apparTester",l:"Isolatietester / PV-analysator",ph:"Fluke 1664 FC / Amprobe PV-200"},{k:"apparMulti",l:"Multimeter",ph:"Fluke 179"},{k:"apparIR",l:"IR camera (optioneel)",ph:"FLIR E6 of n.v.t."}]
    : discipline === "cv"
    ? [{k:"apparAnalyser",l:"Rookgasanalyser (conform EN50379-2)",ph:"Testo 300 / Kane 455"},{k:"apparCO",l:"Persoonlijke CO-meter omgeving",ph:"CO Clip / Dräger X-am"},{k:"apparManometer",l:"Manometer waterdruk",ph:"Sauermann Si-5100"},{k:"apparGasdruk",l:"Gasdrukmanometer",ph:"Testo 510"},{k:"apparMulti",l:"Multimeter / thermometer",ph:"Fluke 179"}]
    : discipline === "wp"
    ? [{k:"apparThermo",l:"Thermometer / temperatuurmeter",ph:"Testo 905i"},{k:"apparManometer",l:"Manometer (verwarmingscircuit)",ph:"Sauermann Si-5100"},{k:"apparEnergie",l:"Energiemeter (opgenomen vermogen)",ph:"Fluke 1735 / energiemeter inbouw"},{k:"apparGeluid",l:"Geluidsmeter (optioneel)",ph:"dB-meter app of Testo 816"},{k:"apparMulti",l:"Multimeter",ph:"Fluke 179"}]
    : [{k:"apparTester",l:"Installatietester",ph:"Fluke 1664 FC"},{k:"apparTang",l:"Stroomtang",ph:"Fluke 376 FC"},{k:"apparIR",l:"IR camera",ph:"FLIR E6 of n.v.t."},{k:"apparMulti",l:"Multimeter",ph:"Fluke 179"}];

  // Laad eerder opgeslagen meetapparatuur (per discipline) bij eerste render
  useEffect(() => {
    try {
      const opg = JSON.parse(localStorage.getItem(`ywkb_apparatuur_${discipline}`)||"{}");
      Object.entries(opg).forEach(([k,v]) => { if (v && !data[k]) onChange(k,v); });
    } catch {}
  }, []);

  const slaApparatuurOp = () => {
    try {
      const obj = {};
      velden.forEach(({k}) => { obj[k]=data[k]||""; obj[`${k}_cal`]=data[`${k}_cal`]||""; });
      localStorage.setItem(`ywkb_apparatuur_${discipline}`, JSON.stringify(obj));
      setOpgeslagen(true);
      setTimeout(()=>setOpgeslagen(false), 2500);
    } catch {}
  };

  return (
    <div>
      <div style={S.hdr}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{flex:1}}><div style={{ fontWeight:700, fontSize:15 }}>Meetapparatuur</div><div style={{ fontSize:11, color:K.muted }}>Stap 3 · met kalibratiedatum</div></div>
        <button onClick={slaApparatuurOp} style={{
          padding:"6px 12px", borderRadius:8,
          border:`1px solid ${opgeslagen?K.green:K.border}`,
          background: opgeslagen?K.greenDim:"transparent",
          color: opgeslagen?K.green:K.muted,
          fontFamily:"'IBM Plex Sans',sans-serif", fontSize:12, fontWeight:600, cursor:"pointer",
        }}>
          {opgeslagen ? "✓ Opgeslagen" : "💾 Onthouden"}
        </button>
      </div>
      <div style={S.body}>
        <div style={{ fontSize:12, color:K.muted, marginBottom:14 }}>Verplicht te vermelden in het rapport. Tik "Onthouden" om dezelfde apparatuur volgende keer automatisch in te vullen.</div>
        <div style={S.card}>
          {velden.map(({k,l,ph})=>(
            <div key={k} style={{ marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${K.border}` }}>
              <label style={S.label}>{l}</label>
              <input style={{...S.input,marginBottom:8}} placeholder={ph} value={data[k]||""} onChange={e=>onChange(k,e.target.value)}/>
              <label style={{...S.label,fontSize:10}}>Kalibratiedatum</label>
              <input style={S.input} type="date" value={data[`${k}_cal`]||""} onChange={e=>onChange(`${k}_cal`,e.target.value)}/>
            </div>
          ))}
        </div>
        <button style={{ ...S.btn, background:K.yellow, color:"#000" }} onClick={onNext}>Volgende →</button>
      </div>
    </div>
  );
}

// ─── GROEPENKAST STAPPEN ──────────────────────────────────────────────────────

function GK_StapMateriaal({ data, onChange, onNext, onBack }) {
  const [fab,setFab]     = useState(data.fab||"");
  const [serie,setSerie] = useState(data.serie||"");
  const [automaten,setAut] = useState(data.automaten||[]);
  const [fabAnders,setFabAnders] = useState(data.fabAnders||"");
  const series = fab && fab!=="Anders" ? Object.keys(GK_FABRIKANTEN[fab]||{}) : [];
  const types  = serie ? GK_FABRIKANTEN[fab]?.[serie]||[] : [];
  const addAut = (type) => {
    const merkNaam = fab==="Anders" ? (fabAnders||"Anders") : fab;
    const ex = automaten.find(a=>a.type===type&&a.serie===serie&&a.fab===merkNaam);
    const u = ex ? automaten.map(a=>a.type===type&&a.serie===serie&&a.fab===merkNaam?{...a,aantal:a.aantal+1}:a) : [...automaten,{fab:merkNaam,serie,type,aantal:1}];
    setAut(u); onChange("automaten",u);
  };
  const addAutHandmatig = () => {
    const merkNaam = fabAnders||"Anders";
    const u = [...automaten,{fab:merkNaam,serie:"",type:"handmatig",aantal:1}];
    setAut(u); onChange("automaten",u);
  };
  const remAut = (i) => { const u=automaten.filter((_,j)=>j!==i); setAut(u); onChange("automaten",u); };
  return (
    <div>
      <div style={S.hdr}><button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:15}}>Materiaal</div><div style={{fontSize:11,color:K.muted}}>Stap 5 · Groepenkast</div></div>
      </div>
      <div style={S.body}>

        {/* Stelsel + kasttype — bepaalt later de normen en metingen */}
        <div style={S.sTitle}>Stelsel &amp; kastuitvoering</div>
        <div style={{...S.card,marginBottom:16}}>
          <label style={S.label}>Stelsel</label>
          <div style={{display:"flex",gap:8,marginBottom:8,flexWrap:"wrap"}}>
            {["TN-C-S","TN-S","TT","Anders"].map(s=>(
              <Pill key={s} active={(data.stelsel||"TN-C-S")===s} onClick={()=>onChange("stelsel",s)}>{s}</Pill>
            ))}
          </div>
          {data.stelsel==="Anders" && (
            <input style={{...S.input,marginBottom:14}} placeholder="Beschrijf het stelsel"
              value={data.stelselAnders||""} onChange={e=>onChange("stelselAnders",e.target.value)}/>
          )}
          <div style={{fontSize:11,color:K.muted,padding:"8px 10px",background:K.surface,borderRadius:8,marginBottom:14,marginTop:6}}>
            {data.stelsel==="TT"
              ? "TT-stelsel: beveiliging via RCD — Z L-PE kan hoog zijn. ΔT-norm altijd ≤300ms (EN 61008)."
              : data.stelsel==="Anders"
                ? "Aangepast stelsel: controleer zelf welke normen van toepassing zijn."
                : "TN-stelsel: beveiliging via kortsluitstroom. ΔT-norm altijd ≤300ms (EN 61008)."}
          </div>
          <label style={S.label}>Kastklasse</label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
            <Pill active={(data.kastType||"klasse2")==="klasse2"} onClick={()=>onChange("kastType","klasse2")}>Klasse 2 — dubbel geïsoleerd (kunststof)</Pill>
            <Pill active={data.kastType==="klasse1"} onClick={()=>onChange("kastType","klasse1")}>Klasse 1 — metaal (geaard)</Pill>
          </div>
        </div>

        <div style={S.card}>
          <label style={S.label}>Bouwjaar installatie</label>
          <input style={S.input} placeholder="2024" value={data.bouwjaar||""} onChange={e=>onChange("bouwjaar",e.target.value)} maxLength={4}/>
        </div>

        <div style={{...S.sTitle,marginTop:8}}>Automaten</div>
        <div style={S.card}>
          <label style={S.label}>Fabrikant</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
            {[...Object.keys(GK_FABRIKANTEN),"Anders"].map(f=><Pill key={f} active={fab===f} onClick={()=>{setFab(f);setSerie("");onChange("fab",f);}}>{f}</Pill>)}
          </div>
          {fab==="Anders" && (
            <div style={{marginBottom:12}}>
              <label style={S.label}>Merknaam</label>
              <input style={{...S.input,marginBottom:8}} placeholder="bijv. Legrand" value={fabAnders} onChange={e=>{setFabAnders(e.target.value);onChange("fabAnders",e.target.value);}}/>
              <button onClick={addAutHandmatig} style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${K.yellow}66`,background:K.yellowDim,color:K.yellow,fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Automaat toevoegen</button>
            </div>
          )}
          {fab && fab!=="Anders" && <><label style={S.label}>Serie</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
              {series.map(s=><Pill key={s} active={serie===s} onClick={()=>{setSerie(s);onChange("serie",s);}}>{s}</Pill>)}
            </div></>}
          {serie && <><label style={S.label}>Type — tik om toe te voegen</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {types.map(t=>(
                <button key={t} onClick={()=>addAut(t)} style={{padding:"9px 14px",borderRadius:10,border:`1px solid ${K.yellow}66`,background:K.yellowDim,color:K.yellow,fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"}}>+ {t}</button>
              ))}
            </div></>}
        </div>
        {automaten.length>0 && <div style={S.card}>
          <div style={{...S.sTitle,marginBottom:8}}>Geselecteerd ({automaten.reduce((s,a)=>s+a.aantal,0)}×)</div>
          {automaten.map((a,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${K.border}`}}>
              <div style={{width:34,height:34,borderRadius:8,background:K.yellowDim,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,color:K.yellow}}>{a.aantal}×</div>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{a.fab} {a.type!=="handmatig"?a.type:""}</div><div style={{fontSize:11,color:K.muted}}>{a.serie}</div></div>
              <button onClick={()=>remAut(i)} style={{background:"transparent",border:"none",color:K.muted,cursor:"pointer",fontSize:18}}>×</button>
            </div>
          ))}
        </div>}
        <button style={{...S.btn,background:K.yellow,color:"#000"}} onClick={()=>{onChange("automaten",automaten);onNext();}}>Volgende →</button>
      </div>
    </div>
  );
}

// Aardlekgroep (RCD-cluster) — bevat 1 of meer eindgroepen (automaten).
// Er wordt 1× gemeten per aardlekgroep, op de hoogst afgaande eindgroep (NEN1010-praktijk).
function GK_StapGroepen({ data, onChange, onNext, onBack }) {
  const nieuweEindgroep = (naam="Nieuwe eindgroep") => ({ id:Date.now()+Math.random(), naam, kar:"B", ampere:"16A", type:null });
  const [aardlekgroepen,setAG] = useState(data.aardlekgroepen || [
    { id:1, naam:"Aardlek A", rcdType:"A", rcdMa:"30", fase:"1", hoogstId:null,
      eindgroepen:[ nieuweEindgroep("Licht BG"), nieuweEindgroep("Stopcontacten woonkamer") ] },
    { id:2, naam:"Aardlek B", rcdType:"A", rcdMa:"30", fase:"1", hoogstId:null,
      eindgroepen:[ nieuweEindgroep("Keuken") ] },
  ]);
  const [editId,setEditId] = useState(null);

  const sync = (u) => { setAG(u); onChange("aardlekgroepen",u); };

  const addAG = () => {
    const u=[...aardlekgroepen,{ id:Date.now(), naam:`Aardlek ${String.fromCharCode(65+aardlekgroepen.length)}`, rcdType:"A", rcdMa:"30", fase:"1", hoogstId:null, eindgroepen:[nieuweEindgroep()] }];
    sync(u); setEditId(u[u.length-1].id);
  };
  const updAG = (id,k,v) => sync(aardlekgroepen.map(a=>a.id===id?{...a,[k]:v}:a));
  const remAG = (id) => sync(aardlekgroepen.filter(a=>a.id!==id));

  const addEind = (agId) => sync(aardlekgroepen.map(a=>a.id===agId?{...a,eindgroepen:[...a.eindgroepen,nieuweEindgroep()]}:a));
  const updEind = (agId,eindId,k,v) => sync(aardlekgroepen.map(a=>a.id===agId?{...a,eindgroepen:a.eindgroepen.map(e=>e.id===eindId?{...e,[k]:v}:e)}:a));
  const remEind = (agId,eindId) => sync(aardlekgroepen.map(a=>a.id===agId?{...a,eindgroepen:a.eindgroepen.filter(e=>e.id!==eindId)}:a));

  // Automatisch de hoogst belaste eindgroep bepalen (vuistregel: hoogste ampèrewaarde)
  const autoHoogst = (ag) => {
    if (!ag.eindgroepen.length) return null;
    return ag.eindgroepen.reduce((best,e)=> (toNum((e.ampere||"").replace("A",""))||0) > (toNum((best.ampere||"").replace("A",""))||0) ? e : best, ag.eindgroepen[0]).id;
  };

  return (
    <div>
      <div style={S.hdr}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15}}>Aardlekgroepen ({aardlekgroepen.length})</div><div style={{fontSize:11,color:K.muted}}>Stap 6 · gemeten per RCD-cluster</div></div>
        <button onClick={addAG} style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${K.yellow}66`,background:K.yellowDim,color:K.yellow,fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Aardlek</button>
      </div>
      <div style={S.body}>
        <div style={{fontSize:11,color:K.muted,marginBottom:14,lineHeight:1.5}}>
          Eén aardlekschakelaar beschermt vaak meerdere eindgroepen. Je meet straks 1× per aardlekgroep — op de <strong>hoogst afgaande groep</strong> (de zwaarst belaste eindgroep in dat cluster). <LeerIcoon onderwerp="aardlekgroep"/>
        </div>
        {aardlekgroepen.map((ag,i)=>{
          const hoogstId = ag.hoogstId || autoHoogst(ag);
          return (
          <div key={ag.id} style={S.card}>
            {editId===ag.id ? (
              <div>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                  <input style={{...S.input,fontWeight:700,flex:1}} value={ag.naam} autoFocus onChange={e=>updAG(ag.id,"naam",e.target.value)}/>
                  <button onClick={()=>setEditId(null)} style={{padding:"10px 14px",borderRadius:8,border:"none",background:K.yellow,color:"#000",fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>Klaar</button>
                </div>

                <label style={S.label}>RCD type</label>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                  {[...RCD_TYPE,"geen"].map(t=>(
                    <Pill key={t} small active={ag.rcdType===t} onClick={()=>updAG(ag.id,"rcdType",t)}>{t==="geen"?"Geen RCD":`type-${t}`}</Pill>
                  ))}
                </div>

                {ag.rcdType!=="geen" && (
                  <>
                    <label style={S.label}>RCD mA</label>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                      {RCD_MA.map(m=><Pill key={m} small active={ag.rcdMa===m} onClick={()=>updAG(ag.id,"rcdMa",m)}>{m}mA</Pill>)}
                    </div>
                  </>
                )}

                <label style={S.label}>Fasetype</label>
                <div style={{display:"flex",gap:8,marginBottom:14}}>
                  <Pill small active={ag.fase==="1"} onClick={()=>updAG(ag.id,"fase","1")}>⚡ 1-fase 230V</Pill>
                  <Pill small active={ag.fase==="3"} onClick={()=>updAG(ag.id,"fase","3")}>⚡⚡⚡ 3-fase 400V</Pill>
                </div>

                <div style={{height:1,background:K.border,margin:"4px 0 12px"}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <label style={{...S.label,marginBottom:0}}>Eindgroepen ({ag.eindgroepen.length})</label>
                  <button onClick={()=>addEind(ag.id)} style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${K.yellow}66`,background:K.yellowDim,color:K.yellow,fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:11,cursor:"pointer"}}>+ Eindgroep</button>
                </div>
                {ag.eindgroepen.map(eg=>(
                  <div key={eg.id} style={{background:K.surface,borderRadius:10,padding:10,marginBottom:8}}>
                    <div style={{display:"flex",gap:6,marginBottom:8}}>
                      <input style={{...S.input,fontSize:13,flex:1}} value={eg.naam} onChange={e=>updEind(ag.id,eg.id,"naam",e.target.value)}/>
                      <button onClick={()=>remEind(ag.id,eg.id)} style={{background:"transparent",border:"none",color:K.muted,cursor:"pointer",fontSize:16,padding:"0 4px"}}>×</button>
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                      {EINDGROEP_TYPES.map(t=>(
                        <Pill key={t.id} small active={eg.type===t.id} onClick={()=>{
                          updEind(ag.id,eg.id,"type",t.id);
                          if (eg.naam===""||eg.naam==="Nieuwe eindgroep") updEind(ag.id,eg.id,"naam",t.label);
                        }}>{t.icon} {t.label}</Pill>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <MiniSelect value={eg.kar} onChange={v=>updEind(ag.id,eg.id,"kar",v)} options={KAR_TYPE} width={56}/>
                      <MiniSelect value={eg.ampere} onChange={v=>updEind(ag.id,eg.id,"ampere",v)} options={GROEP_A} width={72}/>
                      {ag.eindgroepen.length>1 && (
                        <label style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:hoogstId===eg.id?K.yellow:K.muted,cursor:"pointer",marginLeft:"auto"}}>
                          <input type="radio" name={`hoogst-${ag.id}`} checked={hoogstId===eg.id} onChange={()=>updAG(ag.id,"hoogstId",eg.id)}/>
                          hoogst afgaand
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{cursor:"pointer"}} onClick={()=>setEditId(ag.id)}>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:ag.eindgroepen.length?10:0}}>
                  <div style={{width:36,height:36,borderRadius:8,background:K.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                    {ag.rcdType==="geen"?"⭕":"🛡️"}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14}}>{ag.naam}</div>
                    <div style={{fontSize:11,color:K.muted}}>
                      {ag.rcdType==="geen"?"Geen RCD":`RCD ${ag.rcdMa}mA type-${ag.rcdType}`} · {ag.fase==="3"?"3-fase 400V":"1-fase 230V"} · {ag.eindgroepen.length} eindgroep{ag.eindgroepen.length!==1?"en":""}
                    </div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();remAG(ag.id);}} style={{background:"transparent",border:"none",color:K.muted,cursor:"pointer",fontSize:18}}>×</button>
                </div>
                {ag.eindgroepen.length>0 && (
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,paddingLeft:48}}>
                    {ag.eindgroepen.map(eg=>(
                      <span key={eg.id} style={{fontSize:10,padding:"3px 8px",borderRadius:20,background:hoogstId===eg.id?K.yellowDim:K.surface,color:hoogstId===eg.id?K.yellow:K.muted,fontWeight:hoogstId===eg.id?700:400}}>
                        {hoogstId===eg.id?"⭐ ":""}{eg.naam} ({eg.kar}{eg.ampere?.replace("A","")})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )})}

        {/* Opties voor in de bijlage — automatisch uit de aardlekgroep-data */}
        {aardlekgroepen.length > 0 && (
          <div style={{...S.card,marginTop:14,background:K.surface}}>
            <div style={{fontSize:11,fontWeight:700,color:K.muted,letterSpacing:0.5,textTransform:"uppercase",marginBottom:10}}>📎 Bijlage bij het rapport</div>
            <div style={{fontSize:11,color:K.muted,lineHeight:1.4,marginBottom:12}}>Worden als <strong>aparte bijlage</strong> bij het rapport gegenereerd — niet in het hoofdrapport zelf.</div>
            <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginBottom:10}}>
              <input type="checkbox"
                checked={data.toonGroepenschema !== false}
                onChange={e=>onChange("toonGroepenschema", e.target.checked)}
                style={{marginTop:3,cursor:"pointer"}}/>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>Groepenschema automatisch genereren</div>
                <div style={{fontSize:11,color:K.muted,marginTop:2,lineHeight:1.4}}>Boomstructuur per aardlekschakelaar met onderliggende eindgroepen. Vervangt de noodzaak voor een aparte foto van het schema.</div>
              </div>
            </label>
            <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
              <input type="checkbox"
                checked={data.toonLabels !== false}
                onChange={e=>onChange("toonLabels", e.target.checked)}
                style={{marginTop:3,cursor:"pointer"}}/>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>Uitknipbare labels voor de meterkast</div>
                <div style={{fontSize:11,color:K.muted,marginTop:2,lineHeight:1.4}}>Aparte pagina met labels per eindgroep (nummer, naam, karakteristiek). Druk op stickerpapier voor direct plakken.</div>
              </div>
            </label>
          </div>
        )}

        <button style={{...S.btn,background:K.yellow,color:"#000",marginTop:8}} onClick={()=>{
          // Zorg dat elke aardlekgroep een hoogstId heeft vóór doorgaan
          const u = aardlekgroepen.map(a=>({...a, hoogstId: a.hoogstId||autoHoogst(a)}));
          sync(u); onNext();
        }}>Volgende →</button>
      </div>
    </div>
  );
}

function StapFotos({ data, onChange, onNext, onBack, checkpoints }) {
  // Gebruik data.fotos direct (geen lokale kopie) — zo overschrijven
  // de VOOR- en NA-stappen elkaars foto's nooit.
  const fotos = data.fotos||{};
  const [kiesVoor,setKiesVoor] = useState(null);
  const cameraRef = useRef(null);
  const galerijRef = useRef(null);

  // Foto comprimeren naar max 900px breed, JPEG ~60% — klein genoeg voor localStorage + PDF
  const comprimeer = (file) => new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    img.onload = () => {
      const maxW = 900;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    reader.readAsDataURL(file);
  });

  const verwerkFoto = async (file) => {
    if (!file || !kiesVoor) return;
    const dataUrl = await comprimeer(file);
    // Merge altijd met data.fotos (niet met een lokale kopie) —
    // zo blijven VOOR-foto's bewaard als de NA-stap een foto toevoegt.
    const u = {...(data.fotos||{}), [kiesVoor]: dataUrl};
    onChange("fotos", u);
    setKiesVoor(null);
  };

  const verwijderFoto = (id) => {
    const u = {...(data.fotos||{})}; delete u[id];
    onChange("fotos", u);
  };

  const verplichtDone = checkpoints.filter(c=>c.required).every(c=>fotos[c.id]);
  const done = checkpoints.filter(c=>fotos[c.id]).length;

  return (
    <div>
      {/* Verborgen file inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{display:"none"}}
        onChange={e=>{verwerkFoto(e.target.files[0]); e.target.value="";}}/>
      <input ref={galerijRef} type="file" accept="image/*" style={{display:"none"}}
        onChange={e=>{verwerkFoto(e.target.files[0]); e.target.value="";}}/>

      <div style={S.hdr}><button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:15}}>Foto's</div><div style={{fontSize:11,color:K.muted}}>{done}/{checkpoints.length} gemaakt</div></div>
      </div>
      <div style={S.body}>
        {checkpoints.map(cp=>(
          <div key={cp.id} style={{...S.card,border:`1px solid ${fotos[cp.id]?K.green+"66":K.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:14,cursor:"pointer"}}
              onClick={()=>!fotos[cp.id]&&setKiesVoor(kiesVoor===cp.id?null:cp.id)}>
              {/* Thumbnail of icoon */}
              <div style={{width:54,height:54,borderRadius:10,flexShrink:0,overflow:"hidden",
                background:fotos[cp.id]?"#000":K.surface,
                border:`2px ${fotos[cp.id]?"solid "+K.green:"dashed "+K.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
                {fotos[cp.id]
                  ? <img src={fotos[cp.id]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  : cp.icon}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:14}}>{cp.label}</div>
                <div style={{fontSize:11,marginTop:2}}>
                  {cp.required?<span style={{color:fotos[cp.id]?K.green:K.red}}>● Verplicht</span>:<span style={{color:K.muted}}>○ Aanbevolen</span>}
                </div>
                {cp.optioneelInRapport && fotos[cp.id] && (
                  <label style={{display:"flex",alignItems:"center",gap:6,marginTop:6,fontSize:11,color:K.muted,cursor:"pointer"}} onClick={e=>e.stopPropagation()}>
                    <input type="checkbox"
                      checked={data.fotoInRapport?.[cp.id] !== false}
                      onChange={e=>{
                        const huidige = data.fotoInRapport||{};
                        onChange("fotoInRapport", {...huidige, [cp.id]: e.target.checked});
                      }}
                      style={{cursor:"pointer"}}/>
                    Opnemen in rapport
                  </label>
                )}
              </div>
              {fotos[cp.id]
                ? <button onClick={e=>{e.stopPropagation();verwijderFoto(cp.id);}} style={{background:"transparent",border:`1px solid ${K.border}`,borderRadius:8,color:K.muted,cursor:"pointer",fontSize:12,padding:"6px 10px"}}>✕</button>
                : <div style={{padding:"7px 12px",borderRadius:8,background:K.yellowDim,color:K.yellow,fontSize:12,fontWeight:600}}>📷</div>}
            </div>

            {/* Camera / galerij keuze */}
            {kiesVoor===cp.id && !fotos[cp.id] && (
              <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${K.border}`}}>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <button onClick={()=>cameraRef.current?.click()} style={{flex:1,padding:"12px",borderRadius:10,border:"none",background:K.yellow,color:"#000",fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>
                    📷 Camera
                  </button>
                  <button onClick={()=>galerijRef.current?.click()} style={{flex:1,padding:"12px",borderRadius:10,border:`1px solid ${K.border}`,background:K.surface,color:K.text,fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:600,fontSize:13,cursor:"pointer"}}>
                    🖼️ Galerij
                  </button>
                </div>
                <div style={{fontSize:10,color:K.orange,lineHeight:1.5}}>
                  ⚠️ Gebruik bij voorkeur de camera op locatie. Bij een galerijfoto worden datum en locatie niet automatisch vastgelegd.
                </div>
              </div>
            )}
          </div>
        ))}
        {!verplichtDone&&<div style={{...S.card,background:K.redDim,border:`1px solid ${K.red}44`}}>
          <div style={{fontSize:12,color:K.red,fontWeight:600}}>⚠️ Maak alle verplichte foto's</div>
        </div>}
        <button style={{...S.btn,background:verplichtDone?K.yellow:K.border,color:verplichtDone?"#000":K.muted}} onClick={verplichtDone?onNext:undefined}>Volgende →</button>
      </div>
    </div>
  );
}

function GK_StapMeten({ data, onChange, onNext, onBack }) {
  const [inst,setInst] = useState(data.instMetingen||{});
  const [grpMeet,setGrpMeet] = useState(data.grpMeet||{});
  const aardlekgroepen = data.aardlekgroepen||[];
  const stelsel = data.stelsel || "TN-C-S";
  const isTT = stelsel === "TT";
  const dtNorm = 300; // EN 61008: altijd 300ms bij 1× In, ongeacht stelsel
  const si = (k,v) => { const u={...inst,[k]:v,stelsel}; setInst(u); onChange("instMetingen",u); };
  const sg = (gId,k,v) => { const u={...grpMeet,[`${gId}_${k}`]:v}; setGrpMeet(u); onChange("grpMeet",u); };
  const gv = (gId,k) => grpMeet[`${gId}_${k}`]||"";

  const heeft3faseGroep = aardlekgroepen.some(a=>a.fase==="3");
  const isoTotNorm = 0.23; // ISO totaal (vanaf hoofdschakelaar, alle groepen aan) — norm ≥0,23 MΩ
  const isoOk  = v => toNum(v) >= isoTotNorm;
  const dtOk   = v => toNum(v)<=dtNorm;
  const spanOk = v => toNum(v)>=207&&toNum(v)<=253;

  // ── A) IMPEDANTIE ────────────────────────────────────────────────────────
  // Z L-N en Z L-PE worden ÉÉN KEER gemeten, op de hoogst afgaande groep van
  // de gehele installatie (niet meer per aardlekgroep). De verwachte kort-
  // sluitstroom (Icc) en de maximale afschakeltijd zijn beide AFGELEIDE
  // waarden — geen losse invulvelden — op basis van: stelsel + automaat-
  // karakteristiek (B/C/D/gG) + ampèrewaarde van de hoogst afgaande groep,
  // gecombineerd met de gemeten Z-waarde zelf (Wet van Ohm: Icc = U / Z).
  const karFactor = { B:5, C:10, D:20, gG:4 }; // gG: trage smeltzekering, factor ~4× In (NEN-EN 60269)
  const hoogstKar    = inst.hoogstKar || "B";
  const hoogstAmpere = inst.hoogstAmpere || "";
  const karOnbekend  = !karFactor[hoogstKar];
  const iccMin       = !karOnbekend && toNum(hoogstAmpere)>0 ? karFactor[hoogstKar] * toNum(hoogstAmpere) : null;
  const zMaxVoorzek  = iccMin ? (230 / iccMin) : null; // grens waarbinnen Icc voldoende is voor tijdige uitschakeling
  // Z_max-toetsing (Wet van Ohm + automaatkarakteristiek) geldt ALTIJD, ongeacht kastklasse —
  // dit gaat over of de automaat/zekering snel genoeg afschakelt bij kortsluiting, wat niets
  // te maken heeft met het materiaal van de kast zelf. Alleen TT-stelsel en een onbekende/
  // "Anders" karakteristiek maken automatische toetsing onmogelijk.
  const zOk = v => isTT ? true : karOnbekend ? true : (zMaxVoorzek ? toNum(v) <= zMaxVoorzek : true);

  // Maximale afschakeltijd — afgeleid uit stelsel + automaatkarakteristiek (NEN1010 tabel 41.1-achtig):
  // TN-stelsel: 0,4s voor eindgroepen ≤32A (B/C/D bij normale factor), TT-stelsel: 0,2s.
  // Dit is de installatienorm-afschakeltijd (verschillend van de RCD-apparaatnorm ΔT ≤300ms hieronder bij C!).
  const maxAfschakeltijd = isTT ? 0.2 : 0.4;

  const cag = null; // niet meer gebruikt voor Z — Z wordt niet meer per aardlekgroep getoond
  const [activeAG,setActiveAG] = useState(aardlekgroepen[0]?.id||null);
  useEffect(()=>{ if (inst.stelsel!==stelsel) si("stelsel",stelsel); }, [stelsel]);
  const warnings = gkCrossChecks(aardlekgroepen, grpMeet, {...inst, stelsel});

  return (
    <div>
      <div style={S.hdr}><button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:15}}>Meetwaarden NEN1010</div><div style={{fontSize:11,color:K.muted}}>Stap 7 · {stelsel}-stelsel · 250V</div></div>
      </div>
      <div style={S.body}>
        {/* A) IMPEDANTIE */}
        <div style={S.sTitle}>A · Impedantie</div>
        <div style={S.card}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
            <div><label style={S.label}>Stelsel<LeerIcoon onderwerp="stelsel_tn_tt"/></label>
              <div style={{padding:"8px 10px",borderRadius:8,background:K.surface,fontSize:13,fontWeight:600,color:K.yellow,minWidth:90,textAlign:"center"}}>{stelsel}</div>
            </div>
            <div>
              <label style={S.label}>Hoofdzekering</label>
              <MiniInput value={inst.hoofdzekering} onChange={v=>si("hoofdzekering",v)} unit="A" width={80} placeholder="bijv. 40"/>
            </div>
            <div>
              <label style={S.label}>Hoofdschakelaar</label>
              <input style={{...S.input,width:140}} type="text" placeholder="bijv. 40A / 4-polig"
                value={inst.hoofdschakelaar||""} onChange={e=>si("hoofdschakelaar",e.target.value)}
                onFocus={e=>e.target.select()}/>
            </div>
          </div>

          <div style={{fontSize:11,color:K.muted,marginBottom:10,lineHeight:1.5,padding:"7px 10px",background:K.surface,borderRadius:8}}>
            Vul de <strong style={{color:K.text}}>voorbeveiliging (hoogst afgaande groep)</strong> van de gehele installatie in — de verwachte kortsluitstroom en maximale afschakeltijd worden hieruit afgeleid.
          </div>

          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
            <div>
              <label style={S.label}>Voorzekering (A) — hoogst afgaande groep</label>
              <MiniInput value={hoogstAmpere} onChange={v=>si("hoogstAmpere",v)} unit="A" width={70}/>
            </div>
            <div>
              <label style={S.label}>Karakteristiek voorzekering</label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {["B","C","D","gG","Anders"].map(k=>(
                  <Pill key={k} small active={hoogstKar===k} onClick={()=>si("hoogstKar",k)}>{k}</Pill>
                ))}
              </div>
            </div>
          </div>

          <div style={{fontSize:11,color:K.muted,padding:"7px 10px",background:K.surface,borderRadius:8,marginBottom:10}}>
            Maximale afschakeltijd (afgeleid uit stelsel {stelsel}): <strong style={{color:K.text}}>{maxAfschakeltijd}s</strong>
          </div>

          {zMaxVoorzek && !isTT && (
            <div style={{fontSize:11,color:K.muted,padding:"7px 10px",background:K.surface,borderRadius:8,marginBottom:10}}>
              {hoogstKar}{hoogstAmpere}A → Icc min = {iccMin?.toFixed(0)}A → Z_max = <strong style={{color:K.text}}>{zMaxVoorzek.toFixed(2)}Ω</strong>
            </div>
          )}
          {!zMaxVoorzek && !isTT && (
            <div style={{fontSize:11,color:K.orange,padding:"7px 10px",background:K.orangeDim,borderRadius:8,marginBottom:10}}>
              ⚠ Vul ampère + karakteristiek van de hoogst afgaande groep hierboven in om Z_max en de automatische toetsing te berekenen.
            </div>
          )}

          <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,cursor:"pointer"}}>
            <input type="checkbox" checked={inst.zDrieFase ?? heeft3faseGroep} onChange={e=>si("zDrieFase",e.target.checked)}/>
            <span style={{fontSize:12,color:K.muted}}>3-fase — ook L2 en L3 meten</span>
          </label>

          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
            {(["Z L-N","Z L-PE"].concat((inst.zDrieFase ?? heeft3faseGroep) ? ["Z L2-N","Z L2-PE","Z L3-N","Z L3-PE"] : [])).map(l=>{
              const k = l==="Z L-N"?"zln":l==="Z L-PE"?"zlpe":l==="Z L2-N"?"zl2n":l==="Z L2-PE"?"zl2pe":l==="Z L3-N"?"zl3n":"zl3pe";
              return (
                <div key={k}><label style={S.label}>{l}</label>
                  <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
                    <MiniInput value={inst[k]} onChange={v=>si(k,v)} unit="Ω" width={70}/>
                    {inst[k] && zMaxVoorzek && !isTT && <StatusTag level={zOk(inst[k])?"ok":"red"}/>}
                    {inst[k] && !isTT && (
                      <span style={{fontSize:10,color:K.muted,whiteSpace:"nowrap"}}>
                        Icc≈{(230/toNum(inst[k])).toFixed(0)}A
                      </span>
                    )}
                  </div>
                  {inst[k] && !isTT && !zMaxVoorzek && (
                    <div style={{fontSize:10,color:K.orange,marginTop:3}}>Vul ampère + karakteristiek hierboven in voor automatische toetsing</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Z L-PE achter aardlek — Ra_max = 50V / IΔn */}
          <div style={{marginTop:8,padding:"10px 12px",background:K.surface,borderRadius:10}}>
            <label style={S.label}>Z L-PE achter aardlekschakelaar</label>
            <div style={{fontSize:11,color:K.muted,marginBottom:8,lineHeight:1.5}}>
              Als de hoogst afgaande groep achter een RCD zit: Ra_max = 50V ÷ IΔn<br/>
              {[["30mA","1667Ω"],["100mA","500Ω"],["300mA","166Ω"],["500mA","100Ω"]].map(([rcd,ra])=>(
                <span key={rcd} style={{marginRight:12}}>• {rcd} RCD → ≤{ra}</span>
              ))}
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{fontSize:12,color:K.muted,whiteSpace:"nowrap"}}>RCD:</div>
              {["10","30","100","300","500"].map(mA=>(
                <Pill key={mA} small active={inst.rcdMaZlpe===mA} onClick={()=>si("rcdMaZlpe",mA)}>{mA}mA</Pill>
              ))}
            </div>
            {inst.rcdMaZlpe && (
              <div style={{marginTop:8,padding:"6px 10px",borderRadius:8,
                background:K.greenDim,border:`1px solid ${K.green}44`,fontSize:12,color:K.green,fontWeight:700}}>
                Ra_max = 50V ÷ {toNum(inst.rcdMaZlpe)/1000}A = {(50/(toNum(inst.rcdMaZlpe)/1000)).toFixed(0)}Ω
              </div>
            )}
            <div style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
              <MiniInput value={inst.zlpeAardlek} onChange={v=>si("zlpeAardlek",v)} unit="Ω" width={80} placeholder="bijv. 120"/>
              {inst.zlpeAardlek && inst.rcdMaZlpe && (
                <StatusTag level={toNum(inst.zlpeAardlek)<=(50/(toNum(inst.rcdMaZlpe)/1000))?"ok":"red"}/>
              )}
            </div>
          </div>
        </div>

        {/* B) ISOLATIEWEERSTAND */}
        <div style={{...S.sTitle,marginTop:8}}>B · Isolatieweerstand</div>
        <div style={S.card}>
          <label style={S.label}>ISO totaal — norm ≥ 0,23 MΩ (alle groepen aan, hoofdvoeding uit)<LeerIcoon onderwerp="iso_meting"/></label>
          <div style={{fontSize:11,color:K.muted,marginBottom:8,lineHeight:1.4}}>
            Meet met alle aardlekgroepen ingeschakeld en de voeding zelf uit.
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <MiniInput value={inst.isoTot} onChange={v=>si("isoTot",v)} unit="MΩ" width={80}/>
            {inst.isoTot && <StatusTag level={isoOk(inst.isoTot)?"ok":"red"}/>}
          </div>
          {inst.isoTot && !isoOk(inst.isoTot) && (
            <div style={{marginTop:10,padding:"10px 12px",background:K.orangeDim,borderRadius:10,border:`1px solid ${K.orange}44`}}>
              <div style={{fontSize:11,color:K.orange,lineHeight:1.6,marginBottom:10}}>
                ⚠ <strong>Waarde onder 0,23 MΩ.</strong> Zoek de boosdoener zo op:
                <ol style={{margin:"6px 0 0 18px",padding:0}}>
                  <li>Zet de groepen één voor één uit</li>
                  <li>Meet steeds opnieuw, totdat de waarde weer ≥ 0,23 MΩ wordt</li>
                  <li>De laatst uitgezette groep is de probleemgroep — vink 'm hieronder aan en meet die apart (zie hieronder)</li>
                </ol>
              </div>
              <label style={S.label}>Geïdentificeerde probleemgroep(en)</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                {aardlekgroepen.map(ag=>{
                  const geselecteerd = (inst.isoTotProblemGroepen||[]).includes(ag.id);
                  return (
                    <Pill key={ag.id} small active={geselecteerd} onClick={()=>{
                      const huidige = inst.isoTotProblemGroepen||[];
                      si("isoTotProblemGroepen", geselecteerd ? huidige.filter(id=>id!==ag.id) : [...huidige, ag.id]);
                    }}>{ag.naam}</Pill>
                  );
                })}
              </div>

              {/* Alleen de geselecteerde probleemgroep(en) krijgen een losse ISO-meting */}
              {(inst.isoTotProblemGroepen||[]).map(agId=>{
                const ag = aardlekgroepen.find(a=>a.id===agId);
                if (!ag) return null;
                const norm = ag.fase==="3" ? 0.40 : 0.23;
                const isoVelden = ag.fase==="3"
                  ? [{k:"iso_l1a",l:"L1 → Aarde"},{k:"iso_l2a",l:"L2 → Aarde"},{k:"iso_l3a",l:"L3 → Aarde"},{k:"iso_na",l:"N → Aarde"}]
                  : [{k:"iso_fa",l:"Fase → Aarde"},{k:"iso_na",l:"Nul → Aarde"}];
                return (
                  <div key={agId} style={{marginTop:10,padding:"10px 12px",background:K.surface,borderRadius:10}}>
                    <div style={{fontSize:12,fontWeight:700,color:K.text,marginBottom:8}}>{ag.naam} — norm ≥ {norm} MΩ</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      {isoVelden.map(({k,l})=>{
                        const val = gv(ag.id,k);
                        const ok = val && toNum(val)>=norm;
                        return (
                          <div key={k}>
                            <div style={{fontSize:10,color:K.muted,marginBottom:3}}>{l}</div>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <input style={{...S.input,fontSize:15,fontWeight:700,flex:1,
                                background:val?(ok?K.greenDim:K.redDim):K.surface,
                                border:`1px solid ${val?(ok?K.green:K.red):K.border}`}}
                                type="text" inputMode="decimal" placeholder="0,5"
                                value={val} onChange={e=>sg(ag.id,k,e.target.value)}
                                onFocus={e=>e.target.select()}/>
                              <span style={{fontSize:12,fontWeight:700,color:K.muted,whiteSpace:"nowrap"}}>MΩ</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <label style={{...S.label,marginTop:10}}>Toelichting (optioneel)</label>
              <input style={S.input} type="text"
                placeholder="bijv. vochtige leiding badkamer, defect apparaat"
                value={inst.isoTotProblemen||""}
                onChange={e=>si("isoTotProblemen",e.target.value)}
                onFocus={e=>e.target.select()}/>
            </div>
          )}
        </div>

        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8,marginTop:8}}>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
            <input type="checkbox" checked={inst.toon3fase ?? heeft3faseGroep} onChange={e=>si("toon3fase",e.target.checked)}/>
            <span style={{fontSize:12,color:K.muted}}>Ook L2/N en L3/N meten (3-fase aansluiting aanwezig)</span>
          </label>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
          {(["L1/N"].concat((inst.toon3fase ?? heeft3faseGroep) ? ["L2/N","L3/N"] : [])).map(f=>(
            <div key={f}><label style={S.label}>{f}</label>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <MiniInput value={inst[`span_${f}`]} onChange={v=>si(`span_${f}`,v)} unit="V" width={65}/>
                {inst[`span_${f}`]&&<StatusTag level={spanOk(inst[`span_${f}`])?"ok":"red"}/>}
              </div>
            </div>
          ))}
        </div>

        {/* Visuele inspectie & overige controles — conform NEN1010/NEN3140/BRL6000 opleverchecklist */}
        <div style={S.sTitle}>Visuele inspectie &amp; overige controles</div>
        <div style={S.card}>
          {[
            {k:"beschermingscontacten", l:"Beschermingscontacten wandcontactdozen + metalen gestellen gecontroleerd door meting"},
            {k:"potentiaalvereffening", l:"Hoofd- en aanvullende potentiaalvereffening gecontroleerd", video:"potentiaalvereffening"},
            {k:"leidingberekeningen",   l:"Leidingberekeningen op alle punten gecontroleerd"},
            {k:"beveiligingen",         l:"Beveiligingen (incl. selectiviteit) op alle punten gecontroleerd", video:"selectiviteit"},
          ].map(({k,l,video})=>(
            <div key={k} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:`1px solid ${K.border}`,cursor:"pointer"}}
              onClick={()=>si(k, inst[k]==="OK"?"NOK":inst[k]==="NOK"?"":inst[k]||"OK")}>
              <div style={{width:30,height:30,borderRadius:8,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12,
                background: inst[k]==="OK" ? K.greenDim : inst[k]==="NOK" ? K.redDim : K.surface,
                border: `1px solid ${inst[k]==="OK"?K.green:inst[k]==="NOK"?K.red:K.border}`,
                color: inst[k]==="OK" ? K.green : inst[k]==="NOK" ? K.red : K.muted,
              }}>{inst[k]==="OK"?"✓":inst[k]==="NOK"?"✗":"?"}</div>
              <div style={{flex:1,fontSize:12.5}}>{l}{video && <LeerIcoon onderwerp={video}/>}</div>
            </div>
          ))}
          <div style={{fontSize:10,color:K.muted,marginTop:8}}>Tik om te wisselen: ? → ✓ OK → ✗ NOK → ?</div>

          <div style={{height:1,background:K.border,margin:"14px 0"}}/>

          <label style={S.label}>Badkamer voorzien van Centraal Aardpunt</label>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <Pill small active={inst.badkamerCAP==="Ja"} onClick={()=>si("badkamerCAP","Ja")}>Ja</Pill>
            <Pill small active={inst.badkamerCAP==="Nee"} onClick={()=>si("badkamerCAP","Nee")}>Nee</Pill>
            <Pill small active={inst.badkamerCAP==="n.v.t."} onClick={()=>si("badkamerCAP","n.v.t.")}>n.v.t.</Pill>
          </div>

          <label style={S.label}>Rookmelder aanwezig</label>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <Pill small active={inst.rookmelder==="Ja"} onClick={()=>si("rookmelder","Ja")}>Ja</Pill>
            <Pill small active={inst.rookmelder==="Nee"} onClick={()=>si("rookmelder","Nee")}>Nee</Pill>
          </div>
          {inst.rookmelder==="Ja" && (
            <>
              <label style={S.label}>Voeding rookmelder</label>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <Pill small active={inst.rookmelderVoeding==="Batterij"} onClick={()=>si("rookmelderVoeding","Batterij")}>Batterij</Pill>
                <Pill small active={inst.rookmelderVoeding==="230V"} onClick={()=>si("rookmelderVoeding","230V")}>230V</Pill>
              </div>
              <label style={S.label}>Juist geprojecteerd</label>
              <div style={{display:"flex",gap:8}}>
                <Pill small active={inst.rookmelderProjectie==="Ja"} onClick={()=>si("rookmelderProjectie","Ja")}>Ja</Pill>
                <Pill small active={inst.rookmelderProjectie==="Nee"} onClick={()=>si("rookmelderProjectie","Nee")}>Nee</Pill>
              </div>
            </>
          )}
        </div>

        {/* C) AARDLEKSCHAKELAARS */}
        <div style={S.sTitle}>C · Aardlekschakelaars — RCD-test per groep</div>
        <div style={{overflowX:"auto",display:"flex",gap:8,marginBottom:14,paddingBottom:4}}>
          {aardlekgroepen.map(ag=>{
            const gd = ag.rcdType==="geen" || gv(ag.id,"dt");
            const gOk = gd && (ag.rcdType==="geen" || dtOk(gv(ag.id,"dt")));
            return (
              <button key={ag.id} onClick={()=>setActiveAG(ag.id)} style={{padding:"7px 13px",borderRadius:10,border:`1px solid ${activeAG===ag.id?K.yellow:K.border}`,background:activeAG===ag.id?K.yellowDim:K.card,color:activeAG===ag.id?K.yellow:K.text,fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                {gd?(gOk?"✅":"⚠️"):"○"} {ag.naam.length>14?ag.naam.slice(0,14)+"…":ag.naam}
              </button>
            );
          })}
        </div>
        {(() => {
          const cagRcd = aardlekgroepen.find(a=>a.id===activeAG);
          if (!cagRcd) return null;
          const is3fase = cagRcd.fase==="3";
          const hoogst = cagRcd.eindgroepen?.find(e=>e.id===cagRcd.hoogstId) || cagRcd.eindgroepen?.[0];

          return (
          <div style={S.card}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{cagRcd.naam}</div>
            <div style={{fontSize:11,color:K.muted,marginBottom:6}}>
              {cagRcd.rcdType==="geen"?"Geen RCD":`RCD ${cagRcd.rcdMa}mA type-${cagRcd.rcdType}`} · {is3fase?"3-fase 400V":"1-fase 230V"}
            </div>
            {hoogst && (
              <div style={{fontSize:11,color:K.yellow,marginBottom:14,padding:"6px 10px",background:K.yellowDim,borderRadius:8}}>
                ⭐ Hoogst afgaande groep: <strong>{hoogst.naam}</strong> ({hoogst.kar}{hoogst.ampere})
              </div>
            )}

            {cagRcd.rcdType!=="geen" ? (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={S.label}>ΔT ms — norm ≤300ms (EN 61008)<LeerIcoon onderwerp="delta_t_i"/></label>
                  <input style={{...S.input,fontSize:15,fontWeight:700,
                    background:gv(cagRcd.id,"dt")?(dtOk(gv(cagRcd.id,"dt"))?K.greenDim:K.redDim):K.surface,
                    border:`1px solid ${gv(cagRcd.id,"dt")?(dtOk(gv(cagRcd.id,"dt"))?K.green:K.red):K.border}`}}
                    type="text" inputMode="decimal" placeholder="180" value={gv(cagRcd.id,"dt")} onChange={e=>sg(cagRcd.id,"dt",e.target.value)}
                    onFocus={e=>e.target.select()}/>
                </div>
                {(() => {
                  const mA = toNum(cagRcd.rcdMa);
                  const diMax = cagRcd.rcdType==="B" ? mA*2 : cagRcd.rcdType==="AC" ? mA*1 : mA*1.4;
                  const diLabel = cagRcd.rcdType==="B" ? `≤ 2× In (≤${diMax.toFixed(0)}mA)` : cagRcd.rcdType==="AC" ? `≤ 1× In (≤${diMax.toFixed(0)}mA)` : `≤ 1,4× In (≤${diMax.toFixed(0)}mA)`;
                  const diVal = gv(cagRcd.id,"di");
                  const diOk = diVal && toNum(diVal) <= diMax;
                  return (
                    <div>
                      <label style={S.label}>ΔI mA type-{cagRcd.rcdType} — {diLabel}</label>
                      <input style={{...S.input,fontSize:15,fontWeight:700,
                        background:diVal?(diOk?K.greenDim:K.redDim):K.surface,
                        border:`1px solid ${diVal?(diOk?K.green:K.red):K.border}`}}
                        type="text" inputMode="decimal" placeholder={String(Math.round(mA*0.8))}
                        value={diVal} onChange={e=>sg(cagRcd.id,"di",e.target.value)}
                        onFocus={e=>e.target.select()}/>
                    </div>
                  );
                })()}
                <div>
                  <label style={S.label}>Testknop RCD</label>
                  <div style={{display:"flex",gap:8,marginTop:2}}>
                    {["OK","NOK"].map(v=><Pill key={v} small active={gv(cagRcd.id,"testknop")===v} onClick={()=>sg(cagRcd.id,"testknop",v)}>{v}</Pill>)}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{fontSize:11,color:K.muted}}>Geen RCD op deze groep — geen ΔT/ΔI-test van toepassing.</div>
            )}

            {aardlekgroepen.findIndex(a=>a.id===cagRcd.id)<aardlekgroepen.length-1 &&
              <button style={{...S.btn,background:K.surface,color:K.text,border:`1px solid ${K.border}`,marginTop:14,marginBottom:0}}
                onClick={()=>{const idx=aardlekgroepen.findIndex(a=>a.id===cagRcd.id);setActiveAG(aardlekgroepen[idx+1].id);}}>
                Volgende aardlekgroep →
              </button>}
          </div>
          );
        })()}

        {/* Cross-checks */}
        <div style={{...S.sTitle,marginTop:8}}>Cross-check installatie</div>
        <WarnBox warnings={warnings}/>

        {/* AI technische analyse */}
        <div style={{...S.sTitle,marginTop:8}}>Technische beoordeling</div>
        <AIAnalyseBox
          analyse={data.aiAnalyse}
          onAnalyse={(t)=>onChange("aiAnalyse",t)}
          prompt={`Je bent een ervaren elektrotechnisch inspecteur (NEN1010). Analyseer onderstaande meetwaarden van een elektrische installatie als geheel. Let op combinaties van waarden die samen een risico vormen, ook als ze individueel binnen de norm vallen (bijv. ISO net boven minimum bij meerdere aardlekgroepen, spanningsasymmetrie, ΔT dicht tegen de norm voor het gekozen stelsel). Geef een korte professionele beoordeling in het Nederlands: max 6 zinnen, gevolgd door maximaal 3 concrete aanbevelingen, elk op een nieuwe regel beginnend met "- ". Geen inleiding, geen disclaimer, alleen platte tekst (geen markdown opmaak, geen HTML).

STELSEL: ${stelsel} (ΔT-norm eindgroep ≤${dtNorm}ms) | KASTUITVOERING: ${data.kastType||"kunststof"}
HOOGST AFGAANDE GROEP: ${inst.hoogstKar||"—"}${inst.hoogstAmpere||"—"}A
Z L-N: ${inst.zln||"—"} Ohm | Z L-PE: ${inst.zlpe||"—"} Ohm | ISO totaal: ${inst.isoTot||"—"} MOhm
SPANNINGEN: L1 ${inst["span_L1/N"]||"—"}V / L2 ${inst["span_L2/N"]||"—"}V / L3 ${inst["span_L3/N"]||"—"}V
AARDLEKGROEPEN:
${aardlekgroepen.map((ag,i)=>{
  const isoKeys = ag.fase==="3" ? ["iso_l1a","iso_l2a","iso_l3a","iso_na"] : ["iso_fa","iso_na"];
  const isoStr = isoKeys.map(k=>`${k.replace("iso_","").toUpperCase()}: ${gv(ag.id,k)||"—"}`).join(" / ");
  const hoogst = ag.eindgroepen?.find(e=>e.id===ag.hoogstId) || ag.eindgroepen?.[0];
  const eindStr = (ag.eindgroepen||[]).map(e=>`${e.naam}(${e.kar}${e.ampere})`).join(", ");
  return `${i+1}. ${ag.naam} | ${ag.rcdType==="geen"?"geen RCD":`RCD ${ag.rcdMa}mA-${ag.rcdType}`} | ${ag.fase==="3"?"3F 400V":"1F 230V"} | eindgroepen: ${eindStr} | gemeten op: ${hoogst?.naam||"—"} | ISO(MOhm): ${isoStr} | dT: ${gv(ag.id,"dt")||"—"}ms | dI: ${gv(ag.id,"di")||"—"}mA | Testknop: ${gv(ag.id,"testknop")||"—"}`;
}).join("\n")}
CROSS-CHECK SIGNALEN: ${warnings.length>0?warnings.map(w=>w.msg).join("; "):"geen"}`}
        />

        <button style={{...S.btn,background:K.yellow,color:"#000"}} onClick={onNext}>Volgende: versturen →</button>
      </div>
    </div>
  );
}

// ─── ZONNEPANELEN STAPPEN ─────────────────────────────────────────────────────

function PV_StapMateriaal({ data, onChange, onNext, onBack }) {
  const [strings, setStrings] = useState(data.pvStrings || [{ id:1, aantalPanelen:10 }]);
  const addString = () => { const s=[...strings,{id:Date.now(),aantalPanelen:10}]; setStrings(s); onChange("pvStrings",s); };
  const updStr = (id,k,v) => { const s=strings.map(x=>x.id===id?{...x,[k]:v}:x); setStrings(s); onChange("pvStrings",s); };
  const remStr = (id) => { const s=strings.filter(x=>x.id!==id); setStrings(s); onChange("pvStrings",s); };

  const totaalWp = (parseInt(data.aantalPanelen)||0) * (parseInt(data.paneelWp)||0);

  return (
    <div>
      <div style={S.hdr}><button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:15}}>Materiaal PV</div><div style={{fontSize:11,color:K.muted}}>Stap 5 · Zonnepanelen</div></div>
      </div>
      <div style={S.body}>
        {/* Panelen */}
        <div style={S.sTitle}>Zonnepanelen</div>
        <div style={S.card}>
          <label style={S.label}>Fabrikant panelen</label>
          <select style={{...S.select,marginBottom:12}} value={data.paneelFab||""} onChange={e=>onChange("paneelFab",e.target.value)}>
            <option value="">Kies fabrikant</option>
            {PV_PANEEL_FABS.map(f=><option key={f}>{f}</option>)}
          </select>
          <div style={{display:"flex",gap:10,marginBottom:12}}>
            <div style={{flex:1}}><label style={S.label}>Type / serie</label><input style={S.input} placeholder="bijv. Tiger Neo N-type" value={data.paneelType||""} onChange={e=>onChange("paneelType",e.target.value)}/></div>
          </div>
          <div style={{display:"flex",gap:10,marginBottom:0}}>
            <div style={{flex:1}}><label style={S.label}>Vermogen (Wp)</label><input style={S.input} type="text" inputMode="decimal" placeholder="420" value={data.paneelWp||""} onChange={e=>onChange("paneelWp",e.target.value)}/></div>
            <div style={{flex:1}}><label style={S.label}>Aantal panelen</label><input style={S.input} type="text" inputMode="decimal" placeholder="12" value={data.aantalPanelen||""} onChange={e=>onChange("aantalPanelen",e.target.value)}/></div>
          </div>
          {totaalWp > 0 && (
            <div style={{marginTop:12,padding:"8px 12px",borderRadius:8,background:K.yellowDim,border:`1px solid ${K.yellow}44`}}>
              <span style={{fontSize:13,color:K.yellow,fontWeight:700}}>Totaalvermogen: {(totaalWp/1000).toFixed(2)} kWp</span>
            </div>
          )}
        </div>

        {/* Omvormer */}
        <div style={S.sTitle}>Omvormer</div>
        <div style={S.card}>
          <label style={S.label}>Fabrikant omvormer</label>
          <select style={{...S.select,marginBottom:12}} value={data.omvormerFab||""} onChange={e=>onChange("omvormerFab",e.target.value)}>
            <option value="">Kies fabrikant</option>
            {PV_OMVORMER_FABS.map(f=><option key={f}>{f}</option>)}
          </select>
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:2}}><label style={S.label}>Type / serie</label><input style={S.input} placeholder="bijv. SMA Sunny Boy 5.0" value={data.omvormerType||""} onChange={e=>onChange("omvormerType",e.target.value)}/></div>
            <div style={{flex:1}}><label style={S.label}>Vermogen kW</label><input style={S.input} type="text" inputMode="decimal" placeholder="5.0" value={data.omvormerKw||""} onChange={e=>onChange("omvormerKw",e.target.value)}/></div>
          </div>
          {/* DC/AC ratio check */}
          {data.aantalPanelen && data.paneelWp && data.omvormerKw && (() => {
            const ratio = (parseInt(data.aantalPanelen)*parseInt(data.paneelWp)) / (toNum(data.omvormerKw)*1000);
            const ok = ratio >= 0.8 && ratio <= 1.35;
            return (
              <div style={{marginTop:10,padding:"8px 12px",borderRadius:8,background:ok?K.greenDim:K.orangeDim,border:`1px solid ${ok?K.green:K.orange}44`}}>
                <span style={{fontSize:12,color:ok?K.green:K.orange,fontWeight:700}}>
                  DC/AC ratio: {ratio.toFixed(2)} {ok ? "✓ OK" : "⚠️ Controleer"}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Bevestiging */}
        <div style={S.sTitle}>Bevestigingssysteem</div>
        <div style={S.card}>
          <label style={S.label}>Fabrikant</label>
          <select style={{...S.select,marginBottom:12}} value={data.bevestigingFab||""} onChange={e=>onChange("bevestigingFab",e.target.value)}>
            <option value="">Kies fabrikant</option>
            {PV_BEVESTIGING.map(f=><option key={f}>{f}</option>)}
          </select>
          <label style={S.label}>Type dakbedekking</label>
          <select style={S.select} value={data.dakType||""} onChange={e=>onChange("dakType",e.target.value)}>
            <option value="">Kies type</option>
            {["Dakpannen (keramisch)","Dakpannen (beton)","Leien","Bitumen","EPDM","Metaal / staal","Golfplaten"].map(o=><option key={o}>{o}</option>)}
          </select>
        </div>

        {/* Strings */}
        <div style={{...S.sTitle,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>Strings ({strings.length})</span>
          <button onClick={addString} style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${K.yellow}66`,background:K.yellowDim,color:K.yellow,fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>+ String</button>
        </div>
        {strings.map((s,i)=>(
          <div key={s.id} style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontWeight:700,color:K.yellow}}>String {i+1}</div>
              {strings.length>1&&<button onClick={()=>remStr(s.id)} style={{background:"transparent",border:"none",color:K.muted,cursor:"pointer",fontSize:16}}>×</button>}
            </div>
            <div style={{display:"flex",gap:10}}>
              <div style={{flex:1}}><label style={S.label}>Panelen in string</label><input style={S.input} type="text" inputMode="decimal" placeholder="10" value={s.aantalPanelen||""} onChange={e=>updStr(s.id,"aantalPanelen",e.target.value)}/></div>
              <div style={{flex:1}}><label style={S.label}>Oriëntatie</label>
                <select style={S.select} value={s.orientatie||""} onChange={e=>updStr(s.id,"orientatie",e.target.value)}>
                  <option value="">—</option>
                  {["Zuid","Oost","West","Zuid-Oost","Zuid-West","Plat"].map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
        <button style={{...S.btn,background:K.yellow,color:"#000"}} onClick={onNext}>Volgende →</button>
      </div>
    </div>
  );
}

function PV_StapMeten({ data, onChange, onNext, onBack }) {
  const strings = data.pvStrings || [{ id:1 }];
  const [strMeet, setStrMeet] = useState(data.pvMeet || {});
  const [instMet, setInstMet] = useState(data.pvInstMet || {});
  const [activeStr, setActiveStr] = useState(strings[0]?.id || null);
  const [visueel, setVisueel] = useState(data.pvVisueel || {});

  const sm = (k,v) => { const u={...instMet,[k]:v}; setInstMet(u); onChange("pvInstMet",u); };
  const sv = (k,v) => { const u={...visueel,[k]:v}; setVisueel(u); onChange("pvVisueel",u); };
  const ss = (sId,k,v) => { const u={...strMeet,[`${sId}_${k}`]:v}; setStrMeet(u); onChange("pvMeet",u); };
  const gv = (sId,k) => strMeet[`${sId}_${k}`]||"";

  const isoOk  = v => toNum(v) > 1;
  const spanOk = v => { const n = toNum(v); return n > 50 && n < 1500; };

  const warnings = pvCrossChecks(
    strings.map(s=>({...s, iso:gv(s.id,"iso"), spanning:gv(s.id,"spanning")})),
    instMet,
    { aantalPanelen:data.aantalPanelen, paneelWp:data.paneelWp, omvormerKw:data.omvormerKw }
  );

  const VISUEEL_ITEMS = [
    { k:"ballastplan",    l:"Ballastplan en legplan aanwezig" },
    { k:"dc_klasse2",     l:"DC-leidingen klasse type 2 (dubbel geïsoleerd)" },
    { k:"mc4_ok",         l:"MC4 connectoren mechanisch en elektrisch correct" },
    { k:"vermogen_ok",    l:"Som inkomende vermogens ≤ max. omvormer" },
    { k:"brandcompart",   l:"Doorvoeringen brandcompartimenten OK" },
    { k:"aarding_constr", l:"Geleidende draagconstructie geaard en vereffend" },
    { k:"leidingsyst",    l:"Leidingsystemen bestand tegen uitwendige invloeden" },
    { k:"rcd_type",       l:"RCD van juist type (indien verplicht)" },
    { k:"markering",      l:"Markeringen aangebracht conform NEN1010:712" },
  ];

  return (
    <div>
      <div style={S.hdr}><button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:15}}>Meetwaarden PV</div><div style={{fontSize:11,color:K.muted}}>Stap 6 · NEN1010:712</div></div>
      </div>
      <div style={S.body}>

        {/* Visuele inspectie */}
        <div style={S.sTitle}>Visuele inspectie NEN1010:712</div>
        <div style={S.card}>
          {VISUEEL_ITEMS.map(({k,l})=>(
            <div key={k} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:`1px solid ${K.border}`,cursor:"pointer"}} onClick={()=>sv(k, visueel[k]==="OK"?"NOK":visueel[k]==="NOK"?"":visueel[k]||"OK")}>
              <div style={{width:34,height:34,borderRadius:8,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,
                background: visueel[k]==="OK" ? K.greenDim : visueel[k]==="NOK" ? K.redDim : K.surface,
                border: `1px solid ${visueel[k]==="OK"?K.green:visueel[k]==="NOK"?K.red:K.border}`,
                color: visueel[k]==="OK" ? K.green : visueel[k]==="NOK" ? K.red : K.muted,
              }}>
                {visueel[k]==="OK"?"✓":visueel[k]==="NOK"?"✗":"?"}
              </div>
              <div style={{flex:1,fontSize:13}}>{l}</div>
            </div>
          ))}
          <div style={{fontSize:11,color:K.muted,marginTop:8}}>Tik om te wisselen: ? → ✓ OK → ✗ NOK → ?</div>
        </div>

        {/* AC kant */}
        <div style={S.sTitle}>AC installatie meetwaarden</div>
        <div style={S.card}>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[["Spanning AC","spanAC","V",v=>toNum(v)>=207&&toNum(v)<=253],["Z L-PE","zlpe","Ω",v=>toNum(v)<0.5],["ISO totaal AC","isoAC","MΩ",v=>toNum(v)>1]].map(([l,k,u,chk])=>(
              <div key={k} style={{flex:1,minWidth:80}}>
                <label style={S.label}>{l}</label>
                <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
                  <MiniInput value={instMet[k]} onChange={v=>sm(k,v)} unit={u} width={65}/>
                  {instMet[k]&&<StatusTag level={chk(instMet[k])?"ok":"red"}/>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Per string */}
        <div style={S.sTitle}>Metingen per string (DC)</div>
        <div style={{overflowX:"auto",display:"flex",gap:8,marginBottom:14,paddingBottom:4}}>
          {strings.map((s,i)=>{
            const done = gv(s.id,"iso") && gv(s.id,"spanning");
            const ok   = done && isoOk(gv(s.id,"iso")) && spanOk(gv(s.id,"spanning"));
            return (
              <button key={s.id} onClick={()=>setActiveStr(s.id)} style={{padding:"7px 13px",borderRadius:10,border:`1px solid ${activeStr===s.id?K.yellow:K.border}`,background:activeStr===s.id?K.yellowDim:K.card,color:activeStr===s.id?K.yellow:K.text,fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                {done?(ok?"✅":"⚠️"):"○"} String {i+1}
              </button>
            );
          })}
        </div>

        {(() => {
          const cs = strings.find(s=>s.id===activeStr);
          if (!cs) return null;
          const si = strings.findIndex(s=>s.id===activeStr);
          return (
            <div style={S.card}>
              <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>String {si+1}</div>
              <div style={{fontSize:11,color:K.muted,marginBottom:14}}>
                {cs.aantalPanelen} panelen · {cs.orientatie||"oriëntatie onbekend"}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                {[
                  {l:"ISO MΩ — norm >1",k:"iso",ph:"2.4",chk:isoOk},
                  {l:"Spanning Voc (V)",k:"spanning",ph:"380",chk:spanOk},
                  {l:"Lengte string (m)",k:"lengte",ph:"25",chk:()=>true},
                  {l:"Kortsluitstroom Isc (A)",k:"isc",ph:"10.5",chk:()=>true},
                ].map(({l,k,ph,chk})=>{
                  const val = gv(cs.id,k);
                  const ok  = val && chk(val);
                  return (
                    <div key={k}>
                      <label style={S.label}>{l}</label>
                      <input style={{...S.input,fontSize:16,fontWeight:700,
                        background:val?(ok?K.greenDim:K.redDim):K.surface,
                        border:`1px solid ${val?(ok?K.green:K.red):K.border}`}}
                        type="text" inputMode="decimal" placeholder={ph} value={val} onChange={e=>ss(cs.id,k,e.target.value)}/>
                    </div>
                  );
                })}
              </div>
              <div>
                <label style={S.label}>MC4 connectoren</label>
                <div style={{display:"flex",gap:8}}>
                  {["OK","NOK"].map(v=><Pill key={v} small active={gv(cs.id,"mc4")===v} onClick={()=>ss(cs.id,"mc4",v)}>{v}</Pill>)}
                </div>
              </div>
              {si < strings.length-1 &&
                <button style={{...S.btn,background:K.surface,color:K.text,border:`1px solid ${K.border}`,marginTop:14,marginBottom:0}}
                  onClick={()=>setActiveStr(strings[si+1].id)}>
                  Volgende string →
                </button>}
            </div>
          );
        })()}

        {/* Cross-checks */}
        <div style={{...S.sTitle,marginTop:8}}>Cross-check installatie</div>
        <WarnBox warnings={warnings}/>
        <button style={{...S.btn,background:K.yellow,color:"#000"}} onClick={onNext}>Volgende: versturen →</button>
      </div>
    </div>
  );
}

// ─── GEDEELDE VERSTUUR STAP ───────────────────────────────────────────────────

function StapVersturen({ data, onChange, discipline, onSend, onBack }) {
  const [status, setStatus] = useState("idle");
  const [pdfHtml, setPdfHtml] = useState("");
  const [bijlageHtml, setBijlageHtml] = useState("");
  const [mailStatus, setMailStatus] = useState("idle"); // idle | sending | sent | error
  const [mailError, setMailError] = useState("");
  const disc = DISCIPLINES.find(d=>d.id===discipline);

  const aardlekgroepen = data.aardlekgroepen||[];
  const strings  = data.pvStrings||[];
  const automaten = data.automaten||[];
  const grpMeet  = data.grpMeet||{};
  const pvMeet   = data.pvMeet||{};
  const instMet  = data.instMetingen||{};
  const pvInstMet = data.pvInstMet||{};

  const gkWarnings = discipline==="groepenkast" ? gkCrossChecks(aardlekgroepen, grpMeet, instMet) : [];
  const pvWarnings = discipline==="pv" ? pvCrossChecks(
    strings.map(s=>({...s,iso:pvMeet[`${s.id}_iso`],spanning:pvMeet[`${s.id}_spanning`]})),
    pvInstMet, {aantalPanelen:data.aantalPanelen,paneelWp:data.paneelWp,omvormerKw:data.omvormerKw}
  ) : [];
  const cvWarnings = discipline==="cv" ? cvCrossChecks(data.cvMeet||{}) : [];
  const wpWarnings = discipline==="wp" ? wpCrossChecks(data.wpMeet||{}, {geluidOpgave:data.geluidOpgave, groepAmpere:data.groepAmpere}) : [];
  const allWarnings = [...gkWarnings,...pvWarnings,...cvWarnings,...wpWarnings];
  const redWarnings = allWarnings.filter(w=>w.level==="red");

  const genereerRapport = () => {
    setStatus("generating");
    const datum = new Date().toLocaleDateString("nl-NL");
    const gv = (gId,k) => grpMeet[`${gId}_${k}`]||"—";
    const pv = (sId,k) => pvMeet[`${sId}_${k}`]||"—";
    const cvMeet = data.cvMeet||{};

    // ── Gedeelde CSS ──────────────────────────────────────────────
    const css = (accent) => `
      * { box-sizing:border-box; margin:0; padding:0;
          -webkit-print-color-adjust:exact; print-color-adjust:exact; color-adjust:exact; }
      body { font-family: Arial, sans-serif; font-size:10px; color:#222; background:#fff; padding:16px; }
      h1 { font-size:18px; color:${accent}; margin-bottom:2px; }
      h2 { font-size:11px; color:${accent}; text-transform:uppercase; letter-spacing:0.5px; margin:12px 0 4px; border-bottom:2px solid ${accent}; padding-bottom:2px; page-break-after:avoid; }
      table { width:100%; border-collapse:collapse; margin-bottom:8px; page-break-inside:avoid; }
      td, th { border:1px solid #ddd; padding:4px 6px; font-size:9px; }
      th { background:${accent}; color:#fff; font-weight:bold; text-align:left; }
      tr:nth-child(even) td { background:#f9f9f9; }
      .ok  { color:#166534; font-weight:bold; background:#dcfce7; }
      .nok { color:#991b1b; font-weight:bold; background:#fee2e2; }
      .warn{ color:#92400e; font-weight:bold; background:#fef3c7; }
      .naw { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px; page-break-inside:avoid; }
      .naw-box { border:1px solid #ddd; padding:8px; border-radius:4px; }
      .naw-box strong { display:block; color:${accent}; font-size:9px; text-transform:uppercase; margin-bottom:4px; }
      .naw-box p { margin:1px 0; font-size:9px; }
      .sign { margin-top:32px; border-top:1px solid #ddd; padding-top:12px; font-size:9px; page-break-inside:avoid; }
      .sign-line { display:inline-block; width:200px; border-bottom:1px solid #333; margin-right:32px; height:24px; }
      .warn-box { background:#fef3c7; border:1px solid #f59e0b; border-radius:4px; padding:8px; margin:8px 0; page-break-inside:avoid; }
      .warn-box p { margin:2px 0; font-size:9px; color:#92400e; }
      /* Voorkomt dat Gmail/Outlook automatisch gedetecteerde adressen en e-mailadressen
         blauw/onderstreept tonen — houdt de huisstijl-kleuren intact, ook in mailclients. */
      a, a:link, a:visited, a:hover, a:active,
      span[style*="color"] a { color:inherit !important; text-decoration:none !important; font-weight:inherit !important; cursor:default !important; }
      @media print {
        @page { margin:10mm; }
        body { padding:0; }
        h2 { page-break-after:avoid; }
        table, .naw-box, .warn-box, .sign { page-break-inside:avoid; }
        th, .ok, .nok, .warn, .warn-box, tr:nth-child(even) td {
          -webkit-print-color-adjust:exact !important;
          print-color-adjust:exact !important;
          color-adjust:exact !important;
        }
      }
    `;

    // ── Helpers ───────────────────────────────────────────────────
    const nawHtml = () => `
      <div class="naw">
        <div class="naw-box">
          <strong>Opdrachtgever</strong>
          <p>${data.naam||"—"}</p>
          <p>${data.straat||""} ${data.huisnummer||""}</p>
          <p>${data.postcode||""} ${data.plaats||""}</p>
          <p>${data.email||""}</p>
        </div>
        <div class="naw-box">
          <strong>Installateur</strong>
          <p>${data.instNaam||"—"}</p>
          <p>${data.instAdres||""}</p>
          <p>${data.instPlaats||""}</p>
          <p>${data.instTel||""} | ${data.instEmail||""}</p>
          <p>Erkenning: <strong>${data.instErkenning||"—"}</strong></p>
        </div>
      </div>
      <table>
        <tr><td><strong>Object</strong></td><td>${data.straat||""} ${data.huisnummer||""}, ${data.postcode||""} ${data.plaats||""}</td>
            <td><strong>Datum oplevering</strong></td><td>${datum}</td></tr>
        <tr><td><strong>Type werk</strong></td><td>${data.typewerk||"—"}</td>
            <td><strong>Projectnummer</strong></td><td>${data.projectId||"—"}</td></tr>
      </table>`;

    const waarschuwingHtml = () => allWarnings.length > 0 ? `
      <h2>⚠ Aandachtspunten</h2>
      <div class="warn-box">
        ${allWarnings.map(w=>`<p>${w.level==="red"?"🔴":"⚠️"} ${w.msg}</p>`).join("")}
      </div>` : "";

    // YourWkb-logo als inline SVG (geen externe afbeelding — werkt ook in
    // e-mailclients die externe afbeeldingen standaard blokkeren).
    const logoHtml = () => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <svg width="34" height="34" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
          <rect width="34" height="34" rx="8" fill="#F5C518"/>
          <path d="M19.5 6 L11 18.5 H16 L14.5 28 L23.5 15 H18 L19.5 6 Z" fill="#111318"/>
        </svg>
        <span style="font-family:Arial,sans-serif;font-weight:800;font-size:17px;letter-spacing:-0.3px;color:#111318">YourWkb</span>
      </div>`;

    const aiHtml = () => data.aiAnalyse ? `
      <h2>Technische beoordeling</h2>
      <div style="border:1px solid #ddd;border-radius:4px;padding:10px;font-size:9px;line-height:1.6;white-space:pre-wrap;background:#fafaff">${data.aiAnalyse}</div>` : "";

    const notitieHtml = () => data.notitie ? `
      <h2>Opmerkingen</h2>
      <div style="border:1px solid #ddd;border-radius:4px;padding:10px;font-size:9px;line-height:1.6;white-space:pre-wrap">${data.notitie}</div>` : "";

    // ── GROEPENSCHEMA — boomstructuur per aardlekschakelaar ─────────────────
    // Wordt automatisch gegenereerd uit aardlekgroep → eindgroep data.
    // De installateur kan dit per rapport aan/uit zetten via data.toonGroepenschema (default: true).
    const eindgroepIcoon = (type) => EINDGROEP_TYPES.find(t=>t.id===type)?.icon || "";
    const groepenschemaHtml = () => {
      if (data.toonGroepenschema === false) return "";
      if (!aardlekgroepen?.length) return "";
      // Bouw per aardlekschakelaar een kolom met eindgroepen eronder
      const kolommen = aardlekgroepen.map(ag => {
        const rcdLabel = ag.rcdType === "geen"
          ? "Zonder RCD"
          : `RCD ${ag.rcdMa}mA · type-${ag.rcdType}`;
        const rcdKleur = ag.rcdType === "geen" ? "#999" : "#1565C0";
        const eindGroepen = (ag.eindgroepen||[]).map((e, idx) => `
          <div style="border:1px solid #ccc;padding:6px 8px;margin-top:4px;background:#fff;border-radius:3px;font-size:9px">
            <div style="font-weight:700;color:#333">${idx+1}. ${eindgroepIcoon(e.type)} ${e.naam||"—"}</div>
            <div style="color:#666;font-size:8px;margin-top:2px">${e.kar||"B"}${e.ampere||"16A"}</div>
          </div>`).join("");
        return `
          <div style="flex:1;min-width:120px;page-break-inside:avoid">
            <div style="background:${rcdKleur};color:#fff;padding:6px 8px;border-radius:3px;font-size:10px;font-weight:700;text-align:center">
              ${ag.naam}<br><span style="font-size:8px;font-weight:500;opacity:0.9">${rcdLabel}</span>
            </div>
            <div style="border-left:2px dashed #ccc;margin-left:50%;height:8px"></div>
            ${eindGroepen}
          </div>`;
      }).join("");
      return `
      <h2 style="page-break-before:always">Groepenschema</h2>
      <p style="font-size:9px;color:#555;margin-bottom:10px">Automatisch gegenereerd uit de meetregistratie. Toont de structuur van aardlekschakelaars met onderliggende eindgroepen.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start">${kolommen}</div>`;
    };

    // ── UITKNIPBARE LABELS — voor in de meterkast ───────────────────────────
    // Aparte pagina met labels per eindgroep, in een raster met snijlijnen.
    const labelsHtml = () => {
      if (data.toonLabels === false) return "";
      if (!aardlekgroepen?.length) return "";
      const alleLabels = [];
      aardlekgroepen.forEach(ag => {
        (ag.eindgroepen||[]).forEach((e, idx) => {
          alleLabels.push({
            nummer: `${ag.naam.replace(/[^A-Z]/g,"")||"?"}${idx+1}`,
            naam: `${eindgroepIcoon(e.type)} ${e.naam || "—"}`.trim(),
            kar: `${e.kar||"B"}${e.ampere||"16A"}`,
          });
        });
      });
      if (!alleLabels.length) return "";
      // 4 kolommen × n rijen, met snijlijnen (dashed border) tussen labels
      const labelHtml = alleLabels.map(l => `
        <div style="border:1px dashed #999;padding:6px 8px;text-align:center;background:#fff;page-break-inside:avoid;height:52px;display:flex;flex-direction:column;justify-content:center">
          <div style="font-weight:800;font-size:10px;color:#000;letter-spacing:0.5px">${l.nummer} · ${l.naam}</div>
          <div style="font-size:8px;color:#666;margin-top:2px">${l.kar}</div>
        </div>`).join("");
      return `
      <h2 style="page-break-before:always">Uitknipbare labels meterkast</h2>
      <p style="font-size:9px;color:#555;margin-bottom:10px">Knip langs de stippellijnen en plak op de bijbehorende eindgroep in de meterkast. Het is aan te raden de pagina op stickerpapier af te drukken.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:0">${labelHtml}</div>`;
    };

    const fotosHtml = (checkpoints) => {
      const fotos = data.fotos||{};
      const inRapport = data.fotoInRapport||{};
      const metFoto = (checkpoints||[]).filter(cp => {
        const heeftFoto = fotos[cp.id] && typeof fotos[cp.id]==="string" && fotos[cp.id].startsWith("data:image");
        if (!heeftFoto) return false;
        // Foto's met 'optioneelInRapport' alleen tonen als vinkje aan staat (default: aan)
        if (cp.optioneelInRapport && inRapport[cp.id] === false) return false;
        return true;
      });
      if (metFoto.length === 0) return "";
      return `
      <!--FOTOSECTIE-START-->
      <h2 style="page-break-before:always">Fotodocumentatie</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${metFoto.map(cp=>`
          <div style="border:1px solid #ddd;border-radius:4px;overflow:hidden;page-break-inside:avoid">
            <img src="${fotos[cp.id]}" style="width:100%;height:auto;display:block"/>
            <div style="padding:5px 8px;font-size:8px;font-weight:bold;background:#f5f5f5">${cp.icon} ${cp.label}</div>
          </div>`).join("")}
      </div>
      <!--FOTOSECTIE-EINDE-->`;
    };

    const signHtml = (norm, verklaring) => `
      ${aiHtml()}
      ${notitieHtml()}
      <h2>Conformverklaring</h2>
      <p style="font-size:9px;margin-bottom:12px">${verklaring}</p>
      <div style="border:1px solid #ddd;border-radius:4px;padding:12px;font-size:9px;background:#fafafa">
        <p style="margin-bottom:8px">Ondergetekende verklaart dat bovenstaande gegevens en meetwaarden naar waarheid zijn ingevuld.</p>
        <table style="border:none;margin-bottom:0">
          <tr>
            <td style="border:none;padding:2px 0;width:33%"><strong>Naam installateur</strong><br>${data.instNaam||"—"}</td>
            <td style="border:none;padding:2px 0;width:33%"><strong>Erkenningsnummer</strong><br>${data.instErkenning||"—"}</td>
            <td style="border:none;padding:2px 0;width:33%"><strong>Datum ondertekening</strong><br>${datum}</td>
          </tr>
        </table>
      </div>
      <div class="sign" style="margin-top:16px">
        <span>Handtekening (optioneel): <span class="sign-line" style="width:250px"></span></span>
      </div>`;

    let html = "";

    // ── GROEPENKAST RAPPORT ───────────────────────────────────────
    if (discipline === "groepenkast") {
      const accentGK = "#1565C0";
      const statusGK = (v, chk) => v&&v!=="—" ? (chk(v) ? `class="ok"` : `class="nok"`) : "";
      const karFacRap = { B:5, C:10, D:20, gG:4 };
      const vKarRap = instMet.hoogstKar || "B";
      const vARap   = toNum(instMet.hoogstAmpere);
      const zMaxVoorzekRap = (karFacRap[vKarRap] && !isNaN(vARap) && vARap>0) ? 230/(karFacRap[vKarRap]*vARap) : null;
      const maxAfschakeltijdRap = (instMet.stelsel||data.stelsel)==="TT" ? 0.2 : 0.4;
      html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>${data.projectId}-groepenkast</title>
        <style>${css(accentGK)}</style></head><body>
        ${logoHtml()}
        <h1>Opleveringsrapport</h1>
        <p style="font-size:11px;color:#555;margin-bottom:12px">Elektrische installatie · NEN1010 deel 6</p>
        ${nawHtml()}
        <h2>Meetapparatuur</h2>
        <table>
          <tr><td><strong>Installatietester</strong></td><td>${data.apparTester||"—"}${data.apparTester_cal?` <span style="color:#888;font-size:8px">(kal. ${data.apparTester_cal})</span>`:""}</td>
              <td><strong>Stroomtang</strong></td><td>${data.apparTang||"—"}${data.apparTang_cal?` <span style="color:#888;font-size:8px">(kal. ${data.apparTang_cal})</span>`:""}</td></tr>
          <tr><td><strong>IR camera</strong></td><td>${data.apparIR||"—"}${data.apparIR_cal?` <span style="color:#888;font-size:8px">(kal. ${data.apparIR_cal})</span>`:""}</td>
              <td><strong>Multimeter</strong></td><td>${data.apparMulti||"—"}${data.apparMulti_cal?` <span style="color:#888;font-size:8px">(kal. ${data.apparMulti_cal})</span>`:""}</td></tr>
        </table>
        <h2>Gegevens installatie</h2>
        <table>
          <tr><td><strong>Bouwjaar</strong></td><td>${data.bouwjaar||"—"}</td>
              <td><strong>Kastklasse</strong></td><td>${data.kastType==="klasse1"?"Klasse 1 — metaal (geaard)":"Klasse 2 — dubbel geïsoleerd (kunststof)"}</td></tr>
          <tr><td><strong>Automaten</strong></td><td colspan="3">${automaten.map(a=>`${a.aantal}× ${a.fab} ${a.type!=="handmatig"?a.type:""} ${a.serie?`(${a.serie})`:""}`).join(", ")||"—"}</td></tr>
          <tr><td><strong>Aardlekschakelaars</strong></td><td colspan="3">${aardlekgroepen.map(ag=>ag.rcdType==="geen"?`${ag.naam}: geen RCD`:`${ag.naam}: ${ag.rcdMa}mA type-${ag.rcdType}`).join(" · ")||"—"}</td></tr>
        </table>
        <h2>Meetgegevens installatie (AC)</h2>
        <table>
          <tr>
            <td><strong>Voorzekering (hoogst afg. groep)</strong></td><td>${instMet.hoogstKar||"—"}${instMet.hoogstAmpere||"—"}A</td>
            <td><strong>Stelsel</strong></td><td>${instMet.stelsel||data.stelsel||"—"}${instMet.stelsel==="Anders"&&instMet.stelselAnders?` (${instMet.stelselAnders})`:""}</td>
          </tr>
          <tr>
            <td><strong>Hoofdzekering</strong></td><td>${instMet.hoofdzekering||"—"} A</td>
            <td><strong>Hoofdschakelaar</strong></td><td>${instMet.hoofdschakelaar||"—"}</td>
          </tr>
          <tr>
            <td><strong>Max. afschakeltijd</strong></td><td>${maxAfschakeltijdRap}s</td>
            <td></td><td></td>
          </tr>
          <tr>
            <td><strong>Z L-N</strong></td><td ${statusGK(instMet.zln, v=>toNum(v)<=(zMaxVoorzekRap||999))}>${instMet.zln||"—"} Ω ${instMet.zln&&!isNaN(toNum(instMet.zln))?`(Icc≈${(230/toNum(instMet.zln)).toFixed(0)}A)`:""}</td>
            <td><strong>Z L-PE</strong></td><td ${statusGK(instMet.zlpe, v=>toNum(v)<=(zMaxVoorzekRap||999))}>${instMet.zlpe||"—"} Ω ${instMet.zlpe&&!isNaN(toNum(instMet.zlpe))?`(Icc≈${(230/toNum(instMet.zlpe)).toFixed(0)}A)`:""}</td>
          </tr>
          ${instMet.zDrieFase ? `<tr>
            <td><strong>Z L2-N</strong></td><td ${statusGK(instMet.zl2n, v=>toNum(v)<=(zMaxVoorzekRap||999))}>${instMet.zl2n||"—"} Ω</td>
            <td><strong>Z L2-PE</strong></td><td ${statusGK(instMet.zl2pe, v=>toNum(v)<=(zMaxVoorzekRap||999))}>${instMet.zl2pe||"—"} Ω</td>
          </tr>
          <tr>
            <td><strong>Z L3-N</strong></td><td ${statusGK(instMet.zl3n, v=>toNum(v)<=(zMaxVoorzekRap||999))}>${instMet.zl3n||"—"} Ω</td>
            <td><strong>Z L3-PE</strong></td><td ${statusGK(instMet.zl3pe, v=>toNum(v)<=(zMaxVoorzekRap||999))}>${instMet.zl3pe||"—"} Ω</td>
          </tr>` : ""}
          ${instMet.zlpeAardlek ? `<tr>
            <td><strong>Z L-PE achter aardlek</strong></td><td>${instMet.zlpeAardlek} Ω (RCD ${instMet.rcdMaZlpe||"?"}mA · Ra_max=${instMet.rcdMaZlpe?(50/(toNum(instMet.rcdMaZlpe)/1000)).toFixed(0):"?"}Ω)</td>
            <td></td><td></td>
          </tr>` : ""}
          <tr>
            <td><strong>ISO totaal</strong></td><td ${statusGK(instMet.isoTot, v=>toNum(v)>=0.23)}>${instMet.isoTot||"—"} MΩ
              ${(instMet.isoTotProblemGroepen||[]).length ? `<br><span style="font-size:8px;color:#92400e">⚠ Probleemgroep(en): ${(instMet.isoTotProblemGroepen||[]).map(id=>aardlekgroepen.find(a=>a.id===id)?.naam||"?").join(", ")}${instMet.isoTotProblemen?` — ${instMet.isoTotProblemen}`:""}</span>` : ""}</td>
            <td colspan="2"></td>
          </tr>
          <tr>
            <td><strong>L1/N</strong></td><td ${statusGK(instMet["span_L1/N"], v=>toNum(v)>=207&&toNum(v)<=253)}>${instMet["span_L1/N"]||"—"} V</td>
            <td><strong>L2/N</strong></td><td ${statusGK(instMet["span_L2/N"], v=>toNum(v)>=207&&toNum(v)<=253)}>${instMet["span_L2/N"]||"—"} V</td>
          </tr>
          <tr>
            <td><strong>L3/N</strong></td><td ${statusGK(instMet["span_L3/N"], v=>toNum(v)>=207&&toNum(v)<=253)}>${instMet["span_L3/N"]||"—"} V</td>
            <td></td><td></td>
          </tr>
        </table>
        <h2>Aardlekgroepen — RCD-test (sectie C)</h2>
        <p style="font-size:8px;color:#666;margin-bottom:4px">
          ΔT-norm: ≤300ms (EN 61008 apparaatnorm bij 1× In). ΔI-norm: type AC ≤1× In · type A ≤1,4× In · type B ≤2× In. Isolatieweerstand is gemeten als ISO totaal (zie sectie B) — per-groep ISO alleen indien daar een probleemgroep is geïdentificeerd.
        </p>
        <table>
          <tr>
            <th>Aardlekgroep</th><th>Eindgroepen (kar·A)</th><th>Fase</th><th>RCD</th>
            <th>ΔT ms</th><th>ΔI mA</th><th>Test</th><th>Status</th>
          </tr>
          ${aardlekgroepen.map((ag)=>{
            const dtNormRap = 300; // EN 61008 altijd 300ms
            const geenRcd = ag.rcdType==="geen";
            const dt = geenRcd?"n.v.t.":gv(ag.id,"dt");
            const di = geenRcd?"n.v.t.":gv(ag.id,"di");
            const tk = geenRcd?"n.v.t.":gv(ag.id,"testknop");
            const dtOk2 = geenRcd || (dt!=="—"&&toNum(dt)<=dtNormRap);
            const mARap = toNum(ag.rcdMa);
            const diMaxRap = ag.rcdType==="B" ? mARap*2 : ag.rcdType==="AC" ? mARap*1 : mARap*1.4;
            const diOk = geenRcd || (di!=="—"&&toNum(di)<=diMaxRap);
            const tkOk = geenRcd || tk==="OK";
            const allOk = dtOk2&&diOk&&tkOk;
            const hoogst = ag.eindgroepen?.find(e=>e.id===ag.hoogstId) || ag.eindgroepen?.[0];
            const eindLijst = (ag.eindgroepen||[]).map(e=>`${e.id===hoogst?.id?"⭐ ":""}${eindgroepIcoon(e.type)} ${e.naam} (${e.kar}${e.ampere})`).join("<br>");
            return `<tr>
              <td><strong>${ag.naam}</strong></td>
              <td style="font-size:8px">${eindLijst}</td>
              <td>${ag.fase==="3"?"3F 400V":"1F 230V"}</td>
              <td>${geenRcd?"Geen":`${ag.rcdMa}mA ${ag.rcdType}`}</td>
              <td ${dtOk2?'class="ok"':'class="nok"'}>${dt}</td>
              <td ${diOk?'class="ok"':'class="nok"'}>${di}</td>
              <td ${tk==="OK"?'class="ok"':tk==="NOK"?'class="nok"':''}>${tk}</td>
              <td ${allOk?'class="ok"':'class="nok"'}>${allOk?"✓":"✗"}</td>
            </tr>`;
          }).join("")}
        </table>
        <h2>Visuele inspectie &amp; overige controles</h2>
        <table>
          <tr><th>Controlepunt</th><th>Resultaat</th></tr>
          <tr><td>Beschermingscontacten wandcontactdozen + metalen gestellen gecontroleerd door meting</td>
              <td ${instMet.beschermingscontacten==="OK"?'class="ok"':instMet.beschermingscontacten==="NOK"?'class="nok"':''}>${instMet.beschermingscontacten==="OK"?"✓ OK":instMet.beschermingscontacten==="NOK"?"✗ NOK":"—"}</td></tr>
          <tr><td>Hoofd- en aanvullende potentiaalvereffening gecontroleerd</td>
              <td ${instMet.potentiaalvereffening==="OK"?'class="ok"':instMet.potentiaalvereffening==="NOK"?'class="nok"':''}>${instMet.potentiaalvereffening==="OK"?"✓ OK":instMet.potentiaalvereffening==="NOK"?"✗ NOK":"—"}</td></tr>
          <tr><td>Leidingberekeningen op alle punten gecontroleerd</td>
              <td ${instMet.leidingberekeningen==="OK"?'class="ok"':instMet.leidingberekeningen==="NOK"?'class="nok"':''}>${instMet.leidingberekeningen==="OK"?"✓ OK":instMet.leidingberekeningen==="NOK"?"✗ NOK":"—"}</td></tr>
          <tr><td>Beveiligingen (incl. selectiviteit) op alle punten gecontroleerd</td>
              <td ${instMet.beveiligingen==="OK"?'class="ok"':instMet.beveiligingen==="NOK"?'class="nok"':''}>${instMet.beveiligingen==="OK"?"✓ OK":instMet.beveiligingen==="NOK"?"✗ NOK":"—"}</td></tr>
          <tr><td>Badkamer voorzien van Centraal Aardpunt</td><td>${instMet.badkamerCAP||"—"}</td></tr>
          <tr><td>Rookmelder aanwezig</td><td>${instMet.rookmelder||"—"}${instMet.rookmelder==="Ja"?` (voeding: ${instMet.rookmelderVoeding||"—"}, juist geprojecteerd: ${instMet.rookmelderProjectie||"—"})`:""}</td></tr>
        </table>
        ${waarschuwingHtml()}
        ${fotosHtml(GK_FOTO_CPS)}
        ${signHtml("NEN1010:2015, NEN3140:2011, NEN2555 en BRL6000 §4.1, §4.2 en §4.3","De installatie is aangelegd conform de huidige NEN1010:2015, NEN3140:2011, NEN2555 en BRL6000 hoofdstuk §4.1, §4.2 en §4.3. De visuele controle en metingen zijn over de gehele installatie uitgevoerd. Er zijn geen afwijkingen geconstateerd die een veilige inbedrijfstelling verhinderen.")}
        </body></html>`;

    // ── COMBIKETEL RAPPORT ────────────────────────────────────────
    } else if (discipline === "cv") {
      const accentCV = "#DC2626";
      const statusCV = (v, chk) => v&&v!=="—" ? (chk(v) ? `class="ok"` : `class="nok"`) : "";
      html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>${data.projectId}-combiketel</title>
        <style>${css(accentCV)}</style></head><body>
        ${logoHtml()}
        <h1>Opleveringsrapport</h1>
        <p style="font-size:11px;color:#555;margin-bottom:12px">CV-installatie · BRL6000-25 · Gasketelwet</p>
        ${nawHtml()}
        <h2>Meetapparatuur</h2>
        <table>
          <tr><td><strong>Rookgasanalyser</strong></td><td>${data.apparAnalyser||"—"}</td>
              <td><strong>CO-meter omgeving</strong></td><td>${data.apparCO||"—"}</td></tr>
          <tr><td><strong>Manometer waterdruk</strong></td><td>${data.apparManometer||"—"}</td>
              <td><strong>Gasdrukmanometer</strong></td><td>${data.apparGasdruk||"—"}</td></tr>
          <tr><td><strong>Multimeter / thermometer</strong></td><td>${data.apparMulti||"—"}</td>
              <td></td><td></td></tr>
        </table>
        <h2>Ketelspecificaties</h2>
        <table>
          <tr><td><strong>Fabrikant</strong></td><td>${data.ketelFab||"—"}</td>
              <td><strong>Model</strong></td><td>${data.ketelModel||"—"}</td></tr>
          <tr><td><strong>Serienummer</strong></td><td>${data.ketelSerie||"—"}</td>
              <td><strong>Bouwjaar</strong></td><td>${data.ketelBouwjaar||"—"}</td></tr>
          <tr><td><strong>Vermogen</strong></td><td>${data.ketelKw||"—"} kW</td>
              <td><strong>Type toestel</strong></td><td>${data.ketelType||"—"}</td></tr>
          <tr><td><strong>Rookgasafvoer</strong></td><td>${data.afvoerType||"—"}</td>
              <td><strong>Fabrikant afvoer</strong></td><td>${data.afvoerFab||"—"}</td></tr>
          <tr><td><strong>Expansievat</strong></td><td>${data.expansieL||"—"}L / ${data.expansieBar||"—"}bar</td>
              <td><strong>Veiligheidsventiel</strong></td><td>${data.veilBar||"—"}bar</td></tr>
          <tr><td><strong>Gasleiding materiaal</strong></td><td>${data.gasMateriaal||"—"}</td>
              <td><strong>Lekdichtheid</strong></td><td ${cvMeet.lekdicht==="OK"?'class="ok"':cvMeet.lekdicht==="NOK"?'class="nok"':''}>${cvMeet.lekdicht||"—"}</td></tr>
        </table>
        <h2>CO-meting omgevingslucht</h2>
        <table>
          <tr><th>Moment</th><th>Waarde (ppm)</th><th>Norm</th><th>Status</th></tr>
          <tr>
            <td>Vóór aanvang werkzaamheden</td>
            <td>${cvMeet.coVoor||"—"} ppm</td>
            <td>&lt; 10 ppm</td>
            <td ${statusCV(cvMeet.coVoor, v=>toNum(v)<10)}>${cvMeet.coVoor&&cvMeet.coVoor!=="—"?(toNum(cvMeet.coVoor)<10?"✓ OK":"✗ Te hoog"):"—"}</td>
          </tr>
          <tr>
            <td>Ná werkzaamheden</td>
            <td>${cvMeet.coNa||"—"} ppm</td>
            <td>&lt; 10 ppm</td>
            <td ${statusCV(cvMeet.coNa, v=>toNum(v)<10)}>${cvMeet.coNa&&cvMeet.coNa!=="—"?(toNum(cvMeet.coNa)<10?"✓ OK":"✗ Te hoog"):"—"}</td>
          </tr>
        </table>
        <h2>Rookgasanalyse</h2>
        <table>
          <tr><th>Meetwaarde</th><th>Gemeten</th><th>Norm</th><th>Status</th></tr>
          ${[
            ["CO in rookgassen", cvMeet.coRookgas, "ppm", "< 200 ppm", v=>toNum(v)<200],
            ["CO₂", cvMeet.co2, "%", "8–12%", v=>toNum(v)>=8&&toNum(v)<=12],
            ["O₂", cvMeet.o2, "%", "3–6%", v=>toNum(v)>=3&&toNum(v)<=6],
            ["Rookgastemperatuur", cvMeet.rookgasTemp, "°C", "< 200°C", v=>toNum(v)<200],
            ["Rendement", cvMeet.rendement, "%", "> 90%", v=>toNum(v)>90],
          ].map(([l,v,u,n,chk])=>`<tr>
            <td>${l}</td>
            <td>${v||"—"} ${v&&v!=="—"?u:""}</td>
            <td>${n}</td>
            <td ${v&&v!=="—"?(chk(v)?'class="ok"':'class="nok"'):''}>${v&&v!=="—"?(chk(v)?"✓ OK":"✗ Afwijking"):"—"}</td>
          </tr>`).join("")}
        </table>
        <h2>Drukken &amp; temperaturen</h2>
        <table>
          <tr><th>Meetwaarde</th><th>Gemeten</th><th>Norm</th><th>Status</th></tr>
          ${[
            ["Waterdruk (koud/statisch)", cvMeet.waterdruk, "bar", "1,5–2,0 bar", v=>toNum(v)>=1.5&&toNum(v)<=2.0],
            ["Gasdruk netwerk", cvMeet.gasdruk, "mbar", "20–25 mbar", v=>toNum(v)>=18&&toNum(v)<=27],
            ["Aanvoertemperatuur", cvMeet.aanvoerTemp, "°C", "< 90°C", v=>toNum(v)<90],
            ["Retourtemperatuur", cvMeet.retourTemp, "°C", "< 80°C", v=>toNum(v)<80],
          ].map(([l,v,u,n,chk])=>`<tr>
            <td>${l}</td>
            <td>${v||"—"} ${v&&v!=="—"?u:""}</td>
            <td>${n}</td>
            <td ${v&&v!=="—"?(chk(v)?'class="ok"':'class="nok"'):''}>${v&&v!=="—"?(chk(v)?"✓ OK":"✗ Afwijking"):"—"}</td>
          </tr>`).join("")}
        </table>
        ${waarschuwingHtml()}
        ${fotosHtml(CV_FOTO_CPS)}
        ${signHtml("BRL6000-25","De cv-installatie is geplaatst/vervangen conform de geldende normen en richtlijnen (BRL6000-25, NPR3378, Gasketelwet). De rookgasanalyse en alle meetwaarden voldoen aan de gestelde eisen. De installatie is veilig in bedrijf gesteld.")}
        </body></html>`;

    // ── WARMTEPOMP RAPPORT ────────────────────────────────────────
    } else if (discipline === "wp") {
      const accentWP = "#06B6D4";
      const wpMeet = data.wpMeet||{};
      const statusWP = (v, chk) => v&&v!=="—" ? (chk(v) ? `class="ok"` : `class="nok"`) : "";
      const dtWp = (wpMeet.aanvoerTemp&&wpMeet.retourTemp) ? Math.abs(toNum(wpMeet.aanvoerTemp)-toNum(wpMeet.retourTemp)) : null;
      html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>${data.projectId}-warmtepomp</title>
        <style>${css(accentWP)}</style></head><body>
        ${logoHtml()}
        <h1>Opleveringsrapport</h1>
        <p style="font-size:11px;color:#555;margin-bottom:12px">Warmtepompinstallatie · BRL6000-21</p>
        ${nawHtml()}
        <h2>Meetapparatuur</h2>
        <table>
          <tr><td><strong>Thermometer</strong></td><td>${data.apparThermo||"—"}</td>
              <td><strong>Manometer</strong></td><td>${data.apparManometer||"—"}</td></tr>
          <tr><td><strong>Energiemeter</strong></td><td>${data.apparEnergie||"—"}</td>
              <td><strong>Geluidsmeter</strong></td><td>${data.apparGeluid||"—"}</td></tr>
          <tr><td><strong>Multimeter</strong></td><td colspan="3">${data.apparMulti||"—"}</td></tr>
        </table>
        <h2>Installatiespecificaties</h2>
        <table>
          <tr><td><strong>Type systeem</strong></td><td>${data.wpType||"—"}</td>
              <td><strong>Fabrikant</strong></td><td>${data.wpFab||"—"}</td></tr>
          <tr><td><strong>Model</strong></td><td>${data.wpModel||"—"}</td>
              <td><strong>Serienummer</strong></td><td>${data.wpSerie||"—"}</td></tr>
          <tr><td><strong>Vermogen</strong></td><td>${data.wpKw||"—"} kW</td>
              <td><strong>Geluid (opgave fabrikant)</strong></td><td>${data.geluidOpgave||"—"} dB(A)</td></tr>
          <tr><td><strong>Koudemiddel</strong></td><td>${data.koudemiddel||"—"}</td>
              <td><strong>Hoeveelheid</strong></td><td>${data.koudemiddelKg||"—"} kg</td></tr>
          <tr><td><strong>Boilervat</strong></td><td>${data.boilerL||"—"} L</td>
              <td><strong>Buffervat</strong></td><td>${data.bufferL||"—"} L</td></tr>
          <tr><td><strong>Elektrische groep</strong></td><td colspan="3">${data.groepKar||"—"}${data.groepAmpere||"—"}</td></tr>
        </table>
        <h2>Meetwaarden verwarmingscircuit</h2>
        <table>
          <tr><th>Meetwaarde</th><th>Gemeten</th><th>Norm</th><th>Status</th></tr>
          <tr><td>Aanvoertemperatuur</td><td>${wpMeet.aanvoerTemp||"—"} °C</td><td>—</td><td>—</td></tr>
          <tr><td>Retourtemperatuur</td><td>${wpMeet.retourTemp||"—"} °C</td><td>—</td><td>—</td></tr>
          <tr><td>ΔT verwarmingscircuit</td><td>${dtWp!==null?dtWp.toFixed(1):"—"} K</td><td>5–10K</td>
              <td ${dtWp!==null?(dtWp>=5&&dtWp<=10?'class="ok"':'class="nok"'):''}>${dtWp!==null?(dtWp>=5&&dtWp<=10?"✓ OK":"✗ Afwijking"):"—"}</td></tr>
          <tr><td>Werkdruk</td><td>${wpMeet.werkdruk||"—"} bar</td><td>1,5–2,0 bar</td>
              <td ${statusWP(wpMeet.werkdruk,v=>toNum(v)>=1.5&&toNum(v)<=2.5)}>${wpMeet.werkdruk&&wpMeet.werkdruk!=="—"?(toNum(wpMeet.werkdruk)>=1.5&&toNum(wpMeet.werkdruk)<=2.5?"✓ OK":"✗ Afwijking"):"—"}</td></tr>
          <tr><td>Spanning</td><td>${wpMeet.spanning||"—"} V</td><td>207–253V</td>
              <td ${statusWP(wpMeet.spanning,v=>toNum(v)>=207&&toNum(v)<=253)}>${wpMeet.spanning&&wpMeet.spanning!=="—"?(toNum(wpMeet.spanning)>=207&&toNum(wpMeet.spanning)<=253?"✓ OK":"✗ Afwijking"):"—"}</td></tr>
        </table>
        <h2>Bron</h2>
        <table>
          <tr><td><strong>Brontemperatuur in</strong></td><td>${wpMeet.bronTempIn||"—"} °C</td>
              <td><strong>Brontemperatuur uit</strong></td><td>${wpMeet.bronTempUit||"—"} °C</td></tr>
          <tr><td><strong>Glycolconcentratie</strong></td><td>${wpMeet.glycol||"—"} %</td>
              <td><strong>Luchtdebiet</strong></td><td>${wpMeet.luchtdebiet||"—"} m³/h</td></tr>
        </table>
        <h2>Elektrisch &amp; geluid</h2>
        <table>
          <tr><td><strong>Stroomopname (opstart)</strong></td><td>${wpMeet.stroomopname||"—"} A</td>
              <td><strong>Elektrisch opgenomen vermogen</strong></td><td>${wpMeet.vermogenOpgenomen||"—"} kW</td></tr>
          <tr><td><strong>Geluidsniveau gemeten</strong></td><td>${wpMeet.geluidGemeten||"—"} dB(A)</td>
              <td><strong>Expansievat voordruk</strong></td><td>${wpMeet.expansieVoordr||"—"} bar</td></tr>
        </table>
        ${waarschuwingHtml()}
        ${fotosHtml(WP_FOTO_CPS)}
        ${signHtml("BRL6000-21","De warmtepompinstallatie is geplaatst conform de geldende normen en richtlijnen (BRL6000-21). De metingen aan het verwarmingscircuit, de bron en de elektrische aansluiting voldoen aan de gestelde eisen. De installatie is veilig in bedrijf gesteld.")}
        </body></html>`;

    // ── ZONNEPANELEN RAPPORT ──────────────────────────────────────
    } else {
      const accentPV = "#EA580C";
      const statusPV = (v, chk) => v&&v!=="—" ? (chk(v) ? `class="ok"` : `class="nok"`) : "";
      const totaalKwp = ((parseInt(data.aantalPanelen)||0)*(parseInt(data.paneelWp)||0)/1000).toFixed(2);
      html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>${data.projectId}-zonnepanelen</title>
        <style>${css(accentPV)}</style></head><body>
        ${logoHtml()}
        <h1>Opleveringsrapport</h1>
        <p style="font-size:11px;color:#555;margin-bottom:12px">PV-installatie · NEN1010:712 · SCIOS Scope 12</p>
        ${nawHtml()}
        <h2>Meetapparatuur</h2>
        <table>
          <tr><td><strong>Isolatietester / PV-analysator</strong></td><td>${data.apparTester||"—"}</td>
              <td><strong>Multimeter</strong></td><td>${data.apparMulti||"—"}</td></tr>
          <tr><td><strong>IR camera</strong></td><td colspan="3">${data.apparIR||"—"}</td></tr>
        </table>
        <h2>Installatiespecificaties</h2>
        <table>
          <tr><td><strong>Panelen fabrikant</strong></td><td>${data.paneelFab||"—"}</td>
              <td><strong>Type</strong></td><td>${data.paneelType||"—"}</td></tr>
          <tr><td><strong>Vermogen per paneel</strong></td><td>${data.paneelWp||"—"} Wp</td>
              <td><strong>Aantal panelen</strong></td><td>${data.aantalPanelen||"—"}</td></tr>
          <tr><td><strong>Totaalvermogen</strong></td><td><strong>${totaalKwp} kWp</strong></td>
              <td><strong>Daktype</strong></td><td>${data.dakType||"—"}</td></tr>
          <tr><td><strong>Omvormer</strong></td><td>${data.omvormerFab||"—"} ${data.omvormerType||""}</td>
              <td><strong>Vermogen omvormer</strong></td><td>${data.omvormerKw||"—"} kW</td></tr>
          <tr><td><strong>Bevestigingssysteem</strong></td><td colspan="3">${data.bevestigingFab||"—"}</td></tr>
        </table>
        <h2>Visuele inspectie (NEN1010:712)</h2>
        <table>
          <tr><th>Inspectie punt</th><th>Resultaat</th></tr>
          ${Object.entries(data.pvVisueel||{}).map(([k,v])=>{
            const labels = {ballastplan:"Ballastplan en legplan aanwezig",dc_klasse2:"DC-leidingen klasse type 2",mc4_ok:"MC4 connectoren correct",vermogen_ok:"Som vermogens ≤ max omvormer",brandcompart:"Doorvoeringen brandcompartimenten OK",aarding_constr:"Draagconstructie geaard",leidingsyst:"Leidingsystemen beschermd",rcd_type:"RCD juist type",markering:"Markeringen NEN1010:712"};
            return `<tr><td>${labels[k]||k}</td><td ${v==="OK"?'class="ok"':v==="NOK"?'class="nok"':''}>${v==="OK"?"✓ OK":v==="NOK"?"✗ NOK":"—"}</td></tr>`;
          }).join("")}
        </table>
        <h2>AC meetwaarden</h2>
        <table>
          <tr>
            <td><strong>Spanning AC</strong></td>
            <td ${statusPV(pvInstMet.spanAC, v=>toNum(v)>=207&&toNum(v)<=253)}>${pvInstMet.spanAC||"—"} V</td>
            <td><strong>Z L-PE</strong></td>
            <td ${statusPV(pvInstMet.zlpe, v=>toNum(v)<0.5)}>${pvInstMet.zlpe||"—"} Ω</td>
          </tr>
          <tr>
            <td><strong>ISO totaal AC</strong></td>
            <td ${statusPV(pvInstMet.isoAC, v=>toNum(v)>1)}>${pvInstMet.isoAC||"—"} MΩ</td>
            <td></td><td></td>
          </tr>
        </table>
        <h2>DC string meetstaat</h2>
        <table>
          <tr><th>String</th><th>Panelen</th><th>Oriëntatie</th><th>ISO MΩ</th><th>Voc (V)</th><th>Isc (A)</th><th>Lengte (m)</th><th>MC4</th><th>Status</th></tr>
          ${strings.map((s,i)=>{
            const iso=pv(s.id,"iso"); const span=pv(s.id,"spanning"); const isc=pv(s.id,"isc"); const len=pv(s.id,"lengte"); const mc4=pv(s.id,"mc4");
            const isoOk=iso!=="—"&&toNum(iso)>1;
            const allOk=isoOk&&mc4==="OK";
            return `<tr>
              <td>String ${i+1}</td>
              <td>${s.aantalPanelen||"—"}</td>
              <td>${s.orientatie||"—"}</td>
              <td ${isoOk?'class="ok"':'class="nok"'}>${iso}</td>
              <td>${span}</td><td>${isc}</td><td>${len}</td>
              <td ${mc4==="OK"?'class="ok"':mc4==="NOK"?'class="nok"':''}>${mc4}</td>
              <td ${allOk?'class="ok"':'class="nok"'}>${allOk?"✓ OK":"✗ Check"}</td>
            </tr>`;
          }).join("")}
        </table>
        ${waarschuwingHtml()}
        ${fotosHtml(PV_FOTO_CPS)}
        ${signHtml("NEN1010:712","De PV-installatie is uitgevoerd conform NEN1010:712 en SCIOS Scope 12. De visuele inspectie en metingen zijn over de gehele installatie uitgevoerd. Er zijn geen afwijkingen geconstateerd die een veilige inbedrijfstelling verhinderen.")}
        </body></html>`;
    }

    setPdfHtml(html);
    trackEvent("rapport_gegenereerd", {
      discipline,
      aantal_aardlekgroepen: (data.aardlekgroepen || []).length,
      ai_gebruikt: !!data.aiAnalyse,
    });

    // ── BIJLAGE (alleen voor groepenkast) — groepenschema en uitknipbare labels
    // Apart document zodat het hoofdrapport compact blijft en de bijlage los
    // af te drukken/op te slaan is. Wordt alleen gegenereerd als er aardlekgroepen zijn
    // én tenminste één van de twee vinkjes aan staat.
    if (discipline === "groepenkast"
        && aardlekgroepen?.length > 0
        && (data.toonGroepenschema !== false || data.toonLabels !== false)) {
      const accentGK = "#1565C0";
      const schemaSectie = data.toonGroepenschema !== false ? groepenschemaHtml() : "";
      const labelsSectie = data.toonLabels !== false ? labelsHtml() : "";
      // De helper-functies beginnen met "page-break-before:always" — voor de eerste
      // sectie in een los document hoeven we die page break niet, dus die strippen we.
      const schemaSchoon = schemaSectie.replace('<h2 style="page-break-before:always">', '<h1>');
      const labelsSchoon = labelsSectie;
      const bijlage = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>${data.projectId}-bijlage</title>
        <style>${css(accentGK)}</style></head><body>
        ${logoHtml()}
        <h1>Bijlage opleverrapport</h1>
        <p style="font-size:11px;color:#555;margin-bottom:16px">Behoort bij rapport <strong>${data.projectId||""}</strong> · ${data.straat||""} ${data.huisnummer||""}, ${data.plaats||""}</p>
        ${schemaSchoon}
        ${labelsSchoon}
        </body></html>`;
      setBijlageHtml(bijlage);
    } else {
      setBijlageHtml("");
    }
    setStatus("done");
  };

  const download = () => {
    // Open rapport in nieuw venster met print-naar-PDF instructie
    const win = window.open("", "_blank");
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${data.projectId||"rapport"}-${discipline}</title>
        <style>
          @media print {
            .print-btn { display:none !important; }
            body { margin:0; }
          }
        </style>
      </head>
      <body>
        <div class="print-btn" style="position:fixed;top:12px;right:12px;z-index:999;display:flex;gap:8px;">
          <button onclick="window.print()" style="background:#F5C518;color:#000;border:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;">
            🖨️ Opslaan als PDF
          </button>
          <button onclick="window.close()" style="background:#2E3347;color:#fff;border:none;padding:10px 16px;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;">
            ✕ Sluiten
          </button>
        </div>
        ${pdfHtml}
      </body>
      </html>
    `);
    win.document.close();
  };

  const verstuurEmail = async () => {
    if (!data.email) {
      setMailStatus("error");
      setMailError("Geen e-mailadres van de klant bekend — vul dit in bij stap 1.");
      return;
    }
    setMailStatus("sending");
    setMailError("");
    try {
      // Foto's worden NIET meegestuurd in de e-mail zelf — bij disciplines met
      // veel verplichte foto's (PV/CV/WP) maakt dat de payload te groot voor
      // de server (>4,5MB wordt door Vercel geweigerd, nog vóórdat onze eigen
      // code het ziet). Foto's blijven gewoon in de PDF-versie staan.
      const fotoNotitie = `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:4px;padding:10px;margin:10px 0;font-size:9px;color:#92400e">📷 De foto's bij dit rapport staan niet in deze e-mail (i.v.m. bestandsgrootte). Vraag de installateur naar de PDF-versie met foto's, of laat deze nasturen.</div>`;
      const htmlZonderFotos = pdfHtml.replace(
        /<!--FOTOSECTIE-START-->[\s\S]*?<!--FOTOSECTIE-EINDE-->/,
        fotoNotitie
      );

      // Persoonlijke aanhef toevoegen vóór de inhoud van het rapport
      const introHtml = htmlZonderFotos.replace(
        "<body>",
        `<body><div style="max-width:680px;margin:0 auto 20px;font-family:Arial,sans-serif;font-size:13px;color:#333;line-height:1.6">
          <p>Beste ${data.naam||""},</p>
          <p>Hierbij ontvangt u het opleverrapport van de werkzaamheden uitgevoerd door ${data.instNaam||"uw installateur"}. Dit rapport voldoet aan de geldende normen en is automatisch gegenereerd via YourWkb.</p>
        </div>`
      );
      const resp = await fetch("/api/verstuur-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: data.email,
          replyTo: data.instEmail || undefined,
          subject: `Opleverrapport ${data.projectId||""} – ${data.straat||""} ${data.huisnummer||""}`.trim(),
          html: introHtml,
        }),
      });

      // Veilig parsen: lees eerst als tekst, probeer dan als JSON te lezen.
      // Voorkomt een crash als de server een lege/HTML-foutpagina teruggeeft
      // (bijv. bij een payload die alsnog te groot is, of een timeout).
      const raw = await resp.text();
      let json = {};
      try { json = raw ? JSON.parse(raw) : {}; }
      catch { throw new Error(`Onverwachte serverfout (status ${resp.status}) — probeer het later opnieuw.`); }

      if (!resp.ok || json.error) throw new Error(json.error || `Versturen mislukt (status ${resp.status})`);
      setMailStatus("sent");
      trackEvent("mail_verstuurd", { discipline, success: true });
    } catch (e) {
      setMailStatus("error");
      setMailError(e.message || "Onbekende fout");
      trackEvent("mail_verstuurd", { discipline, success: false });
    }
  };

  return (
    <div>
      <div style={S.hdr}><button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:15}}>Rapport genereren</div><div style={{fontSize:11,color:K.muted}}>Stap 8 · {disc?.label}</div></div>
      </div>
      <div style={S.body}>
        {/* ProjectId */}
        <div style={{...S.card,background:K.yellowDim,border:`1px solid ${K.yellow}55`,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>📁</span>
          <div>
            <div style={{fontSize:10,color:K.yellow,fontWeight:700,textTransform:"uppercase"}}>Bestandsnaam</div>
            <div style={{fontSize:18,fontWeight:800,color:K.yellow}}>{data.projectId||"—"}-{discipline}.pdf</div>
          </div>
        </div>

        {/* Samenvatting */}
        <div style={S.card}>
          <div style={{fontWeight:600,fontSize:15,marginBottom:2}}>{data.naam}</div>
          <div style={{fontSize:13,color:K.muted,marginBottom:12}}>{data.straat} {data.huisnummer}, {data.postcode} {data.plaats}</div>
          <div style={{display:"flex",gap:20}}>
            {discipline==="groepenkast" && <>
              <div><div style={{fontSize:20,fontWeight:800}}>{aardlekgroepen.length}</div><div style={{fontSize:11,color:K.muted}}>Aardlekgroepen</div></div>
              <div><div style={{fontSize:20,fontWeight:800}}>{automaten.reduce((s,a)=>s+a.aantal,0)}</div><div style={{fontSize:11,color:K.muted}}>Automaten</div></div>
            </>}
            {discipline==="cv" && <>
              <div><div style={{fontSize:20,fontWeight:800}}>{data.ketelFab||"—"}</div><div style={{fontSize:11,color:K.muted}}>Fabrikant</div></div>
              <div><div style={{fontSize:20,fontWeight:800}}>{data.ketelKw||"—"}</div><div style={{fontSize:11,color:K.muted}}>kW</div></div>
              <div><div style={{fontSize:20,fontWeight:800}}>{data.cvMeet?.coNa||"—"}</div><div style={{fontSize:11,color:K.muted}}>CO ná ppm</div></div>
            </>}
            {discipline==="pv" && <>
              <div><div style={{fontSize:20,fontWeight:800}}>{data.aantalPanelen||"—"}</div><div style={{fontSize:11,color:K.muted}}>Panelen</div></div>
              <div><div style={{fontSize:20,fontWeight:800}}>{strings.length}</div><div style={{fontSize:11,color:K.muted}}>Strings</div></div>
              <div><div style={{fontSize:20,fontWeight:800}}>{((parseInt(data.aantalPanelen)||0)*(parseInt(data.paneelWp)||0)/1000).toFixed(1)}</div><div style={{fontSize:11,color:K.muted}}>kWp</div></div>
            </>}
            <div>
              <div style={{fontSize:20,fontWeight:800,color:redWarnings.length?K.red:allWarnings.length?K.orange:K.green}}>
                {redWarnings.length ? "🔴" : allWarnings.length ? "⚠️" : "✅"}
              </div>
              <div style={{fontSize:11,color:K.muted}}>{allWarnings.length} punten</div>
            </div>
          </div>
        </div>

        <WarnBox warnings={allWarnings}/>

        {/* Notitieveld */}
        <div style={S.card}>
          <label style={S.label}>Opmerkingen / aantekeningen (optioneel)</label>
          <textarea
            style={{
              width:"100%", minHeight:80, padding:"11px 13px",
              borderRadius:10, border:`1px solid ${K.border}`,
              background:K.surface, color:K.text,
              fontFamily:"'IBM Plex Sans',sans-serif", fontSize:13,
              boxSizing:"border-box", outline:"none", resize:"none",
              display:"block", position:"relative",
            }}
            placeholder="Bijv. afwijkingen toegelicht, bijzonderheden installatie, vervolgacties..."
            defaultValue={data.notitie||""}
            onChange={e=>onChange("notitie", e.target.value)}
          />
        </div>

        {status==="idle" && (
          <button style={{...S.btn,background:K.yellow,color:"#000"}} onClick={genereerRapport}>
            📄 Rapport genereren
          </button>
        )}
        {status==="generating" && (
          <div style={{...S.card,background:K.blueDim,border:`1px solid ${K.blue}44`,textAlign:"center",padding:28}}>
            <div style={{fontSize:32,marginBottom:12}}>📄</div>
            <div style={{fontWeight:700,marginBottom:4}}>Rapport wordt opgesteld…</div>
            <div style={{fontSize:12,color:K.muted}}>Even geduld</div>
          </div>
        )}
        {status==="error" && (
          <div style={{...S.card,background:K.redDim,border:`1px solid ${K.red}44`}}>
            <div style={{fontSize:13,color:K.red,fontWeight:700}}>⚠️ Fout. Probeer opnieuw.</div>
            <button style={{...S.btn,background:K.yellow,color:"#000",marginTop:12}} onClick={genereerRapport}>Opnieuw</button>
          </div>
        )}
        {status==="done" && pdfHtml && (
          <>
            <div style={{...S.sTitle,marginTop:8}}>Voorbeeld</div>
            <div style={{borderRadius:14,overflow:"hidden",border:`1px solid ${K.border}`,marginBottom:12,height:380}}>
              <iframe srcDoc={pdfHtml} style={{width:"100%",height:"100%",border:"none",background:"#fff"}} title="rapport"/>
            </div>
            <button style={{...S.btn,background:K.green,color:"#fff"}} onClick={download}>
              🖨️ Openen &amp; opslaan als PDF
            </button>

            {/* Bijlage met groepenschema + uitknipbare labels (alleen GK) */}
            {bijlageHtml && (
              <button style={{...S.btn,background:K.surface,color:K.text,border:`1px solid ${K.border}`}} onClick={() => {
                const win = window.open("", "_blank");
                win.document.write(`
                  <!DOCTYPE html><html><head>
                    <title>${data.projectId||"rapport"}-bijlage</title>
                    <style>@media print { .print-btn { display:none !important; } body { margin:0; } }</style>
                  </head><body>
                    <div class="print-btn" style="position:fixed;top:12px;right:12px;z-index:999;display:flex;gap:8px;">
                      <button onclick="window.print()" style="background:#F5C518;color:#000;border:none;padding:10px 20px;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;">🖨️ Opslaan als PDF</button>
                      <button onclick="window.close()" style="background:#2E3347;color:#fff;border:none;padding:10px 16px;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;">✕ Sluiten</button>
                    </div>
                    ${bijlageHtml}
                  </body></html>
                `);
                win.document.close();
              }}>
                📎 Bijlage openen (groepenschema &amp; labels)
              </button>
            )}

            {/* Mail rapport naar klant — via Resend */}
            {mailStatus==="idle" && (
              <button style={{...S.btn,background:K.blue,color:"#fff"}} onClick={verstuurEmail}>
                📧 Mail rapport naar klant{data.email?` (${data.email})`:""}
              </button>
            )}
            {mailStatus==="sending" && (
              <div style={{...S.card,background:K.blueDim,border:`1px solid ${K.blue}44`,textAlign:"center",padding:16}}>
                <div style={{fontSize:13,color:K.blue,fontWeight:600}}>📧 Bezig met versturen…</div>
              </div>
            )}
            {mailStatus==="sent" && (
              <div style={{...S.card,background:K.greenDim,border:`1px solid ${K.green}44`,textAlign:"center",padding:16}}>
                <div style={{fontSize:13,color:K.green,fontWeight:700}}>✅ Verstuurd naar {data.email}</div>
              </div>
            )}
            {mailStatus==="error" && (
              <div style={{...S.card,background:K.redDim,border:`1px solid ${K.red}44`}}>
                <div style={{fontSize:12,color:K.red,fontWeight:600,marginBottom:4}}>⚠️ Versturen mislukt</div>
                {mailError && <div style={{fontSize:11,color:K.red,opacity:0.85,fontFamily:"monospace",marginBottom:8}}>{mailError}</div>}
                <button style={{...S.btn,background:K.surface,color:K.text,border:`1px solid ${K.border}`,marginBottom:0}} onClick={verstuurEmail}>Opnieuw proberen</button>
              </div>
            )}

            <button style={{...S.btn,background:K.yellow,color:"#000"}} onClick={onSend}>
              ✅ Markeren als opgeleverd
            </button>
          </>
        )}
        <button style={{...S.btn,background:"transparent",color:K.muted,border:`1px solid ${K.border}`}} onClick={onBack}>Terug</button>
      </div>
    </div>
  );
}

// ─── KLAAR SCHERM ─────────────────────────────────────────────────────────────
function KlaarScreen({ data, discipline, onDone }) {
  const disc = DISCIPLINES.find(d=>d.id===discipline);
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
      <div style={{fontSize:72,marginBottom:16}}>{disc?.icon}✅</div>
      <div style={{fontSize:24,fontWeight:800,marginBottom:6}}>Klaar!</div>
      <div style={{fontSize:14,color:K.muted,marginBottom:24}}>Rapport verstuurd en project gearchiveerd.</div>
      <div style={{...S.card,width:"100%",textAlign:"left",marginBottom:28}}>
        <div style={{display:"flex",alignItems:"center",gap:10,background:K.yellowDim,borderRadius:10,padding:"10px 12px",marginBottom:12}}>
          <span style={{fontSize:20}}>📁</span>
          <div>
            <div style={{fontSize:10,color:K.yellow,fontWeight:700,textTransform:"uppercase"}}>Opgeslagen als</div>
            <div style={{fontSize:16,fontWeight:800,color:K.yellow}}>{data.projectId}-{discipline}.pdf</div>
          </div>
        </div>
        <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{data.naam}</div>
        <div style={{fontSize:12,color:K.muted}}>{data.straat} {data.huisnummer}, {data.postcode} {data.plaats}</div>
        <div style={{fontSize:12,color:K.muted,marginTop:4}}>📬 Verstuurd naar {data.email}</div>
      </div>
      <button style={{...S.btn,background:K.yellow,color:"#000"}} onClick={onDone}>Terug naar home</button>
    </div>
  );
}

// ─── DISCIPLINE KIEZER ────────────────────────────────────────────────────────
function DisciplineKiezer({ onKies, onBack }) {
  return (
    <div>
      <div style={S.hdr}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:15}}>Kies discipline</div><div style={{fontSize:11,color:K.muted}}>Wat ga je registreren?</div></div>
      </div>
      <div style={S.body}>
        <div style={{fontSize:12,color:K.muted,marginBottom:16}}>Kies de discipline voor deze registratie. Elke discipline heeft eigen velden, normen en rapport.</div>
        {DISCIPLINES.map(d=>(
          <div key={d.id} style={{...S.card,
            cursor:d.available?"pointer":"not-allowed",
            opacity:d.available?1:0.5,
            border:`1px solid ${d.available?d.colorDim:K.border}`,
            background:d.available?`linear-gradient(135deg,${d.colorDim},${K.card})`:K.card,
          }} onClick={()=>d.available&&onKies(d.id)}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:48,height:48,borderRadius:12,flexShrink:0,background:d.available?`${d.color}22`:K.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>
                {d.icon}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:16,color:d.available?K.text:K.muted}}>{d.label}</div>
                <div style={{fontSize:12,color:K.muted}}>{d.sub}</div>
                <div style={{fontSize:11,color:d.available?d.color:K.muted,fontWeight:600,marginTop:2}}>{d.norm}</div>
              </div>
              {d.available
                ? <div style={{fontSize:20,color:d.color}}>→</div>
                : <div style={{fontSize:11,color:K.muted,background:K.surface,padding:"3px 8px",borderRadius:10}}>Binnenkort</div>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── HOME SCHERM ──────────────────────────────────────────────────────────────
function HomeScreen({ onNew, onDoorgaan, onVerwijder, idbKlaar }) {
  const [projecten, setProjecten] = useState([]);

  useEffect(() => {
    setProjecten(laadProjecten());
  }, [idbKlaar]);

  const verwijder = (id, e) => {
    e?.stopPropagation();
    if (!window.confirm("Dit project verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    onVerwijder(id);
    setProjecten(laadProjecten());
  };

  // Alleen projecten met al wat ingevulde data tonen (niet helemaal lege starts)
  const zinvol = projecten.filter(p => p.job?.naam || p.job?.postcode);
  const concepten = zinvol.filter(p => p.status !== "opgeleverd").sort((a,b)=>b.updatedAt-a.updatedAt);
  const opgeleverd = zinvol.filter(p => p.status === "opgeleverd").sort((a,b)=>b.updatedAt-a.updatedAt);

  const ProjectRow = ({ p }) => {
    const disc = DISCIPLINES.find(d=>d.id===p.discipline);
    const isDone = p.status === "opgeleverd";
    return (
      <div style={{...S.card,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>onDoorgaan(p)}>
        <div style={{width:44,height:44,borderRadius:10,flexShrink:0,background:isDone?K.greenDim:K.yellowDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
          {isDone?"✅":disc?.icon||"📄"}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:800,fontSize:13,color:K.yellow,letterSpacing:0.3}}>{p.job?.projectId||"Nieuw project"}</div>
          <div style={{fontWeight:500,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.job?.naam||"—"}</div>
          <div style={{fontSize:11,color:K.muted}}>{disc?.label}{!isDone?` · stap ${(p.step||0)+1}`:""}</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:11,color:isDone?K.green:K.yellow,fontWeight:600,marginBottom:6}}>{isDone?"Opgeleverd":"Concept"}</div>
          <button onClick={e=>verwijder(p.id,e)} style={{background:"transparent",border:`1px solid ${K.border}`,borderRadius:6,color:K.muted,cursor:"pointer",fontSize:11,padding:"3px 8px"}}>✕</button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={S.hdr}>
        <div style={{width:34,height:34,borderRadius:9,background:K.yellow,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13,color:"#000"}}>W</div>
        <div><div style={{fontWeight:700,fontSize:16}}>YourWkb</div><div style={{fontSize:11,color:K.muted}}>Installatie opleverrapporten</div></div>
      </div>
      <div style={S.body}>

        {/* Hero */}
        <div style={{...S.card,background:`linear-gradient(135deg,#1A1D10,${K.yellowDim})`,border:`1px solid ${K.yellow}33`,padding:22,marginBottom:20,cursor:"pointer"}} onClick={()=>onNew()}>
          <div style={{fontSize:13,color:K.yellow,fontWeight:700,marginBottom:8}}>+ NIEUWE REGISTRATIE</div>
          <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>Kies discipline</div>
          <div style={{fontSize:13,color:K.muted,marginBottom:16}}>Groepenkast · Zonnepanelen · Combiketel · Warmtepomp</div>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:K.yellow,color:"#000",padding:"11px 20px",borderRadius:10,fontWeight:700,fontSize:14}}>
            Start registratie →
          </div>
        </div>

        {/* Discipline overzicht */}
        <div style={S.sTitle}>Beschikbare disciplines</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
          {DISCIPLINES.map(d=>(
            <div key={d.id} style={{...S.card,padding:14,opacity:d.available?1:0.5,cursor:d.available?"pointer":"default",border:`1px solid ${d.available?d.colorDim:K.border}`}} onClick={()=>d.available&&onNew(d.id)}>
              <div style={{fontSize:24,marginBottom:6}}>{d.icon}</div>
              <div style={{fontWeight:700,fontSize:13}}>{d.label}</div>
              <div style={{fontSize:10,color:d.available?d.color:K.muted,fontWeight:600,marginTop:2}}>{d.available?"Beschikbaar":"Binnenkort"}</div>
            </div>
          ))}
        </div>

        {/* Concepten */}
        {concepten.length > 0 && (
          <>
            <div style={S.sTitle}>🔄 Concepten ({concepten.length})</div>
            {concepten.map(p => <ProjectRow key={p.id} p={p}/>)}
          </>
        )}

        {/* Opgeleverd */}
        {opgeleverd.length > 0 && (
          <>
            <div style={{...S.sTitle,marginTop:concepten.length?16:0}}>✅ Opgeleverd ({opgeleverd.length})</div>
            {opgeleverd.map(p => <ProjectRow key={p.id} p={p}/>)}
          </>
        )}

        {zinvol.length === 0 && (
          <div style={{...S.card,textAlign:"center",padding:24}}>
            <div style={{fontSize:13,color:K.muted}}>Nog geen projecten — start hierboven je eerste registratie.</div>
          </div>
        )}

        {/* Back-up & herstel */}
        <div style={{...S.sTitle,marginTop:24}}>💾 Back-up &amp; herstel</div>
        <div style={S.card}>
          <div style={{fontSize:11,color:K.muted,lineHeight:1.5,marginBottom:12}}>
            Bewaar al je projecten als één bestand op je telefoon, in iCloud, Google Drive of Dropbox. Bij verlies of nieuwe telefoon kun je ze hier weer importeren.
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
            <button onClick={() => {
              try {
                const n = exporteerProjecten();
                trackEvent("backup_gemaakt", { methode: "json", aantal: n });
                alert(`✅ Back-up gemaakt van ${n} project${n===1?"":"en"}. Sla het JSON-bestand op in iCloud/Drive/Dropbox.`);
              } catch (e) {
                alert(`Back-up mislukt: ${e.message}`);
              }
            }} style={{flex:1,minWidth:140,padding:"11px 14px",borderRadius:10,border:"none",background:K.yellow,color:"#000",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
              📥 Back-up downloaden
            </button>
            <button onClick={() => {
              const input = document.createElement("input");
              input.type = "file"; input.accept = "application/json,.json";
              input.onchange = async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const r = importeerProjecten(text);
                  alert(`✅ Geïmporteerd: ${r.nieuw} nieuwe, ${r.vervangen} bijgewerkt (totaal in back-up: ${r.totaal}).`);
                  setProjecten(laadProjecten());
                } catch (err) {
                  alert(`Importeren mislukt: ${err.message}`);
                }
              };
              input.click();
            }} style={{flex:1,minWidth:140,padding:"11px 14px",borderRadius:10,border:`1px solid ${K.border}`,background:K.surface,color:K.text,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
              📤 Back-up herstellen
            </button>
          </div>

          {/* Dropbox koppeling — werkt zonder OAuth via Dropbox Saver/Chooser widgets.
              Vereist Dropbox App Key (zie https://www.dropbox.com/developers/apps).
              Tot die er is, vervang DROPBOX_APP_KEY door je echte key. */}
          <div style={{borderTop:`1px solid ${K.border}`,paddingTop:10,marginTop:4}}>
            <div style={{fontSize:11,color:K.muted,marginBottom:8,lineHeight:1.5}}>
              <strong style={{color:K.text}}>📦 Dropbox</strong> — sla direct op in of laad uit je Dropbox (2GB gratis, ~1.300 projecten).
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={() => {
                // Dropbox Saver werkt via een URL die Dropbox zelf ophaalt.
                // blob:// URLs bestaan alleen in de browser en kunnen niet door Dropbox worden opgehaald.
                // Oplossing: data-URL — bevat de data direct in de URL zelf.
                const DROPBOX_APP_KEY = window.__YWKB_DROPBOX_KEY__ || "";
                if (!DROPBOX_APP_KEY) {
                  alert("⚠️ Dropbox-koppeling nog niet geconfigureerd. Voor nu: download de back-up handmatig en upload zelf naar Dropbox.");
                  return;
                }
                const lijst = laadProjecten();
                const jsonText = JSON.stringify({version:1,exportedAt:new Date().toISOString(),projecten:lijst},null,2);
                const groottMB = (jsonText.length / (1024*1024)).toFixed(2);
                const datum = new Date().toISOString().slice(0,10);
                const filename = `yourwkb-backup-${datum}.json`;

                // Data URL — werkt tot ~150MB, ruim genoeg voor typische back-ups
                const dataUrl = "data:application/json;base64," + btoa(unescape(encodeURIComponent(jsonText)));

                const startSave = () => {
                  if (!window.Dropbox?.save) {
                    alert("⚠️ Dropbox SDK niet correct geladen — probeer nogmaals of gebruik de handmatige back-up-knop.");
                    return;
                  }
                  window.Dropbox.save({
                    files: [{ url: dataUrl, filename }],
                    success: () => alert(`✅ Opgeslagen in Dropbox (${groottMB} MB, ${lijst.length} project${lijst.length===1?"":"en"})`),
                    error: (msg) => alert(`Dropbox-opslag mislukt: ${msg}`),
                    cancel: () => {},
                  });
                };

                if (!window.Dropbox) {
                  const s = document.createElement("script");
                  s.src = "https://www.dropbox.com/static/api/2/dropins.js";
                  s.id = "dropboxjs"; s.setAttribute("data-app-key", DROPBOX_APP_KEY);
                  s.onload = startSave;
                  s.onerror = () => alert("Kon Dropbox SDK niet laden — controleer je internetverbinding.");
                  document.body.appendChild(s);
                } else startSave();
              }} style={{flex:1,minWidth:140,padding:"10px 12px",borderRadius:10,border:`1px solid ${K.border}`,background:K.surface,color:K.text,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                ☁️ Opslaan in Dropbox
              </button>
              <button onClick={() => {
                const DROPBOX_APP_KEY = window.__YWKB_DROPBOX_KEY__ || "";
                if (!DROPBOX_APP_KEY) {
                  alert("⚠️ Dropbox-koppeling nog niet geconfigureerd. Voor nu: download de back-up handmatig uit Dropbox en gebruik 'Herstellen'.");
                  return;
                }
                const open = () => window.Dropbox.choose({
                  linkType: "direct", extensions: [".json"], multiselect: false,
                  success: async (files) => {
                    try {
                      const resp = await fetch(files[0].link);
                      const text = await resp.text();
                      const r = importeerProjecten(text);
                      alert(`✅ Geïmporteerd uit Dropbox: ${r.nieuw} nieuwe, ${r.vervangen} bijgewerkt.`);
                      setProjecten(laadProjecten());
                    } catch (err) {
                      alert(`Importeren uit Dropbox mislukt: ${err.message}`);
                    }
                  }
                });
                if (!window.Dropbox) {
                  const s = document.createElement("script");
                  s.src = "https://www.dropbox.com/static/api/2/dropins.js";
                  s.id = "dropboxjs"; s.setAttribute("data-app-key", DROPBOX_APP_KEY);
                  s.onload = open; document.body.appendChild(s);
                } else open();
              }} style={{flex:1,minWidth:140,padding:"10px 12px",borderRadius:10,border:`1px solid ${K.border}`,background:K.surface,color:K.text,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif"}}>
                ☁️ Laden uit Dropbox
              </button>
            </div>
          </div>
        </div>

        <div style={{fontSize:11,color:K.muted,textAlign:"center",marginTop:16,lineHeight:1.6}}>
          🔒 Projecten staan alleen op dit toestel opgeslagen.<br/>Wij bewaren niets op een server.
        </div>
      </div>
    </div>
  );
}

// ─── COMBIKETEL DATA ──────────────────────────────────────────────────────────
const CV_KETEL_FABS = ["Intergas","Remeha","Nefit/Bosch","Vaillant","Worcester Bosch","Viessmann","Baxi","AWB","Atag","De Dietrich"];
const CV_AFVOER_TYPES = ["80/125mm concentrisch","60/100mm concentrisch","80mm apart","100mm apart","60mm apart"];

// Foto's vóór de werkzaamheden (bestaande situatie)
const CV_FOTO_CPS_VOOR = [
  { id:"voor_overzicht", label:"Bestaande situatie — overzicht ruimte",         icon:"📦", required:true, optioneelInRapport:true },
  { id:"voor_detail",    label:"Bestaande aansluitpunten vóór vervanging",      icon:"🔍", required:true },
];
// Foto's ná de werkzaamheden (nieuwe situatie)
const CV_FOTO_CPS_NA = [
  { id:"gemonteerd", label:"Ketel gemonteerd aan wand",        icon:"🔥", required:true  },
  { id:"gas",        label:"Gasaansluiting en afsluiter",      icon:"🔧", required:true  },
  { id:"rookgas",    label:"Rookgasafvoer aangebracht",        icon:"💨", required:true  },
  { id:"lucht",      label:"Luchttoevoer (type C)",            icon:"🌬️", required:true  },
  { id:"condens",    label:"Condensafvoer",                    icon:"💧", required:true  },
  { id:"expansie",   label:"Expansievat + veiligheidsventiel", icon:"⚙️", required:true  },
  { id:"bedrijf",    label:"Ketel in bedrijf (nieuwe situatie, afgewerkt)", icon:"✅", required:true  },
  { id:"display",    label:"Display / bedieningspaneel",       icon:"📟", required:true  },
  { id:"meting",     label:"Meetresultaten analyser (foto)",   icon:"📊", required:true  },
  { id:"label",      label:"Typeplaatje ketel",                icon:"🏷️", required:false },
];
// Voor het rapport: alle CV foto checkpoints samen
const CV_FOTO_CPS = [...CV_FOTO_CPS_VOOR, ...CV_FOTO_CPS_NA];

function cvCrossChecks(meet) {
  const warnings = [];
  const coVoor  = toNum(meet.coVoor);
  const coNa    = toNum(meet.coNa);
  const coRook  = toNum(meet.coRookgas);
  const o2      = toNum(meet.o2);
  const co2     = toNum(meet.co2);
  const waterdr = toNum(meet.waterdruk);
  const gasdr   = toNum(meet.gasdruk);
  const rendement = toNum(meet.rendement);

  if (!isNaN(coVoor) && !isNaN(coNa) && coNa > coVoor + 3)
    warnings.push({ level:"red", msg:`CO omgeving stijgt van ${coVoor} naar ${coNa} ppm — mogelijke lekkage, installatie NIET in gebruik nemen` });
  if (!isNaN(coNa) && coNa >= 7 && coNa < 10)
    warnings.push({ level:"orange", msg:`CO omgeving na ${coNa} ppm — nadert grenswaarde (10 ppm), controleer ventilatie` });
  if (!isNaN(coRook) && coRook > 150 && coRook <= 200)
    warnings.push({ level:"orange", msg:`CO in rookgas ${coRook} ppm — nadert norm (200 ppm), verbranding controleren` });
  if (!isNaN(o2) && (o2 < 3 || o2 > 6))
    warnings.push({ level:"orange", msg:`O2 ${o2}% buiten optimaal bereik (3-6%) — verbrandingslucht instelling controleren` });
  if (!isNaN(co2) && (co2 < 8 || co2 > 12))
    warnings.push({ level:"orange", msg:`CO2 ${co2}% buiten optimaal bereik (8-12%) — verbranding niet optimaal` });
  if (!isNaN(waterdr) && waterdr < 1.0)
    warnings.push({ level:"red", msg:`Waterdruk ${waterdr} bar te laag — installatie bijvullen voor ingebruikname` });
  if (!isNaN(waterdr) && waterdr >= 1.0 && waterdr < 1.5)
    warnings.push({ level:"orange", msg:`Waterdruk ${waterdr} bar aan de lage kant — norm 1.5-2.0 bar` });
  if (!isNaN(waterdr) && waterdr > 2.5)
    warnings.push({ level:"orange", msg:`Waterdruk ${waterdr} bar te hoog — expansievat controleren` });
  if (!isNaN(gasdr) && (gasdr < 18 || gasdr > 28))
    warnings.push({ level:"orange", msg:`Gasdruk ${gasdr} mbar buiten norm (20-25 mbar) — netbeheerder informeren` });
  if (!isNaN(rendement) && rendement < 90)
    warnings.push({ level:"orange", msg:`Rendement ${rendement}% laag voor een HR-ketel — verbranding optimaliseren` });
  return warnings;
}

function CV_StapMateriaal({ data, onChange, onNext, onBack }) {
  return (
    <div>
      <div style={S.hdr}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:15}}>Materiaal CV</div><div style={{fontSize:11,color:K.muted}}>Stap 5 · Combiketel</div></div>
      </div>
      <div style={S.body}>
        <div style={S.sTitle}>Ketel</div>
        <div style={S.card}>
          <label style={S.label}>Fabrikant</label>
          <select style={{...S.select,marginBottom:12}} value={data.ketelFab||""} onChange={e=>onChange("ketelFab",e.target.value)}>
            <option value="">Kies fabrikant</option>
            {CV_KETEL_FABS.map(f=><option key={f}>{f}</option>)}
          </select>
          {[
            {k:"ketelModel",   l:"Type / model",  ph:"bijv. Kombi Kompakt HRE 28/24"},
            {k:"ketelSerie",   l:"Serienummer",   ph:"bijv. 1234567890"},
            {k:"ketelBouwjaar",l:"Bouwjaar",      ph:"2024"},
          ].map(({k,l,ph})=>(
            <div key={k} style={{marginBottom:12}}>
              <label style={S.label}>{l}</label>
              <input style={S.input} placeholder={ph} value={data[k]||""} onChange={e=>onChange(k,e.target.value)}/>
            </div>
          ))}
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1}}><label style={S.label}>Vermogen kW</label>
              <input style={S.input} type="text" inputMode="decimal" placeholder="28" value={data.ketelKw||""} onChange={e=>onChange("ketelKw",e.target.value)}/>
            </div>
            <div style={{flex:1}}><label style={S.label}>Type toestel</label>
              <select style={S.select} value={data.ketelType||""} onChange={e=>onChange("ketelType",e.target.value)}>
                <option value="">Kies</option>
                <option>Type B (open, afvoergebonden)</option>
                <option>Type C (gesloten, concentrisch)</option>
              </select>
            </div>
          </div>
        </div>

        <div style={S.sTitle}>Rookgasafvoer</div>
        <div style={S.card}>
          <label style={S.label}>Type afvoer</label>
          <select style={{...S.select,marginBottom:12}} value={data.afvoerType||""} onChange={e=>onChange("afvoerType",e.target.value)}>
            <option value="">Kies type</option>
            {CV_AFVOER_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
          {[
            {k:"afvoerFab",    l:"Fabrikant afvoersysteem", ph:"bijv. Ubbink, Centrotherm"},
            {k:"afvoerLengte", l:"Lengte afvoer (m)",       ph:"3.5"},
          ].map(({k,l,ph})=>(
            <div key={k} style={{marginBottom:12}}>
              <label style={S.label}>{l}</label>
              <input style={S.input} placeholder={ph} value={data[k]||""} onChange={e=>onChange(k,e.target.value)}/>
            </div>
          ))}
        </div>

        <div style={S.sTitle}>Overige componenten</div>
        <div style={S.card}>
          <div style={{display:"flex",gap:10,marginBottom:12}}>
            <div style={{flex:1}}><label style={S.label}>Expansievat (L)</label>
              <input style={S.input} type="text" inputMode="decimal" placeholder="8" value={data.expansieL||""} onChange={e=>onChange("expansieL",e.target.value)}/>
            </div>
            <div style={{flex:1}}><label style={S.label}>Voordruk (bar)</label>
              <input style={S.input} type="text" inputMode="decimal" placeholder="0.75" value={data.expansieBar||""} onChange={e=>onChange("expansieBar",e.target.value)}/>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1}}><label style={S.label}>Veiligheidsventiel (bar)</label>
              <input style={S.input} type="text" inputMode="decimal" placeholder="3.0" value={data.veilBar||""} onChange={e=>onChange("veilBar",e.target.value)}/>
            </div>
            <div style={{flex:1}}><label style={S.label}>Gasleiding materiaal</label>
              <select style={S.select} value={data.gasMateriaal||""} onChange={e=>onChange("gasMateriaal",e.target.value)}>
                <option value="">Kies</option>
                {["Staal","Koper","PE (buiten)","Flexibel RVS"].map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </div>
        <button style={{...S.btn,background:K.yellow,color:"#000"}} onClick={onNext}>Volgende →</button>
      </div>
    </div>
  );
}

// ─── WARMTEPOMP DATA ──────────────────────────────────────────────────────────
const WP_MERK_FABS = ["Daikin","Mitsubishi Electric","Nibe","Itho Daalderop","Vaillant","Bosch","Panasonic","Viessmann","Stiebel Eltron","Atlantic","Toshiba","LG"];
const WP_KOUDEMIDDEL = ["R32","R290 (propaan)","R454B","R410A"];

// Foto's vóór de werkzaamheden (bestaande situatie)
const WP_FOTO_CPS_VOOR = [
  { id:"voor_overzicht", label:"Bestaande situatie — overzicht locatie",            icon:"📦", required:true, optioneelInRapport:true },
  { id:"voor_detail",    label:"Bestaande aansluitpunten/fundatie vóór installatie",icon:"🔍", required:true },
];
// Foto's ná de werkzaamheden (nieuwe situatie)
const WP_FOTO_CPS_NA = [
  { id:"buitenunit",  label:"Buitenunit gemonteerd",              icon:"🌡️", required:true  },
  { id:"trilling",    label:"Trillingsdemping / fundatie",        icon:"🔩", required:true  },
  { id:"binnenunit",  label:"Binnenunit / boiler gemonteerd",     icon:"🏠", required:true  },
  { id:"leidingen",   label:"Koudemiddelleidingen geïsoleerd",    icon:"🧊", required:true  },
  { id:"condensafv",  label:"Condensafvoer buitenunit",           icon:"💧", required:true  },
  { id:"elektrisch",  label:"Elektrische aansluiting + groep",    icon:"🔌", required:true  },
  { id:"expansie",    label:"Expansievat + veiligheidsventiel",   icon:"⚙️", required:true  },
  { id:"bedrijf",     label:"Systeem in bedrijf (nieuwe situatie, afgewerkt)", icon:"✅", required:true  },
  { id:"label",       label:"Typeplaatje + F-gassen sticker",     icon:"🏷️", required:false },
];
// Voor het rapport: alle WP foto checkpoints samen
const WP_FOTO_CPS = [...WP_FOTO_CPS_VOOR, ...WP_FOTO_CPS_NA];

function wpCrossChecks(meet, materiaal) {
  const warnings = [];
  const aanvoer = toNum(meet.aanvoerTemp);
  const retour  = toNum(meet.retourTemp);
  const werkdruk = toNum(meet.werkdruk);
  const geluidGemeten = toNum(meet.geluidGemeten);
  const geluidOpgave  = toNum(materiaal.geluidOpgave);
  const stroom = toNum(meet.stroomopname);
  const groepA = toNum((materiaal.groepAmpere||"").replace("A",""));

  if (!isNaN(aanvoer) && !isNaN(retour)) {
    const dt = aanvoer - retour;
    if (dt < 5) warnings.push({ level:"orange", msg:`ΔT verwarmingscircuit ${dt.toFixed(1)}K is laag (norm 5-10K) — controleer circulatiedebiet` });
    if (dt > 10) warnings.push({ level:"orange", msg:`ΔT verwarmingscircuit ${dt.toFixed(1)}K is hoog (norm 5-10K) — debiet mogelijk te laag` });
  }
  if (!isNaN(werkdruk)) {
    if (werkdruk < 1.0) warnings.push({ level:"red", msg:`Werkdruk ${werkdruk} bar te laag — installatie bijvullen vóór ingebruikname` });
    else if (werkdruk < 1.5) warnings.push({ level:"orange", msg:`Werkdruk ${werkdruk} bar aan de lage kant (norm 1,5-2,0 bar)` });
    else if (werkdruk > 2.5) warnings.push({ level:"orange", msg:`Werkdruk ${werkdruk} bar te hoog — expansievat controleren` });
  }
  if (!isNaN(geluidGemeten) && !isNaN(geluidOpgave) && geluidGemeten > geluidOpgave + 3)
    warnings.push({ level:"orange", msg:`Gemeten geluidsniveau ${geluidGemeten}dB(A) ligt ${(geluidGemeten-geluidOpgave).toFixed(0)}dB boven fabrieksopgave (${geluidOpgave}dB) — controleer trillingsdemping en montage` });
  if (!isNaN(stroom) && !isNaN(groepA) && stroom > groepA * 0.9)
    warnings.push({ level:"orange", msg:`Opstartstroom ${stroom}A nadert de groepswaarde van ${materiaal.groepAmpere} — controleer of de groep voldoende capaciteit heeft` });
  return warnings;
}

function WP_StapMateriaal({ data, onChange, onNext, onBack }) {
  return (
    <div>
      <div style={S.hdr}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:15}}>Materiaal warmtepomp</div><div style={{fontSize:11,color:K.muted}}>Stap 5 · Warmtepomp</div></div>
      </div>
      <div style={S.body}>
        <div style={S.sTitle}>Type systeem</div>
        <div style={{...S.card,marginBottom:16}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {["Lucht/water","Lucht/lucht (split)","Bodem/water (grond)"].map(t=>(
              <Pill key={t} active={data.wpType===t} onClick={()=>onChange("wpType",t)}>{t}</Pill>
            ))}
          </div>
        </div>

        <div style={S.sTitle}>Warmtepomp</div>
        <div style={S.card}>
          <label style={S.label}>Fabrikant</label>
          <select style={{...S.select,marginBottom:12}} value={data.wpFab||""} onChange={e=>onChange("wpFab",e.target.value)}>
            <option value="">Kies fabrikant</option>
            {WP_MERK_FABS.map(f=><option key={f}>{f}</option>)}
          </select>
          {[
            {k:"wpModel",   l:"Type / model",   ph:"bijv. Altherma 3 H"},
            {k:"wpSerie",   l:"Serienummer",     ph:"bijv. 1234567890"},
            {k:"wpBouwjaar",l:"Bouwjaar",        ph:"2024"},
          ].map(({k,l,ph})=>(
            <div key={k} style={{marginBottom:12}}>
              <label style={S.label}>{l}</label>
              <input style={S.input} placeholder={ph} value={data[k]||""} onChange={e=>onChange(k,e.target.value)}/>
            </div>
          ))}
          <div style={{display:"flex",gap:10,marginBottom:12}}>
            <div style={{flex:1}}><label style={S.label}>Vermogen kW</label>
              <input style={S.input} type="text" inputMode="decimal" placeholder="8" value={data.wpKw||""} onChange={e=>onChange("wpKw",e.target.value)}/>
            </div>
            <div style={{flex:1}}><label style={S.label}>Geluid opgave (dB(A))</label>
              <input style={S.input} type="text" inputMode="decimal" placeholder="45" value={data.geluidOpgave||""} onChange={e=>onChange("geluidOpgave",e.target.value)}/>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1}}><label style={S.label}>Koudemiddel type</label>
              <select style={S.select} value={data.koudemiddel||""} onChange={e=>onChange("koudemiddel",e.target.value)}>
                <option value="">Kies</option>
                {WP_KOUDEMIDDEL.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
            <div style={{flex:1}}><label style={S.label}>Hoeveelheid (kg)</label>
              <input style={S.input} type="text" inputMode="decimal" placeholder="1.8" value={data.koudemiddelKg||""} onChange={e=>onChange("koudemiddelKg",e.target.value)}/>
            </div>
          </div>
        </div>

        <div style={S.sTitle}>Boiler / buffervat</div>
        <div style={S.card}>
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1}}><label style={S.label}>Boilervat (L)</label>
              <input style={S.input} type="text" inputMode="decimal" placeholder="200" value={data.boilerL||""} onChange={e=>onChange("boilerL",e.target.value)}/>
            </div>
            <div style={{flex:1}}><label style={S.label}>Buffervat (L)</label>
              <input style={S.input} type="text" inputMode="decimal" placeholder="50" value={data.bufferL||""} onChange={e=>onChange("bufferL",e.target.value)}/>
            </div>
          </div>
        </div>

        <div style={S.sTitle}>Elektrische aansluiting</div>
        <div style={S.card}>
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1}}><label style={S.label}>Groep (ampère)</label>
              <select style={S.select} value={data.groepAmpere||""} onChange={e=>onChange("groepAmpere",e.target.value)}>
                <option value="">Kies</option>
                {GROEP_A.map(a=><option key={a}>{a}</option>)}
              </select>
            </div>
            <div style={{flex:1}}><label style={S.label}>Karakteristiek</label>
              <select style={S.select} value={data.groepKar||""} onChange={e=>onChange("groepKar",e.target.value)}>
                <option value="">Kies</option>
                {KAR_TYPE.map(k=><option key={k}>{k}</option>)}
              </select>
            </div>
          </div>
        </div>
        <button style={{...S.btn,background:K.yellow,color:"#000"}} onClick={onNext}>Volgende →</button>
      </div>
    </div>
  );
}

function WP_StapMeten({ data, onChange, onNext, onBack }) {
  const [meet,setMeet] = useState(data.wpMeet||{});
  const sm = (k,v) => { const u={...meet,[k]:v}; setMeet(u); onChange("wpMeet",u); };
  const materiaal = { geluidOpgave:data.geluidOpgave, groepAmpere:data.groepAmpere };
  const warnings = wpCrossChecks(meet, materiaal);

  const tempOk    = v => toNum(v) > 0;
  const werkdrOk  = v => { const n=toNum(v); return n>=1.5&&n<=2.5; };
  const spanOk2   = v => { const n=toNum(v); return n>=207&&n<=253; };
  const geluidOk  = v => {
    const n = toNum(v); const opg = toNum(data.geluidOpgave);
    if (isNaN(opg)) return true;
    return n <= opg + 3;
  };

  const MeetVeld = ({k,l,unit,chk,ph}) => {
    const raw = meet[k];
    const val = raw !== undefined && raw !== null && raw !== "" ? String(raw) : "";
    const ingevuld = val !== "";
    const ok = ingevuld && chk(val);
    return (
      <div>
        <label style={S.label}>{l}</label>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <input style={{...S.input,fontSize:15,fontWeight:700,flex:1,
            background:ingevuld?(ok?K.greenDim:K.redDim):K.surface,
            border:`1px solid ${ingevuld?(ok?K.green:K.red):K.border}`}}
            type="text" inputMode="decimal" placeholder={ph} value={val} onChange={e=>sm(k,e.target.value)} onFocus={e=>e.target.select()}/>
          {unit&&<span style={{fontSize:11,color:K.muted,whiteSpace:"nowrap"}}>{unit}</span>}
          {ingevuld&&<StatusTag level={ok?"ok":"red"}/>}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={S.hdr}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:15}}>Meetwaarden warmtepomp</div><div style={{fontSize:11,color:K.muted}}>Stap 6 · BRL6000-21</div></div>
      </div>
      <div style={S.body}>

        <div style={S.sTitle}>Verwarmingscircuit</div>
        <div style={S.card}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <MeetVeld k="aanvoerTemp" l="Aanvoertemperatuur" unit="°C" chk={tempOk}   ph="bijv. 45"/>
            <MeetVeld k="retourTemp"  l="Retourtemperatuur"  unit="°C" chk={tempOk}   ph="bijv. 38"/>
            <MeetVeld k="werkdruk"    l="Werkdruk"           unit="bar" chk={werkdrOk} ph="bijv. 1.8"/>
            <MeetVeld k="spanning"    l="Spanning"           unit="V"   chk={spanOk2}  ph="bijv. 230"/>
          </div>
          {meet.aanvoerTemp&&meet.retourTemp&&(()=>{
            const dt = Math.abs(toNum(meet.aanvoerTemp)-toNum(meet.retourTemp));
            const ok = dt>=5&&dt<=10;
            return (
              <div style={{padding:"8px 12px",borderRadius:8,background:ok?K.greenDim:K.orangeDim}}>
                <span style={{fontSize:12,fontWeight:700,color:ok?K.green:K.orange}}>
                  ΔT = {dt.toFixed(1)}K {ok?"✓ OK (norm 5-10K)":"⚠ buiten norm 5-10K"}
                </span>
              </div>
            );
          })()}
        </div>

        <div style={S.sTitle}>Bron {data.wpType==="Bodem/water (grond)"?"(bodem)":data.wpType==="Lucht/lucht (split)"?"(lucht)":"(buitenlucht)"}</div>
        <div style={S.card}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <MeetVeld k="bronTempIn"  l="Brontemperatuur in"  unit="°C" chk={()=>true} ph="bijv. 8"/>
            <MeetVeld k="bronTempUit" l="Brontemperatuur uit" unit="°C" chk={()=>true} ph="bijv. 5"/>
            {data.wpType==="Bodem/water (grond)" && (
              <MeetVeld k="glycol" l="Glycolconcentratie" unit="%" chk={()=>true} ph="bijv. 25"/>
            )}
            {data.wpType!=="Bodem/water (grond)" && (
              <MeetVeld k="luchtdebiet" l="Luchtdebiet" unit="m³/h" chk={()=>true} ph="bijv. 1800"/>
            )}
          </div>
        </div>

        <div style={S.sTitle}>Elektrisch &amp; geluid</div>
        <div style={S.card}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <MeetVeld k="stroomopname"   l="Stroomopname (opstart)" unit="A"     chk={()=>true}  ph="bijv. 12"/>
            <MeetVeld k="vermogenOpgenomen" l="Elektrisch opgenomen vermogen" unit="kW" chk={()=>true} ph="bijv. 2.1"/>
            <MeetVeld k="geluidGemeten"  l="Geluidsniveau gemeten"  unit="dB(A)" chk={geluidOk} ph="bijv. 44"/>
            <MeetVeld k="expansieVoordr" l="Expansievat voordruk"   unit="bar"   chk={()=>true}  ph="bijv. 1.5"/>
          </div>
        </div>

        <div style={S.sTitle}>Cross-check installatie</div>
        <WarnBox warnings={warnings}/>
        <button style={{...S.btn,background:K.yellow,color:"#000"}} onClick={onNext}>Volgende: versturen →</button>
      </div>
    </div>
  );
}

function CV_StapMeten({ data, onChange, onNext, onBack }) {
  const [meet,setMeet] = useState(data.cvMeet||{});
  const sm = (k,v) => { const u={...meet,[k]:v}; setMeet(u); onChange("cvMeet",u); };
  const warnings = cvCrossChecks(meet);

  const coOmgOk  = v => toNum(v)<10;
  const coRookOk = v => toNum(v)<200;
  const o2Ok     = v => { const n=toNum(v); return n>=3&&n<=6; };
  const co2Ok    = v => { const n=toNum(v); return n>=8&&n<=12; };
  const waterOk  = v => { const n=toNum(v); return n>=1.5&&n<=2.5; };
  const gasOk    = v => { const n=toNum(v); return n>=18&&n<=28; };
  const rendOk   = v => toNum(v)>=90;
  const tempOk   = v => toNum(v)>0;

  const MeetVeld = ({k,l,unit,chk,ph}) => {
    const raw = meet[k];
    const val = raw !== undefined && raw !== null && raw !== "" ? String(raw) : "";
    const ingevuld = val !== "";
    const ok = ingevuld && chk(val);
    const err = ingevuld && !chk(val);
    return (
      <div>
        <label style={S.label}>{l}</label>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <input style={{...S.input,fontSize:15,fontWeight:700,flex:1,
            background:ingevuld?(ok?K.greenDim:K.redDim):K.surface,
            border:`1px solid ${ingevuld?(ok?K.green:K.red):K.border}`}}
            type="text" inputMode="decimal" placeholder={ph} value={val} onChange={e=>sm(k,e.target.value)} onFocus={e=>e.target.select()}/>
          {unit&&<span style={{fontSize:11,color:K.muted,whiteSpace:"nowrap"}}>{unit}</span>}
          {ingevuld&&<StatusTag level={ok?"ok":"red"}/>}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={S.hdr}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:15}}>Meetwaarden CV</div><div style={{fontSize:11,color:K.muted}}>Stap 6 · BRL6000-25</div></div>
      </div>
      <div style={S.body}>

        <div style={S.sTitle}>CO meting omgeving — verplicht</div>
        <div style={S.card}>
          <div style={{...S.card,background:K.orangeDim,border:`1px solid ${K.orange}44`,padding:"10px 14px",marginBottom:12}}>
            <div style={{fontSize:12,color:K.orange,fontWeight:600}}>⚠️ Meet CO vóór én ná werkzaamheden — wettelijk verplicht (Gasketelwet)</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <MeetVeld k="coVoor" l="CO vóór (ppm)" unit="ppm" chk={coOmgOk} ph="bijv. 2"/>
            <MeetVeld k="coNa"   l="CO ná (ppm)"   unit="ppm" chk={coOmgOk} ph="bijv. 3"/>
          </div>
          {meet.coVoor&&meet.coNa&&(
            <div style={{marginTop:10,padding:"8px 12px",borderRadius:8,
              background:toNum(meet.coNa)>toNum(meet.coVoor)+3?K.redDim:K.greenDim,
              border:`1px solid ${toNum(meet.coNa)>toNum(meet.coVoor)+3?K.red:K.green}44`}}>
              <span style={{fontSize:12,fontWeight:700,color:toNum(meet.coNa)>toNum(meet.coVoor)+3?K.red:K.green}}>
                {toNum(meet.coNa)>toNum(meet.coVoor)+3
                  ?`🔴 CO stijgt ${(toNum(meet.coNa)-toNum(meet.coVoor)).toFixed(0)} ppm — NIET in gebruik nemen`
                  :`✅ CO stabiel — geen lekkage geconstateerd`}
              </span>
            </div>
          )}
        </div>

        <div style={S.sTitle}>Rookgasanalyse</div>
        <div style={S.card}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <MeetVeld k="coRookgas"   l="CO rookgas"         unit="ppm" chk={coRookOk} ph="bijv. 80"/>
            <MeetVeld k="co2"         l="CO2"                unit="%"   chk={co2Ok}    ph="bijv. 9.5"/>
            <MeetVeld k="o2"          l="O2"                 unit="%"   chk={o2Ok}     ph="bijv. 4.2"/>
            <MeetVeld k="rookgasTemp" l="Rookgastemperatuur" unit="°C"  chk={tempOk}   ph="bijv. 65"/>
            <MeetVeld k="rendement"   l="Rendement"          unit="%"   chk={rendOk}   ph="bijv. 98"/>
          </div>
          <label style={S.label}>Lekdichtheid gasleiding</label>
          <div style={{display:"flex",gap:8}}>
            {["OK","NOK"].map(v=>(
              <button key={v} onClick={()=>sm("lekdicht",v)} style={{
                flex:1,padding:"10px 8px",borderRadius:10,
                border:`1px solid ${meet.lekdicht===v?(v==="NOK"?K.red:K.green):K.border}`,
                background:meet.lekdicht===v?(v==="NOK"?K.redDim:K.greenDim):K.surface,
                color:meet.lekdicht===v?(v==="NOK"?K.red:K.green):K.muted,
                fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer",
              }}>{v==="OK"?"✓ Lekdicht":"✗ Lekkage"}</button>
            ))}
          </div>
        </div>

        <div style={S.sTitle}>Drukken & temperaturen</div>
        <div style={S.card}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <MeetVeld k="waterdruk"   l="Waterdruk"           unit="bar"  chk={waterOk} ph="bijv. 1.8"/>
            <MeetVeld k="gasdruk"     l="Gasdruk"             unit="mbar" chk={gasOk}   ph="bijv. 22"/>
            <MeetVeld k="aanvoerTemp" l="Aanvoertemperatuur"  unit="°C"   chk={tempOk}  ph="bijv. 70"/>
            <MeetVeld k="retourTemp"  l="Retourtemperatuur"   unit="°C"   chk={tempOk}  ph="bijv. 50"/>
          </div>
          {meet.aanvoerTemp&&meet.retourTemp&&(
            <div style={{marginTop:10,padding:"8px 12px",borderRadius:8,
              background:Math.abs(toNum(meet.aanvoerTemp)-toNum(meet.retourTemp))>=10?K.greenDim:K.orangeDim}}>
              <span style={{fontSize:12,fontWeight:700,color:Math.abs(toNum(meet.aanvoerTemp)-toNum(meet.retourTemp))>=10?K.green:K.orange}}>
                ΔT = {Math.abs(toNum(meet.aanvoerTemp)-toNum(meet.retourTemp)).toFixed(0)}K
                {Math.abs(toNum(meet.aanvoerTemp)-toNum(meet.retourTemp))>=10?" ✓ OK":" ⚠ Controleer circulatie"}
              </span>
            </div>
          )}
        </div>

        <div style={S.sTitle}>Cross-check installatie</div>
        <WarnBox warnings={warnings}/>
        <button style={{...S.btn,background:K.yellow,color:"#000"}} onClick={onNext}>Volgende: versturen →</button>
      </div>
    </div>
  );
}

// ─── PROJECT OPSLAG HELPERS ───────────────────────────────────────────────────
// Alle projecten staan lokaal op de telefoon van de installateur (geen server, geen AVG-risico).
// ─── PROJECT-OPSLAG ──────────────────────────────────────────────────────────
// We gebruiken IndexedDB als primaire opslag (veel grotere capaciteit, robuuster),
// met automatische fallback naar localStorage. De data wordt 1× bij eerste laad
// vanuit localStorage gemigreerd naar IndexedDB en daarna parallel weggeschreven.
const PROJ_KEY   = "ywkb_projecten";
const ACTIEF_KEY = "ywkb_actief_id";
const IDB_NAME   = "yourwkb";
const IDB_VERSION = 1;
const IDB_STORE_PROJ = "projecten";
const IDB_STORE_FOTOS = "fotos";

// IndexedDB open (asynchroon, maar we cachen de connectie)
let _idbPromise = null;
function openIDB() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (_idbPromise) return _idbPromise;
  _idbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE_PROJ)) db.createObjectStore(IDB_STORE_PROJ, { keyPath: "id" });
        if (!db.objectStoreNames.contains(IDB_STORE_FOTOS)) db.createObjectStore(IDB_STORE_FOTOS, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => resolve(null);
    } catch { resolve(null); }
  });
  return _idbPromise;
}

// Sync-helper: in-memory cache van wat IndexedDB ooit terug-las (asynchroon),
// zodat onze synchrone laadProjecten()-API behouden blijft (compatibel met de rest van de app).
let _idbCache = null; // null = nog niet geladen; [] of array = geladen
let _idbFotosCache = {}; // {id: fotosObject}

async function _initIDBCache() {
  const db = await openIDB();
  if (!db) { _idbCache = []; return; }
  await new Promise((resolve) => {
    const tx = db.transaction([IDB_STORE_PROJ, IDB_STORE_FOTOS], "readonly");
    const projStore = tx.objectStore(IDB_STORE_PROJ);
    const fotoStore = tx.objectStore(IDB_STORE_FOTOS);
    const reqP = projStore.getAll();
    const reqF = fotoStore.getAll();
    let done = 0;
    const klaar = () => { if (++done === 2) resolve(); };
    reqP.onsuccess = () => { _idbCache = reqP.result || []; klaar(); };
    reqP.onerror   = () => { _idbCache = []; klaar(); };
    reqF.onsuccess = () => { (reqF.result||[]).forEach(f => _idbFotosCache[f.id] = f.fotos); klaar(); };
    reqF.onerror   = () => klaar();
  });
  // Eerste keer: migreer eventuele oude localStorage data naar IndexedDB
  if (_idbCache.length === 0) {
    try {
      const oude = JSON.parse(localStorage.getItem(PROJ_KEY) || "[]");
      if (oude.length > 0) {
        for (const p of oude) {
          try {
            const fotos = JSON.parse(localStorage.getItem(`ywkb_fotos_${p.id}`) || "null");
            if (fotos) { p.job = p.job || {}; p.job.fotos = fotos; _idbFotosCache[p.id] = fotos; }
          } catch {}
        }
        _idbCache = oude;
        _persistAllToIDB(oude);
      }
    } catch {}
  }
}

function _persistAllToIDB(projecten) {
  openIDB().then(db => {
    if (!db) return;
    try {
      const tx = db.transaction([IDB_STORE_PROJ, IDB_STORE_FOTOS], "readwrite");
      const projStore = tx.objectStore(IDB_STORE_PROJ);
      const fotoStore = tx.objectStore(IDB_STORE_FOTOS);
      projStore.clear();
      fotoStore.clear();
      for (const p of projecten) {
        const fotos = p.job?.fotos;
        const { fotos: _f, ...jobZonderFotos } = p.job || {};
        projStore.put({ ...p, job: jobZonderFotos });
        if (fotos) fotoStore.put({ id: p.id, fotos });
      }
    } catch {}
  });
}

// Synchrone laadProjecten — leest uit de cache (na _initIDBCache).
// Bij eerste call vóór async-init zijn klaar, valt automatisch terug op localStorage.
function laadProjecten() {
  // Cache geladen? → die gebruiken
  if (_idbCache !== null) {
    return _idbCache.map(p => {
      const fotos = _idbFotosCache[p.id];
      if (fotos && p.job) return { ...p, job: { ...p.job, fotos } };
      return p;
    });
  }
  // Fallback: lees direct uit localStorage (eerste laad, vóór IDB-init)
  try {
    const lijst = JSON.parse(localStorage.getItem(PROJ_KEY)||"[]");
    return lijst.map(p => {
      try {
        const fotos = JSON.parse(localStorage.getItem(`ywkb_fotos_${p.id}`)||"null");
        if (fotos && p.job) p.job.fotos = fotos;
      } catch {}
      return p;
    });
  } catch { return []; }
}

function bewaarProjecten(lijst) {
  // Update in-memory cache
  _idbCache = lijst.map(p => {
    if (p.job?.fotos) {
      _idbFotosCache[p.id] = p.job.fotos;
      const { fotos, ...rest } = p.job;
      return { ...p, job: rest };
    }
    return p;
  });
  // Persistent in IndexedDB (async, fire-and-forget)
  _persistAllToIDB(lijst);
  // Parallel ook in localStorage voor compatibiliteit + fallback bij geen IDB
  try {
    const lijstZonderFotos = lijst.map(p => {
      if (!p.job?.fotos) return p;
      const { fotos, ...jobZonderFotos } = p.job;
      try { localStorage.setItem(`ywkb_fotos_${p.id}`, JSON.stringify(fotos)); }
      catch { /* localStorage vol — IndexedDB heeft het al, dus geen alert nodig */ }
      return { ...p, job: jobZonderFotos };
    });
    localStorage.setItem(PROJ_KEY, JSON.stringify(lijstZonderFotos));
  } catch {
    // localStorage vol — IndexedDB heeft het al, dus geen blocker
    console.warn("YourWkb: localStorage vol, maar IndexedDB werkt nog");
  }
}

function verwijderProjectOpslag(id) {
  delete _idbFotosCache[id];
  try { localStorage.removeItem(`ywkb_fotos_${id}`); } catch {}
  openIDB().then(db => {
    if (!db) return;
    try {
      const tx = db.transaction([IDB_STORE_PROJ, IDB_STORE_FOTOS], "readwrite");
      tx.objectStore(IDB_STORE_PROJ).delete(id);
      tx.objectStore(IDB_STORE_FOTOS).delete(id);
    } catch {}
  });
}

// ─── BACK-UP / EXPORT / IMPORT ───────────────────────────────────────────────
// Eén JSON-bestand met alle projecten + foto's. Werkt offline, geen server.
// Format: { version: 1, exportedAt: "...", projecten: [{...met fotos erin}] }
function exporteerProjecten() {
  const lijst = laadProjecten(); // bevat foto's al re-gemerged
  const blob = new Blob([JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    projecten: lijst,
  }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const datum = new Date().toISOString().slice(0,10);
  a.href = url; a.download = `yourwkb-backup-${datum}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  return lijst.length;
}

function importeerProjecten(jsonText) {
  let data;
  try { data = JSON.parse(jsonText); }
  catch { throw new Error("Ongeldig JSON-bestand"); }
  const inkomend = Array.isArray(data) ? data : data.projecten;
  if (!Array.isArray(inkomend)) throw new Error("Geen geldig YourWkb back-up bestand");
  const bestaand = laadProjecten();
  const bestaandIds = new Set(bestaand.map(p => p.id));
  // Bestaande projecten met dezelfde id krijgen voorrang als ze nieuwer zijn,
  // anders importeren we de back-up versie (laatst-bewerkt wint)
  const samengevoegd = [...bestaand];
  let nieuw = 0, vervangen = 0;
  for (const p of inkomend) {
    if (!p?.id) continue;
    const idx = samengevoegd.findIndex(x => x.id === p.id);
    if (idx === -1) { samengevoegd.unshift(p); nieuw++; }
    else if ((p.updatedAt||0) > (samengevoegd[idx].updatedAt||0)) {
      samengevoegd[idx] = p; vervangen++;
    }
  }
  bewaarProjecten(samengevoegd);
  return { nieuw, vervangen, totaal: inkomend.length };
}
function upsertProject(lijst, proj) {
  const i = lijst.findIndex(p=>p.id===proj.id);
  if (i>=0) { const u=[...lijst]; u[i]=proj; return u; }
  return [proj, ...lijst];
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,     setScreen]     = useState("home");
  const [discipline, setDiscipline] = useState(null);
  const [step,       setStep]       = useState(0);
  const [job,        setJob]        = useState({});
  const [actiefId,   setActiefId]   = useState(null);
  const [idbKlaar,   setIdbKlaar]   = useState(false);

  // Initialiseer IndexedDB-cache bij app-start (eenmalig).
  // Doet ook automatisch migratie van localStorage → IndexedDB.
  useEffect(() => {
    _initIDBCache().finally(() => setIdbKlaar(true));
  }, []);

  // Schrijf de huidige staat van het actieve project terug naar de projectenlijst
  const persist = (jobData, disc, st, status) => {
    if (!actiefId) return;
    const lijst = laadProjecten();
    const bestaand = lijst.find(p=>p.id===actiefId);
    const proj = {
      id: actiefId,
      discipline: disc,
      job: jobData,
      step: st,
      status: status || bestaand?.status || "concept",
      updatedAt: Date.now(),
    };
    bewaarProjecten(upsertProject(lijst, proj));
  };

  const upd = (k,v) => setJob(d => {
    const nieuw = {...d,[k]:v};
    persist(nieuw, discipline, step);
    return nieuw;
  });

  const next = () => {
    const nieuwStep = step + 1;
    setStep(nieuwStep);
    persist(job, discipline, nieuwStep);
    trackEvent("stap_bereikt", { discipline, stap: nieuwStep });
  };
  const prev = () => {
    const nieuwStep = step - 1;
    setStep(nieuwStep);
    persist(job, discipline, nieuwStep);
  };

  const startNew = (discId=null) => {
    const nieuwId = "p" + Date.now();
    setActiefId(nieuwId);
    setJob({});
    setStep(0);
    try { localStorage.setItem(ACTIEF_KEY, nieuwId); } catch {}
    if (discId) {
      setDiscipline(discId);
      setScreen("job");
      const lijst = laadProjecten();
      bewaarProjecten(upsertProject(lijst, {id:nieuwId,discipline:discId,job:{},step:0,status:"concept",updatedAt:Date.now()}));
      trackEvent("discipline_gekozen", { discipline: discId });
    } else {
      setScreen("kiezen");
    }
  };

  // Open een bestaand project (concept of opgeleverd) om verder te werken of te bekijken
  const doorgaan = (proj) => {
    setActiefId(proj.id);
    setJob(proj.job);
    setDiscipline(proj.discipline);
    setStep(proj.step||0);
    try { localStorage.setItem(ACTIEF_KEY, proj.id); } catch {}
    setScreen("job");
  };

  const verwijderProject = (id) => {
    bewaarProjecten(laadProjecten().filter(p=>p.id!==id));
    verwijderProjectOpslag(id);
  };

  const kiesDiscipline = (d) => {
    setDiscipline(d);
    setStep(0);
    setScreen("job");
    persist(job, d, 0);
    trackEvent("discipline_gekozen", { discipline: d });
  };

  // Bij oplevering: status van het project op 'opgeleverd' zetten, data blijft bewaard zodat
  // de installateur het later nog kan inzien of het rapport opnieuw kan genereren.
  const markeerOpgeleverd = () => {
    persist(job, discipline, step, "opgeleverd");
    setScreen("klaar");
  };

  // Stappen per discipline
  const GK_STEPS = ["Klant","Installateur","Apparatuur","Foto's (oud)","Materiaal","Groepen","Meten","Foto's (nieuw)","Versturen"];
  const PV_STEPS = ["Klant","Installateur","Apparatuur","Foto's (oud)","Materiaal","Meten","Foto's (nieuw)","Versturen"];

  const gkScreens = [
    <StapKlant          key="klant"      data={job} onChange={upd} discipline="groepenkast" onNext={next} onBack={()=>setScreen("kiezen")}/>,
    <StapInstallateur   key="inst"       data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapMeetapparatuur key="apparat"    data={job} onChange={upd} discipline="groepenkast" onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_voor" data={job} onChange={upd} checkpoints={GK_FOTO_CPS_VOOR} onNext={next} onBack={prev}/>,
    <GK_StapMateriaal   key="mat"        data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <GK_StapGroepen     key="groepen"    data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <GK_StapMeten       key="meten"      data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_na"   data={job} onChange={upd} checkpoints={GK_FOTO_CPS_NA} onNext={next} onBack={prev}/>,
    <StapVersturen      key="verstuur"   data={job} onChange={upd} discipline="groepenkast" onSend={markeerOpgeleverd} onBack={prev}/>,
  ];

  const pvScreens = [
    <StapKlant          key="klant"      data={job} onChange={upd} discipline="pv" onNext={next} onBack={()=>setScreen("kiezen")}/>,
    <StapInstallateur   key="inst"       data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapMeetapparatuur key="apparat"    data={job} onChange={upd} discipline="pv" onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_voor" data={job} onChange={upd} checkpoints={PV_FOTO_CPS_VOOR} onNext={next} onBack={prev}/>,
    <PV_StapMateriaal   key="mat"        data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <PV_StapMeten       key="meten"      data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_na"   data={job} onChange={upd} checkpoints={PV_FOTO_CPS_NA} onNext={next} onBack={prev}/>,
    <StapVersturen      key="verstuur"   data={job} onChange={upd} discipline="pv" onSend={markeerOpgeleverd} onBack={prev}/>,
  ];

  const CV_STEPS = ["Klant","Installateur","Apparatuur","Foto's (oud)","Materiaal","Meten","Foto's (nieuw)","Versturen"];
  const WP_STEPS = ["Klant","Installateur","Apparatuur","Foto's (oud)","Materiaal","Meten","Foto's (nieuw)","Versturen"];

  const cvScreens = [
    <StapKlant          key="klant"      data={job} onChange={upd} discipline="cv" onNext={next} onBack={()=>setScreen("kiezen")}/>,
    <StapInstallateur   key="inst"       data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapMeetapparatuur key="apparat"    data={job} onChange={upd} discipline="cv" onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_voor" data={job} onChange={upd} checkpoints={CV_FOTO_CPS_VOOR} onNext={next} onBack={prev}/>,
    <CV_StapMateriaal   key="mat"        data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <CV_StapMeten       key="meten"      data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_na"   data={job} onChange={upd} checkpoints={CV_FOTO_CPS_NA} onNext={next} onBack={prev}/>,
    <StapVersturen      key="verstuur"   data={job} onChange={upd} discipline="cv" onSend={markeerOpgeleverd} onBack={prev}/>,
  ];

  const wpScreens = [
    <StapKlant          key="klant"      data={job} onChange={upd} discipline="wp" onNext={next} onBack={()=>setScreen("kiezen")}/>,
    <StapInstallateur   key="inst"       data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapMeetapparatuur key="apparat"    data={job} onChange={upd} discipline="wp" onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_voor" data={job} onChange={upd} checkpoints={WP_FOTO_CPS_VOOR} onNext={next} onBack={prev}/>,
    <WP_StapMateriaal   key="mat"        data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <WP_StapMeten       key="meten"      data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_na"   data={job} onChange={upd} checkpoints={WP_FOTO_CPS_NA} onNext={next} onBack={prev}/>,
    <StapVersturen      key="verstuur"   data={job} onChange={upd} discipline="wp" onSend={markeerOpgeleverd} onBack={prev}/>,
  ];

  const screens    = discipline==="pv" ? pvScreens : discipline==="cv" ? cvScreens : discipline==="wp" ? wpScreens : gkScreens;
  const stepLabels = discipline==="pv" ? PV_STEPS  : discipline==="cv" ? CV_STEPS  : discipline==="wp" ? WP_STEPS  : GK_STEPS;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <div style={S.app}>
        {screen==="home"   && <HomeScreen idbKlaar={idbKlaar} onNew={startNew} onDoorgaan={doorgaan} onVerwijder={verwijderProject}/>}
        {screen==="kiezen" && <DisciplineKiezer onKies={kiesDiscipline} onBack={()=>setScreen("home")}/>}
        {screen==="job"    && (
          <div>
            <StepBar step={step} steps={stepLabels} onJump={(i) => {
              setStep(i);
              persist(job, discipline, i);
            }}/>
            {screens[step]}
          </div>
        )}
        {screen==="klaar"  && <KlaarScreen data={job} discipline={discipline} onDone={()=>setScreen("home")}/>}
      </div>
    </>
  );
}
