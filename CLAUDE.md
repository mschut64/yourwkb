# YourWkb — projectinstructies voor Claude Code

*Overdracht van de webapp-ontwikkelchats (claude.ai, aug 2026). Dit bestand is het werkgeheugen: lees het aan het begin van elke sessie en houd het bij. Lees daarna **`docs/claude_architectuur-en-modules-2026-09-12.md`** — dat zegt wat waar staat, hoe de drie repo's samenwerken en waar de scheuren zitten. Werk zelfstandig verder volgens `YourWkb-roadmap-2026-08.md` (koers) en `YourWkb-releaseplan-checklist.md` (afvinklijst) — beide staan in de repo-root of in `/docs`.*

---

## 1. Wat is dit

**YourWkb** (yourwkb.nl) is een mobiel-eerst PWA waarmee zelfstandige installatietechnici bij elke klus een Wkb-conform opleverrapport maken: metingen getoetst aan NEN 1010, foto's, conformiteitsverklaring, PDF + e-mail, plus een **meterkastpaspoort** (QR-sticker op de kastdeur, open standaard, meterkastpaspoort.nl).

Zes disciplines: groepenkast, zonnepanelen (PV), cv-ketel, warmtepomp, laadpaal, thuisbatterij.

Eigenaar/opdrachtgever: **Martin Schut**, BlauweVisie B.V. Hij is domeinexpert (elektrotechniek, normen, markt), geen webdeveloper — leg technische keuzes kort en in gewone taal uit, en lever werkende dingen op in plaats van instructies. Veldtesters: **Maurits Hordijk** en **Herman** (ervaren elektriciens, normatieve feedback).

### De flow-regel (⚓ hoogste ontwerpprincipe, 13-08-2026)
> **De standaardflow klant-tot-rapport mag door geen enkele nieuwe feature langer worden.**

Elke toevoeging is **automatisch**, **optioneel**, of **vervangt handwerk**. Complexiteit hoort onder de motorkap. Toets elke feature hieraan vóór je bouwt; als een feature de flow verlengt, herontwerp hem of maak hem optioneel.

### Andere vaste principes
- **Privacy-architectuur:** alle projectdata staat op het toestel van de gebruiker. Wij hebben geen database met dossiers. Het meterkastpaspoort draagt zijn data ín de QR (werkt offline in een kelder). Centrale opslag mag **nooit** doorzoekbaar zijn op adres.
- **Zuiverheidsregel erkenningen:** wij verifiëren niets — wij maken controleerbaar. Nooit "keuring", "goedkeuring" of "inspectie" in gebruikersteksten.
- **Het rapport mag zichzelf niet tegenspreken.** De conformverklaring beweegt mee met de bevindingen (cross-checks én fasebalans): bij afwijkingen doet zij géén uitspraak over de veiligheid maar zegt expliciet dat zij zich daar niet toe uitstrekt. Zet dus nooit een onvoorwaardelijke claim in een disciplinetekst — die hoort in `bevindingHtml`, op één plek.
- **Taalregel SCIOS:** het rapport vervangt nooit een SCIOS-afmelding en geeft geen dekking. Wel: "SCIOS-ready".
- **Toon in de app:** Nederlands, vakmatig, kort. Meetwaarden en normen exact; adviezen als hulpmiddel, de installateur blijft verantwoordelijk.

---

## 2. Stack, repo en omgeving

- **Next.js 14.2.35** (App Router), React 18.3.1 — versies zijn **gepind**, niet upgraden zonder reden.
- Repo: **github.com/mschut64/yourwkb** (branch `main`). Lokaal bij Martin: `~/projects/yourwkb`.
- Hosting: **Vercel**, auto-deploy op push naar `main`. Project-id `prj_iTu1Df1ta3CNF9en3AB2qao3IXx4`, team `team_UHO93LYJmD3gAg8oiutk7stk` (hobby-plan). Tweede project: `meterkastpaspoort` (redirect-site).
- Analytics: **PostHog** (EU, project 221035).
- Mail: **Resend** (afzender `YourWkb <rapport@yourwkb.nl>`). AI-analyse: **Anthropic API** (server-side).
- Contactadres: **info@yourwkb.nl** (bestaat en werkt).

### ⚠️ Kastscan — het zusterproject dat je moet kennen

**`~/projects/kastscan`** (kastscan.nl). Van foto naar gelabelde groepenkast: de foto vult in, de installateur bevestigt. Geen los experiment maar de tweede helft van hetzelfde plan — **de modules zijn zo gebouwd dat delen 1-op-1 naar YourWkb kunnen.** De belastingcheck uit `v2026-09-03-A` is daar al vandaan gekomen.

Lees dat project vóór je aan de Fasecheck, de Kastscan-integratie of het meterkastpaspoort werkt. Wat daar staat en hier niet:

- `components/kastscan/model.js` — 2016 regels, 103 exports, **1104 groene tests**. Modulair ESM, waar YourWkb bewust één bestand is.
- Het complete fase-apparaat: `faseBalans`, `faseCapaciteitKw`, `FASE_RESERVE_KW`, `cycleFase`, `magEigenFase`, `zetFaseBlok`, `isMeerpolig`, `indicatiefVermogen`, `FASE_KLEUR`. Het commentaar bij `faseBalans` zegt letterlijk dat het de Fasecheck zijn invoer levert — niet zelf opnieuw schrijven.
- ~~`MKP_SPEC_VERSIE = 2` met `grp[].fase`~~ — **opgelost 11-09-2026**: beide apps schrijven nu `grp[].fn` ([1] / [2] / [3] / [1,2,3]) volgens spec v0.2 §4.4. `fase: "L2"` bestond in geen enkele versie van de standaard en werd door geen enkele conforme lezer gezien.

**Let op twee valkuilen die daaruit voortkomen**, uitgewerkt in `docs/claude_kastscan-yourwkb-inventarisatie.md`:

1. ~~**`belastingcheck` rekent in beide apps anders**~~ — **opgelost 11-09-2026**: beide toetsen nu per fase (besluit Martin). YourWkb legde het totaal langs 3 × A × 230 V en kon daardoor groen zijn waar Kastscan rood was. De optelling per fase staat in `model.js` › `belastingPerFase` en wordt gedeeld door de check en de fasebalans.
2. **`fase` betekent in beide apps iets anders** — daar *welke* fase (L1/L2/L3), hier *hoeveel* fasen ("1"/"3").

Gebruik bij nieuw werk de namen van Kastscan, niet je eigen.

### Belangrijkste bestanden
```
components/WkbApp.jsx      ← de schermen (~5900 regels)
components/wkb/model.js    ← de rekenkern: grenswaarden, cross-checks, belastingcheck, belastingPerFase
   ↑ het paspoortformaat zelf zit in de dependency `meterkastpaspoort` (eigen repo, tag v0.2.0)
components/wkb/mkp-bouw.js ← de vertaling app-gegevens → paspoort (app-specifiek)
components/wkb/veilig.js   ← esc() en de import-sanering uit de security-audit
components/wkb/fasebalans.js ← belasting PER FASE + faseAdvies (waar past een nieuw apparaat); werkt op de paspoort-grp[], dus deelbaar
app/page.js                ← rendert landing
app/landing/page.js        ← marketingpagina
app/app/page.js            ← laadt WkbApp (client-only, ssr:false)
app/blog/page.js           ← blogindex
app/blog/[slug]/page.js    ← artikelpagina
app/blog/BlogShell.js      ← nav/footer/CSS voor blog
app/blog/Deelknoppen.js    ← social share + blog_gedeeld-event
app/blog/ArtikelStats.js   ← blog_artikel_bekeken / _gelezen
app/api/_lib/guard.js      ← rateLimit / origineOk / fout (gedeeld)
app/api/verstuur-email/route.js
app/api/rapport/route.js   ← AI-analyse, prompt volledig server-side
app/layout.js              ← metadata, PostHog, JSON-LD
app/sitemap.js, app/robots.js, app/manifest.js
content/blog/*.md          ← artikelen (frontmatter + markdown)
docs/                      ← projectgeheugen: roadmap, releaseplan-checklist, design-spec, featurespecs
  claude_architectuur-en-modules-2026-09-12.md  ← modulekaart + waar je verder kunt
lib/blog.js                ← frontmatter-parser + mini-markdown-renderer
public/sw.js               ← service worker (v7)
tests/test.js              ← 128 regressietests; importeert components/wkb/model.js rechtstreeks
```

---

## 3. Werkwijze (verplicht)

### Regressietests bij élke norm-wijziging
```bash
npm test                  # 333 tests: normlogica, paspoort, ontsmetting, fasebalans
```
De suite importeert `components/wkb/model.js` rechtstreeks, dus tests en implementatie kúnnen niet uit sync lopen.

**Het paspoortformaat is een dependency, `mkp-bouw.js` is van deze app.** Coderen, decoderen, EAN-controle en QR-grens staan sinds 11-09-2026 in de repo `github.com/mschut64/meterkastpaspoort` (waar ook de specificatie staat) en komen binnen als `import { mkpEncode, ... } from "meterkastpaspoort"`, gepind op tag `v0.2.0`. Kastscan gebruikt hetzelfde pakket. De vertaling van app-gegevens naar een paspoort verschilt per app en blijft hier, in `mkp-bouw.js`. Zet niets app-specifieks in het pakket, en bump de tag bewust — een push naar de spec-repo verandert de apps niet vanzelf.

**Let op bij imports binnen `components/wkb/`:** gebruik expliciete `.js`-extensies. Webpack vindt het bestand ook zonder, Node niet — en de tests draaien op Node.

**Zet nieuwe normlogica in `model.js`, niet in `WkbApp.jsx`.** Alles wat daar staat is per definitie ongetest: `esc()`, `saneerProject`, `mkpBouw` en `genereerRapport` zitten nog in het schermbestand en hebben daarom geen enkele test. Dat is de reden dat de rekenkern eruit is gehaald — zie `docs/claude_kastscan-yourwkb-inventarisatie.md`.

### Vóór elke commit
```bash
npx next build        # volledige productiebuild als eindtoets
```
**Non-fataal en te negeren:** `⚠ Failed to minify the stylesheet … CssSyntaxError: Unknown word` bij de Google Fonts. Waar het om gaat: `✓ Compiled successfully` en `✓ Generating static pages (n/n)`.

Snelle syntaxcheck tussendoor: `npx esbuild components/WkbApp.jsx --loader:.jsx=jsx --outfile=/dev/null`

### Git
- **Altijd `git pull origin main` vóór wijzigingen.** Nooit `--force`.
- Eén commit per logische wijziging, Nederlandse commitboodschap die het *waarom* noemt (zie de historie voor de stijl).
- Push naar `main` = deploy. Controleer daarna de Vercel-deploy (connector of dashboard).

### Versionering
Versie in de kopregel van `WkbApp.jsx`: `// YourWkb WkbApp.jsx — versie 2026-08-27-B (korte omschrijving)`. Formaat `vJJJJ-MM-DD-<letter>`, letter loopt op binnen een dag. Kleine fixes bundelen tot één release; niet voor elke bugfix een nieuwe letter.

### Norm-wijzigingen raken vier lagen
Bij elke wijziging van een grenswaarde of toets: **(1) berekening, (2) invoerscherm/labels/helptekst, (3) rapport + voetnoot, (4) AI-prompt**. Alle vier bijwerken, anders spreken ze elkaar tegen.

---

## 4. Actuele stand (11-09-2026)

**Live:** app `v2026-09-12-G` + security-release + landing + blog (2 artikelen). Testsuite **333 tests** (`npm test`). Alles t/m `v2026-09-03-A` veldbevestigd door Martin.

Recent afgerond:
- **R1 — design fase 2 (`v2026-08-29-A`, 29-08-2026), volledig afgerond en veldbevestigd.** Meetwaarden overal 20px/700 met tabular-nums en de eenheid via `S.eenheid` in alle zes disciplines; normvlak per meetblok via het nieuwe `StatusVlak` (uitspraak in woorden + grenswaarde, zodat je bij afkeur niet terugscrollt); stapteller "Stap i van n" + voortgangsbalk centraal boven het scherm; schermtitels 15 → 20px; startscherm op `S.rij` met disciplinetegels met kleurvlak; één gele knop per scherm (elf handgemaakte grijze knoppen naar `S.btnGhost`); komma-weergave in app én rapport. Vier fouten meegefixt: `@babel/core` ontbrak in `package.json` (extract-logica faalde op een verse checkout), de toevoeging viel uit het projectnummer (`2691JJ-72` i.p.v. `2691JJ-72a`), de paspoort-import zette `projectId` nooit (rapport toonde "—"), en 15 hardgecodeerde stapnummers waren fout zodra een scherm door meerdere disciplines wordt gebruikt. **Afwijkingen van de design-spec staan onderbouwd in de checklist** — met name: géén `S.inputMeting` (32px) op de meetvelden en géén statuspil in de projectenlijst, beide omdat ze op 375px de meetrasters respectievelijk het projectnummer kapotmaken.
- **Belastingcheck wordt berekend (`v2026-09-03-A`, roadmap 2.1).** Gelijktijdigheidsfactor 0,6 uit NEN-EN-IEC 61439 over de grote verbruikers (laadpaal, warmtepomp, kookgroep, thuisbatterij); bij een gezamenlijke load balancer factor 1. De app *beschreef* die regel al bij de load balancing maar rekende hem nergens uit — `p.chk` in het paspoort werd alleen getoond, nooit berekend. Rekenkern overgenomen uit Kastscan; 25 nieuwe regressietests (80 → 105).
- **Fasecheck v1 afgerond (`v2026-09-11-A/B/C` + `v2026-09-12-A t/m G`).** De belasting wordt nu **per fase** gerekend en in de paspoortstap getoond: een balk per fase tegen de capaciteit (A × 230 V), de fase met de meeste vrije ruimte als advies, en de melding welke fase overloopt. Dát is waar de Fasecheck om draait — de slimme meter saldeert over drie fasen, de hoofdzekering niet. Rekenkern in `components/wkb/fasebalans.js`, gevormd op de paspoort-groepenlijst zodat Kastscan hem ongewijzigd kan gebruiken en een P1-meting er zonder vertaling in past. Groepen zonder vastgelegde fase worden apart geteld in plaats van overgeslagen. **Sinds `-C` toetst ook de belastingcheck zelf per fase** (besluit Martin, 11-09-2026) — dat is een gedragswijziging: een laadpaal van 11 kW op één fase van 3×25 A was 38% van de aansluiting en is 115% van die fase. De totaaltoets blijft eronder liggen als vangnet voor groepen zonder vastgelegde fase; de strengste van de twee wint. **Sinds `v2026-09-12-A` telt teruglevering mee** (besluit Martin): stroom is stroom, een smeltdraad kent geen plus en min — maar eigengebruik raakt de fasen niet, dus per fase geldt de *zwaarste van twee richtingen* (volle zon zonder verbruik, óf vol verbruik zonder zon) en nooit hun som. Op de voedende kant geen gelijktijdigheidsfactor: de paspoortspec spreekt bij de kam van "de som van de voedende groepen". Sinds `-F` zit er een **optionele Fasecheck in de apparaatstap** van laadpaal/batterij/wp/pv — een dichtgeklapt blok, géén extra scherm (flow-regel), voorgevuld uit een gescand paspoort of anders een aanvinklijst met standaardvermogens; de gekozen fase gaat als `fn` mee het paspoort in. Op een **eenfasige** aansluiting vervalt de hele verdeling — geen fasekolommen, geen fasekeuze, alleen nog de vraag of het erbij past. Sinds `-D` staat de balans ook **in het rapport**, als hoofdstuk "Belasting per fase" in het gedeelde slotblok (dus in elke discipline); sinds `-E` als **balken**, dezelfde weergave als in de app en als het groepenoverzicht van Kastscan, met `FASE_KLEUR` uit `model.js` op exact de hexwaarden van het zusterproject. Daarvóór stond de uitkomst nergens in het rapport — alleen in de QR. **Een thuisbatterij staat sinds `-B` als twee regels in het paspoort** (spec §4.4 laat dat toe): ontladen als `voed`, laden als `af`. Dat maakt uit zodra ze niet even zwaar zijn — laden is een afname van een grote verbruiker en krijgt dus wél de factor 0,6. Daarvoor is in de groepen-stap het veld `L` per aardlekgroep toegevoegd (L1/L2/L3 of leeg — een gegokte fase is schadelijker dan een lege). `basisbelastingKw()` kent sindsdien `bron: 'geschat' | 'gemeten'`; op een gemeten piek gaat de factor 0,6 er niet overheen.
- **Modulaire opsplitsing van `WkbApp.jsx` (11-09-2026).** Het bestand ging van 6212 naar ~5700 regels en bevat nu alleen nog schermen. Eruit: `components/wkb/model.js` (rekenkern), `mkp-bouw.js` (app → paspoort), `veilig.js` (`esc`/`saneerProject`/`saneerImport` uit de security-audit — die code was tot dan toe ongetest omdat hij niet te importeren was), `fasebalans.js`. Het paspoortformaat zelf staat nu in een **eigen repo** `github.com/mschut64/meterkastpaspoort` (tag `v0.2.0`, als tarball-dependency) en wordt door YourWkb én Kastscan gebruikt. Reden: één standaard hoort één implementatie te hebben.
- **Landing: blog zichtbaar, leesbare koppen (15-09-2026).** Blog staat in de vaste navigatiebalk naast "Hoe werkt het" en blijft als enige nav-link zichtbaar op de telefoon (daar zit de doelgroep). Koppen van Syne 800 naar IBM Plex Sans 700 op landing, blog, artikelpagina en AVG-pagina — Syne was slecht leesbaar en kapte bij regelhoogte 1,08 de onderstok van g/j/p af; regelhoogte nu 1,15–1,2. Design-spec §17 herzien. Meegefixt: op telefoonformaat viel "Gratis starten" buiten beeld door een inline raster (valkuil 11).
- **Tweede blogartikel** + `kicker`-veld in de front matter.
- **🚨 Security-release (audit `claude_security-audit-2026-08-25.md`) — volledig afgevinkt.** Open mailrelay dicht (origin-check, rate limits 6/uur + 60/dag, vaste afzender, onderwerp alleen in strak formaat, HTML-stripping, groottecap); AI-proxy dicht (prompt **volledig server-side**, client stuurt alleen `{discipline, data}`, max_tokens 700, 12/uur); `esc()` om 41 interpolaties in `genereerRapport`; voorbeeld-iframe `sandbox=""`; printen via verborgen sandboxed iframe i.p.v. `window.open`; import-validatie met `saneerProject`/`saneerWaarde` (strings 4000, foto's alleen `data:image/(jpeg|png|webp)`, diepte 7, 500 projecten, 60MB); security headers + CSP in **Report-Only**; Dropbox-inline-script uit layout; generieke foutmeldingen (details naar console/Vercel-logs).
- **MKP-QR in e-mail als inline-bijlage** (`cid:mkpqr` + Resend `attachments` met `content_id`) — mailclients blokkeren data-URI-afbeeldingen, vandaar.
- **Blog live** volgens `claude_blog-featurespec.md`: index + artikelpagina's, OG/Twitter-cards met absolute cover, JSON-LD Article, self-canonical, deelknoppen met UTM + `blog_gedeeld`, `blog_artikel_bekeken`/`_gelezen`, sitemap met lastModified. Eerste artikel = reprint "Pak de regie in de meterkast" (Installatie Journaal, 18-08-2026); tweede = "Vergunningsvrij werk? De waarschuwingsplicht geldt nog steeds" (28-08-2026), vervolg over art. 7:754/755, 7:757a en 7:758 lid 4 BW. De kicker boven de titel komt uit het front-matterveld `kicker` (default "Reprint").
- Landing: dood e-mailveld verwijderd, footer mobiel als kolom, LinkedIn als icoonknop, Blog-link.
- `public/index.html` (fossiel uit het statische-site-tijdperk) verwijderd; **sw v7**: alleen `/app`-navigaties via de service worker.

**Openstaand handwerk voor Martin (niet door jou te doen):** PostHog-funnel/dashboard aanmaken, Google Search Console instellen, prijsdiscrepantie €2,50 (Aannames-tabblad businesscase) vs €7,50 (landing) beslissen.

---

## 5. Releaseplan — hier ga je mee verder

Volgorde uit `YourWkb-releaseplan-checklist.md`. **R0, R0.5 en R1 zijn af** (zie §4). R4 is de enige openstaande release die niet op een extern document wacht.

| # | Release | Inhoud |
|---|---------|--------|
| **R1** ✅ | **Design fase 2** — afgerond `v2026-08-29-A` | Doorgevoerd; de afwijkingen van de spec staan onderbouwd in de checklist. **Twee punten uit spec §4 blijven open en wachten op Martin:** de paspoort-risicoscore en het inspectiepunt-met-reden verwijzen naar UI die niet in de app bestaat. |
| **R2** | Controleerbaar vakmanschap + AI-meekijker (= fotocheck **stap 8**) | Erkenningsblok in bedrijfsprofiel: InstallQ-erkenningsnummer, CO-certificaat (BRL 6000-25), F-gassen (BRL 100/200) — elk optioneel, eenmalig, rapport toont per discipline het relevante nummer + controleregel (echteinstallateur.nl / tlokb.nl). AI-meekijker op werkfoto's: optionele knop per checkpoint, foto's gebundeld naar de beveiligde `/api/rapport`-route, bevindingen als signaal (nooit keuring-taal), privacy-melding, offline grijs. **Wacht op de systeemprompt uit de fototest-kalibratie** (aparte chat). Prijsmodel: advies optie A (inbegrepen, ~€0,03/analyse, ~€0,09/rapport, ~2% van omzet). |
| **R3a** | **Kastscan** (= fotocheck **stap 6**) | ⚠️ **Spec `claude_kastscan-featurespec.md` ligt niet in de repo en is op de werkmachine niet gevonden** — zonder dat document kan hier niet gebouwd worden. Er bestaat wél werkende Kastscan-code buiten deze repo: de belastingcheck-rekenkern van `v2026-09-03-A` is daaruit overgenomen. Verder: Foto van de geopende verdeler vult groepen/aardlekken/fasen vóór in — **de foto vult in, de installateur bevestigt**. Volle resolutie verplicht (geen terugschaling), HEIC-ondersteuning. Testbasis: `claude_fotokalibratie-kasten-herman-2026-08.md`. Levert de faseverdeling aan R3b. |
| **R3b** | **Fasecheck v1** | ⚠️ **Spec `claude_fasecheck-featurespec.md` ligt niet in de repo.** Wél binnen: `docs/claude_p1-meting-featurespec.md` (P1-meting via de slimme meter — maakt van de geschatte fasebelasting een gemeten waarde; zie hieronder). **Deels al gedaan:** de belastingcheck wordt sinds `v2026-09-03-A` berekend (roadmap §2.1, gelijktijdigheid 0,6). Resterend uit de oorspronkelijke omschrijving: Kern: *fasecompensatie is boekhouding, stroom is fysiek* — de slimme meter saldeert over drie fasen, de hoofdzekering niet. Dus **per fase** rekenen: capaciteit = A × 230 V, vrije ruimte = capaciteit − piek, PV-export telt als negatieve belasting, reserve default 1,0 kW, oordeel groen/oranje/rood + beste-fase-advies, batterij laden én ontladen met waarschuwing voor netto-totaal-sturing. Optionele stap in bat/lp/wp/pv, **voorgevuld uit het meterkastpaspoort** (`grp`-lijst); zonder paspoort aanvinklijst met standaardvermogens en label "indicatie". Vastleggen in rapport; het `fn`-veld in MKP spec v0.2 wordt geschreven sinds 11-09-2026. Rekenkern als **pure functies in `components/wkb/model.js`**, zodat de tests hem rechtstreeks importeren. Mockups liggen klaar (`fasecheck-mockup-*.png/html`) — eerst langs Maurits & Herman. |
| **R4** | Normcheck-kern (roadmap fase 1) | 1.1 engine met echte grenswaarden over alle disciplines (harmonisatie: fysica-vlag veld-vs-kastmeting overal, Z-max per automaatkarakteristiek, PV's vaste 0,5 Ω-toets herzien) + 1.2 testuitbreiding. Laadpaal-restpunten: RCD-exclusiviteit, IP/IK bij buitenopstelling, karakteristiekveld. Daarna 1.3 IB22-classificatiemotor → 1.4 meetmiddelregistratie/kalibratie → 1.5 SCIOS-ready exportprofiel. |
| **R5+** | Blog is gebouwd ✅. Verder: **betaalintegratie** Mollie/Stripe (HMAC-zegelontwerp ligt klaar), **Dropbox v2** (opslag + gedeelde teammap als collegiaal deelkanaal; key opnieuw configureren in Vercel + Dropbox App Console; keuze volledige back-up vs geanonimiseerd deelbestand), labelprinters (Niimbot als **driverlaag**: generieke print-interface + merk-drivers; Supvan T50 Pro alleen als Web-Bluetooth/BLE blijkt te werken), fase 2-rest (PV Scope 12, constructieverklaring-flow, CV-rekenhulp, normversie via toetsjaartal), fase 3 (brandrisico/Scope 10). **Slotstap: tablet-layout**, pas als de app functioneel stabiel is. |

### P1-meting — nieuw spoor onder R3b (spec sinds 11-09-2026 in de repo)

`docs/claude_p1-meting-featurespec.md`. Meten via de P1-poort van de slimme meter met een **Smartstuff Wifi P1 Dongle Pro+** (aangeschaft): een logger die de installateur een week achterlaat. Maakt van de geschatte fasebelasting in de Fasecheck een **gemeten** waarde, en later — zonder de afdekplaat eraf — een bevestiging van de fase per aardlek door de aardlek kort te schakelen en de sprong op de P1-data te lezen.

Drie feiten die het ontwerp bepalen: de meter geeft per fase alleen **momentane** waarden (geen kWh per fase, dus piek/gemiddelde bestaan alleen als de dongle ze zelf bijhoudt); **stroom per fase is in DSMR 5 een geheel getal zonder richting**, dus log vermogen en geen stroom; en **een gemeten piek bevat de gelijktijdigheid al** — op een gemeten basisbelasting mag de 0,6-factor er niet nóg eens overheen, alleen op het nieuwe apparaat.

Fasering: **fase 0** spike bij Martin thuis (referentie-installatie 3×25 A met bekende faseverdeling uit `fasebewaker.yaml`) → **fase 1** meetmodus + import in de Fasecheck → **fase 2** centraal doorgeefluik (raakt de privacy-architectuur, vraagt een expliciet besluit) → **fase 3** fase per aardlek in de Kastscan.

**Nu te doen in R3b zelfs zonder de fasecheck-spec:** de rekenkern een `bron: 'geschat' | 'gemeten'` laten accepteren, zodat er later niets herbouwd hoeft te worden.

**Bewust vervallen:** licht/donker-thema (donker is bewuste veldkeuze), cloud sync, internationale expansie, community-laag.

---

## 6. Domeinkennis die je nodig hebt

- **Normen:** NEN 1010:2020 (+C1:2024) wordt getoetst; in de Omgevingsregeling is nog NEN 1010:2015 aangewezen — nieuwere editie toepassen mag. Die nuance staat als voetnoot in het rapport via de constante `NORM_EDITIE`; laat hem staan.
- **Isolatieweerstand naar aarde is altijd ≥ 0,23 MΩ**, ongeacht spanning of faseconfiguratie. (De 0,40 MΩ gold t.o.v. 400 V fase-fase, niet voor metingen naar aarde.) Deze fout is één keer gemaakt en gecorrigeerd — herintroduceer hem niet.
- **Laadpaal:** NEN 1010 hoofdstuk 722 — eindgroep-eis 722.314.101, RCD type B óf type A/F + RDC-DD (niet verplicht ín het laadpunt).
- **Gelijktijdigheidsfactor** zonder gezamenlijke load balancer: 0,6 (richtlijn NEN-EN-IEC 61439). Alleen over de grote verbruikers (laadpaal, warmtepomp, kookgroep, thuisbatterij) en alleen op de afnemende kant.
- **Een thuisbatterij is twee dingen tegelijk:** laden is afname (grote verbruiker, factor 0,6), ontladen levert aan de kam (geen factor). Het paspoort draagt daarom twee `grp`-regels met dezelfde fase. Vraag laad- en ontlaadvermogen alleen apart waar de accu zélf de klus is; in een groepenkast is één veld per eindgroep genoeg.
- **Teruglevering belast de hoofdzekering** net zo goed als afname — de stroom loopt er doorheen, richting daargelaten. **Maar eigengebruik niet:** wat de PV levert en een groep tegelijk opneemt, loopt over de kam van de ene groep naar de andere en passeert de hoofdzekering nooit. Reken daarom per fase met de *zwaarste van twee richtingen*, nooit met hun som. (Besluit Martin, 12-09-2026.)
- **Erkenningslandschap:** InstallQ erkent/certificeert (registers echteinstallateur.nl, CentraalRegisterTechniek.nl) maar wettelijke certificaten (CO/BRL 6000-25, F-gassen BRL 100/200) worden uitgegeven door CI's (Kiwa, Dekra) met eigen nummers; gasregister staat bij TloKB (tlokb.nl). Drie uitgevers, drie registers, geen koppeling — daarom toont het rapport per discipline het juiste nummer mét de juiste controleplek.
- **Meterkastpaspoort-formaat:** JSON → `deflate-raw` → base64url in het **URL-fragment** achter `meterkastpaspoort.nl/p#`, dat redirect naar `yourwkb.nl/app` (fragment reist mee). Spec v0.2 voegt `erk` (`uitgever:nummer`, bv. `installq:14718`) en `fase` per apparaat toe. Licentie CC BY 4.0.

---

## 7. Valkuilen — hard geleerd, niet opnieuw doen

1. **Bestandsverwisseling bij `page.js`-paden.** De landingscode is een keer als `app/blog/page.js` beland; /blog toonde daardoor de landing, wat een avond speurwerk kostte. Elk bestand dat naar een `page.js`-pad gaat, begint met een herkenbare commentaarregel; controleer na kopiëren met `head -1`.
2. **Verdenk eerst je eigen wijziging, niet de infrastructuur.** Bij dat blog-mysterie zijn cache, service worker en deploys verdacht gemaakt terwijl het gewoon de code was. Meet met de connectors (Vercel: `list_deployments`, `web_fetch_vercel_url`; PostHog: events) vóór je theorieën bouwt.
3. **Data-URI-afbeeldingen worden door mailclients geblokkeerd.** Alles wat in een e-mail zichtbaar moet zijn, gaat als bijlage met `content_id` (zie de QR-oplossing).
4. **De service worker mag alleen `/app` afhandelen.** Anders overschrijft een landing- of blogbezoek het offline-anker van de app.
5. **Bij grote regex-bewerkingen op `WkbApp.jsx`:** schrijf per stap weg en assert op het aantal treffers. Een `s.index()` op een ontbrekend anker heeft het bestand een keer gecorrumpeerd; herstel toen vanaf de laatste opgeleverde kopie.
6. **Demo-QR's nooit zelf genereren** — gebruik `public/mkp-demo-qr.png` / `mkp-demo-sticker.png`. Een zelfgemaakte mockup-QR met ongeldige payload heeft een "storing" veroorzaakt die er geen was.
7. **Web Share Target werkt, maar een WebAPK moet ververst worden** (app verwijderen + opnieuw installeren) voordat het deel-menu de nieuwe manifest-entry kent.
8. **`S.btn` zet `width:100%`.** Een rij keuzeknoppen met `flex:"0 0 auto"` erover valt daardoor uit elkaar: flex-basis auto pakt die 100% en elke knop vult een hele regel. Gebruik voor een rij compacte keuzes een `grid` met vaste kolommen, niet een flexrij met wrap. (Vijf ampèrekeuzes stonden zo maandenlang als vijf volle knoppen onder elkaar.)
9. **Bouw nooit na wat `mkp-bouw.js` al schrijft.** De paspoortstap had een eigen kopie van het "eigen apparaat"; die is twee keer uiteengelopen met de echte QR-inhoud. Voorvertoningen halen hun regels uit `eigenApparaatRegels`, en een test bewaakt dat ze gelijk blijven. Hetzelfde geldt voor de belastingcheck, die al op `mkpBouw` draait.
10. De app kan zich **niet** als bestands-opener registreren op Android; deelbestanden gaan als `.txt`/`text-plain` (Android weigert `application/json` in het deelmenu).
11. **Een inline `gridTemplateColumns` wint van elke mediaquery.** Op de landing stonden drie rasters met `style={{ gridTemplateColumns:'1fr 1fr' }}`; de mobiele regel `.price-grid { 1fr }` greep nooit omdat die klasse er niet op zat. Op een 375-px-scherm werd de prijskaart 462 px breed, de pagina rekte mee, en de `position: fixed`-nav rekte mee buiten beeld — "Gratis starten" viel weg. `body { overflow-x: hidden }` verbergt dat: er is geen horizontale scrollbalk, alleen een afgekapte balk bovenin. Kolommen horen in een klasse (`.twee-kol`), niet inline. Controleer op telefoonformaat altijd `document.documentElement.scrollWidth` tegen de schermbreedte.

---

## 8. Werkafspraken met Martin

- Werk in **afgebakende releases** met expliciete scope; vraag niet om toestemming voor stappen die in het releaseplan staan — voer ze uit.
- Lever bij elke release: gewijzigde bestanden, testresultaat (alle tests groen, nu 333), buildresultaat, en een korte samenvatting van wat de gebruiker merkt. Meld gedragswijzigingen expliciet, ook kleine.
- Werk `YourWkb-releaseplan-checklist.md` bij (vinkjes zetten) en dit bestand wanneer de stand verandert.
- Nieuwe features toetsen aan de flow-regel **voordat** je bouwt; als de flow langer wordt, herontwerp.
- Bij normvragen of twijfel over grenswaarden: leg de vraag voor aan Martin (hij is de expert) in plaats van te gokken.
- Blogartikelen publiceren = markdown-bestand in `content/blog/` met frontmatter (`title`, `description`, `date`, `author`, `tags`, `coverImage`, optioneel `source` voor reprints) + push. Na publicatie: URL door de LinkedIn Post Inspector halen.
