'use client'
import { useState, useEffect, useRef } from "react";

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
  label:  { fontSize:11, color:K.muted, fontWeight:600, letterSpacing:0.5, textTransform:"uppercase", marginBottom:5, display:"block" },
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
const RCD_TYPE = ["AC","A","B","F"];
const KAR_TYPE = ["B","C","D"];
const GROEP_A  = ["6A","10A","16A","20A","25A","32A"];

// Foto's vóór de werkzaamheden (bestaande situatie)
const GK_FOTO_CPS_VOOR = [
  { id:"voor_dicht", label:"Bestaande situatie — kast dicht", icon:"📦", required:true  },
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

const PV_FOTO_CPS = [
  { id:"voor",        label:"Situatie dak vóór installatie",     icon:"📦", required:true  },
  { id:"constructie", label:"Bevestigingssysteem gemonteerd",    icon:"🔩", required:true  },
  { id:"panelen",     label:"Panelen geplaatst (totaaloverzicht)",icon:"☀️", required:true  },
  { id:"mc4",         label:"MC4 connectoren aangebracht",       icon:"🔌", required:true  },
  { id:"dc_kabel",    label:"DC-kabels (klasse 2 dubbel isol.)", icon:"🔋", required:true  },
  { id:"doorvoer",    label:"Doorvoeringen brandcompartiment",   icon:"🧱", required:true  },
  { id:"aarding",     label:"Aarding draagconstructie",          icon:"⚡", required:true  },
  { id:"omvormer",    label:"Omvormer gemonteerd + aangesloten", icon:"📟", required:true  },
  { id:"ballast",     label:"Ballastplan aanwezig (foto)",       icon:"📋", required:true  },
  { id:"legplan",     label:"Legplan aanwezig (foto)",           icon:"📐", required:true  },
  { id:"display",     label:"Omvormer display in bedrijf",       icon:"✅", required:false },
];

// ─── CROSS-CHECK LOGICA ───────────────────────────────────────────────────────

// Groepenkast cross-checks — werkt op aardlekgroepen (RCD-clusters), elk met 1+ eindgroepen.
// Norm is altijd de "bestaande installatie" norm (1000Ω/V): 0,23 MΩ bij 230V / 0,40 MΩ bij 400V.
// ΔT-norm is afhankelijk van het stelsel (TN of TT) — zie NEN1010 tabel 41.1:
//   TN-eindgroep ≤ 400ms · TT-eindgroep ≤ 200ms
function gkCrossChecks(aardlekgroepen, grpMeet, instMet) {
  const warnings = [];
  const stelsel = instMet.stelsel || "TN-C-S";
  const isTT = stelsel === "TT";
  const dtNorm = isTT ? 200 : 400;

  (aardlekgroepen||[]).forEach(ag => {
    const geenRcd = ag.rcdType === "geen";
    const hoogst = (ag.eindgroepen||[]).find(e=>e.id===ag.hoogstId) || ag.eindgroepen?.[0];
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
    if (!geenRcd) {
      const dt = toNum(grpMeet[`${ag.id}_dt`]);
      if (!isNaN(dt) && dt > dtNorm)
        warnings.push({ level:"red", msg:`${ag.naam}: ΔT ${dt}ms boven norm (≤${dtNorm}ms voor ${stelsel})` });
      const di  = toNum(grpMeet[`${ag.id}_di`]);
      const mA  = toNum(ag.rcdMa);
      if (!isNaN(di) && !isNaN(mA) && di > mA * 1.5)
        warnings.push({ level:"orange", msg:`${ag.naam}: ΔI ${di}mA nadert limiet voor ${mA}mA RCD` });
    }
    // Hoogst afgaande groep moet de hoogst beschikbare ampèrewaarde in de cluster zijn
    if (hoogst && ag.eindgroepen?.length > 1) {
      const hoogsteAmp = Math.max(...ag.eindgroepen.map(e=>toNum((e.ampere||"").replace("A",""))||0));
      const gekozenAmp = toNum((hoogst.ampere||"").replace("A",""))||0;
      if (gekozenAmp < hoogsteAmp)
        warnings.push({ level:"orange", msg:`${ag.naam}: gemeten op "${hoogst.naam}" maar er zit een hoger belaste eindgroep in dit cluster — meet op de hoogst afgaande groep` });
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
  // Z L-PE hoog maar net OK
  const zlpe = toNum(instMet.zlpe);
  if (!isNaN(zlpe) && zlpe > 0.4 && zlpe < 0.5)
    warnings.push({ level:"orange", msg:`Z L-PE ${zlpe}Ω nadert maximum (0.5Ω) — bij uitbreiding opnieuw meten` });
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

const MiniInput = ({ value, onChange, placeholder, unit, width=80 }) => (
  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
    <input style={{ ...S.input, width, padding:"8px 10px", fontSize:13 }}
      value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder||"—"}/>
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
    } catch(e) {
      setErrMsg(e.message || "Onbekende fout");
      setStatus("error");
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

function StepBar({ step, steps }) {
  return (
    <div style={{ display:"flex", alignItems:"center", padding:"10px 14px", background:K.surface, borderBottom:`1px solid ${K.border}`, gap:0, overflowX:"auto" }}>
      {steps.map((s,i) => (
        <div key={s} style={{ display:"flex", alignItems:"center", flex: i<steps.length-1?1:0 }}>
          <div style={{
            width:26, height:26, borderRadius:"50%", flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontWeight:700, fontSize:11,
            background: i<step ? K.green : i===step ? K.yellow : K.border,
            color: i<step ? "#fff" : i===step ? "#000" : K.muted,
          }}>{i<step ? "✓" : i+1}</div>
          {i<steps.length-1 && <div style={{ flex:1, height:2, background: i<step?K.green:K.border, margin:"0 3px", minWidth:6 }}/>}
        </div>
      ))}
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
    groepenkast: ["Nieuwe groepenkast plaatsen","Groepenkast vervangen","Groepenkast uitbreiden","Groepenkast renoveren"],
    pv:          ["Nieuwe PV installatie","PV uitbreiden","PV + thuisbatterij","PV + omvormer vervangen"],
    cv:          ["Combiketel plaatsen (nieuw)","Combiketel vervangen","Combiketel + warmtepomp","CV renovatie"],
    wp:          ["Nieuwe warmtepomp plaatsen","Warmtepomp vervangen","Hybride opstelling (CV + warmtepomp)","Warmtepomp uitbreiden"],
  };

  return (
    <div>
      <div style={S.hdr}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:15 }}>Klant & locatie</div>
          <div style={{ fontSize:11, color:K.muted }}>Stap 1 · {disc?.label}</div>
        </div>
        <div style={{ fontSize:22 }}>{disc?.icon}</div>
      </div>
      <div style={S.body}>
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
          <label style={S.label}>Type werk</label>
          <select style={S.select} value={data.typewerk||""} onChange={e=>onChange("typewerk",e.target.value)}>
            <option value="">Kies type</option>
            {(typeWerkOpties[discipline]||[]).map(o=><option key={o}>{o}</option>)}
          </select>
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
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            {["TN-C-S","TN-S","TT"].map(s=>(
              <Pill key={s} active={(data.stelsel||"TN-C-S")===s} onClick={()=>onChange("stelsel",s)}>{s}</Pill>
            ))}
          </div>
          <div style={{fontSize:11,color:K.muted,padding:"8px 10px",background:K.surface,borderRadius:8,marginBottom:14}}>
            {data.stelsel==="TT"
              ? "TT-stelsel: max. uitschakeltijd eindgroep ≤ 200ms (NEN1010 tabel 41.1)"
              : "TN-stelsel: max. uitschakeltijd eindgroep ≤ 400ms (NEN1010 tabel 41.1)"}
          </div>
          <label style={S.label}>Kastuitvoering</label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Pill active={(data.kastType||"kunststof")==="kunststof"} onClick={()=>onChange("kastType","kunststof")}>Kunststof (dubbel geïsoleerd)</Pill>
            <Pill active={data.kastType==="metaal"} onClick={()=>onChange("kastType","metaal")}>Metaal</Pill>
          </div>
        </div>

        <div style={S.card}>
          <label style={S.label}>Kastmodel</label>
          <input style={{...S.input,marginBottom:12}} placeholder="Hager Volta 3-fase 24 gr." value={data.kast||""} onChange={e=>onChange("kast",e.target.value)}/>
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
  const nieuweEindgroep = (naam="Nieuwe eindgroep") => ({ id:Date.now()+Math.random(), naam, kar:"B", ampere:"16A" });
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
          Eén aardlekschakelaar beschermt vaak meerdere eindgroepen. Je meet straks 1× per aardlekgroep — op de <strong>hoogst afgaande groep</strong> (de zwaarst belaste eindgroep in dat cluster).
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
  const [fotos,setFotos] = useState(data.fotos||{});
  const [kiesVoor,setKiesVoor] = useState(null); // checkpoint id waarvoor camera/galerij keuze open staat
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
    const u = {...fotos, [kiesVoor]: dataUrl};
    setFotos(u); onChange("fotos",u);
    setKiesVoor(null);
  };

  const verwijderFoto = (id) => {
    const u = {...fotos}; delete u[id];
    setFotos(u); onChange("fotos",u);
  };

  const verplichtDone = checkpoints.filter(c=>c.required).every(c=>fotos[c.id]);
  const done = Object.values(fotos).filter(Boolean).length;

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
  const dtNorm = isTT ? 200 : 400;
  const [activeAG,setActiveAG] = useState(aardlekgroepen[0]?.id||null);
  const si = (k,v) => { const u={...inst,[k]:v,stelsel}; setInst(u); onChange("instMetingen",u); };
  const sg = (gId,k,v) => { const u={...grpMeet,[`${gId}_${k}`]:v}; setGrpMeet(u); onChange("grpMeet",u); };
  const gv = (gId,k) => grpMeet[`${gId}_${k}`]||"";
  const isoOk  = v => toNum(v)>=1;
  const dtOk   = v => toNum(v)<=dtNorm;
  const spanOk = v => toNum(v)>=207&&toNum(v)<=253;
  const zOk    = v => toNum(v)<0.5;
  const cag = aardlekgroepen.find(a=>a.id===activeAG);
  const heeft3fase = aardlekgroepen.some(a=>a.fase==="3");
  // Zorg dat stelsel altijd gesynchroniseerd is naar instMetingen (voor cross-checks/rapport)
  useEffect(()=>{ if (inst.stelsel!==stelsel) si("stelsel",stelsel); }, [stelsel]);
  const warnings = gkCrossChecks(aardlekgroepen, grpMeet, {...inst, stelsel});

  return (
    <div>
      <div style={S.hdr}><button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:15}}>Meetwaarden NEN1010</div><div style={{fontSize:11,color:K.muted}}>Stap 7 · {stelsel}-stelsel · 250V</div></div>
      </div>
      <div style={S.body}>
        {/* Installatie algemeen */}
        <div style={S.sTitle}>Installatie algemeen</div>
        <div style={S.card}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
            <div><label style={S.label}>Voorzekering</label><MiniInput value={inst.voorzekering} onChange={v=>si("voorzekering",v)} unit="A" width={70}/></div>
            <div><label style={S.label}>Stelsel</label>
              <div style={{padding:"8px 10px",borderRadius:8,background:K.surface,fontSize:13,fontWeight:600,color:K.yellow,minWidth:90,textAlign:"center"}}>{stelsel}</div>
            </div>
          </div>
          <div style={{height:1,background:K.border,margin:"8px 0"}}/>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
            {[["Z L-N","zln","Ω",zOk],["Z L-PE","zlpe","Ω",zOk]].map(([l,k,u,chk])=>(
              <div key={k}><label style={S.label}>{l}</label>
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  <MiniInput value={inst[k]} onChange={v=>si(k,v)} unit={u} width={70}/>
                  {inst[k] && <StatusTag level={chk(inst[k])?"ok":"red"}/>}
                </div>
              </div>
            ))}
          </div>
          <div style={{height:1,background:K.border,margin:"8px 0"}}/>
          <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,cursor:"pointer"}}>
            <input type="checkbox" checked={inst.toon3fase ?? heeft3fase} onChange={e=>si("toon3fase",e.target.checked)}/>
            <span style={{fontSize:12,color:K.muted}}>Ook L2/N, L3/N en N/PE meten (3-fase aansluiting aanwezig)</span>
          </label>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
            {(["L1/N"].concat((inst.toon3fase ?? heeft3fase) ? ["L2/N","L3/N","N/PE"] : [])).map(f=>(
              <div key={f}><label style={S.label}>{f}</label>
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  <MiniInput value={inst[`span_${f}`]} onChange={v=>si(`span_${f}`,v)} unit="V" width={65}/>
                  {inst[`span_${f}`]&&f!=="N/PE"&&<StatusTag level={spanOk(inst[`span_${f}`])?"ok":"red"}/>}
                </div>
              </div>
            ))}
          </div>
          <label style={S.label}>ISO totaal — norm ≥ 1 MΩ</label>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <MiniInput value={inst.isoTot} onChange={v=>si("isoTot",v)} unit="MΩ" width={80}/>
            {inst.isoTot && <StatusTag level={isoOk(inst.isoTot)?"ok":"red"}/>}
          </div>
        </div>

        {/* Per aardlekgroep */}
        <div style={S.sTitle}>Per aardlekgroep — meten op 250V</div>
        <div style={{overflowX:"auto",display:"flex",gap:8,marginBottom:14,paddingBottom:4}}>
          {aardlekgroepen.map(ag=>{
            const norm = ag.fase==="3" ? 0.40 : 0.23;
            const isoKeys = ag.fase==="3" ? ["iso_l1a","iso_l2a","iso_l3a","iso_na"] : ["iso_fa","iso_na"];
            const isoIngevuld = isoKeys.every(k=>gv(ag.id,k));
            const isoOke = isoIngevuld && isoKeys.every(k=>toNum(gv(ag.id,k))>=norm);
            const gd = isoIngevuld && (ag.rcdType==="geen" || gv(ag.id,"dt"));
            const gOk = gd && isoOke && (ag.rcdType==="geen" || dtOk(gv(ag.id,"dt")));
            return (
              <button key={ag.id} onClick={()=>setActiveAG(ag.id)} style={{padding:"7px 13px",borderRadius:10,border:`1px solid ${activeAG===ag.id?K.yellow:K.border}`,background:activeAG===ag.id?K.yellowDim:K.card,color:activeAG===ag.id?K.yellow:K.text,fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                {gd?(gOk?"✅":"⚠️"):"○"} {ag.naam.length>14?ag.naam.slice(0,14)+"…":ag.naam}
              </button>
            );
          })}
        </div>
        {cag && (() => {
          const is3fase = cag.fase==="3";
          const isoNorm = is3fase ? 0.40 : 0.23;
          const isoNormLabel = is3fase ? "≥ 0,40 MΩ" : "≥ 0,23 MΩ";
          const isoVelden = is3fase
            ? [{k:"iso_l1a",l:"L1 → Aarde"},{k:"iso_l2a",l:"L2 → Aarde"},{k:"iso_l3a",l:"L3 → Aarde"},{k:"iso_na",l:"N → Aarde"}]
            : [{k:"iso_fa",l:"Fase → Aarde"},{k:"iso_na",l:"Nul → Aarde"}];
          const isoChk = v => toNum(v) >= isoNorm;
          const hoogst = cag.eindgroepen?.find(e=>e.id===cag.hoogstId) || cag.eindgroepen?.[0];

          return (
          <div style={S.card}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:2}}>{cag.naam}</div>
            <div style={{fontSize:11,color:K.muted,marginBottom:6}}>
              {cag.rcdType==="geen"?"Geen RCD":`RCD ${cag.rcdMa}mA type-${cag.rcdType}`} · {is3fase?"3-fase 400V":"1-fase 230V"}
            </div>
            {hoogst && (
              <div style={{fontSize:11,color:K.yellow,marginBottom:14,padding:"6px 10px",background:K.yellowDim,borderRadius:8}}>
                ⭐ Gemeten op hoogst afgaande groep: <strong>{hoogst.naam}</strong> ({hoogst.kar}{hoogst.ampere})
              </div>
            )}

            {/* ISO velden per fase type */}
            <div style={{marginBottom:12}}>
              <label style={S.label}>Isolatieweerstand (MΩ) — 250V — norm {isoNormLabel}</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {isoVelden.map(({k,l})=>{
                  const val = gv(cag.id,k);
                  const ok  = val && isoChk(val);
                  return (
                    <div key={k}>
                      <div style={{fontSize:10,color:K.muted,marginBottom:3}}>{l}</div>
                      <input style={{...S.input,fontSize:15,fontWeight:700,
                        background:val?(ok?K.greenDim:K.redDim):K.surface,
                        border:`1px solid ${val?(ok?K.green:K.red):K.border}`}}
                        type="text" inputMode="decimal" placeholder="0,5"
                        value={val} onChange={e=>sg(cag.id,k,e.target.value)}/>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{height:1,background:K.border,margin:"12px 0"}}/>

            {/* Overige meetwaarden */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <label style={S.label}>Spanning V — norm 207–253V</label>
                <input style={{...S.input,fontSize:15,fontWeight:700,
                  background:gv(cag.id,"spanning")?(spanOk(gv(cag.id,"spanning"))?K.greenDim:K.redDim):K.surface,
                  border:`1px solid ${gv(cag.id,"spanning")?(spanOk(gv(cag.id,"spanning"))?K.green:K.red):K.border}`}}
                  type="text" inputMode="decimal" placeholder="230" value={gv(cag.id,"spanning")} onChange={e=>sg(cag.id,"spanning",e.target.value)}/>
              </div>

              {cag.rcdType!=="geen" && (
                <>
                  <div>
                    <label style={S.label}>ΔT ms — norm ≤{dtNorm}ms ({stelsel})</label>
                    <input style={{...S.input,fontSize:15,fontWeight:700,
                      background:gv(cag.id,"dt")?(dtOk(gv(cag.id,"dt"))?K.greenDim:K.redDim):K.surface,
                      border:`1px solid ${gv(cag.id,"dt")?(dtOk(gv(cag.id,"dt"))?K.green:K.red):K.border}`}}
                      type="text" inputMode="decimal" placeholder={String(dtNorm-50)} value={gv(cag.id,"dt")} onChange={e=>sg(cag.id,"dt",e.target.value)}/>
                  </div>
                  <div>
                    <label style={S.label}>ΔI mA — norm &lt;{toNum(cag.rcdMa)*2}mA</label>
                    <input style={{...S.input,fontSize:15,fontWeight:700,
                      background:gv(cag.id,"di")?(toNum(gv(cag.id,"di"))<toNum(cag.rcdMa)*2?K.greenDim:K.redDim):K.surface,
                      border:`1px solid ${gv(cag.id,"di")?(toNum(gv(cag.id,"di"))<toNum(cag.rcdMa)*2?K.green:K.red):K.border}`}}
                      type="text" inputMode="decimal" placeholder={String(toNum(cag.rcdMa)*0.8)} value={gv(cag.id,"di")} onChange={e=>sg(cag.id,"di",e.target.value)}/>
                  </div>
                  <div>
                    <label style={S.label}>Testknop RCD</label>
                    <div style={{display:"flex",gap:8,marginTop:2}}>
                      {["OK","NOK"].map(v=><Pill key={v} small active={gv(cag.id,"testknop")===v} onClick={()=>sg(cag.id,"testknop",v)}>{v}</Pill>)}
                    </div>
                  </div>
                </>
              )}
            </div>

            {aardlekgroepen.findIndex(a=>a.id===cag.id)<aardlekgroepen.length-1 &&
              <button style={{...S.btn,background:K.surface,color:K.text,border:`1px solid ${K.border}`,marginTop:14,marginBottom:0}}
                onClick={()=>{const idx=aardlekgroepen.findIndex(a=>a.id===cag.id);setActiveAG(aardlekgroepen[idx+1].id);}}>
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
VOORZEKERING: ${inst.voorzekering||"—"}A
Z L-N: ${inst.zln||"—"} Ohm | Z L-PE: ${inst.zlpe||"—"} Ohm | ISO totaal: ${inst.isoTot||"—"} MOhm
SPANNINGEN: L1 ${inst["span_L1/N"]||"—"}V / L2 ${inst["span_L2/N"]||"—"}V / L3 ${inst["span_L3/N"]||"—"}V / N-PE ${inst["span_N/PE"]||"—"}V
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
        <div><div style={{fontWeight:700,fontSize:15}}>Materiaal PV</div><div style={{fontSize:11,color:K.muted}}>Stap 4 · Zonnepanelen</div></div>
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
        <div><div style={{fontWeight:700,fontSize:15}}>Meetwaarden PV</div><div style={{fontSize:11,color:K.muted}}>Stap 7 · NEN1010:712</div></div>
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
      * { box-sizing:border-box; margin:0; padding:0; }
      body { font-family: Arial, sans-serif; font-size:10px; color:#222; background:#fff; padding:16px; }
      h1 { font-size:18px; color:${accent}; margin-bottom:2px; }
      h2 { font-size:11px; color:${accent}; text-transform:uppercase; letter-spacing:0.5px; margin:12px 0 4px; border-bottom:2px solid ${accent}; padding-bottom:2px; }
      table { width:100%; border-collapse:collapse; margin-bottom:8px; }
      td, th { border:1px solid #ddd; padding:4px 6px; font-size:9px; }
      th { background:${accent}; color:#fff; font-weight:bold; text-align:left; }
      tr:nth-child(even) td { background:#f9f9f9; }
      .ok  { color:#166534; font-weight:bold; background:#dcfce7; }
      .nok { color:#991b1b; font-weight:bold; background:#fee2e2; }
      .warn{ color:#92400e; font-weight:bold; background:#fef3c7; }
      .naw { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px; }
      .naw-box { border:1px solid #ddd; padding:8px; border-radius:4px; }
      .naw-box strong { display:block; color:${accent}; font-size:9px; text-transform:uppercase; margin-bottom:4px; }
      .naw-box p { margin:1px 0; font-size:9px; }
      .sign { margin-top:32px; border-top:1px solid #ddd; padding-top:12px; font-size:9px; }
      .sign-line { display:inline-block; width:200px; border-bottom:1px solid #333; margin-right:32px; height:24px; }
      .warn-box { background:#fef3c7; border:1px solid #f59e0b; border-radius:4px; padding:8px; margin:8px 0; }
      .warn-box p { margin:2px 0; font-size:9px; color:#92400e; }
      @media print { @page { margin:10mm; } }
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

    const aiHtml = () => data.aiAnalyse ? `
      <h2>Technische beoordeling</h2>
      <div style="border:1px solid #ddd;border-radius:4px;padding:10px;font-size:9px;line-height:1.6;white-space:pre-wrap;background:#fafaff">${data.aiAnalyse}</div>` : "";

    const notitieHtml = () => data.notitie ? `
      <h2>Opmerkingen</h2>
      <div style="border:1px solid #ddd;border-radius:4px;padding:10px;font-size:9px;line-height:1.6;white-space:pre-wrap">${data.notitie}</div>` : "";

    const fotosHtml = (checkpoints) => {
      const fotos = data.fotos||{};
      const metFoto = (checkpoints||[]).filter(cp => fotos[cp.id] && typeof fotos[cp.id]==="string" && fotos[cp.id].startsWith("data:image"));
      if (metFoto.length === 0) return "";
      return `
      <h2 style="page-break-before:always">Fotodocumentatie</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        ${metFoto.map(cp=>`
          <div style="border:1px solid #ddd;border-radius:4px;overflow:hidden;page-break-inside:avoid">
            <img src="${fotos[cp.id]}" style="width:100%;height:auto;display:block"/>
            <div style="padding:5px 8px;font-size:8px;font-weight:bold;background:#f5f5f5">${cp.icon} ${cp.label}</div>
          </div>`).join("")}
      </div>`;
    };

    const signHtml = (norm, verklaring) => `
      ${aiHtml()}
      ${notitieHtml()}
      <h2>Conformverklaring</h2>
      <p style="font-size:9px;margin-bottom:12px">${verklaring}</p>
      <div style="border:1px solid #ddd;border-radius:4px;padding:12px;font-size:9px;background:#fafafa">
        <p style="margin-bottom:8px">Ondergetekende verklaart dat bovenstaande gegevens en meetwaarden naar waarheid zijn ingevuld en dat de werkzaamheden zijn uitgevoerd conform ${norm}.</p>
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
      html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>${data.projectId}-groepenkast</title>
        <style>${css(accentGK)}</style></head><body>
        <h1>Opleveringsrapport</h1>
        <p style="font-size:11px;color:#555;margin-bottom:12px">Elektrische installatie · NEN1010 deel 6</p>
        ${nawHtml()}
        <h2>Meetapparatuur</h2>
        <table>
          <tr><td><strong>Installatietester</strong></td><td>${data.apparTester||"—"}</td>
              <td><strong>Stroomtang</strong></td><td>${data.apparTang||"—"}</td></tr>
          <tr><td><strong>IR camera</strong></td><td>${data.apparIR||"—"}</td>
              <td><strong>Multimeter</strong></td><td>${data.apparMulti||"—"}</td></tr>
        </table>
        <h2>Gegevens installatie</h2>
        <table>
          <tr><td><strong>Kastmodel</strong></td><td>${data.kast||"—"}</td>
              <td><strong>Bouwjaar</strong></td><td>${data.bouwjaar||"—"}</td></tr>
          <tr><td><strong>Automaten</strong></td><td colspan="3">${automaten.map(a=>`${a.aantal}× ${a.fab} ${a.type!=="handmatig"?a.type:""} ${a.serie?`(${a.serie})`:""}`).join(", ")||"—"}</td></tr>
          <tr><td><strong>Aardlekschakelaars</strong></td><td colspan="3">${aardlekgroepen.map(ag=>ag.rcdType==="geen"?`${ag.naam}: geen RCD`:`${ag.naam}: ${ag.rcdMa}mA type-${ag.rcdType}`).join(" · ")||"—"}</td></tr>
        </table>
        <h2>Meetgegevens installatie (AC)</h2>
        <table>
          <tr>
            <td><strong>Voorzekering</strong></td><td>${instMet.voorzekering||"—"} A</td>
            <td><strong>Stelsel</strong></td><td>${instMet.stelsel||data.stelsel||"—"}</td>
          </tr>
          <tr>
            <td><strong>Z L-N</strong></td><td ${statusGK(instMet.zln, v=>toNum(v)<0.5)}>${instMet.zln||"—"} Ω</td>
            <td><strong>Z L-PE</strong></td><td ${statusGK(instMet.zlpe, v=>toNum(v)<0.5)}>${instMet.zlpe||"—"} Ω</td>
          </tr>
          <tr>
            <td><strong>ISO totaal</strong></td><td ${statusGK(instMet.isoTot, v=>toNum(v)>=1)}>${instMet.isoTot||"—"} MΩ</td>
            <td><strong>Kastuitvoering</strong></td><td>${data.kastType==="metaal"?"Metaal":"Kunststof (dubbel geïsoleerd)"}</td>
          </tr>
          <tr>
            <td><strong>L1/N</strong></td><td ${statusGK(instMet["span_L1/N"], v=>toNum(v)>=207&&toNum(v)<=253)}>${instMet["span_L1/N"]||"—"} V</td>
            <td><strong>L2/N</strong></td><td ${statusGK(instMet["span_L2/N"], v=>toNum(v)>=207&&toNum(v)<=253)}>${instMet["span_L2/N"]||"—"} V</td>
          </tr>
          <tr>
            <td><strong>L3/N</strong></td><td ${statusGK(instMet["span_L3/N"], v=>toNum(v)>=207&&toNum(v)<=253)}>${instMet["span_L3/N"]||"—"} V</td>
            <td><strong>N/PE</strong></td><td>${instMet["span_N/PE"]||"—"} V</td>
          </tr>
        </table>
        <h2>Aardlekgroepen — meetstaat</h2>
        <p style="font-size:8px;color:#666;margin-bottom:4px">
          Gemeten op 250V, per aardlekgroep op de hoogst afgaande eindgroep. Norm 1000Ω/V nominaal: 1-fase ≥0,23 MΩ · 3-fase ≥0,40 MΩ. ΔT-norm voor ${instMet.stelsel||data.stelsel||"TN"}-stelsel: ≤${(instMet.stelsel||data.stelsel)==="TT"?200:400}ms.
        </p>
        <table>
          <tr>
            <th>Aardlekgroep</th><th>Eindgroepen (kar·A)</th><th>Fase</th><th>RCD</th>
            <th>ISO metingen MΩ</th><th>U (V)</th><th>ΔT ms</th><th>ΔI mA</th><th>Test</th><th>Status</th>
          </tr>
          ${aardlekgroepen.map((ag)=>{
            const norm = ag.fase==="3" ? 0.40 : 0.23;
            const dtNormRap = (instMet.stelsel||data.stelsel)==="TT" ? 200 : 400;
            const isoKeys = ag.fase==="3"
              ? [["iso_l1a","L1-A"],["iso_l2a","L2-A"],["iso_l3a","L3-A"],["iso_na","N-A"]]
              : [["iso_fa","F-A"],["iso_na","N-A"]];
            const isoCells = isoKeys.map(([k,label])=>{
              const v = gv(ag.id,k);
              const ok = v!=="—" && toNum(v)>=norm;
              return `<span style="display:inline-block;margin-right:4px;padding:1px 4px;border-radius:2px" class="${v!=="—"?(ok?"ok":"nok"):""}">${label}:${v}</span>`;
            }).join("");
            const isoAllOk = isoKeys.every(([k])=>{const v=gv(ag.id,k);return v!=="—"&&toNum(v)>=norm;});
            const span = gv(ag.id,"spanning"); const spOk = span!=="—"&&toNum(span)>=207&&toNum(span)<=253;
            const geenRcd = ag.rcdType==="geen";
            const dt = geenRcd?"n.v.t.":gv(ag.id,"dt"); const di = geenRcd?"n.v.t.":gv(ag.id,"di"); const tk = geenRcd?"n.v.t.":gv(ag.id,"testknop");
            const dtOk2 = geenRcd || (dt!=="—"&&toNum(dt)<=dtNormRap);
            const diOk = geenRcd || (di!=="—"&&toNum(di)<toNum(ag.rcdMa)*2);
            const tkOk = geenRcd || tk==="OK";
            const allOk = isoAllOk&&dtOk2&&diOk&&spOk&&tkOk;
            const hoogst = ag.eindgroepen?.find(e=>e.id===ag.hoogstId) || ag.eindgroepen?.[0];
            const eindLijst = (ag.eindgroepen||[]).map(e=>`${e.id===hoogst?.id?"⭐ ":""}${e.naam} (${e.kar}${e.ampere})`).join("<br>");
            return `<tr>
              <td><strong>${ag.naam}</strong></td>
              <td style="font-size:8px">${eindLijst}</td>
              <td>${ag.fase==="3"?"3F 400V":"1F 230V"}</td>
              <td>${geenRcd?"Geen":`${ag.rcdMa}mA ${ag.rcdType}`}</td>
              <td style="font-size:8px">${isoCells}</td>
              <td ${spOk?'class="ok"':'class="nok"'}>${span}</td>
              <td ${dtOk2?'class="ok"':'class="nok"'}>${dt}</td>
              <td ${diOk?'class="ok"':'class="nok"'}>${di}</td>
              <td ${tk==="OK"?'class="ok"':tk==="NOK"?'class="nok"':''}>${tk}</td>
              <td ${allOk?'class="ok"':'class="nok"'}>${allOk?"✓":"✗"}</td>
            </tr>`;
          }).join("")}
        </table>
        ${waarschuwingHtml()}
        ${fotosHtml(GK_FOTO_CPS)}
        ${signHtml("NEN1010","De installatie is aangelegd conform de huidige NEN1010. De visuele controle en metingen zijn over de gehele installatie uitgevoerd. Er zijn geen afwijkingen geconstateerd die een veilige inbedrijfstelling verhinderen.")}
        </body></html>`;

    // ── COMBIKETEL RAPPORT ────────────────────────────────────────
    } else if (discipline === "cv") {
      const accentCV = "#DC2626";
      const statusCV = (v, chk) => v&&v!=="—" ? (chk(v) ? `class="ok"` : `class="nok"`) : "";
      html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>${data.projectId}-combiketel</title>
        <style>${css(accentCV)}</style></head><body>
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
      // Persoonlijke aanhef toevoegen vóór de inhoud van het rapport
      const introHtml = pdfHtml.replace(
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
      const json = await resp.json();
      if (!resp.ok || json.error) throw new Error(json.error || "Versturen mislukt");
      setMailStatus("sent");
    } catch (e) {
      setMailStatus("error");
      setMailError(e.message || "Onbekende fout");
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
function HomeScreen({ onNew, onDoorgaan, onVerwijder }) {
  const [projecten, setProjecten] = useState([]);

  useEffect(() => {
    setProjecten(laadProjecten());
  }, []);

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

const CV_FOTO_CPS = [
  { id:"voor",       label:"Situatie vóór werkzaamheden",     icon:"📦", required:true  },
  { id:"gemonteerd", label:"Ketel gemonteerd aan wand",        icon:"🔥", required:true  },
  { id:"gas",        label:"Gasaansluiting en afsluiter",      icon:"🔧", required:true  },
  { id:"rookgas",    label:"Rookgasafvoer aangebracht",        icon:"💨", required:true  },
  { id:"lucht",      label:"Luchttoevoer (type C)",            icon:"🌬️", required:true  },
  { id:"condens",    label:"Condensafvoer",                    icon:"💧", required:true  },
  { id:"expansie",   label:"Expansievat + veiligheidsventiel", icon:"⚙️", required:true  },
  { id:"bedrijf",    label:"Ketel in bedrijf",                 icon:"✅", required:true  },
  { id:"display",    label:"Display / bedieningspaneel",       icon:"📟", required:true  },
  { id:"meting",     label:"Meetresultaten analyser (foto)",   icon:"📊", required:true  },
  { id:"label",      label:"Typeplaatje ketel",                icon:"🏷️", required:false },
];

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
        <div><div style={{fontWeight:700,fontSize:15}}>Materiaal CV</div><div style={{fontSize:11,color:K.muted}}>Stap 4 · Combiketel</div></div>
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

const WP_FOTO_CPS = [
  { id:"voor",        label:"Situatie vóór installatie",         icon:"📦", required:true  },
  { id:"buitenunit",  label:"Buitenunit gemonteerd",              icon:"🌡️", required:true  },
  { id:"trilling",    label:"Trillingsdemping / fundatie",        icon:"🔩", required:true  },
  { id:"binnenunit",  label:"Binnenunit / boiler gemonteerd",     icon:"🏠", required:true  },
  { id:"leidingen",   label:"Koudemiddelleidingen geïsoleerd",    icon:"🧊", required:true  },
  { id:"condensafv",  label:"Condensafvoer buitenunit",           icon:"💧", required:true  },
  { id:"elektrisch",  label:"Elektrische aansluiting + groep",    icon:"🔌", required:true  },
  { id:"expansie",    label:"Expansievat + veiligheidsventiel",   icon:"⚙️", required:true  },
  { id:"bedrijf",     label:"Systeem in bedrijf / display",       icon:"✅", required:true  },
  { id:"label",       label:"Typeplaatje + F-gassen sticker",     icon:"🏷️", required:false },
];

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
        <div><div style={{fontWeight:700,fontSize:15}}>Materiaal warmtepomp</div><div style={{fontSize:11,color:K.muted}}>Stap 4 · Warmtepomp</div></div>
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
    const val=meet[k]||""; const ok=val&&chk(val);
    return (
      <div>
        <label style={S.label}>{l}</label>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <input style={{...S.input,fontSize:15,fontWeight:700,flex:1,
            background:val?(ok?K.greenDim:K.redDim):K.surface,
            border:`1px solid ${val?(ok?K.green:K.red):K.border}`}}
            type="text" inputMode="decimal" placeholder={ph} value={val} onChange={e=>sm(k,e.target.value)}/>
          {unit&&<span style={{fontSize:11,color:K.muted,whiteSpace:"nowrap"}}>{unit}</span>}
          {val&&<StatusTag level={ok?"ok":"red"}/>}
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
    const val=meet[k]||""; const ok=val&&chk(val); const err=val&&!chk(val);
    return (
      <div>
        <label style={S.label}>{l}</label>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <input style={{...S.input,fontSize:15,fontWeight:700,flex:1,
            background:val?(ok?K.greenDim:K.redDim):K.surface,
            border:`1px solid ${val?(ok?K.green:K.red):K.border}`}}
            type="text" inputMode="decimal" placeholder={ph} value={val} onChange={e=>sm(k,e.target.value)}/>
          {unit&&<span style={{fontSize:11,color:K.muted,whiteSpace:"nowrap"}}>{unit}</span>}
          {val&&<StatusTag level={ok?"ok":err?"red":"ok"}/>}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={S.hdr}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:15}}>Meetwaarden CV</div><div style={{fontSize:11,color:K.muted}}>Stap 7 · BRL6000-25</div></div>
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
const PROJ_KEY = "ywkb_projecten";
const ACTIEF_KEY = "ywkb_actief_id";

function laadProjecten() {
  try { return JSON.parse(localStorage.getItem(PROJ_KEY)||"[]"); } catch { return []; }
}
function bewaarProjecten(lijst) {
  try { localStorage.setItem(PROJ_KEY, JSON.stringify(lijst)); } catch {}
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
  };

  const kiesDiscipline = (d) => {
    setDiscipline(d);
    setStep(0);
    setScreen("job");
    persist(job, d, 0);
  };

  // Bij oplevering: status van het project op 'opgeleverd' zetten, data blijft bewaard zodat
  // de installateur het later nog kan inzien of het rapport opnieuw kan genereren.
  const markeerOpgeleverd = () => {
    persist(job, discipline, step, "opgeleverd");
    setScreen("klaar");
  };

  // Stappen per discipline
  const GK_STEPS = ["Klant","Installateur","Apparatuur","Foto's (oud)","Materiaal","Groepen","Meten","Foto's (nieuw)","Versturen"];
  const PV_STEPS = ["Klant","Installateur","Apparatuur","Materiaal","Foto's","Meten","Versturen"];

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
    <StapKlant          key="klant"    data={job} onChange={upd} discipline="pv" onNext={next} onBack={()=>setScreen("kiezen")}/>,
    <StapInstallateur   key="inst"     data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapMeetapparatuur key="apparat"  data={job} onChange={upd} discipline="pv" onNext={next} onBack={prev}/>,
    <PV_StapMateriaal   key="mat"      data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos"    data={job} onChange={upd} checkpoints={PV_FOTO_CPS} onNext={next} onBack={prev}/>,
    <PV_StapMeten       key="meten"    data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapVersturen      key="verstuur" data={job} onChange={upd} discipline="pv" onSend={markeerOpgeleverd} onBack={prev}/>,
  ];

  const CV_STEPS = ["Klant","Installateur","Apparatuur","Materiaal","Foto's","Meten","Versturen"];
  const WP_STEPS = ["Klant","Installateur","Apparatuur","Materiaal","Foto's","Meten","Versturen"];

  const cvScreens = [
    <StapKlant          key="klant"    data={job} onChange={upd} discipline="cv" onNext={next} onBack={()=>setScreen("kiezen")}/>,
    <StapInstallateur   key="inst"     data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapMeetapparatuur key="apparat"  data={job} onChange={upd} discipline="cv" onNext={next} onBack={prev}/>,
    <CV_StapMateriaal   key="mat"      data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos"    data={job} onChange={upd} checkpoints={CV_FOTO_CPS} onNext={next} onBack={prev}/>,
    <CV_StapMeten       key="meten"    data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapVersturen      key="verstuur" data={job} onChange={upd} discipline="cv" onSend={markeerOpgeleverd} onBack={prev}/>,
  ];

  const wpScreens = [
    <StapKlant          key="klant"    data={job} onChange={upd} discipline="wp" onNext={next} onBack={()=>setScreen("kiezen")}/>,
    <StapInstallateur   key="inst"     data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapMeetapparatuur key="apparat"  data={job} onChange={upd} discipline="wp" onNext={next} onBack={prev}/>,
    <WP_StapMateriaal   key="mat"      data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos"    data={job} onChange={upd} checkpoints={WP_FOTO_CPS} onNext={next} onBack={prev}/>,
    <WP_StapMeten       key="meten"    data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapVersturen      key="verstuur" data={job} onChange={upd} discipline="wp" onSend={markeerOpgeleverd} onBack={prev}/>,
  ];

  const screens    = discipline==="pv" ? pvScreens : discipline==="cv" ? cvScreens : discipline==="wp" ? wpScreens : gkScreens;
  const stepLabels = discipline==="pv" ? PV_STEPS  : discipline==="cv" ? CV_STEPS  : discipline==="wp" ? WP_STEPS  : GK_STEPS;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <div style={S.app}>
        {screen==="home"   && <HomeScreen onNew={startNew} onDoorgaan={doorgaan} onVerwijder={verwijderProject}/>}
        {screen==="kiezen" && <DisciplineKiezer onKies={kiesDiscipline} onBack={()=>setScreen("home")}/>}
        {screen==="job"    && (
          <div>
            <StepBar step={step} steps={stepLabels}/>
            {screens[step]}
          </div>
        )}
        {screen==="klaar"  && <KlaarScreen data={job} discipline={discipline} onDone={()=>setScreen("home")}/>}
      </div>
    </>
  );
}
