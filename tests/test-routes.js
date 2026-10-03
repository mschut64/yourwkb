// ─────────────────────────────────────────────────────────────────────────────
// YourWkb — de API-routes: laadt elke route, en bestaat alles wat hij nodig heeft?
//
// WAAROM DIT BESTAAT. Op 02-10-2026 gaf de fotoroute live een 500 op élke scan:
// `TypeError: s is not a constructor`. De oorzaak was dat `@anthropic-ai/sdk`
// niet in package.json stond. De motor importeert hem (de analyse draait erop),
// maar als optionele peerDependency installeert npm hem niet mee — en Next.js
// laat een import uit node_modules als "external" staan in plaats van hem te
// bundelen. Resultaat: **de build was groen**, `npm test` raakte de route niet,
// en de fout kwam pas naar boven bij de eerste echte scan van de gebruiker.
//
// Hetzelfde gat kostte Kastscan op 30-09-2026 al een avond (daar was een functie
// bij een verhuizing meegeknipt). Eén import per route sluit het: wat niet te
// laden is, is hier meteen zichtbaar.
//
// ⚓ IMPORTS BINNEN DE APP KRIJGEN EEN EXPLICIETE `.js`. Webpack vindt het bestand
// ook zonder, Node niet — en deze test draait op Node. Dat is dezelfde regel die
// al voor `components/wkb/` gold.
//
// Voer uit met:  node tests/test-routes.js
// ─────────────────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
const failures = [];
function eq(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) passed++;
  else { failed++; failures.push(`❌ ${label}\n     verwacht: ${e}\n     kreeg:    ${a}`); }
}
async function laadt(pad, label) {
  try { return await import(pad); }
  catch (e) { failed++; failures.push(`❌ ${label}\n     laden mislukte: ${e.message}`); return null; }
}

console.log("▶ CATEGORIE 1: elke route laadt");
const kastbeeld = await laadt("../app/api/kastbeeld/route.js", "1.1 /api/kastbeeld laadt");
const rapport   = await laadt("../app/api/rapport/route.js",   "1.2 /api/rapport laadt");
const email     = await laadt("../app/api/verstuur-email/route.js", "1.3 /api/verstuur-email laadt");
if (kastbeeld) eq(typeof kastbeeld.POST, "function", "1.1 /api/kastbeeld geeft een POST-handler");
if (rapport)   eq(typeof rapport.POST, "function",   "1.2 /api/rapport geeft een POST-handler");
if (email)     eq(typeof email.POST, "function",     "1.3 /api/verstuur-email geeft een POST-handler");

console.log("▶ CATEGORIE 2: wat de fotoroute nodig heeft, bestaat ook");
{
  // De kern van de live storing: de SDK werd geïmporteerd maar stond niet in
  // package.json. `new Anthropic()` werd daardoor `new undefined()`.
  const sdk = await laadt("@anthropic-ai/sdk", "2.1 de Anthropic-SDK is te laden");
  if (sdk) eq(typeof sdk.default, "function", "2.1 en de standaardexport is een constructor");
  const { default: pakket } = await import("../package.json", { with: { type: "json" } })
    .catch(() => ({ default: null }));
  if (pakket) {
    eq(Boolean(pakket.dependencies["@anthropic-ai/sdk"]), true,
       "2.2 en hij staat als gewone afhankelijkheid in package.json");
    // Een peerDependency van de motor is optioneel: npm installeert hem niet mee.
    // Daarom moet hij hier staan en niet alleen daar.
    eq(Boolean(pakket.dependencies["yourwkb-core"]), true, "2.3 net als de motor zelf");
  }
}

console.log("▶ CATEGORIE 3: de grenzen die de route zelf exporteert");
if (kastbeeld) {
  // Next.js leest `maxDuration` alléén uit het routebestand. Staat hij in de
  // motor, dan geldt de standaard van tien seconden en breekt een analyse
  // halverwege af — met een timeout waar niets aan af te lezen is.
  eq(kastbeeld.maxDuration, 60, "3.1 /api/kastbeeld draait zestig seconden");
}
if (email) eq(typeof email.POST, "function", "3.2 de mailroute heeft geen eigen tijdmuur nodig");

console.log("▶ CATEGORIE 4: wat de app uit de motor haalt, bestaat daar ook");
{
  // Dezelfde familie als de ontbrekende SDK: de app hangt aan een TAG van de motor,
  // en een tag die iets niet (meer) heeft breekt pas bij gebruik. Deze test leest de
  // importregel uit WkbApp.jsx zelf, dus hij kan niet verouderen.
  const { readFileSync } = await import("node:fs");
  const bron = readFileSync(new URL("../components/WkbApp.jsx", import.meta.url), "utf8");
  const motor = await import("yourwkb-core");

  // Let op het ontbreken van } in de klasse: een gretige match zou bij de eerste
  // import van het bestand beginnen en alle namen daartussen meenemen.
  const blok = bron.match(/import \{([^}]*)\} from "yourwkb-core";/);
  eq(Boolean(blok), true, "4.1 WkbApp.jsx haalt iets uit de motor");
  const namen = (blok ? blok[1] : "")
    .split(",")
    .map((n) => n.replace(/\/\/[^\n]*/g, "").trim())
    .filter((n) => /^[A-Za-z_$][\w$]*$/.test(n));
  eq(namen.length > 20, true, `4.2 en dat zijn er ${namen.length}`);
  const ontbreekt = namen.filter((n) => motor[n] === undefined);
  eq(ontbreekt, [], "4.3 élke naam bestaat in de motor die nu geïnstalleerd is");

  // De nieuwe taak van vandaag, met naam genoemd: als een tag-bump deze laat vallen,
  // valt de fotocheck stil zonder dat iemand het merkt.
  for (const n of ["normaliseerBeoordeling", "OORDELEN", "OORDEEL_LABEL",
                   "correctiesUitBeoordeling", "leerpuntenUitBeoordeling"]) {
    eq(typeof motor[n] !== "undefined", true, `4.4 de motor levert ${n}`);
  }
  eq(motor.CATEGORIE_IDS.length, 8, "4.5 met de acht categorieën van de zoeklijst");
}

console.log("\n═══════════════════════════════════════════════");
console.log(`RESULTAAT: ${passed} geslaagd · ${failed} mislukt · ${passed + failed} totaal`);
console.log("═══════════════════════════════════════════════");
if (failures.length) {
  console.log("\n⚠️  MISLUKTE TESTS:");
  failures.forEach((f) => console.log(f));
  process.exit(1);
}
