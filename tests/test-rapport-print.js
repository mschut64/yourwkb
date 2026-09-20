// ─────────────────────────────────────────────────────────────────────────────
// Het printdocument van het rapport
//
// Aanleiding: op iPhone en iPad kwam uit "Openen & opslaan als PDF" een pdf met
// het app-scherm op pagina 1 en een half rapport op pagina 2 (Maurits, 20-09-2026).
// Het rapport gaat nu naar een echt tabblad; wat daarin gezet wordt, staat in
// components/wkb/rapport-print.js en wordt hier getoetst.
//
// Voer uit met:  node tests/test-rapport-print.js
// ─────────────────────────────────────────────────────────────────────────────

import { printDocumentHtml, schoonRapport, rapportBestandsnaam } from "../components/wkb/rapport-print.js";

let passed = 0, failed = 0;
const failures = [];
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; failures.push(`❌ ${label}\n     verwacht: ${e}\n     kreeg:    ${a}`); }
}

const rapport = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>oud</title><style>h1{color:#000}</style></head><body><h1>Opleveringsrapport</h1><table><tr><td>ISO</td><td>&gt; 999 MΩ</td></tr></table></body></html>`;

console.log("▶ CATEGORIE 1: het rapport blijft heel");
{
  const d = printDocumentHtml(rapport, { titel: "2691JJ-72a-groepenkast" });
  eq(d.startsWith("<!DOCTYPE html>"), true, "1.1 blijft één compleet document (geen document in een document)");
  eq(d.includes("<h1>Opleveringsrapport</h1>"), true, "1.2 de inhoud van het rapport staat er onveranderd in");
  eq(d.includes("&gt; 999 MΩ"), true, "1.3 ook de al ontsmette waarden blijven zoals ze waren");
  eq(d.includes("<style>h1{color:#000}</style>"), true, "1.4 de opmaak van het rapport blijft staan");
}

console.log("▶ CATEGORIE 2: de printbalk");
{
  const d = printDocumentHtml(rapport, {});
  eq(/<body[^>]*>\s*<style>@media print\{\.ywkb-printbalk\{display:none!important\}/.test(d), true,
     "2.1 de balk staat ín de body, direct achter de openingstag");
  eq(d.includes('onclick="window.print()"'), true, "2.2 met een knop die print — de uitweg als de dialoog niet vanzelf opent");
  eq(d.indexOf("ywkb-printbalk") < d.indexOf("<h1>"), true, "2.3 en boven het rapport, niet erdoorheen");
  const zonderBody = printDocumentHtml("<p>los stukje</p>", {});
  eq(zonderBody.startsWith("<style>@media print"), true, "2.4 zonder <body> komt de balk ervoor in plaats van nergens");
}

console.log("▶ CATEGORIE 3: de titel bepaalt de bestandsnaam van de pdf");
{
  eq(/<title>2691JJ-72a-groepenkast<\/title>/.test(printDocumentHtml(rapport, { titel: "2691JJ-72a-groepenkast" })), true,
     "3.1 een bestaande titel wordt vervangen");
  const zonderTitel = printDocumentHtml(`<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><p>x</p></body></html>`, { titel: "2801AB-12-cv" });
  eq(/<head[^>]*><title>2801AB-12-cv<\/title>/.test(zonderTitel), true, "3.2 zonder titel wordt er één toegevoegd");
  eq(/<title>rapport<\/title>/.test(printDocumentHtml(rapport, {})), true, "3.3 zonder opgave: 'rapport'");
  eq(/<title>project 12<\/title>/.test(printDocumentHtml(rapport, { titel: '  pro<>ject\n 12  ' })), true,
     "3.4 tekens die de titel kunnen breken gaan eruit");
}

console.log("▶ CATEGORIE 4: geen actieve content (audit BEV-03)");
{
  const vies = `<!DOCTYPE html><html><head><title>t</title></head><body><script>alert(1)</script><img src=x onerror="alert(2)"><a href="javascript:alert(3)">klik</a><p onclick=alert(4)>tekst</p></body></html>`;
  const d = printDocumentHtml(vies, { titel: "t" });
  eq(/<script/i.test(d), false, "4.1 script-elementen eruit");
  eq(/alert\(1\)/.test(d), false, "4.2 inclusief wat erin stond");
  eq(/onerror/i.test(d), false, "4.3 onerror eruit");
  eq(/onclick=alert/i.test(d), false, "4.4 ook zonder aanhalingstekens");
  eq(/javascript:/i.test(d), false, "4.5 javascript:-adressen eruit");
  eq(d.includes("<p>tekst</p>") || d.includes("<p >tekst</p>"), true, "4.6 de tekst zelf blijft staan");
  // De knop van de printbalk is van ons en moet juist blijven werken.
  eq(d.includes('onclick="window.print()"'), true, "4.7 de printknop van de balk blijft werken");
}

console.log("▶ CATEGORIE 5: het rapport als deelbaar bestand");
{
  const d = schoonRapport(rapport, { titel: "2671SB-30-groepenkast" });
  eq(d.includes("ywkb-printbalk"), false, "5.1 geen printbalk — een gedeeld bestand hoort geen knop van onze app te bevatten");
  eq(d.includes("<h1>Opleveringsrapport</h1>"), true, "5.2 het rapport zelf is compleet");
  eq(/<title>2671SB-30-groepenkast<\/title>/.test(d), true, "5.3 met de titel als bestandsnaam voor het deelmenu");
  eq(printDocumentHtml(rapport, { titel: "x" }).replace(/<style>@media print[\s\S]*?<\/div>/, ""), schoonRapport(rapport, { titel: "x" }),
     "5.4 print- en deelversie verschillen alleen in de balk");
  const vies = schoonRapport(`<body><script>alert(1)</script><p onclick=alert(2)>x</p></body>`, {});
  eq([/script/i.test(vies), /onclick/i.test(vies)], [false, false], "5.5 ook hier geen actieve content");
}

console.log("▶ CATEGORIE 6: bestandsnaam");
eq(rapportBestandsnaam("2671SB-30", "groepenkast"), "2671SB-30-groepenkast.html", "6.1 projectnummer en discipline");
eq(rapportBestandsnaam("2691JJ-72 a", "cv", "html"), "2691JJ-72-a-cv.html", "6.2 spaties worden streepjes");
eq(rapportBestandsnaam("", ""), "rapport-opleverrapport.html", "6.3 zonder gegevens een bruikbare naam");
eq(rapportBestandsnaam("../../etc/passwd", "groepenkast"), "etc-passwd-groepenkast.html", "6.4 geen padtekens in de naam");
eq(rapportBestandsnaam("2671SB-30", "groepenkast", ""), "2671SB-30-groepenkast", "6.5 zonder extensie ook geen losse punt");

console.log("\n═══════════════════════════════════════════════");
console.log(`RESULTAAT: ${passed} geslaagd · ${failed} mislukt · ${passed + failed} totaal`);
console.log("═══════════════════════════════════════════════");
if (failures.length) {
  console.log("\n⚠️  MISLUKTE TESTS:");
  failures.forEach(f => console.log(f));
  process.exit(1);
}
