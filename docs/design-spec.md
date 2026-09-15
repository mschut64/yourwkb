# YourWkb — design-spec

Versie 2.0 · augustus 2026. Opgesteld op `WkbApp-v2026-08-15-A.jsx` (5741 regels) en `landing-page-v2026-08-15-C.js` (512 regels). Alles hieronder is een **diff op jouw code**: dezelfde tokennamen, dezelfde classnames, dezelfde flow. Wat niet in dit document staat, blijft ongewijzigd.

Uitgangspunt na het lezen van de code: het fundament is beter dan de opdracht suggereert. De luminantieladder `bg → surface → card` (`#111318 → #1A1D25 → #20242F`) is al goed, de `*Dim`-statusvlakken zijn een goed idee, IBM Plex Sans is een goede keuze voor cijfers in het veld. Er zijn drie echte defecten — contrast van `K.muted`, contrast van `K.red`, en tapmaten onder 48 px — plus een uit elkaar gegroeid landingspalet. Ik verander dus **niet** het palet; ik repareer wat meet.

---

## 1 · Design-audit — 10 zwaktes, op impact

1. **`K.muted` haalt 2,8:1.** `#636880` op `K.card` `#20242F` = **2,82:1**, ver onder AA (4,5). Het staat in `S.sTitle` op 11 px — dus elke sectiekop in de app is in een lichte meterkast onleesbaar. Dit is het belangrijkste probleem in de app. → `#9BA3B8` (6,06:1).
2. **`K.red` haalt AA niet, ook niet op zijn eigen vlak.** `#E53935` op `K.card` = 3,67:1, op `K.redDim` `#2A0C0C` = 4,30:1. De `StatusTag` "✗ Afwijking" — precies de melding die niet gemist mag worden — is de slechtst leesbare tekst in de app. → `#FF5A52` (5,05:1 op card).
3. **`S.backBtn` is 34×34 px.** Dat is 30% onder de ondergrens van 48 px, en het is de knop die het vaakst met één hand wordt geraakt. → 48×48, radius 12.
4. **`S.input` en `S.select` worden ±40 px hoog** (`padding:"11px 13px"` + `fontSize:14`). Bij handschoenen en een trillende hand levert dat mis-tikken op naburige velden. → `minHeight:52`, `fontSize:16`, `padding:"0 14px"`.
5. **Meetwaarden zijn 14 px.** De ingevoerde waarde heeft dezelfde grootte als het label ernaast, dus controleren kost een tweede blik. → aparte `S.inputMeting` op 28 px/700 met de eenheid ernaast.
6. **`S.tag` is 11 px op `padding:"3px 9px"`** ≈ 22 px hoog. De statuspil is de snelste informatiedrager in de app en nu het kleinste element. → 13 px, `minHeight:30`, plus 1 px rand in de statuskleur zodat de vorm ook zonder kleurwaarneming leest.
7. **Landing en app zijn twee producten geworden.** Twee paletten (`#0C0D10/#13151A/#1A1D24/#2A2E3A/#6B7080` tegenover `#111318/#1A1D25/#20242F/#2E3347/#636880`), twee groenen (`#22C55E` / `#27AE60`), twee body-fonts (DM Sans / IBM Plex Sans). Een installateur die van landing naar app gaat, ziet twee merken. → landing neemt de app-tokens en IBM Plex Sans over. ~~Syne blijft voor koppen.~~ **Herzien 15-09-2026 (Martin):** ook de koppen gaan naar IBM Plex Sans 700. Syne 800 was slecht leesbaar en kapte bij de krappe regelhoogte onderstokken af (g, j, p). Eén letterfamilie voor landing, blog, AVG-pagina en app; regelhoogte voor koppen minimaal 1,15.
8. **`--muted` op de landing haalt 3,9:1** op `--black` en **3,4:1** op `--card`. Dat treft `.hero-sub` (19 px), `.section-sub` (17 px), `.step-desc`, `.price-desc`, `.faq-a` en `.trust-item` — dus vrijwel alle verkoopbody. Op een telefoon buiten is dat de helft van je tekst. → `#9BA3B8`, en `.hero-sub`/`.section-sub` naar `--text-soft` `#C2C8D8` (9,3:1).
9. **`.btn-ghost` is geen knop.** `color:var(--muted); font-size:14px` naast een 50 px gele knop: 3,9:1 tekst, geen raakvlak, geen rand. De secundaire actie ("bekijk voorbeeldrapport") is daarmee onvindbaar. → 52 px, rand `--border-strong`, `--text`.
10. **Status leunt op kleur alleen.** `StatusTag`, `.check-done`/`.check-open`, `.ok` en `.feat-check`/`.feat-dash` verschillen uitsluitend in kleur. De labels van `StatusTag` bevatten al een teken (`✓ ✗ ⚠`) — goed — maar `.check-open`, `.feat-dash` en `.step-dot` niet. → overal teken + kleur + rand, via één helper.

Kleine punten, niet in de tokens: `@import` voor de Google-fonts staat op regel 72 ná de eerste regels van het stylesheet, waardoor hij door de browser wordt genegeerd (de `<link>` op regel 198 doet het werk — de `@import` kan weg); `.hero { min-height:100vh }` duwt de eerste bewijssectie onder de fold op elke telefoon; `.phone { animation: phoneFloat }` staat al netjes uit bij `prefers-reduced-motion`.

---

## 2a · `K` — alleen de gewijzigde en nieuwe regels

Vervang het `K`-object (regel 47–56) door:

```js
const K = {
  bg:"#111318", surface:"#1A1D25", card:"#20242F", border:"#2E3347",
  borderStrong:"#3E4459",                    // NIEUW — rand van invoervelden en ghost-knoppen
  yellow:"#F5C518", yellowDim:"#2A240A",
  yellowPress:"#D9AE0F",                     // NIEUW — :active van de primaire knop
  green:"#27AE60",  greenDim:"#0C2418",
  orange:"#F59E0B", orangeDim:"#2A1E08",
  red:"#FF5A52",    redDim:"#2A0C0C",        // GEWIJZIGD was #E53935 — haalde AA niet
  blue:"#2196F3",   blueDim:"#0A1A2A",
  purple:"#9B59B6", purpleDim:"#1E0A2A",
  text:"#ECEEF5",
  textSoft:"#C2C8D8",                        // NIEUW — tweede regel in een kaart
  muted:"#9BA3B8",                           // GEWIJZIGD was #636880 — 2,82:1
  tap:52, radius:14, radiusSm:10,            // NIEUW — maten als token
};
```

Vier regels raken de rest van de app: `muted`, `red`, en de drie nieuwe kleuren. `bg`, `surface`, `card`, `border`, `yellow`, `green`, `orange`, `blue`, `purple` en alle `*Dim`-waarden blijven exact zoals ze zijn — die werken.

Let op: `K.muted` wordt op sommige plekken als *decoratieve* kleur gebruikt (inactieve `Pill`-tekst). Daar is de nieuwe waarde ook beter, want inactief-maar-leesbaar is wat je wil; alleen bij `#636880` viel het weg.

## 2b · `S` — het volledige vervangende object

Vervang regel 57–69 door:

```js
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
```

Wijzigingen die door de hele app doorwerken zonder dat je één component aanraakt: elk veld en elke knop wordt minimaal 52 respectievelijk 56 px, elk label wordt 12 px in plaats van 11, elke statuspil wordt 30 px hoog. `S.hdr` verliest 4 px padding om de 14 px die `backBtn` erbij krijgt te compenseren — de header wordt dus niet hoger en er verdwijnt geen inhoud onder de fold.

**`StatusTag` (regel 510–521)** — rand erbij, zodat de vorm zonder kleur leest:

```js
const StatusTag = ({ level }) => {
  const cfg = {
    ok:     { bg:K.greenDim,  color:K.green,  line:"rgba(39,174,96,0.45)",  label:"✓ OK" },
    orange: { bg:K.orangeDim, color:K.orange, line:"rgba(245,158,11,0.45)", label:"⚠ Let op" },
    red:    { bg:K.redDim,    color:K.red,    line:"rgba(255,90,82,0.50)",  label:"✗ Afwijking" },
  };
  const c = cfg[level] || cfg.ok;
  return <span style={{ ...S.tag, background:c.bg, color:c.color, borderColor:c.line }}>{c.label}</span>;
};
```

**`Pill` (regel 498–508)** — raakt 48 px en houdt zijn compacte uiterlijk:

```js
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
```

`small` blijft bestaan voor rijen met veel keuzes (RCD-mA, karakteristiek, groepgrootte), maar zakt niet onder 40 px — die staan altijd in een horizontale rij met ruimte eromheen, dus 40 is daar verdedigbaar; los in een formulier gebruik je `Pill` zonder `small`.

---

## 3 · Landing — vervangend CSS-blok

Vervang de inhoud van `<style>{\`…\`}</style>` (regel 63–195). Alle bestaande classnames blijven; `--text-soft`, `--border-strong`, `.status-*`, `.btn-ghost` als echte knop en de `::before`-tekens zijn nieuw. Verwijder de `@import` op regel 72 (die werkt niet en dupliceert de `<link>`).

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --black: #111318; --surface: #1A1D25; --card: #20242F; --border: #2E3347;
  --border-strong: #3E4459;
  --yellow: #F5C518; --yellow2: #E8A800; --green: #27AE60;
  --orange: #F59E0B; --red: #FF5A52;
  --muted: #9BA3B8; --text-soft: #C2C8D8; --text: #ECEEF5; --white: #FFFFFF;
}
html { scroll-behavior: smooth; }
body { background: var(--black); color: var(--text); font-family: 'IBM Plex Sans', sans-serif; font-size: 17px; line-height: 1.6; overflow-x: hidden; text-wrap: pretty; }
a { color: var(--yellow); text-decoration: none; }
a:hover { color: #FFD84D; }
:focus-visible { outline: 3px solid var(--yellow); outline-offset: 3px; }

nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 0 5vw; display: flex; align-items: center; justify-content: space-between; height: 64px; background: rgba(17,19,24,0.92); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); }
.logo { display: flex; align-items: center; gap: 10px; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 20px; color: var(--white); text-decoration: none; }
.logo-bolt { width: 32px; height: 32px; border-radius: 8px; background: var(--yellow); display: flex; align-items: center; justify-content: center; font-size: 17px; }
.nav-right { display: flex; align-items: center; gap: 16px; }
.nav-link { color: var(--text-soft); text-decoration: none; font-size: 15px; font-weight: 500; }
.nav-link:hover { color: var(--white); }
.btn-nav { background: var(--yellow); color: #000; min-height: 40px; padding: 0 20px; border-radius: 8px; font-weight: 600; font-size: 15px; text-decoration: none; display: inline-flex; align-items: center; }

.hero { display: flex; flex-direction: column; justify-content: center; padding: 120px 5vw 72px; position: relative; overflow: hidden; }
.hero-bg { position: absolute; inset: 0; background: radial-gradient(ellipse 80% 60% at 60% 40%, rgba(245,197,24,0.07) 0%, transparent 70%); pointer-events: none; }
.hero-grid { position: absolute; inset: 0; opacity: 0.03; background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 48px 48px; pointer-events: none; }
.hero-inner { max-width: 700px; position: relative; z-index: 1; }
.hero-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(245,197,24,0.12); border: 1px solid rgba(245,197,24,0.40); color: var(--yellow); font-size: 13px; font-weight: 600; min-height: 34px; padding: 0 14px; border-radius: 20px; margin-bottom: 28px; }
.badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--yellow); animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }

h1, .payoff { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(28px, 5.4vw, 48px); line-height: 1.08; letter-spacing: -0.02em; color: var(--white); margin-bottom: 24px; text-wrap: balance; word-break: keep-all; overflow-wrap: normal; hyphens: none; }
h1 span, .payoff span { color: var(--yellow); }
.hero-sub { font-size: clamp(17px, 2vw, 20px); color: var(--text-soft); max-width: 52ch; margin-bottom: 40px; line-height: 1.6; }
.hero-cta { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }

.btn-primary { background: var(--yellow); color: #000; min-height: 56px; padding: 0 32px; border-radius: 10px; font-weight: 700; font-size: 17px; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid transparent; }
.btn-primary:hover { background: #FFD84D; color: #000; }
.btn-primary:active { background: var(--yellow2); }
.btn-ghost { color: var(--text); background: transparent; border: 1px solid var(--border-strong); min-height: 56px; padding: 0 28px; border-radius: 10px; font-size: 17px; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.btn-ghost:hover { background: var(--card); color: var(--text); border-color: #4A5164; }

.hero-trust { margin-top: 56px; display: flex; gap: 28px; flex-wrap: wrap; }
.trust-item { display: flex; align-items: center; gap: 8px; font-size: 15px; color: var(--text-soft); }
.trust-icon { color: var(--green); }

.phone-wrap { position: absolute; right: 5vw; top: 50%; transform: translateY(-50%); z-index: 1; }
.phone { width: 240px; background: var(--card); border: 1px solid var(--border); border-radius: 32px; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.6); animation: phoneFloat 6s ease-in-out infinite; }
@keyframes phoneFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@media (prefers-reduced-motion: reduce) { .phone { animation: none !important; } .badge-dot { animation: none !important; } }
.phone-shot { display: block; width: 100%; border-radius: 10px; border: 1px solid var(--border); }
.phone-notch { height: 28px; background: var(--surface); display: flex; align-items: center; justify-content: center; }
.phone-notch-pill { width: 60px; height: 8px; background: var(--black); border-radius: 4px; }
.phone-screen { padding: 14px; }
.phone-hdr { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.phone-logo { width: 24px; height: 24px; border-radius: 6px; background: var(--yellow); display: flex; align-items: center; justify-content: center; font-size: 12px; }
.phone-title { font-size: 12px; font-weight: 700; color: var(--white); }
.phone-sub { font-size: 10px; color: var(--muted); }
.step-bar { display: flex; gap: 4px; margin-bottom: 14px; }
.step-dot { flex: 1; height: 3px; border-radius: 2px; }
.phone-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 10px; margin-bottom: 8px; }
.phone-card-title { font-size: 11px; font-weight: 700; color: var(--white); margin-bottom: 6px; }
.phone-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.phone-check { width: 15px; height: 15px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; }
.check-done { background: var(--green); color: #fff; }
.check-open { background: transparent; border: 1px solid var(--border-strong); color: var(--muted); }
.check-open::before { content: '·'; }
.phone-label { font-size: 10px; color: var(--muted); }
.phone-label.done { color: var(--text); }
.measure-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.measure-name { font-size: 10px; color: var(--muted); }
.measure-val { font-size: 12px; font-weight: 700; color: var(--white); font-variant-numeric: tabular-nums; }
.measure-tag { font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px; }
.ok { background: rgba(39,174,96,0.18); color: var(--green); border: 1px solid rgba(39,174,96,0.45); }
.phone-btn { background: var(--yellow); color: #000; border-radius: 7px; padding: 9px; width: 100%; font-size: 11px; font-weight: 700; text-align: center; margin-top: 8px; }

section.steps { padding: 96px 5vw; }
.section-label { font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--yellow); margin-bottom: 12px; }
h2 { font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(26px, 3.6vw, 40px); letter-spacing: -0.02em; color: var(--white); margin-bottom: 16px; line-height: 1.14; text-wrap: balance; }
.section-sub { color: var(--text-soft); font-size: 18px; max-width: 56ch; line-height: 1.6; }
.steps-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 56px; }
.step-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 28px; transition: border-color .2s, transform .2s; }
.step-card:hover { border-color: rgba(245,197,24,0.4); transform: translateY(-2px); }
.step-num { width: 36px; height: 36px; border-radius: 10px; background: var(--yellow); color: #000; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 16px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
.step-icon { font-size: 28px; margin-bottom: 12px; }
.step-title { font-weight: 700; font-size: 17px; color: var(--white); margin-bottom: 6px; }
.step-desc { font-size: 15px; color: var(--muted); line-height: 1.6; }

.voor-wie { padding: 0 5vw 96px; }
.check-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 48px; max-width: 860px; }
.check-card { display: flex; align-items: flex-start; gap: 14px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
.check-circle { width: 28px; height: 28px; border-radius: 50%; background: rgba(39,174,96,0.18); border: 1px solid rgba(39,174,96,0.45); color: var(--green); display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; margin-top: 2px; }
.check-text { font-size: 16px; color: var(--text-soft); line-height: 1.5; }
.check-text strong { color: var(--white); display: block; font-weight: 600; }

.prijzen { padding: 0 5vw 96px; }
.price-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 48px; }
.price-card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 32px; display: flex; flex-direction: column; }
.price-card.featured { border-color: var(--yellow); position: relative; background: linear-gradient(135deg, rgba(245,197,24,0.06), var(--card)); }
.featured-badge { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: var(--yellow); color: #000; font-size: 12px; font-weight: 700; min-height: 26px; padding: 0 14px; border-radius: 20px; white-space: nowrap; display: inline-flex; align-items: center; }
.price-name { font-size: 13px; font-weight: 700; color: var(--muted); letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px; }
.price-amount { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 40px; color: var(--white); letter-spacing: -0.02em; margin-bottom: 4px; }
.price-amount span { font-size: 16px; color: var(--muted); font-weight: 400; font-family: 'IBM Plex Sans', sans-serif; }
.price-desc { font-size: 15px; color: var(--text-soft); margin-bottom: 24px; }
.price-features { list-style: none; margin-bottom: 28px; }
.price-features li { font-size: 15px; color: var(--text-soft); padding: 7px 0; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border); }
.price-features li:last-child { border-bottom: none; }
.feat-check { color: var(--green); }
.feat-dash { color: var(--muted); }
.btn-price-primary { display: flex; align-items: center; justify-content: center; text-decoration: none; background: var(--yellow); color: #000; min-height: 52px; border-radius: 10px; font-weight: 700; font-size: 16px; margin-top: auto; }
.btn-price-ghost { display: flex; align-items: center; justify-content: center; text-decoration: none; background: transparent; color: var(--text); min-height: 52px; border-radius: 10px; font-weight: 600; font-size: 16px; border: 1px solid var(--border-strong); margin-top: auto; }

.faq-wrap { padding: 0 5vw 96px; max-width: 720px; }
.faq-item { border-bottom: 1px solid var(--border); }
.faq-q { width: 100%; min-height: 60px; text-align: left; background: none; border: none; cursor: pointer; color: var(--text); font-family: 'IBM Plex Sans', sans-serif; font-size: 17px; font-weight: 600; padding: 16px 0; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.faq-icon { color: var(--yellow); font-size: 22px; flex-shrink: 0; transition: transform .2s; }
.faq-icon.open { transform: rotate(45deg); }
.faq-a { font-size: 16px; color: var(--text-soft); padding-bottom: 20px; line-height: 1.7; }

.cta-bottom { margin: 0 5vw 80px; background: linear-gradient(135deg, rgba(245,197,24,0.10), rgba(245,197,24,0.03)); border: 1px solid rgba(245,197,24,0.25); border-radius: 24px; padding: 64px 5vw; text-align: center; }
.cta-bottom p { color: var(--text-soft); font-size: 18px; margin-bottom: 36px; }
.email-input { width: 100%; min-height: 56px; padding: 0 18px; border-radius: 10px; background: var(--surface); border: 1px solid var(--border-strong); color: var(--text); font-family: 'IBM Plex Sans', sans-serif; font-size: 17px; outline: none; margin-bottom: 12px; }
.email-input::placeholder { color: var(--muted); }

footer { padding: 32px 5vw; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
footer p { font-size: 14px; color: var(--muted); }
.footer-links { display: flex; gap: 20px; }
.footer-links a { font-size: 14px; color: var(--text-soft); text-decoration: none; }
.footer-links a:hover { color: var(--white); }

.wkb-explainer { padding: 0 5vw 64px; }
.wkb-explainer-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; padding: 32px; border: 1px solid var(--border); border-radius: 18px; background: linear-gradient(135deg, rgba(245,197,24,0.04), rgba(255,255,255,0.02)); }
.wkb-text { font-size: 16px; line-height: 1.7; color: var(--text-soft); }
.wkb-text strong { color: var(--white); }
.wkb-cta-line { text-align: center; margin-top: 20px; font-size: 15px; font-weight: 600; color: var(--yellow); }

/* status: kleur én teken — nieuw, voor sectie-inhoud die nu alleen kleur gebruikt */
.status-ok, .status-warn, .status-fail { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 12px; border-radius: 20px; font-size: 14px; font-weight: 700; line-height: 1; }
.status-ok   { color: var(--green);  background: rgba(39,174,96,0.16);  border: 1px solid rgba(39,174,96,0.45); }
.status-warn { color: var(--orange); background: rgba(245,158,11,0.16); border: 1px solid rgba(245,158,11,0.45); }
.status-fail { color: var(--red);    background: rgba(255,90,82,0.16);  border: 1px solid rgba(255,90,82,0.50); }
.status-ok::before   { content: '\2713'; }
.status-warn::before { content: '\26A0'; }
.status-fail::before { content: '\2717'; }

@media (max-width: 900px) {
  .phone-wrap { position: static; transform: none; display: flex; justify-content: center; margin: 48px auto 0; }
  .phone { width: 220px; }
  .hero { padding-bottom: 72px; }
  .wkb-explainer-inner { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .check-grid { grid-template-columns: 1fr; }
  .price-grid { grid-template-columns: 1fr; }
  .hero-trust { flex-direction: column; gap: 12px; }
  nav .nav-link { display: none; }
  .btn-primary, .btn-ghost { width: 100%; }
}
```

Vervang ook de `<link>` op regel 198–199 door één regel met beide families:

```jsx
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

Waarom deze keuzes voor het veld: de secundaire knop is nu een echte knop met 56 px raakvlak, zodat een installateur die het voorbeeldrapport wil zien hem op een telefoon vindt en raakt. `.hero { min-height:100vh }` is weg, zodat de eerste bewijssectie direct onder de fold zichtbaar begint in plaats van na een volle schermhoogte scrollen. De bodytekst gaat van `--muted` naar `--text-soft`; `--muted` blijft over voor labels en metadata, waar 6:1 volstaat.

---

## 4 · Per scherm — wat níet via de tokens meekomt

Elk item is een zoek-en-vervang op de aangegeven string.

**Startscherm — projectenlijst en "Start direct"**
- Projectrij: zet de rij op `S.rij` in plaats van `S.card`, zodat de rij 56 px hoog is en de status rechts uitlijnt.
  `zoek` `style={S.card}` in de projectkaart-map → `vervang` `style={{...S.rij, minHeight:76, alignItems:"center"}}`
- Disciplinetegel: label onder een 28 px kleurvlak in plaats van gecentreerd, zodat de vier tegels op vorm te onderscheiden zijn zonder te lezen:
```jsx
<div style={{...S.card, minHeight:92, marginBottom:0, display:"flex", flexDirection:"column", justifyContent:"space-between"}}>
  <div style={{width:28, height:28, borderRadius:8, background: actief ? K.yellow : K.borderStrong}} />
  <div style={{fontSize:16, fontWeight:600}}>{titel}<div style={{...S.hint, fontSize:13, marginTop:3}}>{norm}</div></div>
</div>
```

**Meetscherm — normtoetsing**
- Waarde-invoer: `zoek` `style={S.input}` in het meetwaardeveld → `vervang` `style={S.inputMeting}`, en zet de eenheid uit het label naar naast het veld met `<span style={S.eenheid}>MΩ</span>`. *Waarom: de waarde is wat de installateur controleert, niet de veldnaam.*
- Normuitspraak: van een gekleurde tekstregel naar een vlak onder het veld, met de grens erin. Nieuw blokje, direct onder de invoer:
```jsx
<div style={{ minHeight:52, borderRadius:K.radiusSm, padding:"12px 14px", display:"flex", alignItems:"center", gap:12,
  background: ok ? K.greenDim : K.redDim,
  border:`1px solid ${ok ? "rgba(39,174,96,0.45)" : "rgba(255,90,82,0.50)"}` }}>
  <span style={{width:26, height:26, borderRadius:7, background: ok ? K.green : K.red, color:"#fff",
    fontSize:15, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center"}}>{ok ? "✓" : "✗"}</span>
  <div>
    <div style={{fontSize:15, fontWeight:600, color: ok ? K.green : K.red}}>{ok ? "Voldoet aan NEN 1010" : "Afwijking — vastleggen in rapport"}</div>
    <div style={{...S.hint, color:K.textSoft, fontSize:13}}>{grensTekst}</div>
  </div>
</div>
```
*Waarom: bij afkeur wil hij de grens zien zonder terug te scrollen naar de instructietekst.*
- Stapteller in de header, alleen weergave, geen extra tik:
```jsx
<div style={S.hdr}>
  <button style={S.backBtn}>‹</button>
  <div>
    <div style={{...S.sTitle, marginBottom:2}}>Stap {i} van {n}</div>
    <div style={{fontSize:20, fontWeight:700, lineHeight:1.15}}>{titel}</div>
  </div>
</div>
<div style={S.bar}><div style={{...S.barFill, width:`${(i/n)*100}%`}} /></div>
```
- Alle gemeten waarden krijgen `fontVariantNumeric:"tabular-nums"` (zit al in `S.inputMeting`); voeg het ook toe waar waarden in een lijst staan, zodat kolommen uitlijnen en een afwijkende waarde opvalt.

**Paspoort-stap**
- Risicoscore: van `K.yellow` naar de statuskleur van de klasse (`K.green` / `K.orange` / `K.red`), cijfer op 56 px met de klasse in woorden ernaast. *Waarom: geel moet in de hele app "hier tikken" betekenen; een score is geen knop.*
- Inspectiepunt: `S.card` → `S.rij` met een 24 px statusvierkant links en de reden in `S.hint` eronder. *Waarom: "ontbreekt in kast" in de rij scheelt een telefoontje achteraf.*

**Back-up & delen**
- Twee gelijkwaardige `S.btn` → delen blijft `S.btn` (geel), back-up wordt `S.btnGhost`. *Waarom: delen is de handeling die de klus afsluit; twee gele knoppen naast elkaar dwingen tot lezen.*
- Compleetheidsmelding: het `statusvlak` uit het meetscherm hergebruiken direct onder de bestandsregel, met `level="ok"`. Geen dialoog, geen extra stap.
- De waarschuwing over lokale opslag van `K.red` naar `S.hint`. *Waarom: het is informatie, geen fout — rood devalueert als het voor gewone tekst wordt gebruikt.*

---

## 5 · Typografie- en spacingschaal

| Rol | huidig | nieuw | token |
|---|---|---|---|
| Meetwaarde | 14 | **32** / 700 | `S.inputMeting` |
| Score paspoort | — | 56 / 700 | inline |
| Schermtitel | 15–16 | 20 / 700 | inline in `S.hdr` |
| Knop primair | 15 | 17 / 700 | `S.btn` |
| Invoer / select | 14 | 16 / 500 | `S.input`, `S.select` |
| Rij / body | 14–15 | 16 / 400 | `S.rij` |
| Eenheid | — | 17 / 600 | `S.eenheid` |
| Hulptekst | 13 | 14 / 400 | `S.hint` |
| Veldlabel | 11 | 12 / 700 caps | `S.label` |
| Sectielabel | 11 | 12 / 700 caps | `S.sTitle` |
| Statuspil | 11 | 13 / 700 | `S.tag` |

Landing: 48 / 40 / 20 / 18 / 17 / 15 / 12. De kop blijft op 48 px omdat Syne op gewicht 800 breed zet: boven 48 px past een kop van meer dan ~22 tekens niet meer in twee regels naast de telefoonafbeelding.

Spacing blijft jouw ritme: **4 · 8 · 12 · 16 · 18 · 28 · 56**. Binnen een kaart 12–16, tussen kaarten 12, sectiepadding 18 (app) en 96 (landing). Radii: 10 (controls) · 12 (knop, rij) · 14 (kaart) · 20 (pil). Raakmaten: 40 (`Pill small`) · 48 (`backBtn`, `Pill`) · 52 (veld, select, ghost) · 56 (primaire knop, rij).

---

## 6 · Contrast — bewijs

Relatieve luminantie volgens WCAG 2.1. AA normaal = 4,5:1; AA groot (≥18,66 px bold of ≥24 px) = 3:1.

**App — na wijziging**

| Voorgrond | Achtergrond | Ratio | Resultaat |
|---|---|---|---|
| `text` #ECEEF5 | `bg` #111318 | 16,0:1 | AAA |
| `text` #ECEEF5 | `surface` #1A1D25 | 14,5:1 | AAA |
| `text` #ECEEF5 | `card` #20242F | 13,4:1 | AAA |
| `textSoft` #C2C8D8 | `card` #20242F | 9,3:1 | AAA |
| `muted` #9BA3B8 | `bg` #111318 | 7,3:1 | AAA |
| `muted` #9BA3B8 | `surface` #1A1D25 | 6,6:1 | AAA |
| `muted` #9BA3B8 | `card` #20242F | 6,1:1 | AAA |
| `yellow` #F5C518 | `card` #20242F | 9,6:1 | AAA |
| `#000` op `yellow` | #F5C518 | 12,0:1 | AAA |
| `green` #27AE60 | `card` #20242F | 5,4:1 | AA |
| `green` #27AE60 | `greenDim` #0C2418 | 5,7:1 | AA |
| `orange` #F59E0B | `card` #20242F | 7,2:1 | AAA |
| `orange` #F59E0B | `orangeDim` #2A1E08 | 7,7:1 | AAA |
| `red` #FF5A52 | `card` #20242F | 5,1:1 | AA |
| `red` #FF5A52 | `redDim` #2A0C0C | 5,9:1 | AA |
| `border` #2E3347 | `card` #20242F | 1,2:1 | decoratief |
| `borderStrong` #3E4459 | `surface` #1A1D25 | 1,7:1 | zie noot |

**Wat het was — als bewijs dat de twee wijzigingen nodig waren**

| Voorgrond | Achtergrond | Ratio | Resultaat |
|---|---|---|---|
| `muted` #636880 | `card` #20242F | **2,8:1** | faalt AA en AA-groot |
| `muted` #636880 | `bg` #111318 | **3,4:1** | faalt AA |
| `red` #E53935 | `card` #20242F | **3,7:1** | faalt AA |
| `red` #E53935 | `redDim` #2A0C0C | **4,3:1** | faalt AA |

**Landing — na wijziging**

| Voorgrond | Achtergrond | Ratio | Resultaat |
|---|---|---|---|
| `--text` #ECEEF5 | `--black` #111318 | 16,0:1 | AAA |
| `--text-soft` #C2C8D8 | `--black` #111318 | 11,1:1 | AAA |
| `--text-soft` #C2C8D8 | `--card` #20242F | 9,3:1 | AAA |
| `--muted` #9BA3B8 | `--black` #111318 | 7,3:1 | AAA |
| `--yellow` #F5C518 | `--black` #111318 | 11,5:1 | AAA |
| `--green` #27AE60 | `--card` #20242F | 5,4:1 | AA |
| `--muted` #6B7080 (oud) | `--black` #0C0D10 | **3,9:1** | faalde AA |
| `--muted` #6B7080 (oud) | `--card` #1A1D24 | **3,4:1** | faalde AA |

Noot bij de twee randen: `border` en `borderStrong` halen de 3:1 voor UI-grenzen niet. Dat is bewust — de invulvelden onderscheiden zich van hun kaart door hun vulling (`surface` #1A1D25 tegen `card` #20242F), hun 52 px hoogte en hun label, niet door hun rand. Een rand die 3:1 haalt op een donker thema wordt een lichtgrijze doos en breekt de vormtaal.

---

## 7 · Toets aan de flow-regel

Geen scherm, stap of bevestiging toegevoegd. De voortgangsbalk, het normvlak en de compleetheidsmelding zijn weergaven van gegevens die de app al berekent. Twee wijzigingen halen juist tikken weg: de leesbare statuspil in de projectenlijst maakt het openen van een project om de status te zien onnodig, en de norm onder de meetwaarde voorkomt terugscrollen naar de instructie.

Twee ingrepen verdienen een expliciete controle op jouw kant, omdat ze hoogte toevoegen: `S.input` van ±40 naar 52 px en `S.btn` van ±48 naar 56 px maken lange formulieren (de paspoort- en materiaalstappen) ongeveer 25% langer. `S.hdr` levert 4 px terug en `S.card` blijft op 16 px padding om dat deels te compenseren. Als een specifiek scherm daardoor een extra scroll krijgt die er nu niet is, meld het — dan halen we daar dichtheid uit de spacing, niet uit de tapmaat.
