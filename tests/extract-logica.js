// ─────────────────────────────────────────────────────────────────────────────
// YourWkb — Logica-extractor
// Haalt de pure (React-vrije) norm-validatiefuncties rechtstreeks uit de echte
// WkbApp.jsx en schrijft ze naar tests/logica.js. Zo test de regressiesuite
// ALTIJD de daadwerkelijke app-code, niet een handmatig gekopieerde variant die
// stilletjes uit de pas kan lopen (de reden dat de oude suite achterliep).
//
// Gebruik:  node extract-logica.js <pad-naar-WkbApp.jsx>
// ─────────────────────────────────────────────────────────────────────────────
const babel = require("@babel/core");
const fs = require("fs");
const path = require("path");

const bron = process.argv[2] || path.join(__dirname, "..", "components", "WkbApp.jsx");
const src = fs.readFileSync(bron, "utf8");

// Namen van de top-level declaraties die we nodig hebben voor de tests.
// gkCrossChecks/pvCrossChecks hangen alleen af van toNum + ggIaVoorTijd (+ GG_TABEL
// via ggIaVoorTijd) — geen React, geen styling-objecten.
const NODIG = new Set([
  "toNum", "GG_TABEL", "GG_IN_WAARDEN", "ggIaVoorTijd",
  "gkCrossChecks", "pvCrossChecks",
]);

const ast = babel.parse(src, {
  presets: [["@babel/preset-react"]],
  filename: "WkbApp.jsx",
});

const gekozenNodes = [];
for (const node of ast.program.body) {
  let naam = null;
  if (node.type === "FunctionDeclaration" && node.id) naam = node.id.name;
  if (node.type === "VariableDeclaration" && node.declarations.length === 1) {
    const d = node.declarations[0];
    if (d.id.type === "Identifier") naam = d.id.name;
  }
  if (naam && NODIG.has(naam)) gekozenNodes.push({ naam, node });
}

const gevonden = new Set(gekozenNodes.map(x => x.naam));
const ontbrekend = [...NODIG].filter(n => !gevonden.has(n));
if (ontbrekend.length) {
  console.error("❌ Kon deze functies niet vinden in de bron: " + ontbrekend.join(", "));
  console.error("   (Is de structuur van WkbApp.jsx gewijzigd? Pas NODIG aan of controleer de bron.)");
  process.exit(1);
}

// Genereer de code terug in de bron-volgorde.
const stukken = ast.program.body
  .filter(n => gekozenNodes.some(x => x.node === n))
  .map(n => babel.transformFromAstSync(
    { type: "File", program: { type: "Program", body: [n], sourceType: "module", directives: [] } },
    src, { presets: [], filename: "logica.js", retainLines: false }
  ).code)
  .join("\n\n");

const header = `// ─────────────────────────────────────────────────────────────────────────────
// YourWkb — Pure logica module (AUTO-GEGENEREERD — NIET HANDMATIG BEWERKEN)
// Gegenereerd uit: ${path.basename(bron)}
// Op: ${new Date().toISOString().slice(0,19).replace("T"," ")}
// Draai 'node extract-logica.js <WkbApp.jsx>' opnieuw na elke wijziging aan de
// norm-validatie in de app. De regressietest (test.js) draait hier direct op.
// ─────────────────────────────────────────────────────────────────────────────
`;

const footer = `\n\nmodule.exports = { ${[...NODIG].join(", ")} };\n`;

const uit = path.join(__dirname, "logica.js");
fs.writeFileSync(uit, header + "\n" + stukken + footer);
console.log(`✅ logica.js gegenereerd uit ${path.basename(bron)} (${gekozenNodes.length} functies: ${[...gevonden].join(", ")})`);
