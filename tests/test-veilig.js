// ─────────────────────────────────────────────────────────────────────────────
// Ontsmetting van gebruikersinvoer — testsuite
//
// De twee bevindingen uit de security-audit van 25-08-2026 stonden tot 11-09
// midden in WkbApp.jsx en waren daarmee ongetest. Juist beveiligingscode hoort
// getoetst, en de gevallen hieronder zijn daarom aanvallend bedoeld: niet
// "werkt het bij normale invoer", maar "houdt het stand bij invoer die er op
// gericht is eruit te breken".
//
// Voer uit met:  node tests/test-veilig.js
// ─────────────────────────────────────────────────────────────────────────────

import {
  esc, saneerWaarde, saneerProject, saneerImport, anonimiseerJob,
  MAX_STRING, MAX_DIEPTE, MAX_ARRAY, MAX_SLEUTELS, MAX_PROJECTEN, MAX_BESTAND_BYTES,
} from "../components/wkb/veilig.js";

let passed = 0, failed = 0;
const failures = [];
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; failures.push(`❌ ${label}\n     verwacht: ${e}\n     kreeg:    ${a}`); }
}
function gooit(fn, bericht, label) {
  try { fn(); failed++; failures.push(`❌ ${label}\n     verwachtte een fout, kreeg er geen`); }
  catch (e) {
    if (!bericht || e.message === bericht) passed++;
    else { failed++; failures.push(`❌ ${label}\n     verwacht bericht: ${bericht}\n     kreeg:           ${e.message}`); }
  }
}

console.log("▶ CATEGORIE 1: esc — HTML-escaping (BEV-03)");

eq(esc("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;", "1.1 scripttag onschadelijk");
eq(esc('" onerror="alert(1)'), "&quot; onerror=&quot;alert(1)", "1.2 uitbreken uit een attribuut met dubbele quote");
eq(esc("' onclick='alert(1)"), "&#39; onclick=&#39;alert(1)", "1.3 idem met enkele quote");
eq(esc("a & b"), "a &amp; b", "1.4 ampersand");

// De ampersand moet als eerste worden vervangen, anders worden de eigen
// escapes nog eens geëscaped. Dit is de klassieke volgordefout.
eq(esc("<"), "&lt;", "1.5 kleiner-dan");
eq(esc("&lt;"), "&amp;lt;", "1.6 al-geëscapete invoer wordt niet dubbel verminkt tot &lt;");

// Niet-tekst mag geen "undefined" of "null" in het rapport opleveren.
eq(esc(null), "", "1.7 null wordt leeg");
eq(esc(undefined), "", "1.8 undefined wordt leeg");
eq(esc(0), "0", "1.9 nul blijft nul, niet leeg");
eq(esc(false), "false", "1.10 false wordt tekst");

// Een object dat toString overschrijft mag geen ruwe HTML binnensmokkelen.
eq(esc({ toString: () => "<b>x</b>" }), "&lt;b&gt;x&lt;/b&gt;", "1.11 eigen toString wordt ook geëscaped");

console.log("▶ CATEGORIE 2: saneerWaarde — begrenzing (BEV-04)");

eq(saneerWaarde("x".repeat(MAX_STRING + 500), 0).length, MAX_STRING, "2.1 string afgekapt op de grens");
eq(saneerWaarde(Array(MAX_ARRAY + 50).fill(1), 0).length, MAX_ARRAY, "2.2 array afgekapt");

const veelSleutels = {};
for (let i = 0; i < MAX_SLEUTELS + 40; i++) veelSleutels["k" + i] = 1;
eq(Object.keys(saneerWaarde(veelSleutels, 0)).length, MAX_SLEUTELS, "2.3 aantal sleutels begrensd");

// Diep geneste invoer is een klassieke manier om een parser te laten omvallen.
let diep = "bodem";
for (let i = 0; i < 40; i++) diep = { n: diep };
eq(saneerWaarde(diep, 0) !== undefined, true, "2.4 diepe nesting levert iets op in plaats van te klappen");
let telDiepte = saneerWaarde(diep, 0), d = 0;
while (telDiepte && typeof telDiepte === "object" && telDiepte.n !== undefined) { telDiepte = telDiepte.n; d++; }
eq(d <= MAX_DIEPTE + 1, true, `2.5 nesting afgekapt rond de grens (kwam tot ${d})`);

eq(saneerWaarde(NaN, 0), undefined, "2.6 NaN wordt geweigerd");
eq(saneerWaarde(Infinity, 0), undefined, "2.7 Infinity wordt geweigerd");
eq(saneerWaarde(() => 1, 0), undefined, "2.8 functies worden geweigerd");
eq(saneerWaarde(true, 0), true, "2.9 boolean blijft");
eq(saneerWaarde(null, 0), null, "2.10 null blijft");

console.log("▶ CATEGORIE 3: foto's — alleen raster, geen script");

const geldig = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
eq(saneerWaarde(geldig, 0), geldig, "3.1 geldige jpeg blijft");
eq(saneerWaarde("data:image/png;base64,iVBORw0KGgo=", 0) !== undefined, true, "3.2 png blijft");
eq(saneerWaarde("data:image/webp;base64,UklGRg==", 0) !== undefined, true, "3.3 webp blijft");

// SVG kan script bevatten en mag er daarom niet in, ook al is het een afbeelding.
eq(saneerWaarde("data:image/svg+xml;base64,PHN2Zz48c2NyaXB0Pg==", 0), undefined, "3.4 SVG wordt geweigerd");
eq(saneerWaarde("data:text/html;base64,PGh0bWw+", 0), undefined, "3.5 text/html wordt geweigerd");
eq(saneerWaarde("data:image/jpeg;base64,<script>", 0), undefined, "3.6 niet-base64 achter de header geweigerd");
eq(saneerWaarde("data:image/jpeg," + "x".repeat(50), 0), undefined, "3.7 zonder base64-markering geweigerd");

console.log("▶ CATEGORIE 4: saneerProject — de buitenste poort");

eq(saneerProject({ id: "p1", job: { naam: "Test" } }).id, "p1", "4.1 geldig project komt door");
eq(saneerProject(null), null, "4.2 null");
eq(saneerProject("string"), null, "4.3 geen object");
eq(saneerProject({}), null, "4.4 zonder id");
eq(saneerProject({ id: 42 }), null, "4.5 id moet tekst zijn");
eq(saneerProject({ id: "x".repeat(65) }), null, "4.6 te lange id");
eq(saneerProject({ id: "p1", job: { naam: "<img onerror=x>" } }).job.naam, "<img onerror=x>",
   "4.7 sanering escapet NIET — dat doet esc bij het renderen");

console.log("▶ CATEGORIE 5: saneerImport — bestand van buiten");

const goed = JSON.stringify({ version: 1, projecten: [{ id: "a" }, { id: "b" }] });
eq(saneerImport(goed).length, 2, "5.1 geldige back-up");
eq(saneerImport(JSON.stringify([{ id: "a" }])).length, 1, "5.2 kale array mag ook");

gooit(() => saneerImport("{niet: json"), "Ongeldig JSON-bestand", "5.3 kapotte JSON");
gooit(() => saneerImport(JSON.stringify({ iets: "anders" })), "Geen geldig YourWkb back-up bestand", "5.4 geen projectenlijst");
gooit(() => saneerImport(JSON.stringify({ projecten: [] })), "Geen geldige projecten in dit bestand", "5.5 lege lijst");
gooit(() => saneerImport(JSON.stringify({ projecten: [{ geen: "id" }] })), "Geen geldige projecten in dit bestand", "5.6 alleen ongeldige projecten");
gooit(() => saneerImport(null), "Bestand is te groot om te importeren", "5.7 geen tekst");
gooit(() => saneerImport("x".repeat(MAX_BESTAND_BYTES + 1)), "Bestand is te groot om te importeren", "5.8 te groot bestand");

// Meer projecten dan de cap: de rest wordt afgekapt, niet geweigerd.
const veel = JSON.stringify({ projecten: Array.from({ length: MAX_PROJECTEN + 60 }, (_, i) => ({ id: "p" + i })) });
eq(saneerImport(veel).length, MAX_PROJECTEN, "5.9 aantal projecten begrensd");

// Kwaadaardige inhoud moet de poort halen maar wel gesaneerd zijn: het bestand
// afwijzen zou een collega's deelbestand onbruikbaar maken om de verkeerde reden.
const vuil = JSON.stringify({ projecten: [{ id: "p1", job: {
  naam: "y".repeat(MAX_STRING + 100),
  foto: "data:image/svg+xml;base64,PHN2Zz4=",
  bedrag: Infinity === undefined ? 1 : null,
} }] });
const schoon = saneerImport(vuil)[0];
eq(schoon.job.naam.length, MAX_STRING, "5.10 te lange string afgekapt in plaats van geweigerd");
eq(schoon.job.foto, undefined, "5.11 SVG uit het bestand verwijderd");

console.log("▶ CATEGORIE 6: anoniem delen — het adres eruit, de geschiedenis van de kast niet");

{
  const job = { naam: "Klant", email: "k@x.nl", postcode: "2691JJ", huisnummer: "72", mkpUrl: "https://…", mkpQr: "data:…",
    mkp: { ean: "871685920000000019", ean2: "871685920000000019", bj: "1995" },
    mkpImport: { v: 2, pc: "2691JJ", nr: "72", ean: "871685920000000019", ean2: "871685920000000019", xyz: 1,
      mat: [{ i: 1, fab: "Hager", art: "CDA440D" }], log: [{ d: "2026-05-02", b: "Jansen", sig: "abc" }] } };
  const a = anonimiseerJob(job);
  eq([a.naam, a.email, a.postcode, a.huisnummer, a.mkpUrl, a.mkpQr], [undefined, undefined, undefined, undefined, undefined, undefined],
     "6.1 klantgegevens en de oude QR (die het adres draagt) gaan eruit");
  eq([a.mkp.ean, a.mkp.ean2, a.mkp.bj], [undefined, undefined, "1995"], "6.2 de EAN-codes uit de app-velden");
  eq([a.mkpImport.pc, a.mkpImport.nr, a.mkpImport.ean, a.mkpImport.ean2], [undefined, undefined, undefined, undefined],
     "6.3 en ook uit het gescande paspoort");
  eq([a.mkpImport.mat, a.mkpImport.log, a.mkpImport.xyz], [job.mkpImport.mat, job.mkpImport.log, 1],
     "6.4 materiaallijst, ondertekend logboek en onbekende velden blijven — de collega wist ze anders");
  eq([job.mkpImport.pc, job.naam], ["2691JJ", "Klant"], "6.5 het origineel op het eigen toestel wordt niet gewijzigd");
  eq("mkpImport" in anonimiseerJob({ naam: "Klant" }), false, "6.6 zonder gescand paspoort wordt er niets toegevoegd");
}

console.log("\n═══════════════════════════════════════════════");
console.log(`RESULTAAT: ${passed} geslaagd · ${failed} mislukt · ${passed + failed} totaal`);
console.log("═══════════════════════════════════════════════");
if (failures.length) {
  console.log("\n⚠️  MISLUKTE TESTS:");
  failures.forEach(f => console.log("  " + f));
  process.exit(1);
}
console.log("\n✅ De ontsmetting uit de security-audit doet wat hij belooft");
