// ─────────────────────────────────────────────────────────────────────────────
// Het voorbeeldrapport voor de landing — gemaakt door de app zelf
//
//   node scripts/demo-opleverrapport.mjs      (of: npm run demo-rapport)
//
// Schrijft public/voorbeeld-opleverrapport.html en .pdf. Opmaak: het ontwerp
// uit Marketing/opleverrapport.html (18-09-2026). De inhoud komt NIET met de
// hand: een fictieve klus gaat door dezelfde code als in de app — mkpBouw,
// faseBalans, mkpQrVoorRapport — zodat getallen, oordeel en QR elkaar niet
// kunnen tegenspreken. De QR wordt vóór het wegschrijven teruggelezen met een
// QR-lezer en vergeleken; klopt hij niet, dan stopt het script (valkuil 6:
// nooit een QR met een verzonnen payload).
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { MKP_BASIS, mkpDecode } from "meterkastpaspoort";
import { mkpQrVoorRapport } from "../components/wkb/mkp-qr.js";
import { faseBalans } from "../components/wkb/fasebalans.js";
import { GELIJKTIJDIGHEID, FASE_RESERVE_KW } from "../components/wkb/model.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UIT_HTML = path.join(ROOT, "public/voorbeeld-opleverrapport.html");
const UIT_PDF = path.join(ROOT, "public/voorbeeld-opleverrapport.pdf");

// ── De fictieve klus (zelfde adres als de bestaande demo-sticker) ────────────
const BLOKKEN = [
  { L: "L1", rcd: { dt: 24, di: 21 }, groepen: [
    ["Verlichting bg", "B", 10, "", 0.2], ["WCD woonkamer", "B", 16, "", 0.8], ["Koelkast", "B", 16, "", 0.4] ] },
  { L: "L2", rcd: { dt: 27, di: 23 }, groepen: [
    ["Wasmachine", "B", 16, "", 2.0], ["WCD slaapkamers", "B", 16, "", 0.4], ["Verlichting 1e", "B", 10, "", 0.2] ] },
  { L: "L3", rcd: { dt: 22, di: 19 }, groepen: [
    ["Inductiekookplaat", "B", 16, "kook", 3.7], ["Oven", "B", 16, "", 1.4], ["Vaatwasser", "B", 16, "", 1.0] ] },
];
const kwById = {};
const klus = {
  postcode: "2801 AB", huisnummer: "12", straat: "Voorbeeldstraat", plaats: "Gouda",
  naam: "Fam. de Vries", typeWerk: "Groepenkast vervangen",
  instNaam: "Van Dijk Elektrotechniek", instMonteur: "J. van Dijk (VP)",
  // Geen erkenning: het bedrijf is verzonnen, en een nummer zou naar een echt
  // bedrijf in het register van InstallQ kunnen wijzen.
  instMetingen: { hoofdzekering: "25", zDrieFase: true },
  aardlekgroepen: BLOKKEN.map((b, i) => ({
    id: i + 1, naam: `Blok ${i + 1}`, fase: "1", L: b.L,
    eindgroepen: b.groepen.map(([naam, , a, type, kw], j) => {
      const id = (i + 1) * 10 + j + 1;
      kwById[id] = String(kw);
      return { id, naam, type, ampere: `${a}A` };
    }),
  })),
  mkp: { kwById, lbAan: false },
};

// ── Door de echte code ──────────────────────────────────────────────────────
const { paspoort, url, qr, modules } = await mkpQrVoorRapport(klus, "groepenkast");
const png = PNG.sync.read(Buffer.from(qr.split(",")[1], "base64"));
const gelezen = jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data;
const terug = gelezen && await mkpDecode(gelezen.slice(MKP_BASIS.length));
if (gelezen !== url || JSON.stringify(terug) !== JSON.stringify(paspoort)) {
  console.error("✗ De QR leest niet terug als het paspoort — niets weggeschreven.");
  process.exit(1);
}
const bal = faseBalans({ grp: paspoort.grp, ha: paspoort.ha, lbAan: false });
if (!bal || !bal.volledig) { console.error("✗ Fasebalans onvolledig"); process.exit(1); }

// ── Opmaak ──────────────────────────────────────────────────────────────────
const nl = (n, d = 1) => Number(n).toFixed(d).replace(".", ",");
const kw2 = (n) => nl(n, Math.abs(n * 10 - Math.round(n * 10)) > 1e-9 ? 2 : 1);   // 5,75 en 2,9
const datumNl = paspoort.d.split("-").reverse().join("-");
const projectNr = `${paspoort.pc}-${paspoort.nr}`;
const cap = bal.rijen[0].capaciteitKw;
const pct = (r) => Math.round(r.bezet * 100);
const KLASSE = { ok: "g", "let-op": "o", afwijking: "r" };
const krap = bal.rijen.filter((r) => r.niveau === "let-op");
const over = bal.rijen.filter((r) => r.niveau === "afwijking");
const beste = bal.rijen.find((r) => r.fase === bal.besteFase);
const zwaarste = bal.rijen.reduce((a, b) => (b.bezet > a.bezet ? b : a));
const aantalGroepen = paspoort.grp.length;
const aandachtspunten = krap.length + over.length;

const verdict = over.length
  ? { k: "bad", ic: "!", t: `${over.map((r) => r.fase).join(" en ")} boven de capaciteit`,
      d: "Herverdelen over de fasen, sturing of een zwaardere aansluiting is hier aan de orde." }
  : krap.length
  ? { k: "warn", ic: "!", t: `Binnen de capaciteit — ${krap.map((r) => r.fase).join(" en ")} heeft weinig ruimte over`,
      d: `Geen enkele fase komt boven de capaciteit. De keukengroepen staan samen op ${zwaarste.fase} (${pct(zwaarste)}% bezet, ${nl(Math.max(0, zwaarste.vrijKw))} kW vrij na ${nl(FASE_RESERVE_KW)} kW reserve); de andere fasen hebben ruime marge.` }
  : { k: "ok", ic: "✓", t: "Kast in balans en binnen de capaciteit", d: "Op alle drie de fasen is ruimte over." };

const fcRij = (r) => `
      <div class="fc-row">
        <div class="fc-lab">${r.fase}</div>
        <div class="fc-bar"><div class="fc-fill ${KLASSE[r.niveau]}" style="width:${Math.min(100, pct(r))}%">${pct(r)}%</div></div>
        <div class="fc-meta"><b>${nl(r.belastingKw)} kW</b> belast<br><span class="small">${r.vrijKw > 0 ? `${nl(r.vrijKw)} kW vrij` : "geen ruimte vrij"}</span></div>
      </div>`;

const rcdRij = (b, i) => `
      <tr>
        <td><strong>Blok ${i + 1}</strong></td>
        <td class="small">${b.groepen.map(([n, k, a]) => `${n} (${k}${a})`).join(" · ")}</td>
        <td class="nw">${b.L} · 1F</td><td class="nw">30 mA · A</td>
        <td class="num">${b.rcd.dt} ms</td><td class="num">${b.rcd.di} mA</td><td><span class="tag ok">✓</span></td>
        <td style="text-align:right"><span class="tag ok">✓ OK</span></td>
      </tr>`;

const html = `<!DOCTYPE html>
<!-- public/voorbeeld-opleverrapport.html — GEGENEREERD door scripts/demo-opleverrapport.mjs, niet met de hand bewerken -->
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>YourWkb — Voorbeeld opleverrapport</title>
<meta name="description" content="Voorbeeld van een YourWkb-opleverrapport voor een groepenkast: metingen getoetst aan NEN 1010, belasting per fase en een werkend meterkastpaspoort.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Caveat:wght@600&display=swap" rel="stylesheet">
<style>
  :root{
    --ink:#1b1e27; --muted:#6b7280; --soft:#9aa1ad; --line:#e6e8ec; --line2:#eef0f3;
    --paper:#ffffff; --panel:#f7f8fa; --yellow:#F5C518; --yellowdk:#8a6d00;
    --green:#1a8f4c; --greenbg:#e8f6ee; --orange:#b5730a; --orangebg:#fcf1de; --red:#d23b34; --redbg:#fdecea;
    --ink2:#111318;
    /* Koppen in IBM Plex Sans 700 (design-spec §17): Syne kapte de onderstok van g/j/p af. */
    --head:'IBM Plex Sans',system-ui,sans-serif; --body:'IBM Plex Sans',system-ui,sans-serif;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{background:#e9ebef;color:var(--ink);font-family:var(--body);font-size:13px;line-height:1.55;padding:24px 12px}
  .page{max-width:820px;margin:0 auto 22px;background:var(--paper);border-radius:6px;
    box-shadow:0 8px 30px rgba(0,0,0,.12);overflow:hidden}
  .top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;
    padding:26px 40px 22px;border-bottom:3px solid var(--yellow);position:relative}
  .brand{display:flex;align-items:center;gap:11px}
  .bolt{width:40px;height:40px;border-radius:10px;background:var(--yellow);display:flex;align-items:center;justify-content:center;font-size:22px}
  .brand .nm{font-family:var(--head);font-weight:700;font-size:20px;letter-spacing:-.01em;color:var(--ink2);line-height:1.2}
  .brand .nm span{color:var(--yellowdk)}
  .brand .tl{font-size:11px;color:var(--muted);margin-top:1px}
  .doc-h{text-align:right}
  .doc-h h1{font-family:var(--head);font-weight:700;font-size:22px;color:var(--ink2);letter-spacing:-.01em;line-height:1.2}
  .doc-h .s{font-size:11.5px;color:var(--muted);margin-top:2px}
  .demo{position:absolute;top:26px;left:50%;transform:translateX(-50%);
    background:#111318;color:var(--yellow);font-family:var(--head);font-weight:700;font-size:10.5px;
    letter-spacing:.22em;padding:4px 12px;border-radius:5px}
  /* Alleen de directe kinderen: de oude selector ".meta div" gaf ook de labels
     erbinnen padding en randen, waardoor de strook in de pdf uit elkaar viel. */
  .meta{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--line)}
  .meta > div{padding:11px 40px 11px 24px;border-right:1px solid var(--line2)}
  .meta > div:first-child{padding-left:40px}
  .meta > div:nth-child(4n){border-right:none}
  .meta .k{font-size:9.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--soft);font-weight:700}
  .meta .v{font-size:13px;font-weight:600;color:var(--ink);margin-top:2px}
  h2{font-family:var(--head);font-weight:700;font-size:14px;color:var(--ink2);margin:0 0 10px;line-height:1.25;
    display:flex;align-items:center;gap:9px}
  h2::before{content:"";width:5px;height:16px;border-radius:3px;background:var(--yellow);display:inline-block}
  section{padding:22px 40px;border-bottom:1px solid var(--line2)}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px 26px}
  .kv{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--line2);font-size:12.5px}
  .kv .k{color:var(--muted)}
  .kv .v{font-weight:600;text-align:right}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:var(--panel);text-align:left;font-family:var(--head);font-weight:600;font-size:10px;
    text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding:8px 10px;border-bottom:1px solid var(--line)}
  td{padding:8px 10px;border-bottom:1px solid var(--line2);vertical-align:top}
  td.num{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}
  .tag{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:20px;border:1px solid transparent;white-space:nowrap}
  .tag.ok{color:var(--green);background:var(--greenbg);border-color:#bfe6cd}
  .small{font-size:10.5px;color:var(--muted)}
  td.nw{white-space:nowrap}
  .note{font-size:10.5px;color:var(--muted);margin-top:6px}
  .fc-wrap{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px 18px 8px}
  .fc-row{display:grid;grid-template-columns:34px 1fr 128px;align-items:center;gap:14px;margin-bottom:14px}
  .fc-lab{font-family:var(--head);font-weight:700;font-size:16px;color:var(--ink2)}
  .fc-bar{height:22px;border-radius:6px;background:#e7e9ee;overflow:hidden;position:relative}
  .fc-fill{height:100%;border-radius:6px 0 0 6px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;
    font-size:10.5px;font-weight:700;color:#fff}
  .fc-fill.g{background:linear-gradient(90deg,#27AE60,#1e9a54)}
  .fc-fill.o{background:linear-gradient(90deg,#F59E0B,#d98704)}
  .fc-fill.r{background:linear-gradient(90deg,#FF5A52,#e0453d)}
  .fc-meta{font-size:11px;text-align:right;font-variant-numeric:tabular-nums}
  .fc-meta b{font-size:13px}
  .fc-scale{display:flex;justify-content:space-between;font-size:9.5px;color:var(--soft);padding:0 128px 8px 48px;margin-top:-4px}
  .verdict{display:flex;gap:12px;align-items:flex-start;border-radius:10px;padding:13px 15px;margin-top:10px}
  .verdict .ic{width:26px;height:26px;border-radius:7px;color:#fff;font-weight:700;
    display:flex;align-items:center;justify-content:center;flex:0 0 26px;font-size:15px}
  .verdict .tt{font-weight:700;font-size:13px}
  .verdict .dd{font-size:12px;margin-top:1px}
  .verdict.ok{background:var(--greenbg);border:1px solid #bfe6cd} .verdict.ok .ic{background:var(--green)} .verdict.ok .tt{color:var(--green)} .verdict.ok .dd{color:#245c3c}
  .verdict.warn{background:var(--orangebg);border:1px solid #f0d9a8} .verdict.warn .ic{background:var(--orange)} .verdict.warn .tt{color:var(--orange)} .verdict.warn .dd{color:#6b4a0c}
  .verdict.bad{background:var(--redbg);border:1px solid #f3c6c2} .verdict.bad .ic{background:var(--red)} .verdict.bad .tt{color:var(--red)} .verdict.bad .dd{color:#6e211d}
  .advies{display:flex;gap:12px;align-items:flex-start;background:#fffdf3;border:1px solid #f0e2a8;
    border-left:3px solid var(--yellow);border-radius:10px;padding:13px 15px;margin-top:10px}
  .advies .ic{font-size:17px}
  .advies .tt{font-family:var(--head);font-weight:700;font-size:12.5px;color:var(--yellowdk)}
  .advies .dd{font-size:12px;color:#5f5320;margin-top:2px}
  .ai{background:#f4f0fb;border:1px solid #e4d8f5;border-radius:10px;padding:14px 16px}
  .ai .h{font-family:var(--head);font-weight:700;font-size:11.5px;color:#6b4aa0;display:flex;align-items:center;gap:7px;margin-bottom:7px}
  .ai p{font-size:12px;color:#3a3350}
  .ai ul{margin:8px 0 0;padding-left:18px}
  .ai li{font-size:12px;color:#3a3350;margin:3px 0}
  .mkp{display:flex;gap:20px;align-items:center;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px 18px}
  .mkp img{width:150px;height:150px;flex:0 0 150px;border:1px solid var(--line);border-radius:8px;background:#fff;image-rendering:pixelated}
  .mkp .t{font-family:var(--head);font-weight:700;font-size:13px;color:var(--ink2)}
  .mkp .d{font-size:12px;color:var(--muted);margin-top:4px}
  .mkp .chips{margin-top:9px;display:flex;gap:6px;flex-wrap:wrap}
  .chip{font-size:10px;font-weight:600;color:var(--ink2);background:#fff;border:1px solid var(--line);border-radius:20px;padding:3px 9px}
  .concl{background:var(--greenbg);border:1px solid #bfe6cd;border-radius:10px;padding:14px 16px;font-size:12.5px;color:#22563a}
  .concl b{color:var(--green)}
  .sign{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:16px}
  .sign .box{border-top:1px solid var(--line);padding-top:8px}
  .sign .k{font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--soft);font-weight:700}
  .sign .v{font-weight:600;margin-top:2px}
  .sign .sig{font-family:'Caveat',cursive;font-size:26px;color:var(--ink2);margin-top:4px;opacity:.85}
  footer{padding:16px 40px;background:#111318;color:#c2c8d8;font-size:10.5px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px}
  footer b{color:#fff}
  footer a{color:#c2c8d8;text-decoration:none}
  .disc{padding:12px 40px;font-size:10px;color:var(--soft);background:#fbfbfc;border-top:1px solid var(--line2)}
  .downloads{max-width:820px;margin:0 auto 14px;display:flex;justify-content:flex-end;gap:10px}
  .downloads a{font-size:12px;font-weight:600;color:#111318;background:#F5C518;border-radius:8px;padding:8px 14px;text-decoration:none}
  @page{size:A4;margin:10mm}
  @media print{body{background:#fff;padding:0}.page{box-shadow:none;margin:0;border-radius:0;max-width:none}
    .downloads{display:none} section{break-inside:avoid} .fc-wrap,.verdict,.advies,.ai,.mkp,.concl,tr{break-inside:avoid}}
  @media(max-width:640px){.top{flex-direction:column;padding:22px 16px 18px}.doc-h{text-align:left}.demo{position:static;transform:none;align-self:flex-start}
    .meta{grid-template-columns:1fr 1fr}.meta > div,.meta > div:first-child{padding:10px 16px}.meta > div:nth-child(2n){border-right:none}
    section{padding:20px 16px}.grid2{grid-template-columns:1fr}.sign{grid-template-columns:1fr}
    .table-scroll{overflow-x:auto}.fc-row{grid-template-columns:28px 1fr}.fc-meta{grid-column:2;text-align:left}.fc-scale{display:none}
    .mkp{flex-direction:column;align-items:flex-start}.disc,footer{padding-left:16px;padding-right:16px}}
</style>
</head>
<body>
<div class="downloads"><a href="/voorbeeld-opleverrapport.pdf" download>Download als pdf</a></div>
<div class="page">

  <div class="top">
    <div class="brand">
      <div class="bolt">⚡</div>
      <div>
        <div class="nm">Your<span>Wkb</span></div>
        <div class="tl">Aantoonbaar veilig opgeleverd</div>
      </div>
    </div>
    <div class="demo">VOORBEELD</div>
    <div class="doc-h">
      <h1>Opleveringsrapport</h1>
      <div class="s">Groepenkast · NEN 1010 · Wkb-opleverdossier</div>
    </div>
  </div>

  <div class="meta">
    <div><div class="k">Projectnummer</div><div class="v">${projectNr}</div></div>
    <div><div class="k">Opleverdatum</div><div class="v">${datumNl}</div></div>
    <div><div class="k">Discipline</div><div class="v">Groepenkast</div></div>
    <div><div class="k">Status</div><div class="v" style="color:var(--green)">✓ Opgeleverd</div></div>
  </div>

  <section>
    <h2>Projectgegevens</h2>
    <div class="grid2">
      <div>
        <div class="kv"><span class="k">Opdrachtgever</span><span class="v">${klus.naam}</span></div>
        <div class="kv"><span class="k">Locatie</span><span class="v">${klus.straat} ${klus.huisnummer}</span></div>
        <div class="kv"><span class="k">Postcode / plaats</span><span class="v">${klus.postcode} · ${klus.plaats}</span></div>
        <div class="kv"><span class="k">Type werk</span><span class="v">${klus.typeWerk}</span></div>
      </div>
      <div>
        <div class="kv"><span class="k">Installatiebedrijf</span><span class="v">${klus.instNaam}</span></div>
        <div class="kv"><span class="k">Monteur</span><span class="v">${klus.instMonteur}</span></div>
        <div class="kv"><span class="k">Aansluiting</span><span class="v">3-fase · 3 × ${paspoort.ha.a} A</span></div>
        <div class="kv"><span class="k">Stelsel / kast</span><span class="v">TN-C-S · kunststof</span></div>
      </div>
    </div>
  </section>

  <section>
    <h2>Meetapparatuur</h2>
    <div class="table-scroll"><table>
      <tr><th>Instrument</th><th>Type</th><th>Serienr.</th><th>Norm</th><th>Kalibratie geldig t/m</th></tr>
      <tr><td>Installatietester</td><td>Fluke 1664 FC</td><td class="num">40291744</td><td>NEN-EN-IEC 61557-1/2/3/6</td><td class="num">14-03-2027 <span class="tag ok">✓</span></td></tr>
      <tr><td>Multimeter</td><td>Fluke 117</td><td class="num">28114902</td><td>IEC 61010-1</td><td class="num">14-03-2027 <span class="tag ok">✓</span></td></tr>
    </table></div>
    <div class="note">Kalibratiestatus geldig op meetdatum. Certificaten worden ≥ 5 jaar bewaard (conform TD17 / NEN-EN-IEC 61557).</div>
  </section>

  <section>
    <h2>Installatiemetingen</h2>
    <div class="table-scroll"><table>
      <tr><th>Meting</th><th>Waarde</th><th>Norm (NEN 1010 h. 6.4)</th><th style="text-align:right">Oordeel</th></tr>
      <tr><td>Impedantie Z L-N</td><td class="num">0,38 Ω</td><td>≤ 2,88 Ω (B16: 230 / 5·16)</td><td style="text-align:right"><span class="tag ok">✓ Voldoet</span></td></tr>
      <tr><td>Impedantie Z L-PE (hoogste groep B16)</td><td class="num">0,42 Ω</td><td>≤ 2,88 Ω (230 / 5·16)</td><td style="text-align:right"><span class="tag ok">✓ Voldoet</span></td></tr>
      <tr><td>Isolatieweerstand fase → aarde</td><td class="num">&gt; 999 MΩ</td><td>≥ 0,23 MΩ</td><td style="text-align:right"><span class="tag ok">✓ Voldoet</span></td></tr>
      <tr><td>Isolatieweerstand nul → aarde</td><td class="num">&gt; 999 MΩ</td><td>≥ 0,23 MΩ</td><td style="text-align:right"><span class="tag ok">✓ Voldoet</span></td></tr>
      <tr><td>Spanning L1 / N</td><td class="num">231 V</td><td>207 – 253 V</td><td style="text-align:right"><span class="tag ok">✓ Voldoet</span></td></tr>
      <tr><td>Spanning L2 / N</td><td class="num">229 V</td><td>207 – 253 V</td><td style="text-align:right"><span class="tag ok">✓ Voldoet</span></td></tr>
      <tr><td>Spanning L3 / N</td><td class="num">233 V</td><td>207 – 253 V</td><td style="text-align:right"><span class="tag ok">✓ Voldoet</span></td></tr>
    </table></div>
    <div class="note">Fasespanning-asymmetrie 4 V (&lt; 6 V richtwaarde) — netaansluiting in orde.</div>
  </section>

  <section>
    <h2>Aardlekgroepen — RCD-test</h2>
    <div class="table-scroll"><table>
      <tr><th>Blok</th><th>Eindgroepen (kar · A)</th><th>Fase</th><th>RCD</th><th>ΔT</th><th>ΔI</th><th>Test</th><th style="text-align:right">Status</th></tr>
      ${BLOKKEN.map(rcdRij).join("")}
    </table></div>
    <div class="note">Norm ΔT ≤ 300 ms (EN 61008, 1×IΔn). Norm ΔI type A ≤ 1,4×IΔn = 42 mA. Testknop bediend en functioneel bevonden bij alle blokken.</div>
  </section>

  <section>
    <h2>Fasecheck — belasting per fase</h2>
    <p class="small" style="margin-bottom:12px">Indicatie op basis van de vastgelegde groepen en hun vermogens — geen meting. Capaciteit per fase: ${paspoort.ha.a} A × 230 V = ${kw2(cap)} kW; van de vrije ruimte is ${nl(FASE_RESERVE_KW)} kW reserve afgetrokken. Over de kookgroep is gerekend met gelijktijdigheidsfactor ${nl(GELIJKTIJDIGHEID)} (richtlijn NEN-EN-IEC 61439). De hoofdzekering saldeert niet over de fasen — daarom wordt per fase gerekend.</p>
    <div class="fc-wrap">
      ${bal.rijen.map(fcRij).join("")}
      <div class="fc-scale"><span>0</span><span>${nl(cap / 2)} kW</span><span>${kw2(cap)} kW</span></div>
    </div>

    <div class="verdict ${verdict.k}">
      <div class="ic">${verdict.ic}</div>
      <div>
        <div class="tt">${verdict.t}</div>
        <div class="dd">${verdict.d}</div>
      </div>
    </div>

    <div class="advies">
      <div class="ic">💡</div>
      <div>
        <div class="tt">Advies voor uitbreiding</div>
        <div class="dd">Komt er later een eenfase-apparaat bij, zoals een laadpaal, warmtepomp of thuisbatterij? Dat zit op <strong>${beste.fase}</strong> het minst in de weg — daar staat met ${nl(beste.vrijKw)} kW de meeste vrije ruimte. ${krap.length ? `Op ${krap.map((r) => r.fase).join(" en ")} past er nauwelijks nog iets bij; verplaats daar eerst een keukengroep of kies een driefase-apparaat.` : ""} Reken het nieuwe apparaat vooraf door met de Fasecheck in de app. De faseverdeling staat ook in het meterkastpaspoort, zodat de volgende monteur haar bij het scannen meteen heeft.</div>
      </div>
    </div>
  </section>

  <section>
    <h2>Geautomatiseerde beoordeling</h2>
    <div class="ai">
      <div class="h">✦ YourWkb-analyse — installatie als geheel</div>
      <p>Alle gemeten waarden vallen ruim binnen de NEN 1010-grenswaarden en de drie aardlekblokken schakelen snel en scherp af. De isolatieweerstand is uitstekend en de fasespanningen zijn nagenoeg symmetrisch (asymmetrie 4 V). De belasting is op L1 en L2 licht en op ${zwaarste.fase} duidelijk zwaarder door de gebundelde keukengroepen. Dat past binnen de capaciteit, maar ${zwaarste.fase} heeft daardoor de minste ruimte voor uitbreiding.</p>
      <ul>
        <li>Reserveer ${beste.fase} voor een toekomstige laadpaal of warmtepomp (meeste vrije ruimte).</li>
        <li>Overweeg bij een volgende uitbreiding één keukengroep van ${zwaarste.fase} naar ${beste.fase} te verplaatsen voor een gelijkmatiger beeld.</li>
        <li>De faseverdeling staat in het meterkastpaspoort; de volgende monteur heeft haar bij het scannen direct.</li>
      </ul>
    </div>
  </section>

  <section>
    <h2>Meterkastpaspoort</h2>
    <div class="mkp">
      <img src="${qr}" alt="QR-code meterkastpaspoort van dit voorbeeld">
      <div>
        <div class="t">Scan voor het digitale meterkastpaspoort</div>
        <div class="d">Deze QR werkt echt: richt je telefooncamera erop. Hij is door de app gemaakt uit de gegevens van dit rapport — aansluiting, groepen en faseverdeling in één open standaard, direct herbruikbaar bij een volgende laadpaal-, PV- of warmtepompklus. De gegevens zitten in de code zelf; er is geen centrale opslag.</div>
        <div class="chips">
          <span class="chip">3 × ${paspoort.ha.a} A</span><span class="chip">${aantalGroepen} groepen</span>
          <span class="chip">${bal.rijen.map((r) => `${r.fase} ${pct(r)}%`).join(" · ")}</span><span class="chip">open standaard</span>
        </div>
      </div>
    </div>
  </section>

  <section style="border-bottom:none">
    <h2>Conclusie &amp; oplevering</h2>
    <div class="concl">
      <b>De groepenkast is uitgevoerd en gemeten conform NEN 1010.</b> De visuele controle en de metingen zijn over de gehele installatie uitgevoerd. ${aandachtspunten === 1 ? "Er is één aandachtspunt vastgelegd" : aandachtspunten > 1 ? `Er zijn ${aandachtspunten} aandachtspunten vastgelegd` : "Er zijn geen aandachtspunten"}${aandachtspunten ? " — zie de Fasecheck" : ""}; er zijn geen afwijkingen van de gestelde eisen geconstateerd die een veilige inbedrijfstelling verhinderen. Dit rapport is onderdeel van het Wkb-opleverdossier en legt de kwaliteit van het werk aantoonbaar vast.
    </div>
    ${krap.length ? `<p class="note">Aandachtspunt: ${krap.map((r) => r.fase).join(" en ")} is met ${pct(zwaarste)}% de zwaarst belaste fase. Voor uitbreidingen geldt het advies onder “Fasecheck”. De installateur blijft verantwoordelijk voor beoordeling en uitvoering; de Fasecheck is een hulpmiddel en een indicatie.</p>` : ""}
    <p class="note">Getoetst aan NEN 1010:2020. In de Omgevingsregeling is momenteel NEN 1010:2015 aangewezen; toepassing van een nieuwere editie is toegestaan.</p>
    <div class="sign">
      <div class="box">
        <div class="k">Opgeleverd door</div>
        <div class="v">J. van Dijk — ${klus.instNaam}</div>
        <div class="sig">J. van Dijk</div>
      </div>
      <div class="box">
        <div class="k">Voor ontvangst — opdrachtgever</div>
        <div class="v">${klus.naam}</div>
        <div class="sig" style="opacity:.35">— — —</div>
      </div>
    </div>
  </section>

  <div class="disc">
    Dit is een <strong>voorbeeldrapport</strong> van YourWkb met fictieve gegevens, bedoeld ter illustratie. Een echt rapport wordt automatisch gevuld met de gegevens en metingen van de betreffende installatie.
  </div>

  <footer>
    <span><b>YourWkb</b> · opleverrapport ${projectNr} · ${datumNl}</span>
    <span><a href="https://yourwkb.nl">YourWkb.nl</a> · <a href="https://meterkastpaspoort.nl">meterkastpaspoort.nl</a></span>
  </footer>

</div>
</body>
</html>
`;

fs.writeFileSync(UIT_HTML, html);
console.log(`✓ ${path.relative(ROOT, UIT_HTML)} (${Math.round(html.length / 1024)} kB, QR ${modules} modules, teruggelezen en gelijk)`);

// ── PDF via headless Chrome ─────────────────────────────────────────────────
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!fs.existsSync(CHROME)) {
  console.warn("! Geen Chrome gevonden — pdf niet bijgewerkt (zet CHROME=/pad/naar/chrome).");
} else {
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=8000",
    `--print-to-pdf=${UIT_PDF}`, `file://${UIT_HTML}`,
  ], { stdio: "ignore" });
  console.log(`✓ ${path.relative(ROOT, UIT_PDF)} (${Math.round(fs.statSync(UIT_PDF).size / 1024)} kB)`);
}
console.log("Paspoort in de QR:", JSON.stringify(paspoort));
