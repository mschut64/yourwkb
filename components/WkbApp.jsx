'use client'
// YourWkb WkbApp.jsx — versie: zie de constante APP_VERSIE hieronder.
// 2026-09-11-A (fasecheck v1, stap 1 — herkomst van de basisbelasting):
//   • basisbelastingKw() kent nu twee bronnen. Bij 'geschat' blijft alles zoals
//     het was: optellen uit het paspoort met de gelijktijdigheidsfactor 0,6
//     over de grote verbruikers. Bij 'gemeten' is de gemeten piek de basis en
//     gaat die factor er NIET overheen — wat de meter zag, liep werkelijk
//     tegelijk, dus de gelijktijdigheid zit er al in. Hem nogmaals toepassen
//     zou 40% van een echte meting wegstrepen.
//   • Nog niets zichtbaar in de app: zonder meting is het gedrag identiek.
//     Dit is het fundament waar de P1-meting straks op landt, zodat er dan
//     niets herbouwd hoeft te worden. Zie docs/claude_fasecheck-v1-scope.md.
//
// 2026-09-03-A (roadmap 2.1 — belastingcheck wordt berekend):
//   • De gelijktijdigheidsfactor 0,6 over de grote verbruikers (laadpaal,
//     warmtepomp, kookgroep, thuisbatterij) uit NEN-EN-IEC 61439. Deze app
//     BESCHREEF die regel al bij de load balancing, maar rekende hem nergens
//     uit: `p.chk` werd alleen getoond uit een gescand paspoort en overal stond
//     "(volgt)". Rekenkern overgenomen uit Kastscan, waar hij is gebouwd en met
//     tests vastgelegd; hier draait hij nu door de extract-logica-suite mee.
//   • `p.chk` wordt berekend in plaats van met de hand ingevuld, en de uitkomst
//     staat onder de load balancing-kaart — anders rekent de app iets uit dat
//     alleen in de QR belandt.
//   • Mét gezamenlijke sturing vervalt de korting: load balancing is een
//     software-instelling en geen veiligheidsmaatregel, dus de installatie moet
//     ook bij falende sturing kloppen.
//
// 2026-08-29-A (R1 — design fase 2, design-spec §4). In één release gebundeld:
//   • Versienummer als constante APP_VERSIE + zichtbaar in de kop van het
//     beginscherm. De kopregel stond twee releases achter (2026-08-16-A terwijl
//     08-27-A en 08-27-B al live waren) — vandaar één bron van waarheid.
//   • Meetwaarden overal op 20px/700 met tabular-nums en de eenheid als token,
//     in alle zes disciplines. NIET op de 32px uit de spec: met zes Z-waarden
//     naast elkaar zou dat de flow-regel breken.
//   • Normvlak per meetblok (StatusVlak): uitspraak in woorden + de grenswaarde,
//     zodat je bij afkeur niet terug hoeft te scrollen naar de instructie.
//   • Stapteller "Stap i van n" + voortgangsbalk, centraal boven het scherm.
//     Vervangt 15 hardgecodeerde stapnummers die fout waren zodra een scherm
//     door meerdere disciplines wordt gebruikt (paspoortstap zei "Stap 8",
//     is in de groepenkastflow stap 10). Schermtitels 15 → 20px.
//   • Startscherm: projectrij op S.rij, disciplinetegels met kleurvlak.
//   • Knophiërarchie: één gele knop per scherm, elf handgemaakte grijze knoppen
//     vervangen door het token S.btnGhost.
//   • Projectnummer bevat nu de toevoeging (2691JJ-72a i.p.v. 2691JJ-72), en de
//     paspoort-import zet projectId — die liet het rapport "—" afdrukken.
//   • Klantstap: toevoegingsveld leesbaar, bevestigingsregel toont het gevonden
//     adres vóluit.
// 2026-08-01-A: ISO per groep naar aarde altijd ≥0,23 MΩ (ook 3-fase; 0,40 gold
//               t.o.v. 400V fase-fase, niet voor metingen naar aarde). Labels,
//               help-tekst, rapport, cross-check en AI-prompt meegewijzigd.
// Aanpassingen 29-7-2026 (veldtest-feedback, in één release gebundeld):
// 1. STAP 7 label: achter de schuine streep aangepast naar "Hoogst afgaande groep
//    (klasse 2)" (was "Hoofdzekering afgaande groep (klasse 2) — hoogst afgaande
//    groep"). Deel vóór de streep ("Voorzekering (klasse 1)") ongewijzigd.
// 2. STAP 7 aardlekschakelaar-keuze + enkel Z L-PE-veld: het dubbele Z L-PE-veld
//    (grid-meting + los "achter aardlek"-vak) is samengevoegd tot ÉÉN Z L-PE-veld.
//    Nieuwe keuzeknop "Aardlekschakelaar aanwezig" bepaalt nu de toetsing:
//      • aangevinkt  → Z L-PE OK bij ≤166Ω (aanraakspanningsnorm, RCD schakelt af)
//      • uitgevinkt  → foutstroom-norm (Z_max obv automaatkarakteristiek) geldt
//    Van toepassing op Z L-PE én de 3-fase varianten Z L2-PE / Z L3-PE. De L-N-
//    metingen blijven altijd tegen Z_max (automaat) getoetst.
// 3. STAP 7 spanningsmeting: L1/PE toegevoegd; bij 3-fase ook L2/PE en L3/PE.
// 4. STAP 8 veldmeting: Z L-PE krijgt nu óók het "achter aardlek"-systeem — per
//    groep een keuzeknop aardlekschakelaar (default afgeleid uit RCD-type), met
//    ≤166Ω bij RCD en Z_max-norm zonder RCD, net als in sectie A.
// 5. STAP 7 isolatieweerstand: de vaste ISO-invoer per aardlekschakelaar is
//    vervangen door een dynamische lijst "per groep" — met de knop "+ Extra groep"
//    voeg je een tweede/derde groep enz. toe. 1-fase (≥0,23 MΩ) en 3-fase
//    per groep instelbaar. Rapport + cross-check + AI-prompt bijgewerkt.
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { trackEvent } from "./analytics";

// Versie van de app — ENIGE bron van waarheid. De kopregel bovenaan dit bestand
// verwijst hiernaar; werk bij een release deze constante bij, niet de kopregel.
// Formaat vJJJJ-MM-DD-<letter>, letter loopt op binnen één dag. Wordt getoond in
// de kop van het beginscherm, zodat een veldtester bij een melding meteen kan
// zeggen welke versie hij in handen heeft.
const APP_VERSIE = "2026-09-11-A";

// 2026-08-06 (MKP blok 1): Open Meterkastpaspoort — spec v0.1 (meterkastpaspoort.nl).
//   Nieuw: paspoort-stap in groepenkast-flow (hoofdaansluiting, kam 10/16mm²,
//   bouwjaar, EAN met GS1-check + eancodeboek.nl-knop, load balancing incl.
//   dubbele-balancer-waarschuwing, groepenlijst, logboek), QR-generatie
//   (JSON→deflate-raw→base64url in URL-fragment), uitknipbare stickerpagina in
//   rapport-PDF, inlezen gescand paspoort via #fragment bij app-start,
//   norm-editie- en scope-voetnoot in conformverklaring (NORM_EDITIE_VOETNOOT).
//   Vereist dependency "qrcode" in package.json.

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
  borderStrong:"#3E4459",                    // rand van invoervelden en ghost-knoppen
  yellow:"#F5C518", yellowDim:"#2A240A",
  yellowPress:"#D9AE0F",                     // :active van de primaire knop
  green:"#27AE60",  greenDim:"#0C2418",
  orange:"#F59E0B", orangeDim:"#2A1E08",
  red:"#FF5A52",    redDim:"#2A0C0C",        // was #E53935 — haalde AA niet (design-spec §6)
  blue:"#2196F3",   blueDim:"#0A1A2A",
  purple:"#9B59B6", purpleDim:"#1E0A2A",
  text:"#ECEEF5",
  textSoft:"#C2C8D8",                        // tweede regel in een kaart
  muted:"#9BA3B8",                           // was #636880 — 2,82:1, onder AA (design-spec §6)
  tap:52, radius:14, radiusSm:10,            // maten als token
};
const S = {
  app:    { background:K.bg, minHeight:"100vh", maxWidth:430, margin:"0 auto", fontFamily:"'IBM Plex Sans',sans-serif", color:K.text },
  hdr:    { padding:"12px 18px 12px", display:"flex", alignItems:"center", gap:12, background:K.surface, borderBottom:`1px solid ${K.border}`, position:"sticky", top:0, zIndex:20 },
  body:   { padding:"18px 18px 100px" },
  card:   { background:K.card, borderRadius:K.radius, padding:16, border:`1px solid ${K.border}`, marginBottom:12 },

  btn:    { width:"100%", minHeight:56, boxSizing:"border-box", padding:"0 18px", borderRadius:12, border:"none", cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", fontWeight:700, fontSize:17, lineHeight:1.2, marginBottom:10, display:"flex", alignItems:"center", justifyContent:"center", gap:8, WebkitTapHighlightColor:"transparent" },
  btnGhost:{ width:"100%", minHeight:K.tap, boxSizing:"border-box", padding:"0 18px", borderRadius:12, border:`1px solid ${K.borderStrong}`, background:K.surface, color:K.text, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", fontWeight:600, fontSize:17, lineHeight:1.2, marginBottom:10, display:"flex", alignItems:"center", justifyContent:"center", gap:8 },

  input:  { width:"100%", minHeight:K.tap, boxSizing:"border-box", padding:"0 14px", borderRadius:K.radiusSm, border:`1px solid ${K.borderStrong}`, background:K.surface, color:K.text, fontFamily:"'IBM Plex Sans',sans-serif", fontSize:16, fontWeight:500 },
  inputMeting:{ width:"100%", minHeight:64, boxSizing:"border-box", padding:"0 14px", borderRadius:K.radiusSm, border:`1px solid ${K.borderStrong}`, background:K.surface, color:K.text, fontFamily:"'IBM Plex Sans',sans-serif", fontSize:32, fontWeight:700, letterSpacing:"-0.01em", fontVariantNumeric:"tabular-nums" },
  eenheid:{ fontSize:17, fontWeight:600, color:K.muted, marginLeft:10, whiteSpace:"nowrap" },
  select: { width:"100%", minHeight:K.tap, boxSizing:"border-box", padding:"0 14px", borderRadius:K.radiusSm, border:`1px solid ${K.borderStrong}`, background:K.surface, color:K.text, fontFamily:"'IBM Plex Sans',sans-serif", fontSize:16, fontWeight:500, appearance:"none" },

  label:  { fontSize:12, color:"#C2C8D8", fontWeight:700, letterSpacing:0.6, textTransform:"uppercase", marginBottom:6, display:"block" },
  sTitle: { fontSize:12, color:K.muted, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", marginBottom:10 },
  hint:   { fontSize:14, lineHeight:1.45, color:K.muted, margin:0 },

  backBtn:{ width:48, height:48, flex:"0 0 48px", borderRadius:12, border:`1px solid ${K.border}`, background:"transparent", color:K.text, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, WebkitTapHighlightColor:"transparent" },
  tag:    { display:"inline-flex", alignItems:"center", gap:5, minHeight:30, padding:"0 11px", borderRadius:20, fontSize:13, fontWeight:700, lineHeight:1, border:"1px solid transparent" },

  rij:    { minHeight:56, background:K.card, border:`1px solid ${K.border}`, borderRadius:12, padding:"0 14px", display:"flex", alignItems:"center", gap:12, fontSize:16, color:K.text, marginBottom:10 },
  bar:    { height:4, borderRadius:999, background:K.border, overflow:"hidden" },
  barFill:{ height:4, background:K.yellow },
};

// ─── DISCIPLINE DEFINITIES ────────────────────────────────────────────────────
const DISCIPLINES = [
  { id:"groepenkast", label:"Groepenkast",    icon:"⚡", sub:"Plaatsen of vervangen",     color:K.yellow,  colorDim:K.yellowDim, norm:"NEN1010",     available:true  },
  { id:"pv",          label:"Zonnepanelen",   icon:"☀️", sub:"PV installatie",            color:"#F97316", colorDim:"#2A1000",   norm:"NEN1010:712", available:true  },
  { id:"cv",          label:"Combiketel",     icon:"🔥", sub:"Plaatsen of vervangen",     color:"#EF4444", colorDim:"#2A0808",   norm:"BRL6000-25",  available:true  },
  { id:"wp",          label:"Warmtepomp",     icon:"🌡️", sub:"Lucht/water · split-airco · bodem", color:"#06B6D4", colorDim:"#042020",   norm:"BRL100 / 6000-21",  available:true  },
  { id:"laadpaal",    label:"Laadpaal",       icon:"🔌", sub:"EV-laadvoorziening",        color:"#22C55E", colorDim:"#06200D",   norm:"NEN1010:2020", available:true },
  { id:"batterij",    label:"Thuisbatterij",  icon:"🔋", sub:"Energieopslag",             color:"#8B5CF6", colorDim:"#1A0A30",   norm:"NEN1010:2020", available:true },
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

// ── gG-smeltzekering (trage patroon, D-patronen) — tijd-stroomkromme tabel ──
// In tegenstelling tot B/C/D-automaten (vaste factor × In) heeft een gG-zekering
// een niet-lineaire tijd-stroomkromme: de vereiste uitschakelstroom (Ia) per
// stroomwaarde moet per In en per tijdsduur worden opgezocht, niet berekend met
// een simpele factor. Bron: door Martin aangeleverde tabel "D-patronen Traag gG".
// Kolommen komen exact overeen met de vier afschakeltijden die de app al
// gebruikt (kastklasse × stelsel: Klasse1 TN=5s/TT=1s, Klasse2 TN=0,4s/TT=0,2s).
const GG_TABEL = {
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
const GG_IN_WAARDEN = Object.keys(GG_TABEL).map(Number).sort((a,b)=>a-b);

// Zoekt de dichtstbijzijnde In-waarde in de tabel (niet elke stroomwaarde is
// een standaard gG-maat) en geeft de vereiste Ia terug voor de gevraagde tijd.
function ggIaVoorTijd(ampere, tijd) {
  const amp = toNum(ampere);
  if (isNaN(amp) || amp <= 0) return null;
  const dichtstbij = GG_IN_WAARDEN.reduce((best,cur) =>
    Math.abs(cur-amp) < Math.abs(best-amp) ? cur : best
  , GG_IN_WAARDEN[0]);
  const rij = GG_TABEL[dichtstbij];
  if (!rij || rij[tijd] === undefined) return null;
  return { ia: rij[tijd], inGebruikt: dichtstbij };
}

// ─── MKP: OPEN METERKASTPASPOORT (spec v0.1 — meterkastpaspoort.nl) ──────────
// Het paspoort is een JSON-object conform de open specificatie, gecomprimeerd
// (deflate-raw) en base64url-gecodeerd in het URL-fragment achter /p#.
// Fragmenten gaan nooit naar een server: privacy door architectuur.
const MKP_BASIS = "https://meterkastpaspoort.nl/p#";
const MKP_SPEC_VERSIE = 1;

// Norm-editie: één plek. NEN 1010:2020 is nog niet aangewezen in de
// Omgevingsregeling (daar staat 2015); toepassing van een nieuwere editie is
// toegestaan. Zodra de aanwijzing rond is: alleen deze voetnoot aanpassen.
const NORM_EDITIE_VOETNOOT = "Getoetst aan NEN 1010:2020. In de Omgevingsregeling is momenteel NEN 1010:2015 aangewezen; toepassing van een nieuwere editie is toegestaan — het veiligheidsniveau ligt daarmee ten minste op het wettelijk aangewezen niveau.";
const SCOPE_VOETNOOT = "De uitgevoerde werkzaamheden zijn getoetst aan de actuele editie van NEN 1010. De bestaande installatie is beoordeeld op veiligheid en op samenhang met de uitgevoerde werkzaamheden; voor het overige geldt het rechtens verkregen niveau (de normeditie ten tijde van aanleg).";

// EAN-18 validatie: 18 cijfers, NL begint met 87, laatste cijfer = GS1
// modulo-10-controlecijfer (afwisselend ×3/×1 vanaf rechts, aanvullen tot tiental).
// Let op: dit is dus géén elfproef (die was van oude bankrekeningnummers).
const eanValide = (ean) => {
  const s = String(ean||"").replace(/\s/g,"");
  if (!/^\d{18}$/.test(s)) return false;
  if (!s.startsWith("87")) return false;
  let som = 0;
  for (let i = 0; i < 17; i++) {
    const cijfer = s.charCodeAt(16 - i) - 48;      // van rechts naar links, excl. controlecijfer
    som += cijfer * (i % 2 === 0 ? 3 : 1);
  }
  const controle = (10 - (som % 10)) % 10;
  return controle === (s.charCodeAt(17) - 48);
};

// bytes ⇄ base64url
const _b64urlEnc = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const _b64urlDec = (s) => {
  const b64 = s.replace(/-/g,"+").replace(/_/g,"/") + "===".slice((s.length + 3) % 4);
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
};

// JSON → deflate-raw → base64url (CompressionStream: standaard browser-API,
// iOS 16.4+/Chrome 103+ — ruim gedekt op monteurstelefoons).
async function mkpEncode(obj) {
  const bron = new TextEncoder().encode(JSON.stringify(obj));
  const cs = new CompressionStream("deflate-raw");
  const gecomprimeerd = new Uint8Array(await new Response(
    new Blob([bron]).stream().pipeThrough(cs)
  ).arrayBuffer());
  return _b64urlEnc(gecomprimeerd);
}

async function mkpDecode(frag) {
  const bytes = _b64urlDec(String(frag||"").trim());
  const ds = new DecompressionStream("deflate-raw");
  const json = await new Response(
    new Blob([bytes]).stream().pipeThrough(ds)
  ).text();
  const obj = JSON.parse(json);
  if (!obj || typeof obj.v !== "number") throw new Error("geen geldig meterkastpaspoort");
  return obj;
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
const GROTE_VERBRUIKERS_MKP = ["lp", "wp", "kook", "bat"];
const GELIJKTIJDIGHEID = 0.6;

// Terugval als het vermogen niet is ingevuld. Alleen voor de vier grote
// verbruikers: bij een lichtgroep zou een aangenomen waarde de uitkomst sturen
// zonder dat iemand het ziet, en die groepen tellen hier toch al licht.
const GROOT_STANDAARD_KW = { lp: 7.4, wp: 6.9, kook: 7.4, bat: 5.0 };

function isGroteVerbruikerMkp(t) {
  return GROTE_VERBRUIKERS_MKP.includes(String(t || "").trim().toLowerCase());
}

// Het vermogen van één paspoortgroep in kW, of NaN als het onbekend is.
function groepVermogenKw(g) {
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
const RESERVE_KW = 1.0;

function periodeLabel(van, tot) {
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

function basisbelastingKw(groepen, lbAan, meting) {
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
  const afnemers = lijst.filter((g) => (g && g.rol) !== "voed");
  let groot = 0, gewoon = 0, bekend = 0;
  for (const g of afnemers) {
    const kw = groepVermogenKw(g);
    if (isNaN(kw) || kw <= 0) continue;
    bekend += 1;
    if (isGroteVerbruikerMkp(g.t)) groot += kw; else gewoon += kw;
  }
  if (!bekend) return null;

  // Mét gezamenlijke sturing vervalt de korting. Load balancing is een
  // software-instelling en geen veiligheidsmaatregel — de installatie moet ook
  // bij falende sturing kloppen, en dan is vol vermogen de veilige kant.
  const factor = lbAan === true ? 1 : GELIJKTIJDIGHEID;
  return { kw: gewoon + groot * factor, bron: "geschat", label: "indicatie o.b.v. schatting" };
}

// De uitkomst voor `p.chk`. Woorden en vorm volgen wat deze app zelf uitleest
// in chkKleur: "groen", "oranje" of "rood".
//
// `meting` is optioneel en verandert de vorm van de uitkomst NIET: p.chk gaat
// rechtstreeks het meterkastpaspoort in, en dat is een open standaard. Een veld
// toevoegen is een spec-wijziging (v0.2) en geen bijvangst van deze functie.
// Wie de herkomst wil tonen, roept basisbelastingKw apart aan.
function belastingcheck(grp, ha, lbAan, datum, meting) {
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

  const belasting = basis.kw;
  const capaciteit = (fasen * ampere * 230) / 1000;
  const bezet = capaciteit > 0 ? belasting / capaciteit : 0;

  const r = bezet > 1 ? "rood" : bezet > 0.7 ? "oranje" : "groen";
  return { r, d: String(datum || "") };
}

// Bouwt het paspoort-object uit de app-data conform spec v0.1.
// Onbekende/lege velden worden weggelaten om de QR compact te houden.
function mkpBouw(data, discipline) {
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

// Korte leesbare samenvatting van een (gescand) paspoort voor de UI.
function mkpSamenvatting(p) {
  const delen = [];
  if (p.pc || p.nr) delen.push(`${p.pc||""} ${p.nr||""}`.trim());
  if (p.ha) delen.push(`${p.ha.f||"?"}×${p.ha.a||"?"}A`);
  if (p.kam) delen.push(`kam ${p.kam.a||"?"}A`);
  if (p.bj) delen.push(`aanleg ${p.bj}`);
  if (p.log?.[0]) delen.push(`laatst: ${p.log[0].b} (${p.log[0].d})`);
  return delen.join(" · ") || "meterkastpaspoort";
}

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
// Norm bestaande installatie (1000Ω/V), gemeten NAAR AARDE: altijd ≥0,23 MΩ.
// Elke fase staat t.o.v. aarde op 230V (ook bij 3-fase); de 0,40 MΩ hoort bij
// 400V fase-tegen-fase, wat we hier niet meten.
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
    if (ratio > 1.35) warnings.push({ level:"orange", msg:`DC/AC ratio ${ratio.toFixed(2).replace(".",",")} is hoog (>1,35) — controleer omvormer specificaties` });
    if (ratio < 0.8)  warnings.push({ level:"orange", msg:`DC/AC ratio ${ratio.toFixed(2).replace(".",",")} is laag (<0,8) — omvormer mogelijk te groot` });
  }
  // Aarding check
  if (instMet.aardingOk === "NOK")
    warnings.push({ level:"red", msg:`Aarding draagconstructie NOK — installatie niet in bedrijf stellen` });
  return warnings;
}

// ─── GEDEELDE HELPERS ─────────────────────────────────────────────────────────
const Pill = ({ active, onClick, children, small }) => (
  <button onClick={onClick} style={{
    minHeight: small ? 40 : 48, padding: small ? "0 12px" : "0 16px", borderRadius:20,
    border:`1px solid ${active ? K.yellow : K.border}`,
    background: active ? K.yellowDim : "transparent",
    color: active ? K.yellow : K.muted,
    fontFamily:"'IBM Plex Sans',sans-serif", fontWeight:600,
    fontSize: small ? 14 : 15, cursor:"pointer", whiteSpace:"nowrap",
    display:"inline-flex", alignItems:"center", WebkitTapHighlightColor:"transparent",
  }}>{children}</button>
);

const StatusTag = ({ level }) => {
  const cfg = {
    ok:     { bg:K.greenDim,  color:K.green,  line:"rgba(39,174,96,0.45)",  label:"✓ OK" },
    orange: { bg:K.orangeDim, color:K.orange, line:"rgba(245,158,11,0.45)", label:"⚠ Let op" },
    red:    { bg:K.redDim,    color:K.red,    line:"rgba(255,90,82,0.50)",  label:"✗ Afwijking" },
  };
  const c = cfg[level] || cfg.ok;
  return <span style={{ ...S.tag, background:c.bg, color:c.color, borderColor:c.line }}>{c.label}</span>;
};

// Vat een meetblok samen tot één oordeel: hoeveel waarden zijn ingevuld en
// toetsbaar, en hoeveel daarvan wijken af. Geeft null zolang er niets
// toetsbaars staat — dan hoort er ook geen normvlak te verschijnen.
const blokOordeel = (metingen) => {
  const getoetst = metingen.filter(m =>
    m.waarde !== undefined && m.waarde !== null && String(m.waarde).trim() !== "" && m.toetsbaar !== false);
  if (!getoetst.length) return null;
  const fout = getoetst.filter(m => !m.ok).length;
  return { level: fout ? "fail" : "ok", fout, totaal: getoetst.length };
};

// Standaardteksten voor het normvlak, zodat elk meetblok dezelfde formulering
// gebruikt. Bij afkeur noemen we hoeveel waarden afwijken — met zes velden in
// een blok is "er wijkt iets af" te vaag om op te handelen.
const normTitel = (o, onderwerp, werkwoord = "voldoet") => o.level === "ok"
  ? `${onderwerp} ${werkwoord} aan NEN 1010`
  : o.totaal === 1
    ? "Waarde wijkt af — vastleggen in rapport"
    : `${o.fout} van ${o.totaal} waarden ${o.fout === 1 ? "wijkt" : "wijken"} af — vastleggen in rapport`;

// Statusvlak (design-spec §4) — de grote broer van StatusTag: een vlak met een
// teken, een uitspraak in woorden en een tweede regel voor de onderbouwing.
// StatusTag zegt dát iets afwijkt, dit vlak zegt wat en waarom, zonder dat je
// terug hoeft te scrollen naar de instructietekst.
// Kleur én teken én rand, zodat de melding ook zonder kleurwaarneming leest.
const StatusVlak = ({ level="ok", titel, sub, style }) => {
  const cfg = {
    ok:   { bg:K.greenDim,  kleur:K.green,  line:"rgba(39,174,96,0.45)",  teken:"✓" },
    warn: { bg:K.orangeDim, kleur:K.orange, line:"rgba(245,158,11,0.45)", teken:"⚠" },
    fail: { bg:K.redDim,    kleur:K.red,    line:"rgba(255,90,82,0.50)",  teken:"✗" },
  };
  const c = cfg[level] || cfg.ok;
  return (
    <div style={{ minHeight:52, borderRadius:K.radiusSm, padding:"12px 14px", display:"flex",
      alignItems:"center", gap:12, background:c.bg, border:`1px solid ${c.line}`, ...style }}>
      <span style={{ width:26, height:26, borderRadius:7, flexShrink:0, background:c.kleur, color:"#fff",
        fontSize:15, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{c.teken}</span>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:15, fontWeight:600, color:c.kleur, lineHeight:1.3 }}>{titel}</div>
        {sub && <div style={{ ...S.hint, color:K.textSoft, fontSize:13, marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
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
    tekst: "De isolatieweerstand test of de bedrading nog goed geïsoleerd is tussen de aders onderling en naar aarde. Een lage waarde wijst op vochtdoordringing, beschadigde kabelisolatie of een defect apparaat. Meet bij voorkeur met alle apparatuur losgekoppeld en verlichting uit (anders meet je mee door aangesloten apparatuur, wat de waarde kunstmatig verlaagt). Norm bestaande installatie: ≥0,23 MΩ, gemeten naar aarde op 250V — ook bij 3-fase, omdat elke fase t.o.v. aarde op 230V staat (de 0,40 MΩ-norm geldt alleen fase-tegen-fase, wat hier niet wordt gemeten). Voor de totale installatie (vanaf de hoofdschakelaar) geldt een strengere norm van ≥1 MΩ.",
  },
  stelsel_tn_tt: {
    titel: "TN vs. TT-stelsel",
    tekst: "Het verschil zit in hoe de installatie beveiligd is tegen een fout naar aarde. Bij een TN-stelsel (TN-C-S of TN-S, in Nederland het meest voorkomend) loopt de retourstroom bij een fout via een vaste PE-verbinding terug naar de bron — de automaat/zekering lost dan snel op door de hoge kortsluitstroom. Bij een TT-stelsel is er geen vaste PE-verbinding naar de bron; de RCD is daar de praktische hoofdbeveiliging omdat de lus-impedantie via aarde vaak te hoog is om alleen op de automaat te vertrouwen. Dat betekent niet dat de Z_max-toetsing bij TT irrelevant is — die geldt voor elk stelsel, ongeacht of er een RCD achter zit.",
  },
  aardlekgroep: {
    titel: "Aardlekgroep & zwaarst belaste eindgroep",
    tekst: "Een aardlekgroep is een cluster van eindgroepen die allemaal door dezelfde aardlekschakelaar (RCD) worden beveiligd. Binnen zo'n cluster meet je de RCD-test (ΔT/ΔI) niet op elke eindgroep apart — je meet op de zwaarst belaste eindgroep van dát cluster (bijvoorbeeld de 32A-groep in plaats van een 16A-lichtgroep). Let op: dit is een ander begrip dan de 'hoogst afgaande groep van de installatie' die in stap 7 wordt gebruikt voor de Z-toetsing — die gaat over de hele installatie, niet over één aardlekgroep-cluster.",
  },
  fasekeuze: {
    titel: "Op welke fase zit deze aardlekgroep?",
    tekst: "Dit is iets anders dan het aantal fasen hierboven. Dat zegt hoeveel fasen een groep gebruikt (1 of 3); dit veld zegt wélke fase dat is: L1, L2 of L3 — dezelfde notatie als de Kastscan en het groepenoverzicht gebruiken. Een slimme meter saldeert over drie fasen, maar de hoofdzekering doet dat niet — fasecompensatie is boekhouding, stroom is fysiek. Drie groepen die toevallig allemaal op L2 zitten kunnen die fase overbelasten terwijl de meter netjes binnen de grenzen lijkt te blijven. Met dit veld kan de app bij een uitbreiding zeggen welke fase nog ruimte heeft, én welke groep in aanmerking komt om te verhangen als de verdeling scheef staat. Weet je het niet zeker, laat het dan leeg: een gok is hier schadelijker dan een leeg veld, want het advies bouwt erop voort. Meten kan ook — schakel de aardlek kort uit en kijk welke fase inzakt.",
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

// Korte instelhulp per testermerk — helpt vooral onervaren installateurs snel de
// juiste meetfunctie te vinden. Matcht op merknaam in de vrije-tekst "apparTester"-
// invoer (hoofdletterongevoelig). Volgorde: Metrel, Fluke, Benning, Kyoritsu, Megger.
// Let op: exacte menubewoording kan per model/firmwareversie verschillen — dit is een
// algemene wegwijzer, geen vervanging van de handleiding van het specifieke toestel.
const TESTERHULP = {
  metrel: {
    merk: "Metrel",
    titel: "Metrel-installatietester instellen",
    tekst: "Metrel-testers (bijv. MI3105, MI3125, MI3102 BT) werken met een draaiknop voor de hoofdfunctie, gevolgd door een submenu op het scherm.\n\n• ISO-meting (250V): draaiknop naar 'Insulation' / 'RISO', testspanning instellen op 250V via de functietoets, daarna START.\n• RCD-test type A/AC/B: draaiknop naar 'RCD', kies eerst het type (AC/A/B/F) in het submenu vóórdat je meet — dit bepaalt de golfvorm van de teststroom.\n• Lus-impedantie Z L-N/L-PE: draaiknop naar 'Loop' of 'Zloop', kies 'No trip' (RCD-vriendelijke meting) als er een RCD in het circuit zit, anders schakelt de RCD tijdens de meting uit.",
  },
  fluke: {
    merk: "Fluke",
    titel: "Fluke-installatietester instellen",
    tekst: "Fluke-testers (bijv. 1664 FC, 1654B, 1653B) navigeer je met de centrale draaischijf plus functietoetsen (F1-F4) onder het scherm.\n\n• ISO-meting (250V): draaischijf naar het isolatie-symbool (Ω met pijl), testspanning wisselen met de functietoets tot 250V verschijnt.\n• RCD-test type A/AC/B: draaischijf naar het RCD-symbool, het type wordt met een functietoets gewisseld (staat rechtsonder in beeld) — controleer dat dit overeenkomt met het type dat op de RCD zelf staat.\n• Lus-impedantie Z L-N/L-PE: draaischijf naar 'Z LOOP', bij een geïnstalleerde RCD de 'i' (RCD-safe / non-trip) variant kiezen zodat de RCD niet ongewenst afslaat tijdens de meting.",
  },
  benning: {
    merk: "Benning",
    titel: "Benning-installatietester instellen",
    tekst: "Benning-testers (bijv. IT 130, IT 100, IT 120) hebben een draaischakelaar met duidelijke pictogrammen per functie, plus een paar pijltjestoetsen voor submenu's.\n\n• ISO-meting (250V): draaischakelaar naar het ISO-symbool, met de pijltjestoetsen de testspanning naar 250V bladeren.\n• RCD-test type A/AC/B: draaischakelaar naar RCD-symbool, type selecteren in het submenu (AC/A/B) vóór de meting — dit staat vaak als eerste keuze in beeld na het draaien.\n• Lus-impedantie Z L-N/L-PE: draaischakelaar naar 'Loop' of 'ZL-PE', bij RCD-beveiligde groepen de laagstroom-variant (vaak aangeduid met een RCD-symbooltje erbij) gebruiken om ongewenst afschakelen te voorkomen.",
  },
  kyoritsu: {
    merk: "Kyoritsu",
    titel: "Kyoritsu-installatietester instellen",
    tekst: "Kyoritsu-testers (bijv. KEW 6016, 6011, 6516BT) hebben een draaiknop met genummerde functies en een 'SELECT'-toets voor submenu's.\n\n• ISO-meting (250V): draaiknop naar 'INSULATION', met SELECT de spanning naar 250V bladeren.\n• RCD-test type A/AC/B: draaiknop naar 'RCD', met SELECT het type (AC/A/B) instellen vóór de meting.\n• Lus-impedantie Z L-N/L-PE: draaiknop naar 'LOOP', bij een RCD-beveiligde groep de 'non-trip'-stand (vaak los aangegeven op de knop of in het submenu) kiezen zodat de RCD niet afslaat tijdens de meting.",
  },
  megger: {
    merk: "Megger",
    titel: "Megger-installatietester instellen",
    tekst: "Megger-testers (bijv. MFT1741, MFT1835) hebben een draaiknop met hoofdfuncties en een display met softkeys (F1-F4) eronder voor submenu's.\n\n• ISO-meting (250V): draaiknop naar 'Insulation' / 'RISO', met de softkeys de testspanning naar 250V bladeren, daarna TEST ingedrukt houden.\n• RCD-test type A/AC/B: draaiknop naar 'RCD', het type wordt met een softkey gewisseld (staat onderin het scherm aangegeven) — controleer dat dit overeenkomt met het type op de RCD zelf.\n• Lus-impedantie Z L-N/L-PE: draaiknop naar 'Loop' of 'Zs/Loop', bij een RCD-beveiligde groep de 'no-trip' variant kiezen zodat de RCD niet ongewenst afslaat tijdens de meting.",
  },
};

// Matcht de vrije-tekst tester-invoer tegen bekende merken (case-insensitive).
// Geeft null terug als er geen match is — dan verschijnt er simpelweg geen icoontje.
function vindTesterHulp(apparTesterTekst) {
  if (!apparTesterTekst) return null;
  const tekst = apparTesterTekst.toLowerCase();
  return Object.values(TESTERHULP).find(t => tekst.includes(t.merk.toLowerCase())) || null;
}

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

// Zelfde patroon als LeerIcoon, maar dan voor tester-instelhulp: neemt het volledige
// info-object direct als prop (i.p.v. een lookup-key) omdat het merk pas bekend is
// nadat vindTesterHulp() de vrije tekst heeft gematcht. whiteSpace:pre-line zorgt
// dat de regeleinden/opsomming in de tekst zichtbaar blijven.
const TesterIcoon = ({ info }) => {
  const [open, setOpen] = useState(false);
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
            <div style={{fontSize:13, color:K.text, lineHeight:1.6, whiteSpace:"pre-line"}}>{info.tekst}</div>
            <div style={{fontSize:10, color:K.muted, marginTop:10, fontStyle:"italic"}}>Exacte menubewoording kan per model/firmwareversie verschillen — check bij twijfel de handleiding van je toestel.</div>
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

// MiniInput draagt vrijwel elke meetwaarde in de app. De waarde stond op 13px —
// even groot als het label ernaast — in een vak dat sinds de design-fundamentlaag
// 52px hoog is: een klein cijfer in veel lege ruimte. Nu 20px/700 met
// tabular-nums, zodat je in één blik terugleest wat je hebt ingetikt en cijfers
// in een kolom onder elkaar uitlijnen (een afwijkende waarde valt dan op).
//
// Bewust NIET S.inputMeting (32px, volle breedte) zoals design-spec §4 voorstelt:
// deze velden staan met zes tegelijk naast elkaar in flexWrap-rijen — Z L-N t/m
// Z L3-PE — en op volle breedte wordt één meetscherm een scrollmarathon. Dat
// botst met de flow-regel. 20px is de grootste maat die de rasters heel laat.
const MiniInput = ({ value, onChange, placeholder, unit, width=96 }) => (
  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
    <input style={{ ...S.input, width, padding:"0 10px", fontSize:20, fontWeight:700,
                    letterSpacing:"-0.01em", fontVariantNumeric:"tabular-nums" }}
      value={value||""} onChange={e=>onChange(e.target.value)}
      onFocus={e=>e.target.select()}
      inputMode="decimal"
      placeholder={placeholder||"—"}/>
    {/* S.eenheid op 15px i.p.v. 17: dat token is bedoeld naast een meetveld van
        32px, hier staat het naast 20px en moet de rij compact blijven. */}
    {unit && <span style={{ ...S.eenheid, fontSize:15, marginLeft:0 }}>{unit}</span>}
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
function AIAnalyseBox({ aiData, discipline, analyse, onAnalyse }) {
  const [status, setStatus] = useState(analyse ? "done" : "idle");
  const [errMsg, setErrMsg] = useState("");

  const analyseer = async () => {
    setStatus("busy");
    setErrMsg("");
    try {
      const resp = await fetch("/api/rapport", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ discipline, data: aiData })
      });
      const json = await resp.json();
      if (json.error) throw new Error(json.error);
      const aiTekst = json.tekst || json.html || "";
      if (!aiTekst) throw new Error("Geen antwoord ontvangen van de AI");
      onAnalyse(aiTekst);
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
          <button style={{...S.btnGhost,marginBottom:0}} onClick={analyseer}>Opnieuw proberen</button>
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

// Projectnummer = postcode-huisnummer, inclusief de toevoeging en zonder
// scheidingsteken ertussen: 2691 JJ + 72 + a wordt 2691JJ-72a. De toevoeging
// hoorde er altijd al bij (zo heten de opleverrapporten in de praktijk), maar
// zat niet in de opbouw — een project op nummer 72a kreeg 2691JJ-72, waardoor
// twee woningen in hetzelfde pand hetzelfde projectnummer konden krijgen.
// Staat op moduleniveau omdat zowel de klantstap als de paspoort-import hem
// nodig heeft; twee kopieën zouden vroeg of laat uit elkaar lopen.
const buildId = (pc,nr,tv) => {
  const c=(pc||"").replace(/\s/g,"").toUpperCase();
  const n=(nr||"").trim();
  const t=(tv||"").trim().replace(/\s/g,"");
  return c&&n ? `${c}-${n}${t}` : "";
};

function StapKlant({ data, onChange, onNext, onBack, discipline }) {
  const disc = DISCIPLINES.find(d => d.id === discipline);
  const [pcStatus, setPcStatus] = useState(""); // "" | "loading" | "found" | "error"

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
    onChange("projectId", buildId(v, data.huisnummer, data.toevoeging));
    if (v.replace(/\s/g,"").length === 6 && data.huisnummer) lookupPostcode(v, data.huisnummer);
  };

  const handleNr = (v) => {
    onChange("huisnummer", v);
    onChange("projectId", buildId(data.postcode, v, data.toevoeging));
    if (data.postcode?.replace(/\s/g,"").length === 6 && v) lookupPostcode(data.postcode, v);
  };

  // De toevoeging telt mee in het projectnummer, dus moet hij het nummer net zo
  // bijwerken als postcode en huisnummer dat doen. Geen postcode-lookup hier:
  // PDOK zoekt op postcode + huisnummer, de toevoeging voegt daar niets toe.
  const handleToevoeging = (v) => {
    onChange("toevoeging", v);
    onChange("projectId", buildId(data.postcode, data.huisnummer, v));
  };

  const pid = data.projectId || buildId(data.postcode, data.huisnummer, data.toevoeging);
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
          <div style={{ fontWeight:700, fontSize:20, lineHeight:1.15 }}>Nieuw project — gegevens klant</div>
          <div style={{ fontSize:12, color:K.muted }}>{disc?.label} · geen account nodig</div>
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
          {/* Verhouding 3:2 en krappere binnenmarges op de twee nummervelden.
              Met de 16px-invoer uit de design-fundamentlaag at de padding van
              S.input (2×14px) het toevoegingsveld op: van de placeholder "toev."
              bleef zichtbaar "t" over. Postcode had ruimte over, dus die staat
              hier af. Placeholder "a" i.p.v. "toev." — een toevoeging is in de
              praktijk een letter, en die past nu wél in zijn eigen vakje. */}
          <div style={{ display:"flex", gap:10, marginBottom:4 }}>
            <div style={{ flex:3 }}>
              <label style={S.label}>Postcode</label>
              <input style={{ ...S.input, textTransform:"uppercase" }} placeholder="1234 AB"
                value={data.postcode||""} onChange={e=>handlePc(e.target.value)} maxLength={7}/>
            </div>
            <div style={{ flex:2 }}>
              <label style={S.label}>Huisnr.</label>
              <div style={{display:"flex",gap:6}}>
                <input style={{...S.input,flex:3,minWidth:0,padding:"0 10px"}} placeholder="12" value={data.huisnummer||""}
                  onChange={e=>handleNr(e.target.value)}/>
                <input style={{...S.input,flex:2,minWidth:0,padding:"0 8px"}} placeholder="a" value={data.toevoeging||""}
                  onChange={e=>handleToevoeging(e.target.value)}/>
              </div>
            </div>
          </div>

          {/* Postcode status. Bij een treffer tonen we het gevonden adres vóluit
              op de volle breedte, niet alleen "Adres gevonden": dít is de regel
              waarop je controleert of de postcode het juiste pand opleverde.
              De velden Straatnaam en Plaats staan naast elkaar en kappen lange
              namen af ('s-Gravenzande, Nieuwerkerk aan den IJssel); die kun je
              niet breed genoeg maken zonder het scherm te verlengen. Deze regel
              lost dat op zonder één pixel extra hoogte. */}
          <div style={{ marginBottom:12, minHeight:20 }}>
            {pcStatus==="loading" && <div style={{ fontSize:13, color:K.muted }}>🔍 Adres opzoeken…</div>}
            {pcStatus==="found"   && (
              <div style={{ fontSize:13, color:K.green, lineHeight:1.4 }}>
                ✓ {[data.straat, [data.huisnummer,data.toevoeging].filter(Boolean).join("")].filter(Boolean).join(" ")}
                {data.plaats ? `, ${data.plaats}` : ""}
              </div>
            )}
            {pcStatus==="error"   && <div style={{ fontSize:13, color:K.orange }}>⚠ Adres niet gevonden — vul handmatig in</div>}
          </div>

          {/* Straat + plaats — automatisch ingevuld of handmatig.
              Gelijk verdeeld (was 2:1). Deze twee velden vul je zelden zelf in;
              je leest ze om te controleren of de postcode het juiste adres
              opleverde. Op 1/3 van de breedte werd 's-Gravenzande afgekapt tot
              's-Graven… — dan kun je die controle niet doen. */}
          <div style={{ display:"flex", gap:10, marginBottom:12 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <label style={S.label}>Straatnaam</label>
              <input style={{ ...S.input, color: pcStatus==="found" ? K.green : K.text }}
                placeholder="Kerkstraat" value={data.straat||""} onChange={e=>onChange("straat",e.target.value)}/>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
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
          {velden.map(({k,l,ph})=>{
            const hulp = k === "apparTester" ? vindTesterHulp(data[k]) : null;
            return (
              <div key={k} style={{ marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${K.border}` }}>
                <label style={S.label}>{l}{hulp && <TesterIcoon info={hulp}/>}</label>
                <input style={{...S.input,marginBottom:8}} placeholder={ph} value={data[k]||""} onChange={e=>onChange(k,e.target.value)}/>
                <label style={{...S.label,fontSize:10}}>Kalibratiedatum</label>
                <input style={S.input} type="date" value={data[`${k}_cal`]||""} onChange={e=>onChange(`${k}_cal`,e.target.value)}/>
              </div>
            );
          })}
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
        <div><div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Materiaal</div><div style={{fontSize:12,color:K.muted}}>Groepenkast</div></div>
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
              ? "TT-stelsel: RCD is de praktische hoofdbeveiliging, maar Z_max-toetsing geldt ook hier. ΔT-norm altijd ≤300ms (EN 61008)."
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
    { id:1, naam:"Aardlek A", rcdType:"A", rcdMa:"30", fase:"1", L:"", Lbron:"", hoogstId:null,
      eindgroepen:[ nieuweEindgroep("Licht BG"), nieuweEindgroep("Stopcontacten woonkamer") ] },
    { id:2, naam:"Aardlek B", rcdType:"A", rcdMa:"30", fase:"1", L:"", Lbron:"", hoogstId:null,
      eindgroepen:[ nieuweEindgroep("Keuken") ] },
  ]);
  const [editId,setEditId] = useState(null);

  const sync = (u) => { setAG(u); onChange("aardlekgroepen",u); };

  const addAG = () => {
    const u=[...aardlekgroepen,{ id:Date.now(), naam:`Aardlek ${String.fromCharCode(65+aardlekgroepen.length)}`, rcdType:"A", rcdMa:"30", fase:"1", L:"", Lbron:"", hoogstId:null, eindgroepen:[nieuweEindgroep()] }];
    sync(u); setEditId(u[u.length-1].id);
  };
  const updAG = (id,k,v) => sync(aardlekgroepen.map(a=>a.id===id?{...a,[k]:v}:a));
  // Meerdere velden tegelijk. Twee keer updAG achter elkaar werkt NIET: beide
  // aanroepen gaan uit van dezelfde `aardlekgroepen` uit deze render, dus de
  // tweede gooit de eerste weg.
  const updAGvelden = (id,obj) => sync(aardlekgroepen.map(a=>a.id===id?{...a,...obj}:a));
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
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Aardlekgroepen ({aardlekgroepen.length})</div><div style={{fontSize:12,color:K.muted}}>gemeten per RCD-cluster</div></div>
        <button onClick={addAG} style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${K.yellow}66`,background:K.yellowDim,color:K.yellow,fontFamily:"'IBM Plex Sans',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Aardlek</button>
      </div>
      <div style={S.body}>
        <div style={{fontSize:11,color:K.muted,marginBottom:14,lineHeight:1.5}}>
          Eén aardlekschakelaar beschermt vaak meerdere eindgroepen. De RCD-test (ΔT/ΔI) doe je 1× per aardlekgroep — op de <strong>zwaarst belaste eindgroep in dat cluster</strong>. Dit is een ander begrip dan de "hoogst afgaande groep van de installatie" die je straks in stap 7 gebruikt voor de Z-toetsing (dat gaat over de hele installatie, niet over één cluster). <LeerIcoon onderwerp="aardlekgroep"/>
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

                <label style={S.label}>Aantal fasen</label>
                <div style={{display:"flex",gap:8,marginBottom:14}}>
                  <Pill small active={ag.fase==="1"} onClick={()=>updAG(ag.id,"fase","1")}>⚡ 1-fase 230V</Pill>
                  <Pill small active={ag.fase==="3"} onClick={()=>updAG(ag.id,"fase","3")}>⚡⚡⚡ 3-fase 400V</Pill>
                </div>

                {/* LET OP het verschil tussen twee velden die allebei "fase" heten:
                    `ag.fase`  is het fasetype — het AANTAL fasen, "1" of "3".
                    `ag.L`     is de fase zelf — L1, L2 of L3, dezelfde waarden
                               als de Kastscan gebruikt.
                    Het eerste veld bestond al en is bewust niet hernoemd: het
                    zit in opgeslagen projecten op toestellen van installateurs.
                    Zonder `L` weet de app wél hoe zwaar een fase belast is, maar
                    niet wélke aardlek daarop zit — en dat is precies wat je nodig
                    hebt om te kunnen adviseren wat er verhangen moet worden. */}
                {ag.fase === "3" ? (
                  <div style={{...S.hint, marginBottom:14}}>
                    Een 3-fasegroep staat op alle drie de fasen — er valt hier niets te kiezen.
                  </div>
                ) : (
                  <>
                    <label style={S.label}>Fase<LeerIcoon onderwerp="fasekeuze"/></label>
                    <div style={{display:"flex",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                      {["L1","L2","L3"].map(l=>(
                        <Pill key={l} small active={ag.L===l}
                          onClick={()=>updAGvelden(ag.id, ag.L===l ? {L:"",Lbron:""} : {L:l,Lbron:"hand"})}>{l}</Pill>
                      ))}
                      {ag.L && <Pill small active={false} onClick={()=>updAGvelden(ag.id,{L:"",Lbron:""})}>wissen</Pill>}
                    </div>
                    <div style={{...S.hint, marginBottom:14}}>
                      {ag.L
                        ? (ag.Lbron === "meter"
                            ? "Bevestigd met meter."
                            : "Handmatig ingevuld. Weet je het niet zeker, laat het dan leeg — een gok is hier schadelijker dan een leeg veld.")
                        : "Optioneel. Nodig om te kunnen adviseren welke groep naar een andere fase kan; zonder dit veld kan de app alleen zeggen hóe zwaar een fase belast is."}
                    </div>
                  </>
                )}

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
                          if (eg.type===t.id) { updEind(ag.id,eg.id,"type",null); return; }  // nogmaals tikken = deselecteren
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
                          <input type="radio" name={`hoogst-${ag.id}`} checked={hoogstId===eg.id}
                            onClick={()=> ag.hoogstId===eg.id ? updAG(ag.id,"hoogstId",null) : updAG(ag.id,"hoogstId",eg.id)}
                            onChange={()=>{}}/>
                          zwaarst belast{ag.hoogstId===eg.id?" (tik = terug naar automatisch)":" in dit cluster"}
                        </label>
                      )}
                    </div>
                  </div>
                ))}
                <label style={{display:"flex",alignItems:"center",gap:8,marginTop:10,padding:"8px 10px",background:K.surface,borderRadius:8,cursor:"pointer"}}>
                  <input type="checkbox" checked={!!ag.veldmetingSelectie} onChange={()=>updAG(ag.id,"veldmetingSelectie",!ag.veldmetingSelectie)}/>
                  <span style={{fontSize:11,color:K.muted}}>Verste of buitengroep — meenemen in veldmeting stap 8</span>
                </label>
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
                      {ag.rcdType==="geen"?"Geen RCD":`RCD ${ag.rcdMa}mA type-${ag.rcdType}`} · {ag.fase==="3"?"3-fase 400V":(ag.L?`1-fase ${ag.L}`:"1-fase 230V")} · {ag.eindgroepen.length} eindgroep{ag.eindgroepen.length!==1?"en":""}
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
        <div><div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Foto's</div><div style={{fontSize:12,color:K.muted}}>{done}/{checkpoints.length} gemaakt</div></div>
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

  // Isolatieweerstand PER GROEP — dynamische lijst (i.p.v. vaste invoer per
  // aardlekschakelaar). Elke groep: vrije naam + FA/NA (1-fase) of L1/L2/L3/N→A
  // (3-fase). Groepen toevoegen/verwijderen via de knoppen hieronder.
  const isoGroepen = inst.isoGroepen || [];
  const setIsoGroepen = arr => si("isoGroepen", arr);
  const addIsoGroep = () => setIsoGroepen([...isoGroepen, { id:Date.now(), naam:"", driefase:false, fa:"", na:"", l1a:"", l2a:"", l3a:"" }]);
  const updIsoGroep = (id,k,v) => setIsoGroepen(isoGroepen.map(g=>g.id===id?{...g,[k]:v}:g));
  const remIsoGroep = id => setIsoGroepen(isoGroepen.filter(g=>g.id!==id));

  // ── A) IMPEDANTIE ────────────────────────────────────────────────────────
  // Z L-N en Z L-PE worden ÉÉN KEER gemeten, op de hoogst afgaande groep van
  // de gehele installatie (niet meer per aardlekgroep). De verwachte kort-
  // sluitstroom (Icc) en de maximale afschakeltijd zijn beide AFGELEIDE
  // waarden — geen losse invulvelden — op basis van: stelsel + automaat-
  // karakteristiek (B/C/D/gG) + ampèrewaarde van de hoogst afgaande groep,
  // gecombineerd met de gemeten Z-waarde zelf (Wet van Ohm: Icc = U / Z).
  const karFactor = { B:5, C:10, D:20 }; // B/C/D: vaste factor × In (NEN-EN 60898). gG heeft een eigen tabel-lookup, zie GG_TABEL.
  const hoogstKar    = inst.hoogstKar || "B";
  const hoogstAmpere = inst.hoogstAmpere || "";
  const karOnbekend  = hoogstKar!=="gG" && !karFactor[hoogstKar];

  // Maximale afschakeltijd — afgeleid uit stelsel + kastklasse (NEN1010 tabel 41.1):
  // Klasse 1 (metaal) zit doorgaans op verdeler-niveau → langere toegestane tijd
  // (TN 5s / TT 1s). Klasse 2 (kunststof) zit doorgaans op eindgroep-niveau → kortere
  // vereiste tijd (TN 0,4s / TT 0,2s). Dit is de installatienorm-afschakeltijd
  // (verschillend van de RCD-apparaatnorm ΔT ≤300ms hieronder bij C!).
  const isKlasse1 = data.kastType === "klasse1";
  const maxAfschakeltijd = isKlasse1 ? (isTT ? 1 : 5) : (isTT ? 0.2 : 0.4);

  // Icc_min en Z_max: voor B/C/D een vaste factor × In. Voor gG een tabel-lookup
  // (tijd-stroomkromme is niet-lineair) op basis van de al-berekende maxAfschakeltijd.
  const ggLookup = hoogstKar==="gG" ? ggIaVoorTijd(hoogstAmpere, maxAfschakeltijd) : null;
  const iccMin = hoogstKar==="gG"
    ? (ggLookup ? ggLookup.ia : null)
    : (!karOnbekend && toNum(hoogstAmpere)>0 ? karFactor[hoogstKar] * toNum(hoogstAmpere) : null);
  const zMaxVoorzek  = iccMin ? Math.round((230 / iccMin) * 100) / 100 : null; // afgerond op 2 decimalen bij de bron — voorkomt dat weergave (bijv. 1,65Ω) en OK/NOK-toetsing van elkaar afwijken door drijvendekomma-afronding
  // Z_max-toetsing (Wet van Ohm + automaatkarakteristiek) geldt ALTIJD, ongeacht kastklasse —
  // dit gaat over of de automaat/zekering snel genoeg afschakelt bij kortsluiting, wat niets
  // te maken heeft met het materiaal van de kast zelf. Alleen TT-stelsel en een onbekende/
  // "Anders" karakteristiek maken automatische toetsing onmogelijk.
  // Z_max-toetsing (Wet van Ohm + veelvoud nominale stroom + max. afschakeltijd) geldt
  // voor ELK stelsel, dus ook TT — ongeacht of er een aardlekschakelaar achter zit.
  // De fysica van de automaat (Icc=U/Z, karakteristiek-tijd) verandert niet door het
  // stelsel. Bij TT is de RCD vaak de praktische hoofdbeveiliging omdat de lus-
  // impedantie via aarde meestal te hoog is voor de automaat alleen, maar de toetsing
  // zelf blijft relevante informatie en is geen vrijblijvende uitzondering.
  const zOk = v => karOnbekend ? true : (zMaxVoorzek ? toNum(v) <= zMaxVoorzek : true);

  // ── Aardlekschakelaar-keuze bepaalt de Z L-PE-toetsing ────────────────────
  // Achter een aardlekschakelaar schakelt de RCD de aardfout af → dan geldt de
  // aanraakspanningsnorm Ra ≤166Ω. Zonder aardlekschakelaar moet de automaat/
  // zekering de aardfout zelf afschakelen → dan geldt de foutstroom-norm (Z_max
  // obv de automaatkarakteristiek, hetzelfde als voor Z L-N). Dit geldt voor
  // Z L-PE én de 3-fase varianten Z L2-PE / Z L3-PE. Default: aardlek aanwezig.
  const rcdAanwezig = inst.rcdAanwezig ?? true;
  const zPeMax = rcdAanwezig ? 166 : zMaxVoorzek;                    // getal of null
  const zPeToetsbaar = rcdAanwezig ? true : !!zMaxVoorzek;           // kunnen we een oordeel tonen?
  const zPeOk = v => rcdAanwezig ? toNum(v) <= 166 : zOk(v);
  const isPeKey = k => k.endsWith("pe");

  const cag = null; // niet meer gebruikt voor Z — Z wordt niet meer per aardlekgroep getoond
  const [activeAG,setActiveAG] = useState(aardlekgroepen[0]?.id||null);
  useEffect(()=>{ if (inst.stelsel!==stelsel) si("stelsel",stelsel); }, [stelsel]);
  const warnings = gkCrossChecks(aardlekgroepen, grpMeet, {...inst, stelsel, kastType:data.kastType});

  return (
    <div>
      <div style={S.hdr}><button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Meetwaarden NEN1010</div><div style={{fontSize:12,color:K.muted}}>{stelsel}-stelsel · 250V</div></div>
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
              <MiniInput value={inst.hoofdzekering} onChange={v=>si("hoofdzekering",v)} unit="A" width={96} placeholder="40"/>
            </div>
            <div>
              <label style={S.label}>Hoofdschakelaar</label>
              <input style={{...S.input,width:140}} type="text" placeholder="bijv. 40A / 4-polig"
                value={inst.hoofdschakelaar||""} onChange={e=>si("hoofdschakelaar",e.target.value)}
                onFocus={e=>e.target.select()}/>
            </div>
          </div>

          <div style={{fontSize:11,color:K.muted,marginBottom:10,lineHeight:1.5,padding:"7px 10px",background:K.surface,borderRadius:8}}>
            Vul de <strong style={{color:K.text}}>voorbeveiliging (hoogst afgaande groep)</strong> van de gehele installatie in — de verwachte kortsluitstroom en maximale afschakeltijd worden hieruit afgeleid. Meet altijd op het <strong style={{color:K.text}}>meest ongunstige punt</strong> van het circuit (het verst afgelegen of zwaarst belaste punt) — dat geeft de betrouwbaarste indicatie of de beveiliging overal in de installatie voldoet.
          </div>

          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
            <div>
              <label style={S.label}>Voorzekering (klasse 1) / Hoogst afgaande groep (klasse 2)</label>
              <MiniInput value={hoogstAmpere} onChange={v=>si("hoogstAmpere",v)} unit="A" width={88}/>
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
            Maximale afschakeltijd (afgeleid uit stelsel {stelsel} + {isKlasse1?"Klasse 1 — verdeler-niveau":"Klasse 2 — eindgroep-niveau"}): <strong style={{color:K.text}}>{String(maxAfschakeltijd).replace(".",",")}s</strong>
          </div>

          {zMaxVoorzek && (
            <div style={{fontSize:11,color:K.muted,padding:"7px 10px",background:K.surface,borderRadius:8,marginBottom:10}}>
              {hoogstKar}{hoogstAmpere}A → Icc min = {iccMin?.toFixed(1).replace(".",",")}A{hoogstKar==="gG" && ggLookup ? ` (tabel gG bij ${ggLookup.inGebruikt}A, ${String(maxAfschakeltijd).replace(".",",")}s)` : ""} → Z_max = <strong style={{color:K.text}}>{zMaxVoorzek.toFixed(2).replace(".",",")}Ω</strong>
            </div>
          )}
          {!zMaxVoorzek && (
            <div style={{fontSize:11,color:K.orange,padding:"7px 10px",background:K.orangeDim,borderRadius:8,marginBottom:10}}>
              ⚠ Vul ampère + karakteristiek van de hoogst afgaande groep hierboven in om Z_max en de automatische toetsing te berekenen.
            </div>
          )}

          <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,cursor:"pointer"}}>
            <input type="checkbox" checked={inst.zDrieFase ?? heeft3faseGroep} onChange={e=>si("zDrieFase",e.target.checked)}/>
            <span style={{fontSize:12,color:K.muted}}>3-fase — ook L2 en L3 meten</span>
          </label>

          {/* Aardlekschakelaar-keuze — bepaalt de toetsing van Z L-PE (zie helpers boven) */}
          <label style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:10,cursor:"pointer",padding:"8px 10px",background:K.surface,borderRadius:8}}>
            <input type="checkbox" checked={rcdAanwezig} onChange={e=>si("rcdAanwezig",e.target.checked)} style={{marginTop:2}}/>
            <span style={{fontSize:12,color:K.muted,lineHeight:1.5}}>
              <strong style={{color:K.text}}>Aardlekschakelaar aanwezig</strong> achter de hoogst afgaande groep. Voor <strong style={{color:K.text}}>Z L-PE</strong> geldt dan de norm <strong style={{color:K.text}}>≤166Ω</strong> (aanraakspanning). Uitgevinkt: de foutstroom-norm{zMaxVoorzek?` (Z_max ≤${zMaxVoorzek.toFixed(2).replace(".",",")}Ω)`:" (Z_max obv karakteristiek)"} geldt.
            </span>
          </label>

          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}}>
            {(["Z L-N","Z L-PE"].concat((inst.zDrieFase ?? heeft3faseGroep) ? ["Z L2-N","Z L2-PE","Z L3-N","Z L3-PE"] : [])).map(l=>{
              const k = l==="Z L-N"?"zln":l==="Z L-PE"?"zlpe":l==="Z L2-N"?"zl2n":l==="Z L2-PE"?"zl2pe":l==="Z L3-N"?"zl3n":"zl3pe";
              const pe = isPeKey(k);
              const okFn = pe ? zPeOk : zOk;
              const toetsbaar = pe ? zPeToetsbaar : !!zMaxVoorzek;
              const normTxt = pe ? (rcdAanwezig ? "norm ≤166Ω" : (zMaxVoorzek?`norm ≤${zMaxVoorzek.toFixed(2).replace(".",",")}Ω`:"")) : (zMaxVoorzek?`norm ≤${zMaxVoorzek.toFixed(2).replace(".",",")}Ω`:"");
              return (
                <div key={k}><label style={S.label}>{l}</label>
                  <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
                    <MiniInput value={inst[k]} onChange={v=>si(k,v)} unit="Ω" width={88}/>
                    {inst[k] && toetsbaar && <StatusTag level={okFn(inst[k])?"ok":"red"}/>}
                    {inst[k] && (
                      <span style={{fontSize:10,color:K.muted,whiteSpace:"nowrap"}}>
                        Icc≈{(230/toNum(inst[k])).toFixed(0)}A
                      </span>
                    )}
                    {inst[k] && toetsbaar && normTxt && (
                      <span style={{fontSize:10,color:K.muted,whiteSpace:"nowrap"}}>· {normTxt}</span>
                    )}
                  </div>
                  {inst[k] && !toetsbaar && (
                    <div style={{fontSize:10,color:K.orange,marginTop:3}}>Vul ampère + karakteristiek hierboven in voor automatische toetsing</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Normvlak voor het hele impedantieblok. Bewust per blok en niet per
              veld zoals design-spec §4 voorstelt: bij 3-fase staan hier zes
              Z-waarden, en zes vlakken van 52px eronder maken van dit scherm een
              scrollmarathon. De statuspil per veld blijft staan, dus je ziet nog
              steeds wélke waarde afwijkt; dit vlak zegt of je verder kunt en
              tegen welke grens er getoetst is — zonder terug te scrollen naar de
              instructietekst. */}
          {(() => {
            const zKeys = ["zln","zlpe"].concat((inst.zDrieFase ?? heeft3faseGroep) ? ["zl2n","zl2pe","zl3n","zl3pe"] : []);
            const o = blokOordeel(zKeys.map(k => {
              const pe = isPeKey(k);
              return { waarde: inst[k], ok: (pe ? zPeOk : zOk)(inst[k]), toetsbaar: pe ? zPeToetsbaar : !!zMaxVoorzek };
            }));
            if (!o) return null;
            const grenzen = [
              zMaxVoorzek ? `Z L-N \u2264 ${zMaxVoorzek.toFixed(2).replace(".",",")}\u03a9` : null,
              rcdAanwezig ? "Z L-PE \u2264 166\u03a9 (achter aardlek)"
                          : (zMaxVoorzek ? `Z L-PE \u2264 ${zMaxVoorzek.toFixed(2).replace(".",",")}\u03a9` : null),
            ].filter(Boolean).join(" \u00b7 ");
            return <StatusVlak level={o.level} titel={normTitel(o,"Impedantie")} sub={grenzen} style={{marginTop:10}}/>;
          })()}
        </div>

        {/* B) ISOLATIEWEERSTAND */}
        <div style={{...S.sTitle,marginTop:8}}>B · Isolatieweerstand</div>
        <div style={S.card}>
          <label style={S.label}>ISO totaal — norm ≥ 0,23 MΩ (alle groepen aan, hoofdvoeding uit)<LeerIcoon onderwerp="iso_meting"/></label>
          <div style={{fontSize:11,color:K.muted,marginBottom:8,lineHeight:1.4}}>
            Meet met alle aardlekgroepen ingeschakeld en de voeding zelf uit.
          </div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:4}}>
            {[["Fase → Aarde","isoTotFA"],["Nul → Aarde","isoTotNA"]].map(([l,k])=>(
              <div key={k}>
                <div style={{fontSize:10,color:K.muted,marginBottom:3}}>{l}</div>
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  <MiniInput value={inst[k]} onChange={v=>si(k,v)} unit="MΩ" width={96}/>
                  {inst[k] && <StatusTag level={toNum(inst[k])>=0.23?"ok":"red"}/>}
                </div>
              </div>
            ))}
          </div>
          {(inst.isoTotFA || inst.isoTotNA) && (toNum(inst.isoTotFA)<0.23 || toNum(inst.isoTotNA)<0.23) && (
            <div style={{marginTop:10,padding:"10px 12px",background:K.orangeDim,borderRadius:10,border:`1px solid ${K.orange}44`}}>
              <div style={{fontSize:11,color:K.orange,lineHeight:1.6}}>
                ⚠ <strong>Waarde onder 0,23 MΩ.</strong> Zet de groepen één voor één uit en meet steeds opnieuw, tot de waarde weer ≥ 0,23 MΩ wordt — de laatst uitgezette groep is de boosdoener. Leg die (of alle groepen) hieronder per groep vast.
              </div>
            </div>
          )}

          {/* Isolatieweerstand per groep — dynamische lijst, groepen toevoegen via de knop */}
          <div style={{marginTop:14}}>
            <label style={S.label}>Isolatieweerstand per groep — norm ≥ 0,23 MΩ (naar aarde)</label>
            <div style={{fontSize:11,color:K.muted,marginBottom:10,lineHeight:1.4}}>
              Voeg per groep een meting toe met de knop hieronder. Handig om een probleemgroep vast te leggen of om alle eindgroepen los te documenteren.
            </div>

            {isoGroepen.length===0 && (
              <div style={{fontSize:11,color:K.muted,marginBottom:10,padding:"8px 10px",background:K.surface,borderRadius:8}}>
                Nog geen groepen toegevoegd.
              </div>
            )}

            {isoGroepen.map((g,idx)=>{
              const norm = 0.23; // naar aarde: elke fase staat t.o.v. aarde op 230V → ≥0,23 MΩ, ook bij 3-fase
              const velden = g.driefase
                ? [["L1 → Aarde","l1a"],["L2 → Aarde","l2a"],["L3 → Aarde","l3a"],["N → Aarde","na"]]
                : [["Fase → Aarde","fa"],["Nul → Aarde","na"]];
              return (
                <div key={g.id} style={{marginBottom:10,padding:"10px 12px",background:K.surface,borderRadius:10}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                    <input style={{...S.input,flex:1}} type="text"
                      placeholder={`Groep ${idx+1} (bijv. WCD begane grond)`}
                      value={g.naam||""} onChange={e=>updIsoGroep(g.id,"naam",e.target.value)}
                      onFocus={e=>e.target.select()}/>
                    <button onClick={()=>remIsoGroep(g.id)} title="Groep verwijderen"
                      style={{background:"none",border:"none",color:K.muted,fontSize:20,cursor:"pointer",lineHeight:1,padding:"0 6px",flexShrink:0}}>×</button>
                  </div>
                  <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,cursor:"pointer"}}>
                    <input type="checkbox" checked={!!g.driefase} onChange={e=>updIsoGroep(g.id,"driefase",e.target.checked)}/>
                    <span style={{fontSize:11,color:K.muted}}>3-fase groep (L1/L2/L3 → Aarde, norm ≥ 0,23 MΩ)</span>
                  </label>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    {velden.map(([l,k])=>{
                      const val = g[k]||"";
                      const ok = val && toNum(val)>=norm;
                      return (
                        <div key={k}>
                          <div style={{fontSize:10,color:K.muted,marginBottom:3}}>{l}</div>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <input style={{...S.input,fontSize:20,fontWeight:700,fontVariantNumeric:"tabular-nums",flex:1,
                              background:val?(ok?K.greenDim:K.redDim):K.card,
                              border:`1px solid ${val?(ok?K.green:K.red):K.border}`}}
                              type="text" inputMode="decimal" placeholder="0,5"
                              value={val} onChange={e=>updIsoGroep(g.id,k,e.target.value)}
                              onFocus={e=>e.target.select()}/>
                            <span style={{...S.eenheid,fontSize:15,marginLeft:0}}>MΩ</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <button onClick={addIsoGroep}
              style={{...S.btnGhost,marginTop:2,marginBottom:0}}>
              + Extra groep
            </button>
          </div>

          {/* Normvlak isolatieweerstand — ISO totaal én alle per-groep-waarden
              samen, want ze worden aan dezelfde grens getoetst. */}
          {(() => {
            const waarden = [
              { waarde: inst.isoTotFA, ok: isoOk(inst.isoTotFA) },
              { waarde: inst.isoTotNA, ok: isoOk(inst.isoTotNA) },
            ];
            isoGroepen.forEach(g => ["fa","na","l1a","l2a","l3a"].forEach(veld =>
              waarden.push({ waarde: g[veld], ok: isoOk(g[veld]) })));
            const o = blokOordeel(waarden);
            if (!o) return null;
            return <StatusVlak level={o.level} titel={normTitel(o,"Isolatieweerstand")}
              sub={`Norm \u2265 ${String(isoTotNorm).replace(".",",")} M\u03a9 naar aarde, ongeacht spanning of faseconfiguratie`}
              style={{marginTop:10}}/>;
          })()}
        </div>

        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8,marginTop:8}}>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
            <input type="checkbox" checked={inst.toon3fase ?? heeft3faseGroep} onChange={e=>si("toon3fase",e.target.checked)}/>
            <span style={{fontSize:12,color:K.muted}}>Ook L2/N, L3/N en fase-fase meten (3-fase aansluiting aanwezig)</span>
          </label>
        </div>
        <div style={{fontSize:10,color:K.muted,marginBottom:4}}>Fase → Nul / Fase → Aarde (PE)</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
          {(["L1/N","L1/PE"].concat((inst.toon3fase ?? heeft3faseGroep) ? ["L2/N","L2/PE","L3/N","L3/PE"] : [])).map(f=>(
            <div key={f}><label style={S.label}>{f}</label>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <MiniInput value={inst[`span_${f}`]} onChange={v=>si(`span_${f}`,v)} unit="V" width={84}/>
                {inst[`span_${f}`]&&<StatusTag level={spanOk(inst[`span_${f}`])?"ok":"red"}/>}
              </div>
            </div>
          ))}
        </div>
        {(inst.toon3fase ?? heeft3faseGroep) && (
          <>
            <div style={{fontSize:10,color:K.muted,marginBottom:4}}>Fase → Fase</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              {["L1/L2","L2/L3","L1/L3"].map(f=>(
                <div key={f}><label style={S.label}>{f}</label>
                  <div style={{display:"flex",gap:4,alignItems:"center"}}>
                    <MiniInput value={inst[`span_${f}`]} onChange={v=>si(`span_${f}`,v)} unit="V" width={84}/>
                    {inst[`span_${f}`]&&<StatusTag level={toNum(inst[`span_${f}`])>=360&&toNum(inst[`span_${f}`])<=440?"ok":"red"}/>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <div style={{fontSize:10,color:K.muted,marginBottom:4}}>Frequentie — registratie op meetmoment, tolerantie ±10% (45-55Hz)</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
          <div><label style={S.label}>Frequentie</label>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <MiniInput value={inst.frequentie} onChange={v=>si("frequentie",v)} unit="Hz" width={84} placeholder="50"/>
              {inst.frequentie&&<StatusTag level={toNum(inst.frequentie)>=45&&toNum(inst.frequentie)<=55?"ok":"red"}/>}
            </div>
          </div>
        </div>

        {/* Normvlak spanning + frequentie. Deze twee horen bij elkaar: het zijn
            beide registraties van wat het net op het meetmoment levert. */}
        {(() => {
          const fasen = ["L1/N","L1/PE"].concat((inst.toon3fase ?? heeft3faseGroep) ? ["L2/N","L2/PE","L3/N","L3/PE"] : []);
          const waarden = fasen.map(f => ({ waarde: inst[`span_${f}`], ok: spanOk(inst[`span_${f}`]) }));
          if (inst.toon3fase ?? heeft3faseGroep) {
            ["L1/L2","L2/L3","L1/L3"].forEach(f => waarden.push({
              waarde: inst[`span_${f}`],
              ok: toNum(inst[`span_${f}`]) >= 360 && toNum(inst[`span_${f}`]) <= 440,
            }));
          }
          waarden.push({ waarde: inst.frequentie, ok: toNum(inst.frequentie) >= 45 && toNum(inst.frequentie) <= 55 });
          const o = blokOordeel(waarden);
          if (!o) return null;
          const grenzen = ["Fase\u2192nul/aarde 207\u2013253 V"]
            .concat((inst.toon3fase ?? heeft3faseGroep) ? ["fase\u2192fase 360\u2013440 V"] : [])
            .concat(["frequentie 45\u201355 Hz"]).join(" \u00b7 ");
          return <StatusVlak level={o.level} titel={normTitel(o,"Spanning en frequentie","voldoen")} sub={grenzen} style={{marginBottom:16}}/>;
        })()}

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

            {cagRcd.rcdType!=="geen" ? (() => {
              const mA = toNum(cagRcd.rcdMa);
              const diMax = cagRcd.rcdType==="B" ? mA*2 : cagRcd.rcdType==="AC" ? mA*1 : mA*1.4;
              const diFactor = cagRcd.rcdType==="B" ? "2×" : cagRcd.rcdType==="AC" ? "1×" : "1,4×";
              const dtVal = gv(cagRcd.id,"dt");
              const diVal = gv(cagRcd.id,"di");
              const diOk  = diVal && toNum(diVal) <= diMax;
              const tk    = gv(cagRcd.id,"testknop");
              const meetVak = (waarde, goed) => ({
                ...S.input, flex:1, minWidth:0, fontSize:20, fontWeight:700, fontVariantNumeric:"tabular-nums",
                background: waarde ? (goed ? K.greenDim : K.redDim) : K.surface,
                border: `1px solid ${waarde ? (goed ? K.green : K.red) : K.border}`,
              });
              return (
              <>
                {/* De labels stonden vol met de norm ("ΔT ms — norm ≤300ms (EN
                    61008)") en wrapten naar twee of drie regels — bij ΔT viel het
                    ⓘ-icoon zelfs op een eigen regel. Daardoor zakten de twee
                    invoervelden uit elkaar en stond het blok scheef. De norm staat
                    nu in het vlak eronder, de labels zijn kort, de eenheid staat
                    naast het veld, en alignItems:end houdt de velden op één lijn
                    ook als een label toch een keer wrapt. */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,alignItems:"end"}}>
                  <div>
                    <label style={S.label}>ΔT<LeerIcoon onderwerp="delta_t_i"/></label>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <input style={meetVak(dtVal, dtOk(dtVal))}
                        type="text" inputMode="decimal" placeholder="180" value={dtVal}
                        onChange={e=>sg(cagRcd.id,"dt",e.target.value)} onFocus={e=>e.target.select()}/>
                      <span style={{...S.eenheid,fontSize:15,marginLeft:0}}>ms</span>
                    </div>
                  </div>
                  <div>
                    <label style={S.label}>ΔI type-{cagRcd.rcdType}</label>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <input style={meetVak(diVal, diOk)}
                        type="text" inputMode="decimal" placeholder={String(Math.round(mA*0.8))} value={diVal}
                        onChange={e=>sg(cagRcd.id,"di",e.target.value)} onFocus={e=>e.target.select()}/>
                      <span style={{...S.eenheid,fontSize:15,marginLeft:0}}>mA</span>
                    </div>
                  </div>
                  <div style={{gridColumn:"1 / -1"}}>
                    <label style={S.label}>Testknop RCD</label>
                    <div style={{display:"flex",gap:8,marginTop:2}}>
                      {["OK","NOK"].map(v=><Pill key={v} small active={tk===v} onClick={()=>sg(cagRcd.id,"testknop",v)}>{v}</Pill>)}
                    </div>
                  </div>
                </div>

                {/* Normvlak RCD. De testknop telt mee: NOK is een directe
                    afkeuring, ook als ΔT en ΔI binnen de grenzen vallen. */}
                {(() => {
                  const o = blokOordeel([
                    { waarde: dtVal, ok: dtOk(dtVal) },
                    { waarde: diVal, ok: !!diOk },
                    { waarde: tk,    ok: tk === "OK" },
                  ]);
                  if (!o) return null;
                  return <StatusVlak level={o.level} titel={normTitel(o,"Aardlekschakelaar")}
                    sub={`ΔT ≤ 300 ms (EN 61008) · ΔI ≤ ${diFactor} In (≤${diMax.toFixed(0)} mA) · testknop moet OK zijn`}
                    style={{marginTop:12}}/>;
                })()}
              </>
              );
            })() : (
              <div style={{fontSize:11,color:K.muted}}>Geen RCD op deze groep — geen ΔT/ΔI-test van toepassing.</div>
            )}

            {aardlekgroepen.findIndex(a=>a.id===cagRcd.id)<aardlekgroepen.length-1 &&
              <button style={{...S.btnGhost,marginTop:14,marginBottom:0}}
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
          discipline="groepenkast"
          aiData={`STELSEL: ${stelsel} (ΔT-norm eindgroep ≤${dtNorm}ms) | KASTUITVOERING: ${data.kastType||"kunststof"}
HOOGST AFGAANDE GROEP: ${inst.hoogstKar||"—"}${inst.hoogstAmpere||"—"}A
Z L-N: ${inst.zln||"—"} Ohm | Z L-PE: ${inst.zlpe||"—"} Ohm (aardlekschakelaar ${rcdAanwezig?"AANWEZIG → norm Z L-PE ≤166 Ohm":"AFWEZIG → norm Z L-PE = foutstroom-norm Z_max"}) | ISO totaal Fase-Aarde: ${inst.isoTotFA||"—"} MOhm | ISO totaal Nul-Aarde: ${inst.isoTotNA||"—"} MOhm
SPANNINGEN: L1/N ${inst["span_L1/N"]||"—"}V / L1/PE ${inst["span_L1/PE"]||"—"}V / L2/N ${inst["span_L2/N"]||"—"}V / L2/PE ${inst["span_L2/PE"]||"—"}V / L3/N ${inst["span_L3/N"]||"—"}V / L3/PE ${inst["span_L3/PE"]||"—"}V / L1/L2 ${inst["span_L1/L2"]||"—"}V / L2/L3 ${inst["span_L2/L3"]||"—"}V / L1/L3 ${inst["span_L1/L3"]||"—"}V | FREQUENTIE: ${inst.frequentie||"—"}Hz
ISO PER GROEP: ${(isoGroepen.length ? isoGroepen.map((g,i)=>{
  const velden = g.driefase ? [["L1A","l1a"],["L2A","l2a"],["L3A","l3a"],["NA","na"]] : [["FA","fa"],["NA","na"]];
  return `${g.naam||`Groep ${i+1}`}${g.driefase?" (3F, norm ≥0,23)":" (norm ≥0,23)"}: ${velden.map(([lbl,k])=>`${lbl} ${g[k]||"—"}`).join(" / ")}`;
}).join(" | ") : "geen losse groepen ingevoerd")}
AARDLEKGROEPEN:
${aardlekgroepen.map((ag,i)=>{
  const hoogst = ag.eindgroepen?.find(e=>e.id===ag.hoogstId) || ag.eindgroepen?.[0];
  const eindStr = (ag.eindgroepen||[]).map(e=>`${e.naam}(${e.kar}${e.ampere})`).join(", ");
  return `${i+1}. ${ag.naam} | ${ag.rcdType==="geen"?"geen RCD":`RCD ${ag.rcdMa}mA-${ag.rcdType}`} | ${ag.fase==="3"?"3F 400V":`1F 230V${ag.L?" op "+ag.L:""}`} | eindgroepen: ${eindStr} | gemeten op: ${hoogst?.naam||"—"} | dT: ${gv(ag.id,"dt")||"—"}ms | dI: ${gv(ag.id,"di")||"—"}mA | Testknop: ${gv(ag.id,"testknop")||"—"}`;
}).join("\n")}
CROSS-CHECK SIGNALEN: ${warnings.length>0?warnings.map(w=>w.msg).join("; "):"geen"}`}
        />

        {/* Samenvatting: welke groepen zijn geselecteerd voor de veldmeting in stap 8
            (verste/buitengroep-metingen Z L-N/L-PE, kabellengte-indicatie) */}
        {aardlekgroepen.some(ag=>ag.veldmetingSelectie) && (
          <div style={{marginTop:14,padding:"10px 12px",background:K.yellowDim,borderRadius:10,border:`1px solid ${K.yellow}44`}}>
            <div style={{fontSize:11,fontWeight:700,color:K.yellow,marginBottom:6}}>📋 Veldmeting — geselecteerde groepen</div>
            <div style={{fontSize:11,color:K.text}}>
              {aardlekgroepen.filter(ag=>ag.veldmetingSelectie).map(ag=>ag.naam).join(", ")}
            </div>
          </div>
        )}

        <button style={{...S.btn,background:K.yellow,color:"#000"}} onClick={onNext}>Volgende: veldmeting →</button>
      </div>
    </div>
  );
}

// ─── VELDMETING (stap 7B) — verste/buitengroep-metingen + kabellengte-indicatie ──
// Voor de aardlekgroepen die in stap 6 zijn geselecteerd (vinkje "verste of
// buitengroep meenemen"), meet je hier Z L-N en Z L-PE op de verste wandcontactdoos
// van die groep. Met de kabeldikte (doorsnede) berekent de app de indicatieve
// kabellengte: L = Z × A / (2 × ρ), met ρ = 0,023 Ω·mm²/m (koperweerstand bij
// bedrijfstemperatuur — praktijkwaarde, bevestigd door Martin). De factor 2 komt
// van het feit dat een lus-meting heen én terug over de kabel loopt.
function GK_StapVeldmeting({ data, onChange, onNext, onBack }) {
  const [veld, setVeld] = useState(data.veldmeting || {});
  const aardlekgroepen = data.aardlekgroepen || [];
  const geselecteerd = aardlekgroepen.filter(ag => ag.veldmetingSelectie);
  const RHO = 0.023; // Ω·mm²/m — koperweerstand bij bedrijfstemperatuur (praktijkwaarde)
  const KABELDIKTES = ["1.5","2.5","4","6","10"];

  // Zelfde Z_max-berekening als Sectie A (hoogst afgaande groep) — de verste WCD
  // zit achter dezelfde automaat/zekering, dus dezelfde norm geldt hier ook.
  const instM = data.instMetingen || {};
  const hoogstKar = instM.hoogstKar || "B";
  const hoogstAmpere = instM.hoogstAmpere || "";
  const stelsel = instM.stelsel || data.stelsel || "TN-C-S";
  const isTT = stelsel === "TT";
  const isKlasse1 = data.kastType === "klasse1";
  const maxAfschakeltijd = isKlasse1 ? (isTT ? 1 : 5) : (isTT ? 0.2 : 0.4);
  const karFactorV = { B:5, C:10, D:20 };
  let zMaxVeld = null;
  if (hoogstKar === "gG") {
    const ggLookupV = ggIaVoorTijd(hoogstAmpere, maxAfschakeltijd);
    if (ggLookupV) zMaxVeld = Math.round((230/ggLookupV.ia)*100)/100;
  } else if (karFactorV[hoogstKar] && toNum(hoogstAmpere)>0) {
    zMaxVeld = Math.round((230/(karFactorV[hoogstKar]*toNum(hoogstAmpere)))*100)/100;
  }

  const sv = (agId, k, v) => {
    const u = { ...veld, [`${agId}_${k}`]: v };
    setVeld(u);
    onChange("veldmeting", u);
  };
  const gv = (agId, k) => veld[`${agId}_${k}`] || "";

  // Fysica-check: de veldmeting zit vérder van de bron dan de kastmeting, dus de
  // impedantie kan daar nooit LAGER zijn. Lager gemeten = meetfout of verwisselde
  // waarden → rode vlag. Kleine meettolerantie van 5% om terechte twijfel te scheiden
  // van instrumentruis.
  const kastZ = { zln: toNum(instM.zln), zlpe: toNum(instM.zlpe) };
  const veldLagerDanKast = (agId, k) => {
    const veldW = toNum(gv(agId, k));
    const kastW = kastZ[k];
    return veldW > 0 && kastW > 0 && veldW < kastW * 0.95;
  };

  const berekenLengte = (agId) => {
    const dikte = toNum(gv(agId,"dikte")) || 2.5;
    const zln = toNum(gv(agId,"zln"));
    const zlpe = toNum(gv(agId,"zlpe"));
    const lengteZln = !isNaN(zln) && zln>0 ? (zln*dikte)/(2*RHO) : null;
    const lengteZlpe = !isNaN(zlpe) && zlpe>0 ? (zlpe*dikte)/(2*RHO) : null;
    return { lengteZln, lengteZlpe };
  };

  return (
    <div>
      <div style={S.hdr}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Veldmeting</div>
          <div style={{fontSize:11,color:K.muted}}>verste/buitengroep-metingen</div>
        </div>
      </div>
      <div style={S.body}>
        {geselecteerd.length === 0 ? (
          <div style={S.card}>
            <div style={{fontSize:12,color:K.muted,lineHeight:1.5}}>
              Geen groepen geselecteerd voor veldmeting. Ga terug naar stap 6 (Groepen) en vink daar bij de gewenste aardlekgroep(en) "Verste of buitengroep meenemen in veldmeting stap 8" aan als je deze stap wilt gebruiken.
            </div>
          </div>
        ) : (
          <>
            <div style={{fontSize:11,color:K.muted,marginBottom:14,lineHeight:1.5}}>
              Meet Z L-N en Z L-PE op de <strong style={{color:K.text}}>verste wandcontactdoos</strong> van de geselecteerde groep(en). Aan de hand van de kabeldikte berekent de app de indicatieve kabellengte.
            </div>
            {geselecteerd.map(ag => {
              const { lengteZln, lengteZlpe } = berekenLengte(ag.id);
              // Aardlekschakelaar-keuze per groep — bepaalt de Z L-PE-toetsing, net als
              // in sectie A. Default afgeleid uit het RCD-type van de aardlekgroep.
              const rcdVeldRaw = veld[`${ag.id}_rcd`];
              const rcdVeld = rcdVeldRaw === undefined ? (ag.rcdType !== "geen") : (rcdVeldRaw === true || rcdVeldRaw === "1");
              const zlpeVeldOk = v => rcdVeld ? toNum(v) <= 166 : (zMaxVeld ? toNum(v) <= zMaxVeld : true);
              const zlpeVeldToetsbaar = rcdVeld ? true : !!zMaxVeld;
              return (
                <div key={ag.id} style={S.card}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:10}}>{ag.naam}</div>

                  <label style={S.label}>Kabeldikte (doorsnede)</label>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                    {KABELDIKTES.map(d=>(
                      <Pill key={d} small active={(gv(ag.id,"dikte")||"2.5")===d} onClick={()=>sv(ag.id,"dikte",d)}>{d}mm²</Pill>
                    ))}
                  </div>

                  {/* Aardlekschakelaar-keuze — achter aardlek geldt Z L-PE ≤166Ω */}
                  <label style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:12,cursor:"pointer",padding:"8px 10px",background:K.surface,borderRadius:8}}>
                    <input type="checkbox" checked={rcdVeld} onChange={e=>sv(ag.id,"rcd",e.target.checked ? true : "0")} style={{marginTop:2}}/>
                    <span style={{fontSize:11,color:K.muted,lineHeight:1.5}}>
                      <strong style={{color:K.text}}>Aardlekschakelaar aanwezig</strong> — voor <strong style={{color:K.text}}>Z L-PE</strong> geldt dan ≤166Ω (aanraakspanning). Uitgevinkt: de foutstroom-norm{zMaxVeld?` (Z_max ≤${zMaxVeld.toFixed(2).replace(".",",")}Ω)`:" (Z_max obv sectie A)"} geldt.
                    </span>
                  </label>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
                    <div>
                      <label style={S.label}>Z L-N (verste WCD)</label>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <MiniInput value={gv(ag.id,"zln")} onChange={v=>sv(ag.id,"zln",v)} unit="Ω" width={96} placeholder="1,2"/>
                        {gv(ag.id,"zln") && zMaxVeld && (
                          <StatusTag level={toNum(gv(ag.id,"zln"))<=zMaxVeld && !veldLagerDanKast(ag.id,"zln") ?"ok":"red"}/>
                        )}
                        {veldLagerDanKast(ag.id,"zln") && (
                          <div style={{flexBasis:"100%",fontSize:11,color:K.red,marginTop:2}}>🚩 Lager dan de kastmeting ({kastZ.zln} Ω) — fysiek onmogelijk op grotere afstand van de bron. Controleer de meting of de ingevoerde waarden.</div>
                        )}
                      </div>
                      {lengteZln && (
                        <div style={{fontSize:11,color:K.green,marginTop:4,fontWeight:600}}>≈ {lengteZln.toFixed(1).replace(".",",")}m kabel</div>
                      )}
                    </div>
                    <div>
                      <label style={S.label}>Z L-PE (verste WCD)</label>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <MiniInput value={gv(ag.id,"zlpe")} onChange={v=>sv(ag.id,"zlpe",v)} unit="Ω" width={96} placeholder="1,3"/>
                        {gv(ag.id,"zlpe") && zlpeVeldToetsbaar && (
                          <StatusTag level={zlpeVeldOk(gv(ag.id,"zlpe")) && !veldLagerDanKast(ag.id,"zlpe") ?"ok":"red"}/>
                        )}
                        {veldLagerDanKast(ag.id,"zlpe") && (
                          <div style={{flexBasis:"100%",fontSize:11,color:K.red,marginTop:2}}>🚩 Lager dan de kastmeting ({kastZ.zlpe} Ω) — fysiek onmogelijk op grotere afstand van de bron. Controleer de meting of de ingevoerde waarden.</div>
                        )}
                      </div>
                      {gv(ag.id,"zlpe") && zlpeVeldToetsbaar && (
                        <div style={{fontSize:10,color:K.muted,marginTop:3}}>{rcdVeld?"norm ≤166Ω (achter aardlek)":`norm ≤${zMaxVeld.toFixed(2).replace(".",",")}Ω`}</div>
                      )}
                      {lengteZlpe && (
                        <div style={{fontSize:11,color:K.green,marginTop:4,fontWeight:600}}>≈ {lengteZlpe.toFixed(1).replace(".",",")}m kabel</div>
                      )}
                    </div>
                  </div>
                  {zMaxVeld && (
                    <div style={{fontSize:10,color:K.muted,marginBottom:8}}>Norm Z L-N: ≤ {zMaxVeld.toFixed(2).replace(".",",")}Ω (obv {hoogstKar}{hoogstAmpere}A, {String(maxAfschakeltijd).replace(".",",")}s — zelfde als sectie A){rcdVeld?" · Z L-PE ≤166Ω achter aardlek":""}</div>
                  )}
                  {!zMaxVeld && (
                    <div style={{fontSize:10,color:K.orange,marginBottom:8}}>⚠ Vul ampère + karakteristiek in bij sectie A (stap 7) om Z L-N{rcdVeld?"":" en Z L-PE"} automatisch te toetsen.</div>
                  )}

                  <div style={{fontSize:10,color:K.muted,lineHeight:1.4}}>
                    Berekening: L = Z × A ÷ (2 × ρ), met ρ = 0,023 Ω·mm²/m. Dit is een indicatie — de werkelijke lengte kan afwijken door aansluitweerstanden en meetnauwkeurigheid.
                  </div>
                </div>
              );
            })}
          </>
        )}
        <button style={{...S.btn,background:K.yellow,color:"#000"}} onClick={onNext}>Volgende →</button>
      </div>
    </div>
  );
}

function PV_StapMateriaal({ data, onChange, onNext, onBack }) {
  const [strings, setStrings] = useState(data.pvStrings || [{ id:1, aantalPanelen:10 }]);
  const addString = () => { const s=[...strings,{id:Date.now(),aantalPanelen:10}]; setStrings(s); onChange("pvStrings",s); };
  const updStr = (id,k,v) => { const s=strings.map(x=>x.id===id?{...x,[k]:v}:x); setStrings(s); onChange("pvStrings",s); };
  const remStr = (id) => { const s=strings.filter(x=>x.id!==id); setStrings(s); onChange("pvStrings",s); };

  const totaalWp = (parseInt(data.aantalPanelen)||0) * (parseInt(data.paneelWp)||0);

  return (
    <div>
      <div style={S.hdr}><button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Materiaal PV</div><div style={{fontSize:12,color:K.muted}}>Zonnepanelen</div></div>
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
              <span style={{fontSize:13,color:K.yellow,fontWeight:700}}>Totaalvermogen: {(totaalWp/1000).toFixed(2).replace(".",",")} kWp</span>
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
            <div style={{flex:1}}><label style={S.label}>Vermogen kW</label><input style={S.input} type="text" inputMode="decimal" placeholder="5,0" value={data.omvormerKw||""} onChange={e=>onChange("omvormerKw",e.target.value)}/></div>
          </div>
          {/* DC/AC ratio check */}
          {data.aantalPanelen && data.paneelWp && data.omvormerKw && (() => {
            const ratio = (parseInt(data.aantalPanelen)*parseInt(data.paneelWp)) / (toNum(data.omvormerKw)*1000);
            const ok = ratio >= 0.8 && ratio <= 1.35;
            return (
              <div style={{marginTop:10,padding:"8px 12px",borderRadius:8,background:ok?K.greenDim:K.orangeDim,border:`1px solid ${ok?K.green:K.orange}44`}}>
                <span style={{fontSize:12,color:ok?K.green:K.orange,fontWeight:700}}>
                  DC/AC ratio: {ratio.toFixed(2).replace(".",",")} {ok ? "✓ OK" : "⚠️ Controleer"}
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
        <div><div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Meetwaarden PV</div><div style={{fontSize:12,color:K.muted}}>NEN1010:712</div></div>
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
                  <MiniInput value={instMet[k]} onChange={v=>sm(k,v)} unit={u} width={84}/>
                  {instMet[k]&&<StatusTag level={chk(instMet[k])?"ok":"red"}/>}
                </div>
              </div>
            ))}
          </div>

          {/* Normvlak AC-blok. De grenswaarden staan hier expliciet omdat ze in
              de labels nergens genoemd worden — bij afkeur moest je tot nu toe
              raden waartegen getoetst was. Let op: de Z L-PE-grens van 0,5 Ω is
              een vaste waarde, geen afgeleide van de automaatkarakteristiek;
              roadmap 1.1 wil die herzien. Hier alleen zichtbaar gemaakt, niet
              gewijzigd — dat is een normbeslissing. */}
          {(() => {
            const o = blokOordeel([
              { waarde: instMet.spanAC, ok: toNum(instMet.spanAC) >= 207 && toNum(instMet.spanAC) <= 253 },
              { waarde: instMet.zlpe,   ok: toNum(instMet.zlpe) < 0.5 },
              { waarde: instMet.isoAC,  ok: toNum(instMet.isoAC) > 1 },
            ]);
            if (!o) return null;
            return <StatusVlak level={o.level} titel={normTitel(o,"AC-installatie")}
              sub={"Spanning 207\u2013253 V \u00b7 Z L-PE < 0,5 \u03a9 \u00b7 ISO totaal > 1 M\u03a9"}
              style={{marginTop:10}}/>;
          })()}
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
                <button style={{...S.btnGhost,marginTop:14,marginBottom:0}}
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

// ─── MKP SCANNER: QR scannen ín de app — werkt volledig offline ──────────────
// De camera leest de QR, het datafragment wordt lokaal gedecodeerd; er is geen
// redirect via meterkastpaspoort.nl nodig. BarcodeDetector waar beschikbaar
// (Android, snel), anders jsQR als universele fallback (o.a. iOS).
function MkpScanner({ onResult, onSluit }) {
  const videoRef = useRef(null);
  const [fout, setFout] = useState("");
  useEffect(() => {
    let gestopt = false, stream = null, raf = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const v = videoRef.current; if (!v) return;
        v.srcObject = stream; await v.play();
        const detector = ("BarcodeDetector" in window)
          ? new window.BarcodeDetector({ formats: ["qr_code"] }) : null;
        let jsQR = null;
        if (!detector) jsQR = (await import("jsqr")).default;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const tik = async () => {
          if (gestopt) return;
          if (v.readyState === 4) {
            let raw = null;
            if (detector) {
              try { const codes = await detector.detect(v); if (codes.length) raw = codes[0].rawValue; } catch {}
            } else if (jsQR) {
              canvas.width = v.videoWidth; canvas.height = v.videoHeight;
              ctx.drawImage(v, 0, 0);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const c = jsQR(img.data, img.width, img.height);
              if (c) raw = c.data;
            }
            if (raw) {
              const frag = raw.includes("#") ? raw.split("#").pop() : raw;
              try {
                const p = await mkpDecode(frag);
                gestopt = true;
                stream?.getTracks().forEach(t => t.stop());
                onResult(p);
                return;
              } catch {
                setFout("Dit is geen meterkastpaspoort-QR — richt op de sticker.");
              }
            }
          }
          raf = requestAnimationFrame(tik);
        };
        tik();
      } catch (e) {
        setFout("Camera niet beschikbaar" + (e?.message ? ` (${e.message})` : "") + ". Geef de app cameratoegang in de instellingen.");
      }
    })();
    return () => { gestopt = true; stream?.getTracks().forEach(t => t.stop()); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000, background:"#000", display:"flex", flexDirection:"column" }}>
      <video ref={videoRef} playsInline muted style={{ flex:1, width:"100%", objectFit:"cover" }}/>
      <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        width:230, height:230, border:`3px solid ${K.yellow}`, borderRadius:16, boxShadow:"0 0 0 9999px rgba(0,0,0,0.35)" }}/>
      <div style={{ position:"absolute", top:16, left:0, right:0, textAlign:"center", color:"#fff", fontSize:14, fontWeight:700, textShadow:"0 1px 4px #000" }}>
        Richt op de meterkastpaspoort-sticker
      </div>
      {fout && <div style={{ position:"absolute", bottom:96, left:16, right:16, background:"rgba(0,0,0,0.75)", color:"#FCA5A5", fontSize:13, padding:"10px 14px", borderRadius:10, textAlign:"center" }}>{fout}</div>}
      <button onClick={onSluit} style={{ position:"absolute", bottom:24, left:"50%", transform:"translateX(-50%)",
        padding:"12px 28px", borderRadius:24, border:"none", background:"rgba(255,255,255,0.92)", color:"#000", fontSize:14, fontWeight:700, cursor:"pointer" }}>
        Sluiten
      </button>
    </div>
  );
}

// ─── MKP VIEWER: gescand paspoort direct tonen (inzien zonder project) ───────
function MkpViewer({ p, onNieuw, onSluit }) {
  const TYPE_LABEL = { alg:"Algemene groep", kook:"Koken", wp:"Warmtepomp", lp:"Laadpaal", pv:"PV-omvormer", bat:"Thuisbatterij", ov:"Overig" };
  const rij = (label, waarde) => waarde ? (
    <div style={{display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${K.border}`}}>
      <span style={{fontSize:12, color:K.muted}}>{label}</span>
      <span style={{fontSize:13, fontWeight:600, textAlign:"right"}}>{waarde}</span>
    </div>) : null;
  const chkKleur = p.chk?.r==="groen" ? K.green : p.chk?.r==="rood" ? K.red : K.orange;
  return (
    <div style={{padding:16, maxWidth:520, margin:"0 auto"}}>
      <div style={{textAlign:"center", marginBottom:14}}>
        <div style={{fontSize:26}}>📱</div>
        <h2 style={{...S.h2, marginBottom:2}}>Meterkastpaspoort</h2>
        <div style={{fontSize:12, color:K.muted}}>Opgave vorige installateur — controleer bij twijfel · open standaard meterkastpaspoort.nl</div>
      </div>

      <div style={{...S.card, marginBottom:10}}>
        {rij("Adres", [p.pc, p.nr].filter(Boolean).join(" "))}
        {rij("Bouwjaar / aanleg kast", p.bj)}
        {rij("Hoofdaansluiting", p.ha && `${p.ha.f||"?"}-fase × ${p.ha.a||"?"} A`)}
        {rij("Kam / ontwerpstroom", p.kam && `${p.kam.mm2?p.kam.mm2+" mm² · ":""}${p.kam.a||"?"} A`)}
        {rij("EAN aansluiting", p.ean)}
        {rij("EAN secundair (SAP)", p.ean2)}
        {rij("Laatst bijgewerkt", p.d)}
      </div>

      {Array.isArray(p.grp) && p.grp.length>0 && (
        <div style={{...S.card, marginBottom:10}}>
          <div style={{fontWeight:700, fontSize:13, marginBottom:6}}>Op de kast</div>
          {p.grp.map((g,i)=>(
            <div key={i} style={{display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${K.border}`, fontSize:13}}>
              <span>{g.rol==="voed"?"↩︎ ":"→ "}{TYPE_LABEL[g.t]||g.t}{g.n?` — ${g.n}`:""}</span>
              <span style={{color:K.muted}}>{g.kw?`${g.kw} kW`:""}{g.f?` · ${g.f}F`:""}</span>
            </div>
          ))}
          <div style={{fontSize:10, color:K.muted, marginTop:6}}>↩︎ = voedend (levert aan de kam) · → = afgaand</div>
        </div>
      )}

      {p.lb && (
        <div style={{...S.card, marginBottom:10}}>
          <div style={{fontWeight:700, fontSize:13, marginBottom:6}}>Load balancing</div>
          <div style={{fontSize:13}}>
            {p.lb.aan
              ? `${p.lb.typ==="dyn"?"Dynamisch":p.lb.typ==="stat"?"Statisch":"Aanwezig"}${p.lb.max?` · grens ${p.lb.max} A`:""}${p.lb.reg?` · regisseur: ${p.lb.reg}`:""}`
              : "Niet aanwezig"}
          </div>
          <div style={{fontSize:10, color:K.muted, marginTop:4}}>Let op: dit is een instelling, geen veiligheidsmaatregel — kan gewijzigd of opgeheven zijn.</div>
        </div>
      )}

      {p.chk && (
        <div style={{...S.card, marginBottom:10, borderLeft:`4px solid ${chkKleur}`}}>
          <div style={{fontWeight:700, fontSize:13}}>Laatste belastingcheck: <span style={{color:chkKleur, textTransform:"uppercase"}}>{p.chk.r}</span></div>
          {p.chk.d && <div style={{fontSize:11, color:K.muted}}>op {p.chk.d}</div>}
        </div>
      )}

      {Array.isArray(p.log) && p.log.length>0 && (
        <div style={{...S.card, marginBottom:16}}>
          <div style={{fontWeight:700, fontSize:13, marginBottom:6}}>Logboek</div>
          {p.log.map((r,i)=>(
            <div key={i} style={{padding:"6px 0", borderBottom:`1px solid ${K.border}`, fontSize:12}}>
              <span style={{color:K.muted}}>{r.d}</span> — <strong>{r.b}</strong><br/>{r.w}{r.c?<span style={{color:K.muted}}> · {r.c}</span>:null}
            </div>
          ))}
        </div>
      )}

      <div style={{display:"flex", flexDirection:"column", gap:8}}>
        <button style={{...S.btn, background:K.yellow, color:"#000", fontSize:14, padding:"14px"}} onClick={onNieuw}>
          Nieuw project met deze gegevens →
        </button>
        <button style={S.btnGhost} onClick={onSluit}>
          Alleen inzien — sluiten
        </button>
      </div>
      <div style={{fontSize:10, color:K.muted, textAlign:"center", marginTop:10}}>
        Er is niets opgeslagen of verzonden — dit paspoort komt uit de QR-code zelf.
      </div>
    </div>
  );
}

// ─── STAP: METERKASTPASPOORT ─────────────────────────────────────────────────
function StapMkp({ data, onChange, onNext, onBack, discipline }) {
  const m = data.mkp || {};
  const zet = (k,v) => onChange("mkp", { ...m, [k]: v });
  // FIX 06-08-B: meerdere velden in één update. Twee losse zet()-aanroepen in één
  // onClick gingen beide uit van dezelfde oude m, waardoor de tweede de eerste
  // overschreef — daardoor "pakte" de kam-keuze niet.
  const zetMeer = (obj) => onChange("mkp", { ...m, ...obj });
  const [bezig, setBezig] = useState(false);
  const [fout, setFout]   = useState("");
  const [eanHint, setEanHint] = useState(false);

  const MKP_GRP_TYPES = [
    ["alg","💡","Algemeen"],["kook","🍳","Koken"],["wp","🌡️","Warmtepomp"],["lp","🔌","Laadpaal"],
    ["pv","☀️","PV"],["bat","🔋","Batterij"],["ov","⚙️","Overig"],
  ];
  // FIX 06-08-E: het paspoort vraagt niet opnieuw wat de app al weet.
  // Groepenlijst wordt LIVE afgeleid uit de groepen-stap (stap 6) — toevoegen of
  // weghalen doe je daar; hier vul je alleen vermogens (kW) aan, bewaard per
  // eindgroep-id zodat wijzigingen in stap 6 vanzelf doorwerken.
  const EIND_NAAR_MKP = { kook:"kook", pv:"pv", laad:"lp", batterij:"bat", kracht:"ov" };
  const grpLive = (data.aardlekgroepen||[]).flatMap(ag =>
    (ag.eindgroepen||[]).map(e => ({
      id: e.id,
      t: e.type ? (EIND_NAAR_MKP[e.type] || "ov") : "alg",
      rol: e.type==="pv" || e.type==="batterij" ? "voed" : "af",
      f: ag.fase==="3" ? "3" : "1",
      n: (e.naam||"").slice(0,40),
      ampere: e.ampere || "",
    }))
  );
  const kwById = m.kwById || {};
  const zetKw = (id,v) => zet("kwById", { ...kwById, [id]: v });

  // Context: in de groepenkast-flow komt alles uit de app; in laadpaal/batterij-flow
  // is er (nog) geen kast-inventaris — dan werkt deze stap als STARTPASPOORT:
  // de monteur legt vast wat hij ter plekke kan aflezen (hoofdzekering, fasen,
  // bouwjaar) plus zijn eigen apparaat; volgende monteurs vullen aan.
  const isStartModus = discipline === "laadpaal" || discipline === "batterij" || discipline === "pv" || discipline === "wp";
  const instM_mkp = data.instMetingen || {};
  const uitApp_haA = instM_mkp.hoofdzekering || "";
  const haF_app = uitApp_haA ? (instM_mkp.zDrieFase ? "3" : "1") : (m.haF || "");
  const haA_app = uitApp_haA || m.haA || "";
  const bj_app  = data.bouwjaar || m.bj || "";

  // Eigen apparaat uit déze klus — komt altijd in het paspoort:
  const eigenApparaat = discipline === "laadpaal" ? {
    t:"lp", rol:"af", f: toNum(data.lpFasen)||1,
    kw: toNum(String(data.lpVermogen||"").replace(/[^0-9,\.]/g,"")) || undefined,
    n: (data.lpMerk||"laadpaal").slice(0,40),
  } : discipline === "batterij" ? {
    t:"bat", rol:"voed",
    kw: toNum(data.batKw) || undefined,
    n: (data.batMerk||"thuisbatterij").slice(0,40),
  } : discipline === "pv" ? {
    t:"pv", rol:"voed",
    kw: toNum(data.omvormerKw) || undefined,
    n: `PV ${data.aantalPanelen||"?"} panelen`.slice(0,40),
  } : discipline === "wp" ? {
    t:"wp", rol:"af",
    kw: undefined,
    n: (data.wpType||"warmtepomp").slice(0,40),
  } : null;

  // Extra verbruikers die de monteur ter plekke ziet (alleen in startmodus bewerkbaar)
  const extraGrp = m.extraGrp || [];
  const [extraOpen, setExtraOpen] = useState(null);
  const EXTRA_TYPES = [["kook","🍳","Koken"],["wp","🌡️","Warmtepomp"],["pv","☀️","PV"],["lp","🔌","Laadpaal"],["bat","🔋","Batterij"],["alg","💡","Overig"]];

  // Dubbele-balancer-detectie: laadpaal én batterij in de lijst, load balancing aan,
  // maar geen regisseur ingevuld → wie stuurt wie?
  const heeftLp  = grpLive.some(g=>g.t==="lp");
  const heeftBat = grpLive.some(g=>g.t==="bat");
  const dubbeleBalancerRisico = m.lbAan && heeftLp && heeftBat && !(m.lbReg||"").trim();

  const eanIngevuld = (m.ean||"").replace(/\s/g,"");
  const eanStatus = !eanIngevuld ? null : eanValide(eanIngevuld) ? "ok" : "fout";

  const volgende = async () => {
    setBezig(true); setFout("");
    try {
      const paspoort = mkpBouw(data, discipline);
      const url = MKP_BASIS + await mkpEncode(paspoort);
      const qr  = await QRCode.toDataURL(url, { errorCorrectionLevel:"M", margin:1, width:480, color:{ dark:"#000000", light:"#FFFFFF" } });
      onChange("mkpUrl", url);
      onChange("mkpQr", qr);
      onNext();
    } catch(e) {
      setFout("QR-generatie mislukt: " + (e?.message||e));
    } finally { setBezig(false); }
  };

  const knopStijl = (actief) => ({ ...S.btn, flex:1, padding:"10px 6px", fontSize:13,
    background: actief ? K.yellow : K.card, color: actief ? "#000" : K.text,
    border: `1px solid ${actief ? K.yellow : K.border}` });

  return (
    <div style={{padding:16}}>
      <h2 style={S.h2}>Meterkastpaspoort</h2>
      <p style={{fontSize:13,color:K.muted,marginBottom:14}}>
        Deze gegevens komen als QR-sticker op de kastdeur én als uitknippagina in het rapport.
        De data zit in de QR zelf — er wordt niets centraal opgeslagen. Open standaard: meterkastpaspoort.nl.
      </p>

      {data.mkpImport && (
        <div style={{...S.card, background:K.yellowDim, border:`1px solid ${K.yellow}55`, marginBottom:12, fontSize:12}}>
          📥 Vooringevuld vanuit gescand paspoort — <strong>opgave vorige installateur, controleer bij twijfel.</strong>
        </div>
      )}

      {!isStartModus ? (
      <div style={{...S.card, marginBottom:12}}>
        <div style={{fontWeight:700, fontSize:13, marginBottom:6}}>Uit de app overgenomen</div>
        <div style={{fontSize:13}}>Hoofdaansluiting: <strong>{haF_app}-fase{haA_app?` × ${haA_app} A`:""}</strong>{!haA_app && <span style={{color:K.orange}}> — hoofdzekering nog niet ingevuld (stap 7)</span>}</div>
        <div style={{fontSize:13, marginTop:4}}>Bouwjaar kast: {bj_app ? <strong>{bj_app}</strong> : <span style={{color:K.orange}}>nog niet ingevuld (stap 3 · Apparatuur)</span>}</div>
        <div style={{fontSize:11, color:K.muted, marginTop:6}}>Aanpassen doe je in de betreffende stap — het paspoort neemt het automatisch over.</div>
      </div>
      ) : (
      <div style={{...S.card, marginBottom:12}}>
        <div style={{fontWeight:700, fontSize:13, marginBottom:4}}>Hoofdaansluiting (aflezen in de kast)</div>
        <div style={{fontSize:11, color:K.muted, marginBottom:8}}>Nog geen paspoort op deze kast? Jij maakt het startpaspoort: leg vast wat je ter plekke kunt aflezen — volgende monteurs vullen aan.</div>
        <div style={{display:"flex", gap:8, marginBottom:8}}>
          {[["1","1-fase"],["3","3-fase"]].map(([v,l]) =>
            <button key={v} style={knopStijl(m.haF===v)} onClick={()=>zet("haF",v)}>{l}</button>)}
        </div>
        <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:10}}>
          {["25","35","40","50","63"].map(a =>
            <button key={a} style={{...knopStijl(m.haA===a), flex:"0 0 auto", minWidth:56}} onClick={()=>zet("haA",a)}>{a} A</button>)}
        </div>
        <label style={S.label}>Bouwjaar / aanlegperiode kast (schatting mag)</label>
        <input style={{...S.input}} placeholder='bijv. 1998 of "±1990"' value={m.bj||""} onChange={e=>zet("bj",e.target.value)}/>
      </div>
      )}

      <div style={{...S.card, marginBottom:12}}>
        <div style={{fontWeight:700, fontSize:13, marginBottom:4}}>Kam / ontwerpstroom verdeler</div>
        <div style={{fontSize:11, color:K.muted, marginBottom:8}}>De som van voedende groepen (PV, batterij) waar ze op de kam cumuleren mag deze waarde niet overschrijden.</div>
        <div style={{display:"flex", gap:8}}>
          <button style={knopStijl(m.kamMm2==="10")} onClick={()=>zetMeer({kamMm2:"10", kamA:"40"})}>10 mm² · 40 A</button>
          <button style={knopStijl(m.kamMm2==="16")} onClick={()=>zetMeer({kamMm2:"16", kamA:"63"})}>16 mm² · 63 A</button>
          <button style={knopStijl(m.kamMm2==="?")}  onClick={()=>zetMeer({kamMm2:"?",  kamA:"40"})}>Onbekend → 40 A</button>
        </div>
      </div>

      <div style={{...S.card, marginBottom:12}}>
        <div style={{fontWeight:700, fontSize:13, marginBottom:4}}>EAN-code aansluiting <span style={{fontWeight:400, color:K.muted}}>(optioneel)</span></div>
        <div style={{fontSize:11, color:K.muted, marginBottom:8}}>De unieke code van de netaansluiting (18 cijfers, staat op de energierekening). Nodig voor o.a. de netbeheerder-melding bij PV/batterij.</div>
        <input style={{...S.input, width:"100%", borderColor: eanStatus==="fout" ? K.red : eanStatus==="ok" ? K.green : K.border}}
          placeholder="87…" inputMode="numeric" value={m.ean||""} onChange={e=>zet("ean",e.target.value)}/>
        {eanStatus==="fout" && <div style={{fontSize:11, color:K.red, marginTop:4}}>Geen geldige EAN (18 cijfers, begint met 87, controlecijfer klopt niet).</div>}
        {eanStatus==="ok"   && <div style={{fontSize:11, color:K.green, marginTop:4}}>✓ Geldige EAN-code</div>}
        <button style={{...S.btnGhost, marginTop:8}}
          onClick={()=>{
            // iOS: window.open en kopiëren moeten SYNCHROON in de tik-actie gebeuren —
            // na een await ziet Safari het niet meer als gebruikersactie en blokkeert beide.
            const tekst = `${(data.postcode||"").replace(/\s/g,"")} ${[data.huisnummer,data.toevoeging].filter(Boolean).join(" ")}`.trim();
            let ok = false;
            try {
              const ta = document.createElement("textarea");
              ta.value = tekst; ta.style.position = "fixed"; ta.style.opacity = "0";
              document.body.appendChild(ta); ta.focus(); ta.select();
              ok = document.execCommand("copy");
              document.body.removeChild(ta);
            } catch {}
            if (!ok && navigator.clipboard?.writeText) navigator.clipboard.writeText(tekst).catch(()=>{});
            setEanHint(true);
            window.open("https://www.eancodeboek.nl","_blank");
          }}>
          🔎 Zoek op in het EAN-codeboek
        </button>
        {eanHint && <div style={{fontSize:11, color:K.green, marginTop:4}}>✓ {[(data.postcode||""),data.huisnummer,data.toevoeging].filter(Boolean).join(" ")} staat op je klembord — plak in het zoekveld van het codeboek en zet de EAN hierboven.</div>}
      </div>

      <div style={{...S.card, marginBottom:12}}>
        <div style={{fontWeight:700, fontSize:13, marginBottom:4}}>Wat hangt er op de kast</div>
        {!isStartModus ? (
          <div style={{fontSize:11, color:K.muted, marginBottom:8}}>Live overgenomen uit de groepen-stap (stap 6) — groepen toevoegen of weghalen doe je dáár. Vul hier waar bekend het vermogen (kW) aan; dat komt in het paspoort en voedt straks de belastingcheck.</div>
        ) : (
          <div style={{fontSize:11, color:K.muted, marginBottom:8}}>Jouw {({laadpaal:"laadpaal",batterij:"batterij",pv:"PV-installatie",wp:"warmtepomp"}[discipline])||"apparaat"} staat er automatisch in. Zie je in de kast nog andere grote verbruikers of opwekkers (kookgroep, warmtepomp, PV…)? Voeg ze toe — hoeft niet compleet, elk gegeven helpt de volgende monteur.</div>
        )}
        {isStartModus && eigenApparaat && (
          <div style={{display:"flex", gap:6, alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${K.border}`}}>
            <div style={{flex:1, minWidth:0, fontSize:13}}>
              {({lp:"🔌",bat:"🔋",pv:"☀️",wp:"🌡️"}[eigenApparaat.t])||"⚙️"} {eigenApparaat.n}
              <span style={{color:K.yellow, fontSize:11}}> · deze klus</span>
              <span style={{color:K.muted, fontSize:11}}>{eigenApparaat.kw?` · ${eigenApparaat.kw} kW`:""}{eigenApparaat.rol==="voed"?" · ↩︎ voedend":""}</span>
            </div>
          </div>
        )}
        {isStartModus && Array.isArray(data.mkpImport?.grp) && data.mkpImport.grp.map((g,i)=>(
          <div key={`imp${i}`} style={{display:"flex", gap:6, alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${K.border}`}}>
            <div style={{flex:1, minWidth:0, fontSize:13, color:K.muted}}>
              {({lp:"🔌",bat:"🔋",pv:"☀️",wp:"🌡️",kook:"🍳"}[g.t])||"💡"} {g.n||g.t}
              <span style={{fontSize:11}}> · uit gescand paspoort{g.kw?` · ${g.kw} kW`:""}</span>
            </div>
          </div>
        ))}
        {isStartModus && extraGrp.map((g,i)=>{
          const gek = EXTRA_TYPES.find(([v])=>v===g.t);
          return (
          <div key={`ex${i}`} style={{border:`1px solid ${K.border}`, borderRadius:10, padding:8, marginTop:8}}>
            <div style={{display:"flex", gap:6, alignItems:"center"}}>
              <button style={{flex:1, minWidth:0, textAlign:"left", padding:"9px 10px", background:K.card, color:K.text,
                      border:`1px solid ${extraOpen===i?K.yellow:K.border}`, borderRadius:8, fontSize:13, fontFamily:"inherit"}}
                onClick={()=>setExtraOpen(extraOpen===i?null:i)}>
                {gek ? `${gek[1]} ${gek[2]}` : "— kies type —"}
              </button>
              <input style={{width:64, padding:"9px 8px", background:K.card, color:K.text, border:`1px solid ${K.border}`, borderRadius:8, fontSize:13, fontFamily:"inherit"}}
                placeholder="kW" inputMode="decimal" value={g.kw||""}
                onChange={e=>{const n=[...extraGrp]; n[i]={...n[i],kw:e.target.value}; zet("extraGrp",n);}}/>
              <button style={{padding:"8px 10px", background:"transparent", border:"none", color:K.red, fontSize:16, cursor:"pointer"}}
                onClick={()=>{setExtraOpen(null); zet("extraGrp", extraGrp.filter((_,j)=>j!==i));}}>✕</button>
            </div>
            {extraOpen===i && (
              <div style={{display:"flex", flexWrap:"wrap", gap:6, marginTop:8}}>
                {EXTRA_TYPES.map(([v,ic,l])=>(
                  <button key={v} style={{padding:"8px 10px", borderRadius:8, fontSize:12, fontFamily:"inherit", cursor:"pointer",
                          background:g.t===v?K.yellow:K.card, color:g.t===v?"#000":K.text, border:`1px solid ${g.t===v?K.yellow:K.border}`}}
                    onClick={()=>{const n=[...extraGrp]; n[i]={...n[i], t:v, rol:(v==="pv"||v==="bat")?"voed":"af"}; zet("extraGrp",n); setExtraOpen(null);}}>
                    {ic} {l}
                  </button>
                ))}
              </div>
            )}
          </div>
        );})}
        {isStartModus && (
          <button style={{...S.btnGhost, marginTop:8}}
            onClick={()=>zet("extraGrp",[...extraGrp,{}])}>+ Zichtbare verbruiker toevoegen</button>
        )}
        {!isStartModus && grpLive.length===0 && <div style={{fontSize:12, color:K.orange}}>Nog geen groepen — vul eerst stap 6 (Groepen) in.</div>}
        {!isStartModus && grpLive.map(g=>{
          const gekozen = MKP_GRP_TYPES.find(([v])=>v===g.t);
          return (
          <div key={g.id} style={{display:"flex", gap:6, alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${K.border}`}}>
            <div style={{flex:1, minWidth:0, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
              {gekozen?gekozen[1]:"💡"} {g.n || (gekozen?gekozen[2]:"Groep")}
              <span style={{color:K.muted, fontSize:11}}> · {g.ampere||""}{g.rol==="voed"?" · ↩︎ voedend":""}</span>
            </div>
            <input style={{width:64, padding:"9px 8px", background:K.card, color:K.text, border:`1px solid ${K.border}`, borderRadius:8, fontSize:13, fontFamily:"inherit"}}
              placeholder="kW" inputMode="decimal"
              value={kwById[g.id]||""} onChange={e=>zetKw(g.id, e.target.value)}/>
          </div>
        );})}
      </div>

      <div style={{...S.card, marginBottom:12}}>
        <div style={{fontWeight:700, fontSize:13, marginBottom:8}}>Load balancing / vermogenssturing</div>
        <div style={{display:"flex", gap:8, marginBottom:8}}>
          <button style={knopStijl(m.lbAan===true)}  onClick={()=>zet("lbAan",true)}>Aanwezig</button>
          <button style={knopStijl(m.lbAan===false)} onClick={()=>zet("lbAan",false)}>Niet aanwezig</button>
        </div>
        {m.lbAan && (<>
          <div style={{display:"flex", gap:8, marginBottom:8}}>
            <button style={knopStijl(m.lbTyp==="stat")} onClick={()=>zet("lbTyp","stat")}>Statisch (vaste grens)</button>
            <button style={knopStijl(m.lbTyp==="dyn")}  onClick={()=>zet("lbTyp","dyn")}>Dynamisch (P1/meting)</button>
          </div>
          <div style={{display:"flex", gap:8}}>
            <div style={{flex:1, display:"flex", alignItems:"center", gap:4}}>
              <input style={{...S.input, flex:1, minWidth:0}} placeholder="Grenswaarde" inputMode="decimal"
                value={m.lbMax||""} onChange={e=>zet("lbMax",e.target.value)}/>
              <span style={{fontSize:13, color:K.muted, fontWeight:700}}>A</span>
            </div>
            <input style={{...S.input, flex:2}} placeholder="Regisseur (bijv. evcc, HEMS, laadpaal intern)"
              value={m.lbReg||""} onChange={e=>zet("lbReg",e.target.value)}/>
          </div>
          {dubbeleBalancerRisico && (
            <div style={{...S.card, background:K.orangeDim, border:`1px solid ${K.orange}66`, marginTop:8, marginBottom:0, fontSize:12}}>
              ⚠️ <strong>Laadpaal én thuisbatterij aanwezig, maar geen regisseur ingevuld.</strong> Twee
              onafhankelijke begrenzers weten niets van elkaar en kunnen samen alsnog de aansluiting of
              kam overbelasten. Vul in wélk systeem de regie voert, of leg vast dat sturing ontbreekt.
            </div>
          )}
          <div style={{fontSize:11, color:K.muted, marginTop:8}}>
            Load balancing is een software-instelling, geen veiligheidsmaatregel — de installatie moet ook bij falende sturing veilig zijn.
          </div>
        </>)}
        {m.lbAan===false && (
          <div style={{fontSize:11, color:K.muted}}>Zonder gezamenlijke sturing rekent de belastingcheck conservatief met gelijktijdigheidsfactor 0,6 over de grote verbruikers — laadpaal, warmtepomp, kookgroep en thuisbatterij (richtlijn NEN-EN-IEC 61439).</div>
        )}
        {m.lbAan===true && (
          <div style={{fontSize:11, color:K.muted}}>Mét sturing rekent de belastingcheck met het VOLLE vermogen: load balancing is een software-instelling en geen veiligheidsmaatregel, dus de installatie moet ook bij falende sturing kloppen.</div>
        )}

        {/* DE UITKOMST HOORT HIER TE STAAN. Zonder deze regel rekent de app iets
            uit dat alleen in de QR belandt, en dan ziet de installateur nooit
            waar zijn kW-invoer hierboven toe leidt. */}
        {(() => {
          // In een try, want dit draait tijdens de RENDER. De andere aanroep van
          // mkpBouw staat in een handler met een eigen try/catch; hier zou een
          // fout het hele paspoortscherm wit maken, en dan is de installateur
          // zijn stap kwijt voor een regel die alleen informeert.
          let uit = null, voorbeeld = null;
          try {
            voorbeeld = mkpBouw(data, discipline);
            uit = belastingcheck(voorbeeld.grp, voorbeeld.ha, m.lbAan, "");
          } catch { return null; }
          if (!uit) return (
            <div style={{fontSize:11, color:K.muted, marginTop:8}}>
              Belastingcheck: nog niets te toetsen. Vul de hoofdaansluiting in en het vermogen van
              minstens één groep hierboven.
            </div>
          );
          // Dezelfde bron als de check zelf gebruikt, zodat het label meeverandert
          // zodra er een P1-meting is: dan staat hier vanzelf "gemeten over 7
          // dagen" in plaats van "indicatie o.b.v. schatting", zonder dat hier
          // nog iets aan hoeft te veranderen.
          const basis = basisbelastingKw(voorbeeld.grp, m.lbAan);
          const fasenHa = toNum(voorbeeld.ha && voorbeeld.ha.f) === 3 ? 3 : 1;
          const capaciteit = (fasenHa * toNum(voorbeeld.ha && voorbeeld.ha.a) * 230) / 1000;

          const kom = (n, d=1) => Number(n).toFixed(d).replace(".", ",");
          const titel = uit.r === "groen" ? "Belasting past binnen de aansluiting"
                      : uit.r === "rood"  ? "Belasting overschrijdt de aansluiting"
                      :                     "Belasting nadert de grens van de aansluiting";
          const cijfers = basis && capaciteit > 0
            ? `${kom(basis.kw)} van ${kom(capaciteit)} kW`
            : null;
          const fasenTxt = voorbeeld.ha && voorbeeld.ha.a
            ? `${toNum(voorbeeld.ha.f) === 3 ? "3" : "1"}×${toNum(voorbeeld.ha.a)} A`
            : null;
          return (
            <StatusVlak
              level={uit.r === "groen" ? "ok" : uit.r === "rood" ? "fail" : "warn"}
              titel={titel}
              sub={[[cijfers, fasenTxt ? `(${fasenTxt})` : null].filter(Boolean).join(" "),
                    basis && basis.label].filter(Boolean).join(" · ")}
              style={{marginTop:10}}
            />
          );
        })()}
      </div>

      <div style={{...S.card, marginBottom:16}}>
        <div style={{fontWeight:700, fontSize:13, marginBottom:8}}>Logboekregel voor deze klus</div>
        <input style={{...S.input, width:"100%"}} placeholder={data.typeWerk||"Omschrijving werkzaamheden"}
          value={m.logOmschrijving||""} onChange={e=>zet("logOmschrijving",e.target.value)}/>
        {Array.isArray(data.mkpImport?.log) && data.mkpImport.log.length>0 && (
          <div style={{fontSize:11, color:K.muted, marginTop:8}}>
            Historie (uit gescand paspoort):<br/>
            {data.mkpImport.log.slice(0,5).map((r,i)=><span key={i}>• {r.d} — {r.b}: {r.w}<br/></span>)}
          </div>
        )}
      </div>

      {fout && <div style={{...S.card, background:K.redDim, border:`1px solid ${K.red}66`, marginBottom:12, fontSize:12}}>{fout}</div>}

      <div style={{display:"flex", gap:10}}>
        <button style={S.btnGhost} onClick={onBack}>← Terug</button>
        <button style={{...S.btn, flex:1, background:K.yellow, color:"#000"}} disabled={bezig} onClick={volgende}>
          {bezig ? "QR genereren…" : "Paspoort-QR maken & verder →"}
        </button>
      </div>
    </div>
  );
}

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

  const gkWarnings = discipline==="groepenkast" ? gkCrossChecks(aardlekgroepen, grpMeet, {...instMet, kastType:data.kastType}) : [];
  const pvWarnings = discipline==="pv" ? pvCrossChecks(
    strings.map(s=>({...s,iso:pvMeet[`${s.id}_iso`],spanning:pvMeet[`${s.id}_spanning`]})),
    pvInstMet, {aantalPanelen:data.aantalPanelen,paneelWp:data.paneelWp,omvormerKw:data.omvormerKw}
  ) : [];
  const cvWarnings = discipline==="cv" ? cvCrossChecks(data.cvMeet||{}) : [];
  const wpWarnings = discipline==="wp" ? wpCrossChecks(data.wpMeet||{}, {geluidOpgave:data.geluidOpgave, groepAmpere:data.groepAmpere}) : [];
  const lpWarnings = discipline==="laadpaal" ? lpCrossChecks(data.lpMeet||{}, {fasen:data.lpFasen}) : [];
  const batWarnings = discipline==="batterij" ? batCrossChecks(data.batMeet||{}) : [];
  const allWarnings = [...gkWarnings,...pvWarnings,...cvWarnings,...wpWarnings,...lpWarnings,...batWarnings];
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
          <p>${esc(data.naam||"—")}</p>
          <p>${esc(data.straat||"")} ${esc(data.huisnummer||"")}</p>
          <p>${esc(data.postcode||"")} ${esc(data.plaats||"")}</p>
          <p>${esc(data.email||"")}</p>
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
        <tr><td><strong>Object</strong></td><td>${esc(data.straat||"")} ${esc(data.huisnummer||"")}, ${esc(data.postcode||"")} ${esc(data.plaats||"")}</td>
            <td><strong>Datum oplevering</strong></td><td>${datum}</td></tr>
        <tr><td><strong>Type werk</strong></td><td>${data.typewerk||"—"}</td>
            <td><strong>Projectnummer</strong></td><td>${esc(data.projectId||"—")}</td></tr>
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
      <div style="border:1px solid #ddd;border-radius:4px;padding:10px;font-size:9px;line-height:1.6;white-space:pre-wrap;background:#fafaff">${esc(data.aiAnalyse)}</div>` : "";

    const notitieHtml = () => data.notitie ? `
      <h2>Opmerkingen</h2>
      <div style="border:1px solid #ddd;border-radius:4px;padding:10px;font-size:9px;line-height:1.6;white-space:pre-wrap">${esc(data.notitie)}</div>` : "";

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
            <div style="font-weight:700;color:#333">${idx+1}. ${eindgroepIcoon(e.type)} ${esc(e.naam||"—")}</div>
            <div style="color:#666;font-size:8px;margin-top:2px">${e.kar||"B"}${e.ampere||"16A"}</div>
          </div>`).join("");
        return `
          <div style="flex:1;min-width:120px;page-break-inside:avoid">
            <div style="background:${rcdKleur};color:#fff;padding:6px 8px;border-radius:3px;font-size:10px;font-weight:700;text-align:center">
              ${esc(ag.naam)}<br><span style="font-size:8px;font-weight:500;opacity:0.9">${rcdLabel}</span>
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
            naam: `${eindgroepIcoon(e.type)} ${esc(e.naam || "—")}`.trim(),
            kar: `${e.kar||"B"}${e.ampere||"16A"}`,
          });
        });
      });
      if (!alleLabels.length) return "";
      // 4 kolommen × n rijen, met snijlijnen (dashed border) tussen labels
      const labelHtml = alleLabels.map(l => `
        <div style="border:1px dashed #999;padding:6px 8px;text-align:center;background:#fff;page-break-inside:avoid;height:52px;display:flex;flex-direction:column;justify-content:center">
          <div style="font-weight:800;font-size:10px;color:#000;letter-spacing:0.5px">${l.nummer} · ${esc(l.naam)}</div>
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
      </div>
      <p style="font-size:8px;color:#666;margin-top:10px">${NORM_EDITIE_VOETNOOT}</p>
      <p style="font-size:8px;color:#666;margin-top:4px">${SCOPE_VOETNOOT}</p>
      ${stickerHtml()}`;

    // ── MKP: uitknipbare QR-stickerpagina (alleen als er een paspoort-QR is) ──
    const stickerHtml = () => {
      if (!data.mkpQr) return "";
      const adres = [data.postcode, data.huisnummer].filter(Boolean).join(" ") || "";
      return `
      <div style="page-break-before:always; padding-top:20px">
        <h2>Meterkastpaspoort — sticker voor op de kastdeur</h2>
        <p style="font-size:9px;margin-bottom:10px">
          Knip de sticker uit langs de stippellijn en plak hem aan de <strong>binnenzijde van de meterkastdeur</strong>.
          Elke volgende installateur scant de QR-code met de telefooncamera en ziet direct wat er op deze kast hangt.
          De gegevens zitten in de code zelf — er is geen centrale opslag. Open standaard: meterkastpaspoort.nl.
        </p>
        <div style="border:2px dashed #999; border-radius:8px; width:260px; padding:14px; text-align:center; margin:0 auto">
          <div style="font-weight:bold; font-size:12px; letter-spacing:0.5px">⚡ METERKASTPASPOORT</div>
          <div style="font-size:8px; color:#555; margin-bottom:6px">${adres}</div>
          <img src="${data.mkpQr}" style="width:200px; height:200px" alt="Meterkastpaspoort QR"/>
          <div style="font-size:8px; color:#555; margin-top:6px">Scan met je telefooncamera · bijgewerkt ${datum}</div>
          <div style="font-size:7px; color:#888; margin-top:2px">meterkastpaspoort.nl — open standaard · gemaakt met YourWkb</div>
        </div>
        <p style="font-size:8px; color:#666; margin-top:10px; text-align:center">
          Tip: geen printer bij de hand? De QR staat ook in de app — laat de klant hem fotograferen, of print hem op een labelprinter.
        </p>
        <p style="font-size:8px; color:#666; margin-top:6px; text-align:center; max-width:340px; margin-left:auto; margin-right:auto">
          <strong>Dit rapport is tevens de reservekopie van het paspoort.</strong> Sticker kwijt, beschadigd of verloren gegaan (bijv. door brand)?
          Scan de QR hierboven uit dit document en print opnieuw — elk opleverrapport bevat de paspoortstand van dat moment,
          dus de historie is zo vaak bewaard als er rapporten zijn.
        </p>
      </div>`;
    };

    let html = "";

    // ── GROEPENKAST RAPPORT ───────────────────────────────────────
    if (discipline === "groepenkast") {
      const accentGK = "#1565C0";
      const statusGK = (v, chk) => v&&v!=="—" ? (chk(v) ? `class="ok"` : `class="nok"`) : "";
      const karFacRap = { B:5, C:10, D:20 };
      const vKarRap = instMet.hoogstKar || "B";
      const vARap   = toNum(instMet.hoogstAmpere);
      const isKlasse1Rap = data.kastType === "klasse1";
      const maxAfschakeltijdRap = isKlasse1Rap
        ? ((instMet.stelsel||data.stelsel)==="TT" ? 1 : 5)
        : ((instMet.stelsel||data.stelsel)==="TT" ? 0.2 : 0.4);
      const ggLookupRap = vKarRap==="gG" ? ggIaVoorTijd(vARap, maxAfschakeltijdRap) : null;
      const zMaxVoorzekRap = vKarRap==="gG"
        ? (ggLookupRap ? Math.round((230/ggLookupRap.ia)*100)/100 : null)
        : ((karFacRap[vKarRap] && !isNaN(vARap) && vARap>0) ? Math.round((230/(karFacRap[vKarRap]*vARap))*100)/100 : null);
      // Z L-PE-norm hangt af van de aardlekschakelaar-keuze: achter aardlek ≤166Ω,
      // anders de foutstroom-norm (Z_max). Van toepassing op L-PE en 3-fase L2/L3-PE.
      const rcdAanwezigRap = instMet.rcdAanwezig ?? true;
      const zPeMaxRap = rcdAanwezigRap ? 166 : zMaxVoorzekRap;
      const zPeChkRap = v => rcdAanwezigRap ? toNum(v)<=166 : (zPeMaxRap ? toNum(v)<=zPeMaxRap : true);
      const zPeNormTxtRap = rcdAanwezigRap ? "≤166Ω (achter aardlek)" : (zMaxVoorzekRap?`≤${zMaxVoorzekRap.toFixed(2).replace(".",",")}Ω`:"—");
      html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>${esc(data.projectId)}-groepenkast</title>
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
          <tr><td><strong>Automaten</strong></td><td colspan="3">${automaten.map(a=>`${a.aantal}× ${a.fab} ${a.type!=="handmatig"?a.type:""} ${a.serie?`(${a.serie})`:""}`).join(", ")||`${aardlekgroepen.reduce((t,ag)=>t+(ag.eindgroepen||[]).length,0)}× — zie groepenoverzicht (merk/serie niet ingevuld in stap 5)`}</td></tr>
          <tr><td><strong>Aardlekschakelaars</strong></td><td colspan="3">${aardlekgroepen.map(ag=>ag.rcdType==="geen"?`${esc(ag.naam)}: geen RCD`:`${esc(ag.naam)}: ${ag.rcdMa}mA type-${ag.rcdType}`).join(" · ")||"—"}</td></tr>
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
            <td><strong>Max. afschakeltijd</strong></td><td>${String(maxAfschakeltijdRap).replace(".",",")}s (${isKlasse1Rap?"Klasse 1, verdeler-niveau":"Klasse 2, eindgroep-niveau"})</td>
            <td></td><td></td>
          </tr>
          <tr>
            <td><strong>Z L-N</strong></td><td ${statusGK(instMet.zln, v=>toNum(v)<=(zMaxVoorzekRap||999))}>${instMet.zln||"—"} Ω ${instMet.zln&&!isNaN(toNum(instMet.zln))?`(Icc≈${(230/toNum(instMet.zln)).toFixed(0)}A)`:""}</td>
            <td><strong>Z L-PE</strong></td><td ${statusGK(instMet.zlpe, zPeChkRap)}>${instMet.zlpe||"—"} Ω ${instMet.zlpe&&!isNaN(toNum(instMet.zlpe))?`(Icc≈${(230/toNum(instMet.zlpe)).toFixed(0)}A · norm ${zPeNormTxtRap})`:""}</td>
          </tr>
          ${instMet.zDrieFase ? `<tr>
            <td><strong>Z L2-N</strong></td><td ${statusGK(instMet.zl2n, v=>toNum(v)<=(zMaxVoorzekRap||999))}>${instMet.zl2n||"—"} Ω</td>
            <td><strong>Z L2-PE</strong></td><td ${statusGK(instMet.zl2pe, zPeChkRap)}>${instMet.zl2pe||"—"} Ω</td>
          </tr>
          <tr>
            <td><strong>Z L3-N</strong></td><td ${statusGK(instMet.zl3n, v=>toNum(v)<=(zMaxVoorzekRap||999))}>${instMet.zl3n||"—"} Ω</td>
            <td><strong>Z L3-PE</strong></td><td ${statusGK(instMet.zl3pe, zPeChkRap)}>${instMet.zl3pe||"—"} Ω</td>
          </tr>` : ""}
          <tr>
            <td colspan="4" style="font-size:8px;color:#666">Aardlekschakelaar achter hoogst afgaande groep: <strong>${rcdAanwezigRap?"aanwezig":"afwezig"}</strong> — Z L-PE getoetst aan ${zPeNormTxtRap}.</td>
          </tr>
          <tr>
            <td><strong>ISO totaal Fase→Aarde</strong></td><td ${statusGK(instMet.isoTotFA, v=>toNum(v)>=0.23)}>${instMet.isoTotFA||"—"} MΩ</td>
            <td><strong>ISO totaal Nul→Aarde</strong></td><td ${statusGK(instMet.isoTotNA, v=>toNum(v)>=0.23)}>${instMet.isoTotNA||"—"} MΩ</td>
          </tr>
          <tr>
            <td><strong>L1/N</strong></td><td ${statusGK(instMet["span_L1/N"], v=>toNum(v)>=207&&toNum(v)<=253)}>${instMet["span_L1/N"]||"—"} V</td>
            <td><strong>L1/PE</strong></td><td ${statusGK(instMet["span_L1/PE"], v=>toNum(v)>=207&&toNum(v)<=253)}>${instMet["span_L1/PE"]||"—"} V</td>
          </tr>
          ${(instMet.toon3fase || instMet["span_L2/N"]) ? `<tr>
            <td><strong>L2/N</strong></td><td ${statusGK(instMet["span_L2/N"], v=>toNum(v)>=207&&toNum(v)<=253)}>${instMet["span_L2/N"]||"—"} V</td>
            <td><strong>L2/PE</strong></td><td ${statusGK(instMet["span_L2/PE"], v=>toNum(v)>=207&&toNum(v)<=253)}>${instMet["span_L2/PE"]||"—"} V</td>
          </tr>
          <tr>
            <td><strong>L3/N</strong></td><td ${statusGK(instMet["span_L3/N"], v=>toNum(v)>=207&&toNum(v)<=253)}>${instMet["span_L3/N"]||"—"} V</td>
            <td><strong>L3/PE</strong></td><td ${statusGK(instMet["span_L3/PE"], v=>toNum(v)>=207&&toNum(v)<=253)}>${instMet["span_L3/PE"]||"—"} V</td>
          </tr>` : ""}
          <tr>
            <td><strong>Frequentie</strong></td><td ${statusGK(instMet.frequentie, v=>toNum(v)>=45&&toNum(v)<=55)}>${instMet.frequentie||"—"} Hz</td>
            <td></td><td></td>
          </tr>
          ${instMet.zDrieFase || instMet["span_L1/L2"] ? `<tr>
            <td><strong>L1/L2</strong></td><td ${statusGK(instMet["span_L1/L2"], v=>toNum(v)>=360&&toNum(v)<=440)}>${instMet["span_L1/L2"]||"—"} V</td>
            <td><strong>L2/L3</strong></td><td ${statusGK(instMet["span_L2/L3"], v=>toNum(v)>=360&&toNum(v)<=440)}>${instMet["span_L2/L3"]||"—"} V</td>
          </tr>
          <tr>
            <td><strong>L1/L3</strong></td><td ${statusGK(instMet["span_L1/L3"], v=>toNum(v)>=360&&toNum(v)<=440)}>${instMet["span_L1/L3"]||"—"} V</td>
            <td></td><td></td>
          </tr>` : ""}
        </table>

        ${(() => {
          const groepen = instMet.isoGroepen || [];
          if (!groepen.length) return "";
          const rijen = groepen.map((g,i)=>{
            const norm = 0.23; // naar aarde: elke fase staat t.o.v. aarde op 230V → ≥0,23 MΩ, ook bij 3-fase
            const velden = g.driefase
              ? [["L1→A","l1a"],["L2→A","l2a"],["L3→A","l3a"],["N→A","na"]]
              : [["Fase→A","fa"],["Nul→A","na"]];
            const cel = velden.map(([lbl,k])=>{
              const v = g[k];
              const st = v&&v!=="—" ? (toNum(v)>=norm?`class="ok"`:`class="nok"`) : "";
              return `<span ${st} style="padding:1px 4px;border-radius:3px;margin-right:4px;display:inline-block">${lbl}: ${v||"—"}</span>`;
            }).join("");
            return `<tr><td><strong>${esc(g.naam||`Groep ${i+1}`)}</strong></td><td>${g.driefase?"3-fase":"1-fase"} (≥${norm} MΩ)</td><td>${cel}</td></tr>`;
          }).join("");
          return `
          <h2>Isolatieweerstand per groep</h2>
          <p style="font-size:8px;color:#666;margin-bottom:4px">Norm ≥0,23 MΩ, gemeten naar aarde op 250V.</p>
          <table>
            <tr><th>Groep</th><th>Type</th><th>Isolatieweerstand (MΩ)</th></tr>
            ${rijen}
          </table>`;
        })()}

        ${(() => {
          const veld = data.veldmeting || {};
          const geselecteerdRap = aardlekgroepen.filter(ag => ag.veldmetingSelectie);
          if (geselecteerdRap.length === 0) return "";
          const RHO_RAP = 0.023;
          const rijenRap = geselecteerdRap.map(ag => {
            const dikte = toNum(veld[`${ag.id}_dikte`]) || 2.5;
            const zlnV = veld[`${ag.id}_zln`];
            const zlpeV = veld[`${ag.id}_zlpe`];
            const lenZln = toNum(zlnV) > 0 ? ((toNum(zlnV)*dikte)/(2*RHO_RAP)).toFixed(1).replace(".",",") : "—";
            const lenZlpe = toNum(zlpeV) > 0 ? ((toNum(zlpeV)*dikte)/(2*RHO_RAP)).toFixed(1).replace(".",",") : "—";
            // Z L-PE-norm per groep: achter aardlek ≤166Ω, anders foutstroom-norm (Z_max).
            const rcdRaw = veld[`${ag.id}_rcd`];
            const rcdVeldRap = rcdRaw === undefined ? (ag.rcdType !== "geen") : (rcdRaw === true || rcdRaw === "1");
            const zlpeChkRap = v => rcdVeldRap ? toNum(v)<=166 : (zMaxVoorzekRap?toNum(v)<=zMaxVoorzekRap:true);
            const peNorm = rcdVeldRap ? "≤166Ω" : (zMaxVoorzekRap?`≤${zMaxVoorzekRap.toFixed(2).replace(".",",")}Ω`:"—");
            return `<tr>
              <td><strong>${esc(ag.naam)}</strong></td>
              <td>${dikte} mm²</td>
              <td ${statusGK(zlnV, v=>zMaxVoorzekRap?toNum(v)<=zMaxVoorzekRap:true)}>${zlnV||"—"} Ω</td>
              <td>${lenZln}m</td>
              <td ${statusGK(zlpeV, zlpeChkRap)}>${zlpeV||"—"} Ω<br><span style="font-size:7px;color:#666">${rcdVeldRap?"achter aardlek":"foutstroom"} ${peNorm}</span></td>
              <td>${lenZlpe}m</td>
            </tr>`;
          }).join("");
          return `
          <h2>Veldmeting — verste/buitengroep</h2>
          <p style="font-size:8px;color:#666;margin-bottom:4px">
            Z L-N gemeten op de verste wandcontactdoos, getoetst aan de norm van sectie A (Z_max=${zMaxVoorzekRap?zMaxVoorzekRap.toFixed(2).replace(".",",")+"Ω":"—"} obv ${instMet.hoogstKar||"—"}${instMet.hoogstAmpere||"—"}A). Z L-PE: achter een aardlekschakelaar geldt ≤166Ω (aanraakspanning), anders de foutstroom-norm. Indicatieve kabellengte via L = Z × A ÷ (2 × ρ), ρ = 0,023 Ω·mm²/m — een indicatie, geen exacte meting.
          </p>
          <table>
            <tr>
              <th>Aardlekgroep</th><th>Kabeldikte</th><th>Z L-N</th><th>Lengte (Z L-N)</th><th>Z L-PE</th><th>Lengte (Z L-PE)</th>
            </tr>
            ${rijenRap}
          </table>`;
        })()}

        <p style="font-size:8px;color:#666;margin-bottom:4px">
          ΔT-norm: ≤300ms (EN 61008 apparaatnorm bij 1× In). ΔI-norm: type AC ≤1× In · type A ≤1,4× In · type B ≤2× In. Isolatieweerstand: ISO totaal (sectie B) plus de eventueel per groep vastgelegde metingen (zie tabel "Isolatieweerstand per groep").
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
            const eindLijst = (ag.eindgroepen||[]).map(e=>`${e.id===hoogst?.id?"⭐ ":""}${eindgroepIcoon(e.type)} ${esc(e.naam)} (${e.kar}${e.ampere})`).join("<br>");
            return `<tr>
              <td><strong>${esc(ag.naam)}</strong></td>
              <td style="font-size:8px">${eindLijst}</td>
              <td>${ag.fase==="3"?"3F 400V":(ag.L?`1F ${esc(ag.L)}`:"1F 230V")}</td>
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
        <title>${esc(data.projectId)}-combiketel</title>
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
        <title>${esc(data.projectId)}-warmtepomp</title>
        <style>${css(accentWP)}</style></head><body>
        ${logoHtml()}
        <h1>Opleveringsrapport</h1>
        <p style="font-size:11px;color:#555;margin-bottom:12px">Warmtepompinstallatie · ${data.wpType||""} · ${data.wpType==="Bodem/water (grond)" ? "BRL 6000-21" : "F-gassenverordening · BRL 100/200"}</p>
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
          <tr><td>ΔT verwarmingscircuit</td><td>${dtWp!==null?dtWp.toFixed(1).replace(".",","):"—"} K</td><td>5–10K</td>
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
        ${data.wpType==="Bodem/water (grond)"
          ? signHtml("BRL 6000-21, NEN 1010","De bodemgebonden warmtepompinstallatie is geplaatst conform BRL 6000-21 (bodemenergiesystemen, bovengrondse deel); het ondergrondse deel (boring/bronnen) valt onder een SIKB 11000-gecertificeerde boorfirma. Het elektrotechnische deel voldoet aan NEN 1010. De metingen aan het verwarmingscircuit, de bron en de elektrische aansluiting voldoen aan de gestelde eisen. De installatie is veilig in bedrijf gesteld.")
          : signHtml("F-gassenverordening (BRL 100/200), NEN-EN 378, NEN 1010","De warmtepompinstallatie is geplaatst conform de geldende regelgeving: eventuele koudemiddelhandelingen zijn uitgevoerd onder geldige F-gassencertificering (BRL 100 bedrijfscertificaat en BRL 200 persoonscertificaat), het koudemiddelcircuit voldoet aan NEN-EN 378 en het elektrotechnische deel aan NEN 1010. De buitenunit voldoet aan de geluidseis uit het Besluit bouwwerken leefomgeving (max. 40 dB op de perceelgrens in de nachtperiode). De metingen aan het verwarmingscircuit, de bron en de elektrische aansluiting voldoen aan de gestelde eisen. De installatie is veilig in bedrijf gesteld.")}
        </body></html>`;

    // ── ZONNEPANELEN RAPPORT ──────────────────────────────────────
    } else if (discipline === "laadpaal") {
      const lm = data.lpMeet || {};
      const lb = data.mkp || {};
      html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>${esc(data.projectId)}-laadpaal</title>
        <style>${css("#22C55E")}</style></head><body>
        ${logoHtml()}
        <h1>Opleveringsrapport</h1>
        <p style="font-size:11px;color:#555;margin-bottom:12px">EV-laadvoorziening · ${data.lpMerk||""} ${data.lpVermogen||""} · NEN 1010:2020</p>
        ${nawHtml()}
        <h2>Laadpunt & aansluiting</h2>
        <table>
          <tr><td><strong>Laadpunt</strong></td><td>${data.lpMerk||"—"}</td><td><strong>Vermogen</strong></td><td>${data.lpVermogen||"—"}</td></tr>
          <tr><td><strong>Aansluiting</strong></td><td>${data.lpFasen||"—"}-fase</td><td><strong>Kabel</strong></td><td>${data.lpKabelMm2||"—"} mm² · ${data.lpKabelLengte||"—"} m</td></tr>
        </table>
        <h2>Beveiliging & metingen</h2>
        <table>
          <tr><td><strong>Aardlek laadgroep</strong></td><td>Type ${lm.aardlekType||"—"}${lm.aardlekType==="A" ? ` (6 mA DC-detectie in laadpunt: ${lm.dcDetectie||"—"})` : ""}</td>
              <td><strong>Uitschakeltijd</strong></td><td>${lm.aardlekMs||"—"} ms</td></tr>
          <tr><td><strong>Isolatieweerstand</strong></td><td>${lm.iso||"—"} MΩ (norm ≥ 0,23)</td>
              <td><strong>Spanningsverlies vollast</strong></td><td>${lm.spanningsverlies||"—"} % (norm ≤ 5)</td></tr>
          <tr><td><strong>Z L-N / Z L-PE</strong></td><td>${lm.zln||"—"} / ${lm.zlpe||"—"} Ω</td>
              <td><strong>Fasevolgorde</strong></td><td>${data.lpFasen==="3" ? (lm.fasevolgorde==="ok"?"gecontroleerd, OK":"—") : "n.v.t. (1-fase)"}</td></tr>
          <tr><td><strong>Functionele laadtest</strong></td><td colspan="3">${lm.laadtest==="ja"?"uitgevoerd met voertuig — geslaagd":lm.laadtest==="nee"?"NIET geslaagd":"—"}</td></tr>
        </table>
        <h2>Load balancing / vermogenssturing</h2>
        <table>
          <tr><td><strong>Sturing</strong></td><td>${lb.lbAan===true ? `${lb.lbTyp==="dyn"?"dynamisch":"statisch"}${lb.lbMax?` · begrensd op ${lb.lbMax} A`:""}${lb.lbReg?` · regisseur: ${lb.lbReg}`:""}` : lb.lbAan===false ? "niet aanwezig — belasting geldt ongestuurd" : "—"}</td></tr>
        </table>
        <p style="font-size:9px;color:#666">Load balancing is een instelbare softwarematige begrenzing en geen veiligheidsmaatregel; de vaste installatie en beveiliging zijn gedimensioneerd onafhankelijk van deze sturing. De instelling is vastgelegd in het meterkastpaspoort.</p>
        ${fotosHtml(LP_FOTO_CPS)}
        ${signHtml("NEN 1010:2020 (laadvoorzieningen EV)","De laadvoorziening is aangelegd conform NEN 1010:2020, met de daarin opgenomen bepalingen voor laadvoorzieningen van elektrische voertuigen (aardlekbeveiliging met DC-foutstroomdetectie, afzonderlijke eindgroep). De metingen en de functionele laadtest voldoen aan de gestelde eisen. De installatie is veilig in bedrijf gesteld.")}
        </body></html>`;
    } else if (discipline === "batterij") {
      const bm = data.batMeet || {};
      const mk = data.mkp || {};
      const plaatsing = { ventilatie:"Ventilatie", temp:"Temperatuurbereik", brandbaar:"Afstand brandbaar", vluchtweg:"Buiten vluchtweg", dragend:"Dragende ondergrond" };
      html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>${esc(data.projectId)}-thuisbatterij</title>
        <style>${css("#8B5CF6")}</style></head><body>
        ${logoHtml()}
        <h1>Opleveringsrapport</h1>
        <p style="font-size:11px;color:#555;margin-bottom:12px">Thuisbatterij · ${data.batMerk||""} ${data.batKwh?data.batKwh+" kWh":""} · NEN 1010:2020</p>
        ${nawHtml()}
        <h2>Systeem</h2>
        <table>
          <tr><td><strong>Batterij</strong></td><td>${data.batMerk||"—"}</td><td><strong>Capaciteit</strong></td><td>${data.batKwh||"—"} kWh</td></tr>
          <tr><td><strong>Max. (ont)laadvermogen</strong></td><td>${data.batKw||"—"} kW</td><td><strong>Koppeling</strong></td><td>${data.batKoppeling||"—"}-gekoppeld</td></tr>
          <tr><td><strong>Back-up/eilandbedrijf</strong></td><td colspan="3">${data.batEiland==="ja" ? `ja — omschakeltest ${bm.eilandtest==="ja"?"geslaagd":"NIET geslaagd/uitgevoerd"}` : "nee"}</td></tr>
        </table>
        <h2>Plaatsingseisen</h2>
        <table>
          ${Object.entries(plaatsing).map(([id,l])=>`<tr><td><strong>${l}</strong></td><td>${bm[`pl_${id}`]==="ja"?"voldaan":bm[`pl_${id}`]==="nee"?"NIET voldaan":"—"}</td></tr>`).join("")}
        </table>
        <h2>Metingen & veiligheid</h2>
        <table>
          <tr><td><strong>Isolatieweerstand batterijgroep</strong></td><td>${bm.iso||"—"} MΩ (norm ≥ 0,23)</td>
              <td><strong>Aardlektest</strong></td><td>${bm.aardlekMs||"—"} ms</td></tr>
          <tr><td><strong>Brandweersticker meterkast</strong></td><td>${bm.brandweersticker==="ja"?"geplaatst":bm.brandweersticker==="nee"?"ONTBREEKT":"—"}</td>
              <td><strong>Melding netbeheerder</strong></td><td>${bm.meldingNetbeheerder==="ja"?`gedaan (energieleveren.nl${mk.ean?`, EAN ${mk.ean}`:""})`:"nog niet gedaan"}</td></tr>
        </table>
        ${fotosHtml(BAT_FOTO_CPS)}
        ${signHtml("NEN 1010:2020","De thuisbatterij is geplaatst en aangesloten conform NEN 1010:2020, met inachtneming van de fabrikantvoorschriften voor opstelling en ventilatie. De metingen voldoen aan de gestelde eisen, de aanwezigheid van het systeem is op de meterkast gemarkeerd en de installatie is bij de netbeheerder gemeld. De installatie is veilig in bedrijf gesteld.")}
        </body></html>`;
    } else {
      const accentPV = "#EA580C";
      const statusPV = (v, chk) => v&&v!=="—" ? (chk(v) ? `class="ok"` : `class="nok"`) : "";
      const totaalKwp = ((parseInt(data.aantalPanelen)||0)*(parseInt(data.paneelWp)||0)/1000).toFixed(2).replace(".",",");
      html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>${esc(data.projectId)}-zonnepanelen</title>
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
        <title>${esc(data.projectId)}-bijlage</title>
        <style>${css(accentGK)}</style></head><body>
        ${logoHtml()}
        <h1>Bijlage opleverrapport</h1>
        <p style="font-size:11px;color:#555;margin-bottom:16px">Behoort bij rapport <strong>${esc(data.projectId||"")}</strong> · ${esc(data.straat||"")} ${esc(data.huisnummer||"")}, ${esc(data.plaats||"")}</p>
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
    // Print via een verborgen sandboxed iframe (audit BEV-03): het rapport kan
    // printen (allow-same-origin + allow-modals) maar script erin draait niet.
    const oud = document.getElementById("ywkb-print-frame");
    if (oud) oud.remove();
    const frame = document.createElement("iframe");
    frame.id = "ywkb-print-frame";
    frame.setAttribute("sandbox", "allow-same-origin allow-modals");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    frame.srcdoc = `<!DOCTYPE html><html><head><title>${esc(data.projectId||"rapport")}-${esc(discipline)}</title><style>@media print{body{margin:0}}</style></head><body>${pdfHtml}</body></html>`;
    frame.onload = () => {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); }
      catch { alert("Printen lukte niet — gebruik het voorbeeld en je browser-printfunctie."); }
    };
    document.body.appendChild(frame);
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

      // Meterkastpaspoort-QR: mailclients blokkeren data-URI-afbeeldingen,
      // dus de QR gaat als inline-bijlage mee (cid) — de route zet hem als
      // attachment met content_id, en hier verwijst de img daarnaar.
      const qrPng = (typeof data.mkpQr === "string" && data.mkpQr.startsWith("data:image/png;base64,"))
        ? data.mkpQr : null;
      const htmlMetQr = qrPng
        ? htmlZonderFotos.split(qrPng).join("cid:mkpqr")
        : htmlZonderFotos;

      // Persoonlijke aanhef toevoegen vóór de inhoud van het rapport
      const introHtml = htmlMetQr.replace(
        "<body>",
        `<body><div style="max-width:680px;margin:0 auto 20px;font-family:Arial,sans-serif;font-size:13px;color:#333;line-height:1.6">
          <p>Beste ${esc(data.naam||"")},</p>
          <p>Hierbij ontvangt u het opleverrapport van de werkzaamheden uitgevoerd door ${data.instNaam||"uw installateur"}. Dit rapport voldoet aan de geldende normen en is automatisch gegenereerd via YourWkb.</p>
        </div>`
      );
      // Simpele e-mailvalidatie voor reply_to — Resend wijst het hele verzoek af met
      // "Invalid 'reply_to' field" als hier iets staat dat geen geldig e-mailadres is
      // (bijv. een spatie, tikfout, of auto-fill dat niet volledig is ingevuld).
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const geldigeReplyTo = data.instEmail && emailRegex.test(data.instEmail.trim()) ? data.instEmail.trim() : undefined;

      const resp = await fetch("/api/verstuur-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: data.email,
          replyTo: geldigeReplyTo,
          subject: `Opleverrapport ${data.projectId||""} – ${data.straat||""} ${data.huisnummer||""}`.trim(),
          qr: qrPng || undefined,
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
        <div><div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Rapport genereren</div><div style={{fontSize:12,color:K.muted}}>{disc?.label}</div></div>
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
              <div><div style={{fontSize:20,fontWeight:800}}>{(data.automaten||[]).reduce((s,a)=>s+a.aantal,0) || aardlekgroepen.reduce((s,ag)=>s+(ag.eindgroepen||[]).length,0)}</div><div style={{fontSize:11,color:K.muted}}>Automaten</div></div>
            </>}
            {discipline==="cv" && <>
              <div><div style={{fontSize:20,fontWeight:800}}>{data.ketelFab||"—"}</div><div style={{fontSize:11,color:K.muted}}>Fabrikant</div></div>
              <div><div style={{fontSize:20,fontWeight:800}}>{data.ketelKw||"—"}</div><div style={{fontSize:11,color:K.muted}}>kW</div></div>
              <div><div style={{fontSize:20,fontWeight:800}}>{data.cvMeet?.coNa||"—"}</div><div style={{fontSize:11,color:K.muted}}>CO ná ppm</div></div>
            </>}
            {discipline==="pv" && <>
              <div><div style={{fontSize:20,fontWeight:800}}>{data.aantalPanelen||"—"}</div><div style={{fontSize:11,color:K.muted}}>Panelen</div></div>
              <div><div style={{fontSize:20,fontWeight:800}}>{strings.length}</div><div style={{fontSize:11,color:K.muted}}>Strings</div></div>
              <div><div style={{fontSize:20,fontWeight:800}}>{((parseInt(data.aantalPanelen)||0)*(parseInt(data.paneelWp)||0)/1000).toFixed(1).replace(".",",")}</div><div style={{fontSize:11,color:K.muted}}>kWp</div></div>
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
              <iframe srcDoc={pdfHtml} sandbox="" style={{width:"100%",height:"100%",border:"none",background:"#fff"}} title="rapport"/>
            </div>
            <button style={{...S.btn,background:K.green,color:"#fff"}} onClick={download}>
              🖨️ Openen &amp; opslaan als PDF
            </button>

            {/* Bijlage met groepenschema + uitknipbare labels (alleen GK) */}
            {bijlageHtml && (
              <button style={S.btnGhost} onClick={() => {
                const win = window.open("", "_blank");
                win.document.write(`
                  <!DOCTYPE html><html><head>
                    <title>${esc(data.projectId||"rapport")}-bijlage</title>
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
                📧 Mail rapport naar klant{data.email?` (${esc(data.email)})`:""}
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
                <button style={{...S.btnGhost,marginBottom:0}} onClick={verstuurEmail}>Opnieuw proberen</button>
              </div>
            )}

            <button style={{...S.btn,background:K.yellow,color:"#000"}} onClick={onSend}>
              ✅ Markeren als opgeleverd
            </button>
          </>
        )}
        <button style={S.btnGhost} onClick={onBack}>Terug</button>
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
// ─── BACK-UP & DELEN ─────────────────────────────────────────────────────────
const KLANT_VELDEN = ["naam","email","straat","plaats","postcode","huisnummer","toevoeging"];

function anonimiseerJob(job) {
  const schoon = { ...job };
  KLANT_VELDEN.forEach(k => { delete schoon[k]; });
  delete schoon.mkpUrl; delete schoon.mkpQr;      // bevatten adres — ontvanger genereert opnieuw
  if (schoon.mkp) { const m = { ...schoon.mkp }; delete m.ean; delete m.ean2; schoon.mkp = m; }
  delete schoon.mkpImport;
  return schoon;
}

function downloadJson(naam, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = naam;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function BackupScherm({ onBack, onGewijzigd, startBestand, naVerwerkt }) {
  const [projecten, setProjecten] = useState(laadProjecten());
  const [importLijst, setImportLijst] = useState(null);   // projecten uit gekozen bestand
  const [melding, setMelding] = useState("");
  const fileRef = useRef(null);

  // Bestand dat via het Android-deelmenu binnenkwam ("Delen → YourWkb"):
  useEffect(() => {
    if (!startBestand) return;
    try {
      const d = JSON.parse(startBestand);
      const lijst = d.type==="gedeeld-project" && d.project ? [d.project]
                  : Array.isArray(d.projecten) ? d.projecten : null;
      if (lijst && lijst.length) {
        setImportLijst(lijst.map(p => ({ ...p, _gedeeld: d.type==="gedeeld-project" })));
        setMelding("📥 Bestand ontvangen via delen — controleer hieronder en zet terug.");
      } else {
        setMelding("⚠️ Het gedeelde bestand bevat geen YourWkb-projecten.");
      }
    } catch {
      setMelding("⚠️ Het gedeelde bestand is geen YourWkb-back-up of project.");
    }
    naVerwerkt?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startBestand]);
  const D_LABEL = Object.fromEntries(DISCIPLINES.map(d=>[d.id, `${d.icon} ${d.label}`]));
  const fmt = (t) => new Date(t||Date.now()).toLocaleDateString("nl-NL",{day:"numeric",month:"short",year:"numeric"});
  const omschrijf = (p) => `${D_LABEL[p.discipline]||p.discipline||"—"} · ${p.job?.naam||"(geen naam)"} · ${[p.job?.postcode,p.job?.huisnummer].filter(Boolean).join(" ")||"geen adres"}`;

  const exporteerAlles = () => {
    const datum = new Date().toISOString().slice(0,10);
    downloadJson(`yourwkb-backup-${datum}.json`,
      { app:"yourwkb", type:"backup", versie:1, exportDatum:datum, projecten });
    setMelding(`✓ Back-up met ${projecten.length} project${projecten.length===1?"":"en"} gedownload — bewaar hem buiten dit apparaat (mail naar jezelf, Dropbox, USB).`);
    trackEvent("backup_geexporteerd", { aantal: projecten.length });
  };

  const deelProject = async (p) => {
    const schoon = { ...p, id: undefined, status:"concept", job: anonimiseerJob(p.job||{}) };
    const inhoud = { app:"yourwkb", type:"gedeeld-project", versie:1, geanonimiseerd:true, project: schoon };
    // .txt/text-plain: Android's deelmenu accepteert alleen een vaste lijst
    // bestandstypen — application/json hoort daar NIET bij (canShare → false →
    // stille download-fallback). Als platte tekst deelt hij wél gewoon.
    const naam = `yourwkb-project-${(p.discipline||"klus")}-${new Date().toISOString().slice(0,10)}.txt`;
    const blob = new Blob([JSON.stringify(inhoud)], { type:"text/plain" });
    const bestand = new File([blob], naam, { type:"text/plain" });
    if (navigator.canShare && navigator.canShare({ files:[bestand] })) {
      try {
        await navigator.share({ files:[bestand], title:"YourWkb-project",
          text:"Geanonimiseerd YourWkb-project — importeren via Back-up & delen in de app." });
        trackEvent("project_gedeeld", { discipline: p.discipline });
        return;
      } catch { /* geannuleerd of niet gelukt → download-fallback */ }
    }
    downloadJson(naam, inhoud);
    setMelding("✓ Deelbestand gedownload — stuur het via WhatsApp of mail naar je collega. Klantgegevens, EAN en QR zijn eruit gehaald.");
  };

  const kiesBestand = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const lezer = new FileReader();
    lezer.onload = () => {
      try {
        const d = JSON.parse(lezer.result);
        const lijst = d.type==="gedeeld-project" && d.project ? [d.project]
                    : Array.isArray(d.projecten) ? d.projecten : null;
        if (!lijst || !lijst.length) throw new Error("geen projecten gevonden");
        setImportLijst(lijst.map(p => ({ ...p, _gedeeld: d.type==="gedeeld-project" })));
        setMelding("");
      } catch {
        setMelding("⚠️ Dit bestand is geen YourWkb-back-up of gedeeld project.");
        setImportLijst(null);
      }
    };
    lezer.readAsText(f);
    e.target.value = "";
  };

  const zetTerug = (welke) => {
    const huidig = laadProjecten();
    const bestaandeIds = new Set(huidig.map(p=>p.id));
    let lijst = huidig;
    welke.forEach(p => {
      const kopie = { ...p };
      delete kopie._gedeeld;
      if (!kopie.id || bestaandeIds.has(kopie.id)) kopie.id = "p" + Date.now() + Math.floor(Math.random()*1000);
      kopie.updatedAt = kopie.updatedAt || Date.now();
      lijst = upsertProject(lijst, kopie);
      bestaandeIds.add(kopie.id);
    });
    bewaarProjecten(lijst);
    setProjecten(laadProjecten());
    setImportLijst(null);
    setMelding(`✓ ${welke.length} project${welke.length===1?"":"en"} teruggezet — zichtbaar op het startscherm.`);
    onGewijzigd?.();
    trackEvent("backup_geimporteerd", { aantal: welke.length });
  };

  return (
    <div>
      <div style={S.hdr}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Back-up & delen</div><div style={{fontSize:12,color:K.muted}}>Projecten veiligstellen of overdragen</div></div>
      </div>
      <div style={S.body}>

        <div style={{...S.card, marginBottom:12}}>
          <div style={{fontWeight:700, fontSize:13, marginBottom:4}}>Project back-up & delen</div>
          <div style={{fontSize:12, color:K.muted, marginBottom:6}}>
            Draag een project over aan een collega — klantgegevens, EAN en paspoort-QR worden automatisch verwijderd.
            <strong>💬 Deel</strong> stuurt het complete project als bestand — inclusief alle foto's, zodat je collega
            het werk goed kan beoordelen. Kies in het deelmenu <strong>WhatsApp</strong> (of mail).
          </div>
          {!projecten.length && <div style={{fontSize:12, color:K.muted}}>Nog geen projecten om te delen.</div>}
          {projecten.map(p=>(
            <div key={p.id} style={{display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${K.border}`}}>
              <div style={{fontSize:20, flexShrink:0}}>{(DISCIPLINES.find(d=>d.id===p.discipline)||{}).icon||"📄"}</div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:13, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                  {p.job?.naam || "(geen klantnaam)"}{(p.job?.postcode||p.job?.huisnummer) ? ` · ${[p.job?.postcode, [p.job?.huisnummer,p.job?.toevoeging].filter(Boolean).join(" ")].filter(Boolean).join(" ")}` : ""}
                </div>
                <div style={{fontSize:11, color:K.muted}}>
                  {(DISCIPLINES.find(d=>d.id===p.discipline)||{}).label||p.discipline||"—"} · {fmt(p.updatedAt)}{p.status==="opgeleverd"?" · opgeleverd":""}
                </div>
              </div>
              <button style={{padding:"9px 14px", fontSize:12, fontWeight:700, borderRadius:9, cursor:"pointer", fontFamily:"inherit",
                              background:"#25D366", border:"none", color:"#000", flexShrink:0}}
                onClick={()=>deelProject(p)}>💬 Deel</button>
            </div>
          ))}
        </div>

        <div style={{...S.card, marginBottom:12}}>
          <div style={{fontWeight:700, fontSize:13, marginBottom:4}}>Volledige back-up</div>
          <div style={{fontSize:12, color:K.muted, marginBottom:10}}>
            Alle {projecten.length} project{projecten.length===1?"":"en"} (inclusief foto's) in één bestand.
            Projecten staan alléén op dit apparaat — een back-up buiten de telefoon is je verzekering tegen verlies, wissen of een nieuw toestel.
          </div>
          <button style={{...S.btn, width:"100%", background:K.yellow, color:"#000"}} onClick={exporteerAlles} disabled={!projecten.length}>
            ⬇️ Download back-up ({projecten.length})
          </button>
        </div>

        <div style={{...S.card, marginBottom:12}}>
          <div style={{fontWeight:700, fontSize:13, marginBottom:4}}>Terugzetten / importeren</div>
          <div style={{fontSize:12, color:K.muted, marginBottom:10}}>
            Kies een back-upbestand of een gedeeld project van een collega.
            <br/><strong>Ontvangen via WhatsApp?</strong> Druk in WhatsApp <strong>lang op het bestand</strong> → tik <strong>Delen</strong> → kies <strong>YourWkb</strong>.
            De app opent dan vanzelf met het project klaar om terug te zetten.
            <br/><span style={{color:K.muted}}>Staat YourWkb er (nog) niet tussen? Werk de app-installatie bij (verwijder het icoon en zet de app opnieuw op je beginscherm) — of gebruik "Kies bestand…" hieronder.</span>
          </div>
          <input ref={fileRef} type="file" accept=".json,.txt,application/json,text/plain" style={{display:"none"}} onChange={kiesBestand}/>
          {/* Ghost i.p.v. geel: op dit scherm stonden twee even luide gele
              knoppen onder elkaar, waardoor je moest lezen voordat je kon
              tikken. Back-up maken is de handeling waarvoor je hier komt;
              terugzetten doe je bij een nieuw toestel of een bestand van een
              collega. Geel blijft daarmee 'hier tikken' betekenen. */}
          <button style={S.btnGhost} onClick={()=>fileRef.current?.click()}>
            📂 Kies bestand…
          </button>
          {importLijst && (
            <div style={{marginTop:12}}>
              <div style={{fontSize:12, fontWeight:700, marginBottom:6}}>In dit bestand:</div>
              {importLijst.map((p,i)=>(
                <div key={i} style={{fontSize:12, padding:"7px 0", borderBottom:`1px solid ${K.border}`, display:"flex", justifyContent:"space-between", gap:8}}>
                  <span style={{flex:1, minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                    {omschrijf(p)}{p._gedeeld && <span style={{color:K.yellow}}> · gedeeld (geanonimiseerd)</span>}
                  </span>
                  <span style={{color:K.muted, flexShrink:0}}>{fmt(p.updatedAt)}</span>
                </div>
              ))}
              <button style={{...S.btn, width:"100%", background:K.green, color:"#000", marginTop:10}} onClick={()=>zetTerug(importLijst)}>
                ✓ {importLijst.length===1?"Dit project":"Alle "+importLijst.length+" projecten"} terugzetten
              </button>
              <div style={{fontSize:11, color:K.muted, marginTop:6}}>Bestaande projecten blijven staan; dubbele krijgen een nieuw nummer.</div>
            </div>
          )}
        </div>

        {/* Melding als statusvlak i.p.v. een kaart met een gekleurd streepje
            links: het teken en de kleur zitten nu in het vlak zelf, en de tekst
            staat op 15px in plaats van 12. Het ⚠/✅-teken zat al in de
            meldingstekst en wordt hier weggehaald — het vlak toont het zelf. */}
        {melding && (
          <StatusVlak
            level={melding.startsWith("⚠") ? "warn" : "ok"}
            titel={melding.replace(/^([⚠✅✓]️?\s*)/,"")}
            style={{marginTop:4}}
          />
        )}
      </div>
    </div>
  );
}

function DisciplineKiezer({ onKies, onBack }) {
  return (
    <div>
      <div style={S.hdr}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Kies discipline</div><div style={{fontSize:12,color:K.muted}}>Wat ga je registreren?</div></div>
      </div>
      <div style={S.body}>
        <div style={{fontSize:12,color:K.muted,marginBottom:16}}>Kies de discipline voor deze registratie. Elke discipline heeft eigen velden, normen en rapport.</div>
        {DISCIPLINES.map(d=>(
          <div key={d.id} style={{...S.card, cursor:"pointer",
            border:`1px solid ${d.colorDim}`,
            background:`linear-gradient(135deg,${d.colorDim},${K.card})`,
          }} onClick={()=>onKies(d.id)}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:48,height:48,borderRadius:12,flexShrink:0,background:`${d.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>
                {d.icon}
              </div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:16,color:K.text}}>{d.label}</div>
                <div style={{fontSize:12,color:K.muted}}>{d.sub}</div>
                <div style={{fontSize:11,color:d.color,fontWeight:600,marginTop:2}}>{d.norm}</div>
              </div>
              <div style={{fontSize:20,color:d.color}}>→</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── HOME SCHERM ──────────────────────────────────────────────────────────────
function HomeScreen({ onNew, onDoorgaan, onVerwijder, idbKlaar, onBackup }) {
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
    // Bewust GEEN statuspil in deze rij, in afwijking van design-spec paragraaf 4.
    // Drie varianten zijn geprobeerd (pil rechts gestapeld, pil rechts naast de
    // knop, pil naast het projectnummer). Alle drie kostten wat ze moesten
    // opleveren: op 375px is de middenkolom 203px en een pil "✓ Opgeleverd" is
    // alleen al 112px, waardoor óf de klantnaam tot "Bouwb…" kromp óf het
    // projectnummer afbrak — en dat nummer is wat je aan een klant doorgeeft.
    // De status staat bovendien al twee keer op het scherm: de lijst is gesplitst
    // in de kopjes "Concepten (n)" en "Opgeleverd (n)", en het icoonvlak is groen
    // met ✅ bij opgeleverd en geel bij concept. Een pil herhaalt dat alleen.
    // Wat de rij wél leesbaarder maakt, zit er nu in: klantnaam van 13 naar 16px,
    // discipline/stap van 11 naar 13px, en een verwijderknop van 24 naar 36px.
    return (
      <div style={{...S.rij,minHeight:76,padding:"12px 14px",cursor:"pointer"}} onClick={()=>onDoorgaan(p)}>
        <div style={{width:44,height:44,borderRadius:10,flexShrink:0,background:isDone?K.greenDim:K.yellowDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>
          {isDone?"✅":disc?.icon||"📄"}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:800,fontSize:13,color:K.yellow,letterSpacing:0.3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.job?.projectId||"Nieuw project"}</div>
          <div style={{fontWeight:500,fontSize:16,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.job?.naam||"—"}</div>
          <div style={{fontSize:13,color:K.muted}}>{disc?.label}{!isDone?` · stap ${(p.step||0)+1}`:""}</div>
        </div>
        <button onClick={e=>verwijder(p.id,e)}
          aria-label="Project verwijderen"
          style={{width:36,height:36,flex:"0 0 36px",background:"transparent",border:`1px solid ${K.border}`,borderRadius:10,color:K.muted,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent"}}>✕</button>
      </div>
    );
  };

  return (
    <div>
      <div style={S.hdr}>
        <div style={{width:34,height:34,borderRadius:9,background:K.yellow,display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="#000000" aria-hidden="true"><path d="M13 2 L3 14 h7 l-1 8 L19 10 h-7 l1-8 z"/></svg></div>
        <div><div style={{fontWeight:700,fontSize:16}}>YourWkb</div><div style={{fontSize:12,color:K.muted}}>Installatie opleverrapporten</div></div>
        {/* Versie rechts in de kop — bij een melding uit het veld weet je meteen
            welke versie de installateur draait. Alleen weergave, geen knop. */}
        <div style={{marginLeft:"auto",fontSize:12,color:K.muted,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>
          v{APP_VERSIE}
        </div>
      </div>
      <div style={S.body}>

        {/* Snelkeuze disciplines — dé ingang voor een nieuwe klus */}
        <div style={{fontSize:13,color:K.yellow,fontWeight:700,marginBottom:8}}>+ NIEUWE REGISTRATIE</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          {/* Het icoon zit in een gekleurd vlak van 28px, zodat de zes tegels
              op vorm én kleur te onderscheiden zijn zonder te lezen. De spec
              stelde een leeg kleurvlak zónder icoon voor; het icoon is juist
              het snelste herkenpunt, dus die blijft — in het vlak. */}
          {DISCIPLINES.map(d=>(
            <div key={d.id} style={{...S.card,padding:14,minHeight:92,marginBottom:0,cursor:"pointer",border:`1px solid ${d.colorDim}`,display:"flex",flexDirection:"column",justifyContent:"space-between",gap:10}} onClick={()=>onNew(d.id)}>
              <div style={{width:28,height:28,borderRadius:8,background:`${d.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{d.icon}</div>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>{d.label}</div>
                <div style={{fontSize:12,color:d.color,fontWeight:600,marginTop:2}}>{d.norm}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onBackup}
          style={{width:"100%", marginBottom:20, padding:"12px", borderRadius:12, cursor:"pointer",
                  background:K.card, border:`1px solid ${K.border}`, color:K.text, fontSize:13, fontWeight:600, fontFamily:"inherit"}}>
          💾 Back-up & delen <span style={{color:K.muted, fontWeight:400}}>· veiligstellen of overdragen aan een collega</span>
        </button>

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
        <div><div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Materiaal CV</div><div style={{fontSize:12,color:K.muted}}>Combiketel</div></div>
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
              <input style={S.input} type="text" inputMode="decimal" placeholder="0,75" value={data.expansieBar||""} onChange={e=>onChange("expansieBar",e.target.value)}/>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1}}><label style={S.label}>Veiligheidsventiel (bar)</label>
              <input style={S.input} type="text" inputMode="decimal" placeholder="3,0" value={data.veilBar||""} onChange={e=>onChange("veilBar",e.target.value)}/>
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
    if (dt < 5) warnings.push({ level:"orange", msg:`ΔT verwarmingscircuit ${dt.toFixed(1).replace(".",",")}K is laag (norm 5-10K) — controleer circulatiedebiet` });
    if (dt > 10) warnings.push({ level:"orange", msg:`ΔT verwarmingscircuit ${dt.toFixed(1).replace(".",",")}K is hoog (norm 5-10K) — debiet mogelijk te laag` });
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
        <div><div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Materiaal warmtepomp</div><div style={{fontSize:12,color:K.muted}}>Warmtepomp</div></div>
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
              <input style={S.input} type="text" inputMode="decimal" placeholder="1,8" value={data.koudemiddelKg||""} onChange={e=>onChange("koudemiddelKg",e.target.value)}/>
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
          <input style={{...S.input,fontSize:20,fontWeight:700,fontVariantNumeric:"tabular-nums",flex:1,
            background:ingevuld?(ok?K.greenDim:K.redDim):K.surface,
            border:`1px solid ${ingevuld?(ok?K.green:K.red):K.border}`}}
            type="text" inputMode="decimal" placeholder={ph} value={val} onChange={e=>sm(k,e.target.value)} onFocus={e=>e.target.select()}/>
          {unit&&<span style={{...S.eenheid,fontSize:15,marginLeft:0}}>{unit}</span>}
          {ingevuld&&<StatusTag level={ok?"ok":"red"}/>}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={S.hdr}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Meetwaarden warmtepomp</div><div style={{fontSize:12,color:K.muted}}>{data.wpType==="Bodem/water (grond)" ? "BRL 6000-21 (bodemenergie)" : "F-gassen · BRL 100/200"}</div></div>
      </div>
      <div style={S.body}>

        <div style={S.sTitle}>Verwarmingscircuit</div>
        <div style={S.card}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <MeetVeld k="aanvoerTemp" l="Aanvoertemperatuur" unit="°C" chk={tempOk}   ph="45"/>
            <MeetVeld k="retourTemp"  l="Retourtemperatuur"  unit="°C" chk={tempOk}   ph="38"/>
            <MeetVeld k="werkdruk"    l="Werkdruk"           unit="bar" chk={werkdrOk} ph="1,8"/>
            <MeetVeld k="spanning"    l="Spanning"           unit="V"   chk={spanOk2}  ph="230"/>
          </div>
          {meet.aanvoerTemp&&meet.retourTemp&&(()=>{
            const dt = Math.abs(toNum(meet.aanvoerTemp)-toNum(meet.retourTemp));
            const ok = dt>=5&&dt<=10;
            return (
              <div style={{padding:"8px 12px",borderRadius:8,background:ok?K.greenDim:K.orangeDim}}>
                <span style={{fontSize:12,fontWeight:700,color:ok?K.green:K.orange}}>
                  ΔT = {dt.toFixed(1).replace(".",",")}K {ok?"✓ OK (norm 5-10K)":"⚠ buiten norm 5-10K"}
                </span>
              </div>
            );
          })()}
        </div>

        <div style={S.sTitle}>Bron {data.wpType==="Bodem/water (grond)"?"(bodem)":data.wpType==="Lucht/lucht (split)"?"(lucht)":"(buitenlucht)"}</div>
        <div style={S.card}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <MeetVeld k="bronTempIn"  l="Brontemperatuur in"  unit="°C" chk={()=>true} ph="8"/>
            <MeetVeld k="bronTempUit" l="Brontemperatuur uit" unit="°C" chk={()=>true} ph="5"/>
            {data.wpType==="Bodem/water (grond)" && (
              <MeetVeld k="glycol" l="Glycolconcentratie" unit="%" chk={()=>true} ph="25"/>
            )}
            {data.wpType!=="Bodem/water (grond)" && (
              <MeetVeld k="luchtdebiet" l="Luchtdebiet" unit="m³/h" chk={()=>true} ph="1800"/>
            )}
          </div>
        </div>

        <div style={S.sTitle}>Elektrisch &amp; geluid</div>
        <div style={S.card}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <MeetVeld k="stroomopname"   l="Stroomopname (opstart)" unit="A"     chk={()=>true}  ph="12"/>
            <MeetVeld k="vermogenOpgenomen" l="Elektrisch opgenomen vermogen" unit="kW" chk={()=>true} ph="2,1"/>
            <MeetVeld k="geluidGemeten"  l="Geluidsniveau gemeten"  unit="dB(A)" chk={geluidOk} ph="44"/>
            <MeetVeld k="expansieVoordr" l="Expansievat voordruk"   unit="bar"   chk={()=>true}  ph="1,5"/>
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
          <input style={{...S.input,fontSize:20,fontWeight:700,fontVariantNumeric:"tabular-nums",flex:1,
            background:ingevuld?(ok?K.greenDim:K.redDim):K.surface,
            border:`1px solid ${ingevuld?(ok?K.green:K.red):K.border}`}}
            type="text" inputMode="decimal" placeholder={ph} value={val} onChange={e=>sm(k,e.target.value)} onFocus={e=>e.target.select()}/>
          {unit&&<span style={{...S.eenheid,fontSize:15,marginLeft:0}}>{unit}</span>}
          {ingevuld&&<StatusTag level={ok?"ok":"red"}/>}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={S.hdr}>
        <button style={S.backBtn} onClick={onBack}>←</button>
        <div><div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Meetwaarden CV</div><div style={{fontSize:12,color:K.muted}}>BRL6000-25</div></div>
      </div>
      <div style={S.body}>

        <div style={S.sTitle}>CO meting omgeving — verplicht</div>
        <div style={S.card}>
          <div style={{...S.card,background:K.orangeDim,border:`1px solid ${K.orange}44`,padding:"10px 14px",marginBottom:12}}>
            <div style={{fontSize:12,color:K.orange,fontWeight:600}}>⚠️ Meet CO vóór én ná werkzaamheden — wettelijk verplicht (Gasketelwet)</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <MeetVeld k="coVoor" l="CO vóór (ppm)" unit="ppm" chk={coOmgOk} ph="2"/>
            <MeetVeld k="coNa"   l="CO ná (ppm)"   unit="ppm" chk={coOmgOk} ph="3"/>
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
            <MeetVeld k="coRookgas"   l="CO rookgas"         unit="ppm" chk={coRookOk} ph="80"/>
            <MeetVeld k="co2"         l="CO2"                unit="%"   chk={co2Ok}    ph="9,5"/>
            <MeetVeld k="o2"          l="O2"                 unit="%"   chk={o2Ok}     ph="4,2"/>
            <MeetVeld k="rookgasTemp" l="Rookgastemperatuur" unit="°C"  chk={tempOk}   ph="65"/>
            <MeetVeld k="rendement"   l="Rendement"          unit="%"   chk={rendOk}   ph="98"/>
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
            <MeetVeld k="waterdruk"   l="Waterdruk"           unit="bar"  chk={waterOk} ph="1,8"/>
            <MeetVeld k="gasdruk"     l="Gasdruk"             unit="mbar" chk={gasOk}   ph="22"/>
            <MeetVeld k="aanvoerTemp" l="Aanvoertemperatuur"  unit="°C"   chk={tempOk}  ph="70"/>
            <MeetVeld k="retourTemp"  l="Retourtemperatuur"   unit="°C"   chk={tempOk}  ph="50"/>
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

// Persistente opslag aanvragen — cruciaal op iOS/Safari: zonder dit verzoek mag
// het OS de opslag (incl. IndexedDB met projecten en foto's) opruimen bij
// ruimtegebrek. Met persist() toegekend is de data beschermd tegen automatische
// eviction. Op de geinstalleerde PWA kent Safari dit doorgaans direct toe.
// NB: Safari-tabblad en beginscherm-app hebben ELK een eigen opslagruimte —
// een project uit het tabblad bestaat dus niet in de geinstalleerde app (en
// andersom). Structurele oplossing: back-up/restore (sessie 2).
let _persistGevraagd = false;
async function vraagPersistenteOpslag() {
  if (_persistGevraagd) return;
  _persistGevraagd = true;
  try {
    if (navigator.storage?.persist) {
      const al = await navigator.storage.persisted();
      if (!al) await navigator.storage.persist();
    }
  } catch { /* niet ondersteund — stil doorgaan */ }
}

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
  vraagPersistenteOpslag();
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

// HTML-escaping voor gebruikersinvoer in rapport-HTML (audit BEV-03)
function esc(v) {
  return String(v ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

// Schema-validatie en -sanering voor geïmporteerde back-ups en gedeelde
// projecten (audit BEV-04): strings begrensd, foto's alleen als raster-dataURL,
// aantallen en diepte gecapt. Onbekende velden blijven behouden (compatibiliteit)
// maar worden wel gesaneerd.
const FOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
function saneerWaarde(v, diepte) {
  if (diepte > 7) return undefined;
  if (typeof v === "string") {
    if (v.startsWith("data:")) return FOTO_RE.test(v) && v.length < 9_000_000 ? v : undefined;
    return v.slice(0, 4000);
  }
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "boolean" || v == null) return v;
  if (Array.isArray(v)) return v.slice(0, 400).map(x => saneerWaarde(x, diepte+1));
  if (typeof v === "object") {
    const uit = {};
    let n = 0;
    for (const k of Object.keys(v)) {
      if (++n > 120) break;
      const w = saneerWaarde(v[k], diepte+1);
      if (w !== undefined) uit[k.slice(0,64)] = w;
    }
    return uit;
  }
  return undefined;
}
function saneerProject(p) {
  if (!p || typeof p !== "object" || typeof p.id !== "string" || p.id.length > 64) return null;
  const schoon = saneerWaarde(p, 0);
  return schoon && schoon.id ? schoon : null;
}

function importeerProjecten(jsonText) {
  if (typeof jsonText !== "string" || jsonText.length > 60_000_000)
    throw new Error("Bestand is te groot om te importeren");
  let data;
  try { data = JSON.parse(jsonText); }
  catch { throw new Error("Ongeldig JSON-bestand"); }
  const rauw = Array.isArray(data) ? data : data.projecten;
  if (!Array.isArray(rauw)) throw new Error("Geen geldig YourWkb back-up bestand");
  const inkomend = rauw.slice(0, 500).map(saneerProject).filter(Boolean);
  if (!inkomend.length) throw new Error("Geen geldige projecten in dit bestand");
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

// ═══ LAADPAAL (EV-LAADVOORZIENING) ═══════════════════════════════════════════
// Getoetst aan NEN 1010:2020 (bepalingen laadvoorzieningen elektrische voertuigen).
const LP_FOTO_CPS_VOOR = [
  { id:"situatie",   label:"Situatie vóór montage (gevel/parkeerplek)", required:true  },
  { id:"meterkast",  label:"Meterkast vóór aanpassing",                 required:true  },
  { id:"kabeltrace", label:"Kabeltracé / doorvoer",                     required:false },
];
const LP_FOTO_CPS_NA = [
  { id:"paal",       label:"Laadpunt gemonteerd",                       required:true  },
  { id:"groep",      label:"Laadgroep + aardlek in de kast",            required:true  },
  { id:"typeplaat",  label:"Typeplaatje laadpunt",                      required:true  },
  { id:"laadtest",   label:"Voertuig aan het laden (functietest)",      required:false },
];
const LP_FOTO_CPS = [...LP_FOTO_CPS_VOOR, ...LP_FOTO_CPS_NA];

function lpCrossChecks(meet, ctx) {
  const w = [];
  const iso = toNum(meet.iso), zlpe = toNum(meet.zlpe);
  if (meet.iso && iso < 0.23) w.push({ level:"red", msg:`ISO laadgroep ${meet.iso} MΩ < 0,23 MΩ — afkeur` });
  if (meet.zlpe && zlpe > 1.66) w.push({ level:"orange", msg:`Z L-PE ${meet.zlpe} Ω hoog — controleer aansluitleiding/kabellengte` });
  if (meet.aardlekType === "A" && meet.dcDetectie !== "ja")
    w.push({ level:"red", msg:"Type A aardlek gekozen zonder aantoonbare 6 mA DC-detectie in het laadpunt — type B (of A-EV) vereist" });
  if (ctx.fasen === "3" && meet.fasevolgorde !== "ok")
    w.push({ level:"orange", msg:"Fasevolgorde niet gecontroleerd/OK — draaiveld verplicht controleren bij 3-fase laden" });
  if (meet.laadtest !== "ja") w.push({ level:"orange", msg:"Functionele laadtest nog niet uitgevoerd/geslaagd" });
  const spanningsverlies = toNum(meet.spanningsverlies);
  if (meet.spanningsverlies && spanningsverlies > 5) w.push({ level:"red", msg:`Spanningsverlies ${meet.spanningsverlies}% > 5% — kabeldoorsnede vergroten` });
  return w;
}

function LP_StapMateriaal({ data, onChange, onNext, onBack }) {
  const v = (k) => data[k] || "";
  const zet = (k,val) => onChange(k, val);
  const knop = (actief) => ({ flex:1, padding:"10px 6px", fontSize:13, borderRadius:8, cursor:"pointer", fontFamily:"inherit",
    background: actief ? K.yellow : K.card, color: actief ? "#000" : K.text, border:`1px solid ${actief ? K.yellow : K.border}` });
  return (
    <div style={{padding:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
        <button style={S.backBtn} onClick={onBack}>‹</button>
        <div><div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Laadpunt & aansluiting</div><div style={{fontSize:12,color:K.muted}}>Laadpaal</div></div>
      </div>
      <div style={{...S.card, marginTop:12}}>
        <label style={S.label}>Merk & type laadpunt</label>
        <input style={S.input} placeholder="bijv. Alfen Eve Single, Zaptec Go" value={v("lpMerk")} onChange={e=>zet("lpMerk",e.target.value)}/>
        <label style={{...S.label, marginTop:12}}>Laadvermogen</label>
        <div style={{display:"flex", gap:8}}>
          {["3,7 kW","7,4 kW","11 kW","22 kW"].map(p=><button key={p} style={knop(v("lpVermogen")===p)} onClick={()=>zet("lpVermogen",p)}>{p}</button>)}
        </div>
        <label style={{...S.label, marginTop:12}}>Aansluiting laadgroep</label>
        <div style={{display:"flex", gap:8}}>
          <button style={knop(v("lpFasen")==="1")} onClick={()=>zet("lpFasen","1")}>1-fase</button>
          <button style={knop(v("lpFasen")==="3")} onClick={()=>zet("lpFasen","3")}>3-fase</button>
        </div>
        <div style={{display:"flex", gap:8, marginTop:12}}>
          <div style={{flex:1}}>
            <label style={S.label}>Kabel (mm²)</label>
            <input style={S.input} placeholder="bijv. 2,5 / 6" inputMode="decimal" value={v("lpKabelMm2")} onChange={e=>zet("lpKabelMm2",e.target.value)}/>
          </div>
          <div style={{flex:1}}>
            <label style={S.label}>Kabellengte (m)</label>
            <input style={S.input} placeholder="bijv. 18" inputMode="decimal" value={v("lpKabelLengte")} onChange={e=>zet("lpKabelLengte",e.target.value)}/>
          </div>
        </div>
      </div>
      <button style={{...S.btn, width:"100%", background:K.yellow, color:"#000", marginTop:16}} onClick={onNext}>Volgende →</button>
    </div>
  );
}

function LP_StapMeten({ data, onChange, onNext, onBack }) {
  const meet = data.lpMeet || {};
  const zm = (k,v) => onChange("lpMeet", { ...meet, [k]: v });
  const mkp = data.mkp || {};
  const zetMkp = (obj) => onChange("mkp", { ...mkp, ...obj });
  const warnings = lpCrossChecks(meet, { fasen: data.lpFasen });
  const knop = (actief, kleur=K.yellow) => ({ flex:1, padding:"10px 6px", fontSize:13, borderRadius:8, cursor:"pointer", fontFamily:"inherit",
    background: actief ? kleur : K.card, color: actief ? "#000" : K.text, border:`1px solid ${actief ? kleur : K.border}` });
  const MeetVeld = ({k,l,unit,ph,chk}) => (
    <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:8}}>
      <div style={{flex:1, fontSize:13}}>{l}</div>
      <MiniInput value={meet[k]} onChange={v=>zm(k,v)} unit={unit} width={90} placeholder={ph}/>
      {meet[k] && chk && <StatusTag level={chk(toNum(meet[k]))?"ok":"red"}/>}
    </div>
  );
  return (
    <div style={{padding:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
        <button style={S.backBtn} onClick={onBack}>‹</button>
        <div><div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Metingen & controles laadpunt</div><div style={{fontSize:12,color:K.muted}}>NEN 1010:2020 (EV-laadvoorzieningen)</div></div>
      </div>

      <div style={{...S.card, marginTop:12}}>
        <div style={S.sTitle}>Aardlekbeveiliging laadgroep</div>
        <div style={{fontSize:11, color:K.muted, marginBottom:8}}>Type B vereist, tenzij het laadpunt aantoonbaar 6 mA DC-foutstroomdetectie heeft — dan volstaat type A.</div>
        <div style={{display:"flex", gap:8, marginBottom:8}}>
          <button style={knop(meet.aardlekType==="A")} onClick={()=>zm("aardlekType","A")}>Type A</button>
          <button style={knop(meet.aardlekType==="A-EV")} onClick={()=>zm("aardlekType","A-EV")}>Type A-EV</button>
          <button style={knop(meet.aardlekType==="B")} onClick={()=>zm("aardlekType","B")}>Type B</button>
        </div>
        {meet.aardlekType==="A" && (
          <div style={{display:"flex", gap:8, alignItems:"center"}}>
            <div style={{flex:1, fontSize:13}}>6 mA DC-detectie in laadpunt aantoonbaar?</div>
            <button style={{...knop(meet.dcDetectie==="ja", K.green), flex:"0 0 64px"}} onClick={()=>zm("dcDetectie","ja")}>Ja</button>
            <button style={{...knop(meet.dcDetectie==="nee", K.red), flex:"0 0 64px"}} onClick={()=>zm("dcDetectie","nee")}>Nee</button>
          </div>
        )}
        <div style={{display:"flex", alignItems:"center", gap:8, marginTop:10}}>
          <div style={{flex:1, fontSize:13}}>Aardlektest (testknop + uitschakeltijd)</div>
          <MiniInput value={meet.aardlekMs} onChange={v=>zm("aardlekMs",v)} unit="ms" width={90} placeholder="22"/>
          {meet.aardlekMs && <StatusTag level={toNum(meet.aardlekMs)<=300?"ok":"red"}/>}
        </div>
      </div>

      <div style={{...S.card, marginTop:12}}>
        <div style={S.sTitle}>Elektrische metingen laadgroep</div>
        <MeetVeld k="iso"  l="Isolatieweerstand (naar aarde)" unit="MΩ" ph="≥0,23" chk={(x)=>x>=0.23}/>
        <MeetVeld k="zln"  l="Z L-N bij laadpunt"             unit="Ω"  ph="0,8"/>
        <MeetVeld k="zlpe" l="Z L-PE bij laadpunt"            unit="Ω"  ph="0,9"/>
        <MeetVeld k="spanningsverlies" l="Spanningsverlies bij vollast" unit="%" ph="≤5" chk={(x)=>x<=5}/>
        {data.lpFasen==="3" && (
          <div style={{display:"flex", alignItems:"center", gap:8, marginTop:4}}>
            <div style={{flex:1, fontSize:13}}>Fasevolgorde / draaiveld gecontroleerd</div>
            <button style={{...knop(meet.fasevolgorde==="ok", K.green), flex:"0 0 64px"}} onClick={()=>zm("fasevolgorde","ok")}>OK</button>
            <button style={{...knop(meet.fasevolgorde==="nvt"), flex:"0 0 64px"}} onClick={()=>zm("fasevolgorde","nvt")}>—</button>
          </div>
        )}
      </div>

      <div style={{...S.card, marginTop:12}}>
        <div style={S.sTitle}>Load balancing / vermogenssturing</div>
        <div style={{fontSize:11, color:K.muted, marginBottom:8}}>Wordt vastgelegd in het meterkastpaspoort — een onzichtbare instelling die elke volgende monteur moet kennen.</div>
        <div style={{display:"flex", gap:8, marginBottom:8}}>
          <button style={knop(mkp.lbAan===true)}  onClick={()=>zetMkp({lbAan:true})}>Aanwezig</button>
          <button style={knop(mkp.lbAan===false)} onClick={()=>zetMkp({lbAan:false})}>Niet aanwezig</button>
        </div>
        {mkp.lbAan && (<>
          <div style={{display:"flex", gap:8, marginBottom:8}}>
            <button style={knop(mkp.lbTyp==="stat")} onClick={()=>zetMkp({lbTyp:"stat"})}>Statisch</button>
            <button style={knop(mkp.lbTyp==="dyn")}  onClick={()=>zetMkp({lbTyp:"dyn"})}>Dynamisch (P1)</button>
          </div>
          <div style={{display:"flex", gap:8}}>
            <div style={{flex:1, display:"flex", alignItems:"center", gap:4}}>
              <input style={{...S.input, flex:1, minWidth:0}} placeholder="Grens" inputMode="decimal" value={mkp.lbMax||""} onChange={e=>zetMkp({lbMax:e.target.value})}/>
              <span style={{fontSize:13, color:K.muted, fontWeight:700}}>A</span>
            </div>
            <input style={{...S.input, flex:2}} placeholder="Regisseur (evcc, HEMS, paal intern)" value={mkp.lbReg||""} onChange={e=>zetMkp({lbReg:e.target.value})}/>
          </div>
        </>)}
      </div>

      <div style={{...S.card, marginTop:12}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <div style={{flex:1, fontSize:13, fontWeight:600}}>Functionele laadtest met voertuig geslaagd</div>
          <button style={{...knop(meet.laadtest==="ja", K.green), flex:"0 0 64px"}} onClick={()=>zm("laadtest","ja")}>Ja</button>
          <button style={{...knop(meet.laadtest==="nee", K.red), flex:"0 0 64px"}} onClick={()=>zm("laadtest","nee")}>Nee</button>
        </div>
      </div>

      {warnings.map((w,i)=>(
        <div key={i} style={{...S.card, marginTop:10, borderLeft:`4px solid ${w.level==="red"?K.red:K.orange}`, fontSize:12}}>
          {w.level==="red"?"⛔":"⚠️"} {w.msg}
        </div>
      ))}
      <button style={{...S.btn, width:"100%", background:K.yellow, color:"#000", marginTop:16}} onClick={onNext}>Volgende →</button>
    </div>
  );
}

// ═══ THUISBATTERIJ ═══════════════════════════════════════════════════════════
const BAT_FOTO_CPS_VOOR = [
  { id:"opstelplek", label:"Opstelplek vóór installatie",     required:true  },
  { id:"meterkast",  label:"Meterkast vóór aanpassing",       required:true  },
];
const BAT_FOTO_CPS_NA = [
  { id:"batterij",   label:"Batterij gemonteerd (overzicht)",  required:true  },
  { id:"typeplaat",  label:"Typeplaatje batterij/omvormer",    required:true  },
  { id:"groep",      label:"Batterijgroep in de kast",         required:true  },
  { id:"sticker",    label:"Brandweersticker op meterkast",    required:true  },
];
const BAT_FOTO_CPS = [...BAT_FOTO_CPS_VOOR, ...BAT_FOTO_CPS_NA];

const BAT_PLAATSING = [
  { id:"ventilatie", label:"Ventilatie conform fabrikantvoorschrift" },
  { id:"temp",       label:"Omgevingstemperatuur binnen opgegeven bereik" },
  { id:"brandbaar",  label:"Vrije afstand tot brandbare materialen aangehouden" },
  { id:"vluchtweg",  label:"Niet in of grenzend aan vluchtweg geplaatst" },
  { id:"dragend",    label:"Bevestiging op dragende ondergrond" },
];

function batCrossChecks(meet) {
  const w = [];
  if (meet.iso && toNum(meet.iso) < 0.23) w.push({ level:"red", msg:`ISO batterijgroep ${meet.iso} MΩ < 0,23 MΩ — afkeur` });
  BAT_PLAATSING.forEach(p => { if (meet[`pl_${p.id}`] === "nee") w.push({ level:"red", msg:`Plaatsingseis niet voldaan: ${p.label.toLowerCase()}` }); });
  if (meet.eilandtest === "nee") w.push({ level:"orange", msg:"Omschakeltest eilandbedrijf/back-up niet uitgevoerd of niet geslaagd" });
  if (meet.brandweersticker === "nee") w.push({ level:"orange", msg:"Brandweersticker (aanwezigheid batterij) ontbreekt op de meterkast" });
  if (meet.meldingNetbeheerder !== "ja") w.push({ level:"orange", msg:"Melding netbeheerder (energieleveren.nl) nog niet gedaan — verplicht bij opwek/opslag" });
  return w;
}

function BAT_StapMateriaal({ data, onChange, onNext, onBack }) {
  const v = (k) => data[k] || "";
  const zet = (k,val) => onChange(k, val);
  const knop = (actief) => ({ flex:1, padding:"10px 6px", fontSize:13, borderRadius:8, cursor:"pointer", fontFamily:"inherit",
    background: actief ? K.yellow : K.card, color: actief ? "#000" : K.text, border:`1px solid ${actief ? K.yellow : K.border}` });
  return (
    <div style={{padding:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
        <button style={S.backBtn} onClick={onBack}>‹</button>
        <div><div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Batterij & aansluiting</div><div style={{fontSize:12,color:K.muted}}>Thuisbatterij</div></div>
      </div>
      <div style={{...S.card, marginTop:12}}>
        <label style={S.label}>Merk & type</label>
        <input style={S.input} placeholder="bijv. BYD HVS 7.7, Sessy, HomeWizard" value={v("batMerk")} onChange={e=>zet("batMerk",e.target.value)}/>
        <div style={{display:"flex", gap:8, marginTop:12}}>
          <div style={{flex:1}}>
            <label style={S.label}>Capaciteit (kWh)</label>
            <input style={S.input} placeholder="bijv. 7,7" inputMode="decimal" value={v("batKwh")} onChange={e=>zet("batKwh",e.target.value)}/>
          </div>
          <div style={{flex:1}}>
            <label style={S.label}>Max. (ont)laadvermogen (kW)</label>
            <input style={S.input} placeholder="bijv. 3,68" inputMode="decimal" value={v("batKw")} onChange={e=>zet("batKw",e.target.value)}/>
          </div>
        </div>
        <label style={{...S.label, marginTop:12}}>Koppeling</label>
        <div style={{display:"flex", gap:8}}>
          <button style={knop(v("batKoppeling")==="AC")} onClick={()=>zet("batKoppeling","AC")}>AC-gekoppeld (eigen omvormer)</button>
          <button style={knop(v("batKoppeling")==="DC")} onClick={()=>zet("batKoppeling","DC")}>DC-gekoppeld (via PV-omvormer)</button>
        </div>
        <label style={{...S.label, marginTop:12}}>Back-up / eilandbedrijf-functie</label>
        <div style={{display:"flex", gap:8}}>
          <button style={knop(v("batEiland")==="ja")}  onClick={()=>zet("batEiland","ja")}>Ja</button>
          <button style={knop(v("batEiland")==="nee")} onClick={()=>zet("batEiland","nee")}>Nee</button>
        </div>
      </div>
      <button style={{...S.btn, width:"100%", background:K.yellow, color:"#000", marginTop:16}} onClick={onNext}>Volgende →</button>
    </div>
  );
}

function BAT_StapMeten({ data, onChange, onNext, onBack }) {
  const meet = data.batMeet || {};
  const zm = (k,v) => onChange("batMeet", { ...meet, [k]: v });
  const mkp = data.mkp || {};
  const warnings = batCrossChecks(meet);
  const knop = (actief, kleur=K.yellow) => ({ padding:"10px 6px", fontSize:13, borderRadius:8, cursor:"pointer", fontFamily:"inherit",
    background: actief ? kleur : K.card, color: actief ? "#000" : K.text, border:`1px solid ${actief ? kleur : K.border}` });
  const JaNee = ({k, l}) => (
    <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:8}}>
      <div style={{flex:1, fontSize:13}}>{l}</div>
      <button style={{...knop(meet[k]==="ja", K.green), flex:"0 0 64px"}} onClick={()=>zm(k,"ja")}>Ja</button>
      <button style={{...knop(meet[k]==="nee", K.red), flex:"0 0 64px"}} onClick={()=>zm(k,"nee")}>Nee</button>
    </div>
  );
  return (
    <div style={{padding:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
        <button style={S.backBtn} onClick={onBack}>‹</button>
        <div><div style={{fontWeight:700,fontSize:20,lineHeight:1.15}}>Plaatsing, metingen & meldingen</div><div style={{fontSize:12,color:K.muted}}>NEN 1010:2020 · thuisbatterij</div></div>
      </div>

      <div style={{...S.card, marginTop:12}}>
        <div style={S.sTitle}>Plaatsingseisen</div>
        {BAT_PLAATSING.map(p => <JaNee key={p.id} k={`pl_${p.id}`} l={p.label}/>)}
      </div>

      <div style={{...S.card, marginTop:12}}>
        <div style={S.sTitle}>Elektrisch (batterijgroep)</div>
        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:8}}>
          <div style={{flex:1, fontSize:13}}>Isolatieweerstand (naar aarde)</div>
          <MiniInput value={meet.iso} onChange={v=>zm("iso",v)} unit="MΩ" width={90} placeholder="≥0,23"/>
          {meet.iso && <StatusTag level={toNum(meet.iso)>=0.23?"ok":"red"}/>}
        </div>
        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:8}}>
          <div style={{flex:1, fontSize:13}}>Aardlektest batterijgroep</div>
          <MiniInput value={meet.aardlekMs} onChange={v=>zm("aardlekMs",v)} unit="ms" width={90} placeholder="22"/>
          {meet.aardlekMs && <StatusTag level={toNum(meet.aardlekMs)<=300?"ok":"red"}/>}
        </div>
        {data.batEiland==="ja" && <JaNee k="eilandtest" l="Omschakeltest eilandbedrijf/back-up geslaagd"/>}
      </div>

      <div style={{...S.card, marginTop:12}}>
        <div style={S.sTitle}>Veiligheid & meldingen</div>
        <JaNee k="brandweersticker" l="Brandweersticker op meterkast geplakt"/>
        <JaNee k="meldingNetbeheerder" l="Melding netbeheerder gedaan (energieleveren.nl)"/>
        <div style={{fontSize:11, color:K.muted}}>
          Voor de melding is de EAN-code nodig{mkp.ean ? <> — die staat al in het paspoort: <strong>{mkp.ean}</strong></> : <> — zoek hem op via de EAN-knop in de paspoort-stap</>}.
        </div>
      </div>

      {warnings.map((w,i)=>(
        <div key={i} style={{...S.card, marginTop:10, borderLeft:`4px solid ${w.level==="red"?K.red:K.orange}`, fontSize:12}}>
          {w.level==="red"?"⛔":"⚠️"} {w.msg}
        </div>
      ))}
      <button style={{...S.btn, width:"100%", background:K.yellow, color:"#000", marginTop:16}} onClick={onNext}>Volgende →</button>
    </div>
  );
}

export default function App() {
  const [screen,     setScreen]     = useState("home");
  const [discipline, setDiscipline] = useState(null);
  const [step,       setStep]       = useState(0);
  const [job,        setJob]        = useState({});
  const [actiefId,   setActiefId]   = useState(null);
  const [idbKlaar,   setIdbKlaar]   = useState(false);
  const [mkpScan,    setMkpScan]    = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Service worker registreren (offline-werking) + update-signalering.
  const [swUpdate, setSwUpdate] = useState(null);   // wachtende nieuwe versie
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").then(reg => {
      if (reg.waiting) setSwUpdate(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const nieuw = reg.installing;
        nieuw?.addEventListener("statechange", () => {
          if (nieuw.state === "installed" && navigator.serviceWorker.controller) setSwUpdate(nieuw);
        });
      });
      // iOS-garantie: de allereerste sessie draait nog NIET onder de service worker,
      // waardoor de app-bestanden van die sessie niet gecachet worden. Zodra de
      // worker actief is maar deze pagina nog niet onder zijn controle valt:
      // eenmalig herladen (met vlag tegen een lus), zodat álles door de worker
      // stroomt en offline-start gegarandeerd is. Het controllerchange-event
      // alleen is op iOS niet betrouwbaar genoeg.
      navigator.serviceWorker.ready.then(() => {
        // Kwam de gebruiker binnen via een paspoort-scan (#fragment)? Dan NIET
        // herladen — dat zou de zojuist geopende paspoort-viewer wegvagen.
        // De cache-opwarming gebeurt dan gewoon bij het volgende gewone bezoek.
        if (window.__mkpBinnengekomen) return;
        if (!navigator.serviceWorker.controller && !sessionStorage.getItem("swHerladen")) {
          sessionStorage.setItem("swHerladen", "1");
          window.location.reload();
        }
      });
    }).catch(()=>{});
    let herladen = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (herladen) return; herladen = true; window.location.reload();
    });
  }, []);
  const activeerUpdate = () => { swUpdate?.postMessage("SKIP_WAITING"); };

  // Web Share Target: binnengekomen via "Delen → YourWkb" vanuit een andere app
  // (WhatsApp-bestand). De service worker heeft de inhoud geparkeerd; wij halen
  // hem op, openen het Back-up & delen-scherm en zetten het bestand klaar.
  const [gedeeldBestand, setGedeeldBestand] = useState(null);

  // Demo-paspoort van de landingspagina herkennen (fictief adres 2801AB 12):
  // apart event zodat in PostHog zichtbaar is of de demo-QR tot scans leidt.
  const isDemoPaspoort = (p) => p?.pc === "2801AB" && String(p?.nr||"").trim().startsWith("12");
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.location.search.includes("gedeeld=1")) return;
    window.history.replaceState(null, "", "/app");
    (async () => {
      try {
        const hit = await caches.match("/app/__gedeeld-bestand");
        if (!hit) return;
        const tekst = await hit.text();
        const c = await caches.open((await caches.keys()).find(n=>n.startsWith("yourwkb")) || "yourwkb");
        c.delete("/app/__gedeeld-bestand").catch(()=>{});
        if (tekst) { setGedeeldBestand(tekst); setScreen("backup"); }
      } catch { /* stil — gebruiker kan altijd handmatig kiezen */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // MKP: gescand meterkastpaspoort inlezen. De QR op de kastdeur codeert
  // meterkastpaspoort.nl/p#<data>; die redirect komt hier binnen met het
  // datafragment intact. Decoderen, tonen, en de URL schoonmaken.
  useEffect(() => {
    (async () => {
      const frag = typeof window !== "undefined" ? window.location.hash : "";
      if (!frag || frag.length < 20) return;
      if (typeof window !== "undefined") window.__mkpBinnengekomen = true;
      try {
        const p = await mkpDecode(frag.slice(1));
        setMkpScan(p);
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        if (isDemoPaspoort(p)) trackEvent("qr_demo_gescand", { via: "camera" });
        trackEvent("mkp_gescand", { velden: Object.keys(p).length });
      } catch { /* geen (geldig) paspoort-fragment — stil negeren */ }
    })();
  }, []);

  // Start een nieuw project vooringevuld met een gescand paspoort.
  const startMetPaspoort = () => {
    const p = mkpScan; if (!p) return;
    const nieuwId = "p" + Date.now();
    setActiefId(nieuwId);
    try { localStorage.setItem(ACTIEF_KEY, nieuwId); } catch {}
    setJob({
      postcode: p.pc || "", huisnummer: p.nr || "",
      // Projectnummer meteen afleiden. Zonder dit blijft projectId leeg bij een
      // project dat uit een gescand paspoort start — de klantstap toont dan wél
      // een nummer, maar het rapport drukt "—" af, omdat alleen het wijzigen van
      // postcode/huisnummer/toevoeging het nummer zette.
      projectId: buildId(p.pc, p.nr),
      mkpImport: p,
      mkp: {
        bj: p.bj || "", ean: p.ean || "", ean2: p.ean2 || "",
        haF: p.ha?.f ? String(p.ha.f) : "", haA: p.ha?.a ? String(p.ha.a) : "",
        kamMm2: p.kam?.mm2 ? String(p.kam.mm2) : "", kamA: p.kam?.a ? String(p.kam.a) : "",
        grp: (p.grp||[]).map(g=>({ t:g.t, rol:g.rol, kw:g.kw!==undefined?String(g.kw):"", f:g.f!==undefined?String(g.f):"", n:g.n||"" })),
        lbAan: p.lb ? !!p.lb.aan : undefined,
        lbTyp: p.lb?.typ || "", lbMax: p.lb?.max!==undefined ? String(p.lb.max) : "", lbReg: p.lb?.reg || "",
      },
    });
    setStep(0);
    setMkpScan(null);
    setScreen("kiezen");
  };

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
  const GK_STEPS = ["Klant","Installateur","Apparatuur","Foto's (oud)","Materiaal","Groepen","Meten","Veldmeting","Foto's (nieuw)","Paspoort","Versturen"];
  const PV_STEPS = ["Klant","Installateur","Apparatuur","Foto's (oud)","Materiaal","Meten","Foto's (nieuw)","Paspoort","Versturen"];

  const gkScreens = [
    <StapKlant          key="klant"      data={job} onChange={upd} discipline="groepenkast" onNext={next} onBack={()=>setScreen("home")}/>,
    <StapInstallateur   key="inst"       data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapMeetapparatuur key="apparat"    data={job} onChange={upd} discipline="groepenkast" onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_voor" data={job} onChange={upd} checkpoints={GK_FOTO_CPS_VOOR} onNext={next} onBack={prev}/>,
    <GK_StapMateriaal   key="mat"        data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <GK_StapGroepen     key="groepen"    data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <GK_StapMeten       key="meten"      data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <GK_StapVeldmeting  key="veldmeting" data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_na"   data={job} onChange={upd} checkpoints={GK_FOTO_CPS_NA} onNext={next} onBack={prev}/>,
    <StapMkp            key="mkp"        data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapVersturen      key="verstuur"   data={job} onChange={upd} discipline="groepenkast" onSend={markeerOpgeleverd} onBack={prev}/>,
  ];

  const pvScreens = [
    <StapKlant          key="klant"      data={job} onChange={upd} discipline="pv" onNext={next} onBack={()=>setScreen("home")}/>,
    <StapInstallateur   key="inst"       data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapMeetapparatuur key="apparat"    data={job} onChange={upd} discipline="pv" onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_voor" data={job} onChange={upd} checkpoints={PV_FOTO_CPS_VOOR} onNext={next} onBack={prev}/>,
    <PV_StapMateriaal   key="mat"        data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <PV_StapMeten       key="meten"      data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_na"   data={job} onChange={upd} checkpoints={PV_FOTO_CPS_NA} onNext={next} onBack={prev}/>,
    <StapMkp            key="mkp"        data={job} onChange={upd} discipline="pv" onNext={next} onBack={prev}/>,
    <StapVersturen      key="verstuur"   data={job} onChange={upd} discipline="pv" onSend={markeerOpgeleverd} onBack={prev}/>,
  ];

  const CV_STEPS = ["Klant","Installateur","Apparatuur","Foto's (oud)","Materiaal","Meten","Foto's (nieuw)","Versturen"];
  const WP_STEPS = ["Klant","Installateur","Apparatuur","Foto's (oud)","Materiaal","Meten","Foto's (nieuw)","Paspoort","Versturen"];

  const cvScreens = [
    <StapKlant          key="klant"      data={job} onChange={upd} discipline="cv" onNext={next} onBack={()=>setScreen("home")}/>,
    <StapInstallateur   key="inst"       data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapMeetapparatuur key="apparat"    data={job} onChange={upd} discipline="cv" onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_voor" data={job} onChange={upd} checkpoints={CV_FOTO_CPS_VOOR} onNext={next} onBack={prev}/>,
    <CV_StapMateriaal   key="mat"        data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <CV_StapMeten       key="meten"      data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_na"   data={job} onChange={upd} checkpoints={CV_FOTO_CPS_NA} onNext={next} onBack={prev}/>,
    <StapVersturen      key="verstuur"   data={job} onChange={upd} discipline="cv" onSend={markeerOpgeleverd} onBack={prev}/>,
  ];

  const wpScreens = [
    <StapKlant          key="klant"      data={job} onChange={upd} discipline="wp" onNext={next} onBack={()=>setScreen("home")}/>,
    <StapInstallateur   key="inst"       data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapMeetapparatuur key="apparat"    data={job} onChange={upd} discipline="wp" onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_voor" data={job} onChange={upd} checkpoints={WP_FOTO_CPS_VOOR} onNext={next} onBack={prev}/>,
    <WP_StapMateriaal   key="mat"        data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <WP_StapMeten       key="meten"      data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_na"   data={job} onChange={upd} checkpoints={WP_FOTO_CPS_NA} onNext={next} onBack={prev}/>,
    <StapMkp            key="mkp"        data={job} onChange={upd} discipline="wp" onNext={next} onBack={prev}/>,
    <StapVersturen      key="verstuur"   data={job} onChange={upd} discipline="wp" onSend={markeerOpgeleverd} onBack={prev}/>,
  ];

  const LP_STEPS  = ["Klant","Installateur","Apparatuur","Foto's (voor)","Laadpunt","Meten","Foto's (na)","Paspoort","Versturen"];
  const BAT_STEPS = ["Klant","Installateur","Apparatuur","Foto's (voor)","Batterij","Meten","Foto's (na)","Paspoort","Versturen"];

  const lpScreens = [
    <StapKlant          key="klant"      data={job} onChange={upd} discipline="laadpaal" onNext={next} onBack={()=>setScreen("home")}/>,
    <StapInstallateur   key="inst"       data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapMeetapparatuur key="apparat"    data={job} onChange={upd} discipline="laadpaal" onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_voor" data={job} onChange={upd} checkpoints={LP_FOTO_CPS_VOOR} onNext={next} onBack={prev}/>,
    <LP_StapMateriaal   key="mat"        data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <LP_StapMeten       key="meten"      data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_na"   data={job} onChange={upd} checkpoints={LP_FOTO_CPS_NA} onNext={next} onBack={prev}/>,
    <StapMkp            key="mkp"        data={job} onChange={upd} discipline="laadpaal" onNext={next} onBack={prev}/>,
    <StapVersturen      key="verstuur"   data={job} onChange={upd} discipline="laadpaal" onSend={markeerOpgeleverd} onBack={prev}/>,
  ];
  const batScreens = [
    <StapKlant          key="klant"      data={job} onChange={upd} discipline="batterij" onNext={next} onBack={()=>setScreen("home")}/>,
    <StapInstallateur   key="inst"       data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapMeetapparatuur key="apparat"    data={job} onChange={upd} discipline="batterij" onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_voor" data={job} onChange={upd} checkpoints={BAT_FOTO_CPS_VOOR} onNext={next} onBack={prev}/>,
    <BAT_StapMateriaal  key="mat"        data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <BAT_StapMeten      key="meten"      data={job} onChange={upd} onNext={next} onBack={prev}/>,
    <StapFotos          key="fotos_na"   data={job} onChange={upd} checkpoints={BAT_FOTO_CPS_NA} onNext={next} onBack={prev}/>,
    <StapMkp            key="mkp"        data={job} onChange={upd} discipline="batterij" onNext={next} onBack={prev}/>,
    <StapVersturen      key="verstuur"   data={job} onChange={upd} discipline="batterij" onSend={markeerOpgeleverd} onBack={prev}/>,
  ];

  const screens    = discipline==="pv" ? pvScreens : discipline==="cv" ? cvScreens : discipline==="wp" ? wpScreens : discipline==="laadpaal" ? lpScreens : discipline==="batterij" ? batScreens : gkScreens;
  const stepLabels = discipline==="pv" ? PV_STEPS  : discipline==="cv" ? CV_STEPS  : discipline==="wp" ? WP_STEPS  : discipline==="laadpaal" ? LP_STEPS  : discipline==="batterij" ? BAT_STEPS  : GK_STEPS;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      <div style={S.app}>
        {swUpdate && (
          <button onClick={activeerUpdate} style={{width:"100%", padding:"10px", background:K.yellow, color:"#000", border:"none", fontSize:13, fontWeight:700, cursor:"pointer"}}>
            ⬆️ Nieuwe versie beschikbaar — tik om te verversen
          </button>
        )}
        {scannerOpen && <MkpScanner onResult={(p)=>{ setScannerOpen(false); setMkpScan(p); if (isDemoPaspoort(p)) trackEvent("qr_demo_gescand", { via: "inapp" }); trackEvent("mkp_gescand_inapp",{}); }} onSluit={()=>setScannerOpen(false)}/>}
        {mkpScan && !scannerOpen && <MkpViewer p={mkpScan} onNieuw={startMetPaspoort} onSluit={()=>setMkpScan(null)}/>}
        {!mkpScan && !scannerOpen && screen==="home" && (
          <button onClick={()=>setScannerOpen(true)}
            style={{ margin:"12px 16px 0", width:"calc(100% - 32px)", padding:"12px", borderRadius:12,
                     background:K.card, border:`1px dashed ${K.yellow}88`, color:K.text, fontSize:13, fontWeight:600, cursor:"pointer" }}>
            📷 Scan meterkastpaspoort <span style={{color:K.muted, fontWeight:400}}>· werkt ook zonder bereik</span>
          </button>
        )}
        {!mkpScan && !scannerOpen && screen==="home" && <HomeScreen idbKlaar={idbKlaar} onNew={startNew} onDoorgaan={doorgaan} onVerwijder={verwijderProject} onBackup={()=>setScreen("backup")}/>}
        {!mkpScan && screen==="backup" && <BackupScherm onBack={()=>setScreen("home")} onGewijzigd={()=>{}} startBestand={gedeeldBestand} naVerwerkt={()=>setGedeeldBestand(null)}/>}
        {!mkpScan && screen==="kiezen" && <DisciplineKiezer onKies={kiesDiscipline} onBack={()=>setScreen("home")}/>}
        {!mkpScan && screen==="job"    && (
          <div>
            <StepBar step={step} steps={stepLabels} onJump={(i) => {
              setStep(i);
              persist(job, discipline, i);
            }}/>
            {/* Stapteller en voortgangsbalk (design-spec §4). Hier en niet in de
                kop van elk scherm, omdat alleen op deze plek bekend is hoeveel
                stappen de gekozen discipline heeft. De schermen hadden het
                stapnummer hardgecodeerd in hun ondertitel, en dat ging mis zodra
                een scherm door meerdere disciplines wordt gebruikt: de
                paspoortstap zei "Stap 8" terwijl dat in de groepenkastflow stap
                10 is. Alleen weergave — de bolletjes erboven blijven de
                klikbare navigatie. */}
            <div style={{background:K.surface, padding:"8px 18px 10px", borderBottom:`1px solid ${K.border}`}}>
              <div style={{...S.sTitle, marginBottom:6}}>
                Stap {step+1} van {stepLabels.length} · {stepLabels[step]}
              </div>
              <div style={S.bar}><div style={{...S.barFill, width:`${((step+1)/stepLabels.length)*100}%`}}/></div>
            </div>
            {screens[step]}
          </div>
        )}
        {screen==="klaar"  && <KlaarScreen data={job} discipline={discipline} onDone={()=>setScreen("home")}/>}
      </div>
    </>
  );
}
