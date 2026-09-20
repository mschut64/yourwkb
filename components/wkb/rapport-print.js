// ─────────────────────────────────────────────────────────────────────────────
// Het rapport klaarmaken om te printen
//
// Waarom dit een module is: printen ging op iPhone en iPad mis (melding Maurits,
// 20-09-2026). Het rapport werd geprint vanuit een verborgen iframe van 0×0, en
// WebKit doet daar twee dingen anders dan Chrome op de desktop — print() vanuit
// een frame print het BOVENLIGGENDE document (het app-scherm), en van een frame
// zonder afmetingen komt hooguit één gerenderde pagina mee. Zijn pdf had "Stap 11
// van 11 · Versturen" op pagina 1 en een half rapport op pagina 2.
//
// Het rapport gaat daarom naar een echt tabblad. Wat daar precies in gezet wordt,
// staat hier: dat is te testen zonder browser, en het is de plek waar de
// ontsmetting uit de security-audit (BEV-03) hoort — in een eigen tabblad zou
// script uit het rapport in ONZE oorsprong draaien.
// ─────────────────────────────────────────────────────────────────────────────

const PRINTBALK = `<style>@media print{.ywkb-printbalk{display:none!important}body{margin:0}}</style>
<div class="ywkb-printbalk" style="position:sticky;top:0;z-index:999;display:flex;gap:8px;justify-content:flex-end;padding:10px;background:#111318">
<button onclick="window.print()" style="background:#F5C518;color:#000;border:none;padding:12px 20px;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer">🖨️ Opslaan als PDF</button>
</div>`;

// Alleen tekst die veilig tussen > en < past; de titel bepaalt op iOS de
// bestandsnaam van de pdf.
const veiligeTitel = (t) =>
  String(t || "rapport").replace(/[<>&"']/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "rapport";

// Het rapport als zelfstandig bestand: ontsmet, met een titel, zonder printbalk.
// Dit is wat er gedeeld of gedownload wordt — een document dat jaren later nog
// opengaat, zonder knop van onze app erin.
export function schoonRapport(pdfHtml, { titel } = {}) {
  const schoon = String(pdfHtml || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<script[^>]*>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");

  const t = veiligeTitel(titel);
  if (/<title>[\s\S]*?<\/title>/i.test(schoon)) return schoon.replace(/<title>[\s\S]*?<\/title>/i, `<title>${t}</title>`);
  if (/<head[^>]*>/i.test(schoon)) return schoon.replace(/<head[^>]*>/i, (m) => `${m}<title>${t}</title>`);
  return schoon;
}

// Hetzelfde document, met de printbalk erin. De balk hoort ín de body, niet
// ervoor: anders staat hij buiten het document en print Safari hem alsnog mee.
export function printDocumentHtml(pdfHtml, opties) {
  const doc = schoonRapport(pdfHtml, opties);
  return /<body[^>]*>/i.test(doc) ? doc.replace(/<body[^>]*>/i, (m) => m + PRINTBALK) : PRINTBALK + doc;
}

// Bestandsnaam voor delen en downloaden: alleen tekens die elk besturingssysteem
// en elke deel-app accepteert.
export function rapportBestandsnaam(projectId, discipline, ext = "html") {
  const deel = (x, terug) => String(x || "").replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || terug;
  const e = String(ext || "").replace(/[^A-Za-z0-9]/g, "");
  return `${deel(projectId, "rapport")}-${deel(discipline, "opleverrapport")}${e ? "." + e : ""}`;
}
