# YourWkb — projectinstructies voor Claude Code

*Overdracht van de webapp-ontwikkelchats (claude.ai, aug 2026). Dit bestand is het werkgeheugen: lees het aan het begin van elke sessie en houd het bij. Werk zelfstandig verder volgens `YourWkb-roadmap-2026-08.md` (koers) en `YourWkb-releaseplan-checklist.md` (afvinklijst) — beide staan in de repo-root of in `/docs`.*

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

### Belangrijkste bestanden
```
components/WkbApp.jsx      ← de héle app (~5700 regels, één bestand, bewust)
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
lib/blog.js                ← frontmatter-parser + mini-markdown-renderer
public/sw.js               ← service worker (v7)
tests/extract-logica.js    ← Babel-extractie van norm-functies
tests/logica.js            ← AUTO-GEGENEREERD, nooit handmatig bewerken
tests/test.js              ← 80 regressietests
```

---

## 3. Werkwijze (verplicht)

### Regressietests bij élke norm-wijziging
```bash
node tests/extract-logica.js components/WkbApp.jsx   # regenereert tests/logica.js
node tests/test.js                                    # moet 80/80 groen zijn
```
`tests/logica.js` wordt automatisch uit `WkbApp.jsx` gegenereerd (Babel haalt de pure normfuncties eruit) — dat voorkomt dat tests en implementatie uit sync lopen. Bewerk het bestand nooit met de hand.

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

## 4. Actuele stand (28-08-2026)

**Live:** app `v2026-08-27-B` + security-release + landing + blog. Alles veldbevestigd door Martin.

Recent afgerond:
- **🚨 Security-release (audit `claude_security-audit-2026-08-25.md`) — volledig afgevinkt.** Open mailrelay dicht (origin-check, rate limits 6/uur + 60/dag, vaste afzender, onderwerp alleen in strak formaat, HTML-stripping, groottecap); AI-proxy dicht (prompt **volledig server-side**, client stuurt alleen `{discipline, data}`, max_tokens 700, 12/uur); `esc()` om 41 interpolaties in `genereerRapport`; voorbeeld-iframe `sandbox=""`; printen via verborgen sandboxed iframe i.p.v. `window.open`; import-validatie met `saneerProject`/`saneerWaarde` (strings 4000, foto's alleen `data:image/(jpeg|png|webp)`, diepte 7, 500 projecten, 60MB); security headers + CSP in **Report-Only**; Dropbox-inline-script uit layout; generieke foutmeldingen (details naar console/Vercel-logs).
- **MKP-QR in e-mail als inline-bijlage** (`cid:mkpqr` + Resend `attachments` met `content_id`) — mailclients blokkeren data-URI-afbeeldingen, vandaar.
- **Blog live** volgens `claude_blog-featurespec.md`: index + artikelpagina's, OG/Twitter-cards met absolute cover, JSON-LD Article, self-canonical, deelknoppen met UTM + `blog_gedeeld`, `blog_artikel_bekeken`/`_gelezen`, sitemap met lastModified. Eerste artikel = reprint "Pak de regie in de meterkast" (Installatie Journaal, 18-08-2026).
- Landing: dood e-mailveld verwijderd, footer mobiel als kolom, LinkedIn als icoonknop, Blog-link.
- `public/index.html` (fossiel uit het statische-site-tijdperk) verwijderd; **sw v7**: alleen `/app`-navigaties via de service worker.

**Openstaand handwerk voor Martin (niet door jou te doen):** PostHog-funnel/dashboard aanmaken, Google Search Console instellen, prijsdiscrepantie €2,50 (Aannames-tabblad businesscase) vs €7,50 (landing) beslissen.

---

## 5. Releaseplan — hier ga je mee verder

Volgorde uit `YourWkb-releaseplan-checklist.md`. R0 en R0.5 zijn af.

| # | Release | Inhoud |
|---|---------|--------|
| **R1** | **Design fase 2** | Spec sectie 4 scherm-voor-scherm: `S.inputMeting` (32px) per meetveld + eenheid, normvlak onder het meetveld, stapteller/voortgangsbalk, paspoort-score in statuskleur, back-up-knophiërarchie, disciplinetegels met kleurvlak. Meebundelen: **zichtbaar versienummer in de app** + **landing "binnenkort" opschonen** (laadpaal, thuisbatterij en QR-meterkastpaspoort zijn live → naar beschikbaar; belastingcheck/eigen logo blijven binnenkort). Design-spec: `design-spec.md`. |
| **R2** | Controleerbaar vakmanschap + AI-meekijker (= fotocheck **stap 8**) | Erkenningsblok in bedrijfsprofiel: InstallQ-erkenningsnummer, CO-certificaat (BRL 6000-25), F-gassen (BRL 100/200) — elk optioneel, eenmalig, rapport toont per discipline het relevante nummer + controleregel (echteinstallateur.nl / tlokb.nl). AI-meekijker op werkfoto's: optionele knop per checkpoint, foto's gebundeld naar de beveiligde `/api/rapport`-route, bevindingen als signaal (nooit keuring-taal), privacy-melding, offline grijs. **Wacht op de systeemprompt uit de fototest-kalibratie** (aparte chat). Prijsmodel: advies optie A (inbegrepen, ~€0,03/analyse, ~€0,09/rapport, ~2% van omzet). |
| **R3a** | **Kastscan** (= fotocheck **stap 6**) | Spec: `claude_kastscan-featurespec.md`. Foto van de geopende verdeler vult groepen/aardlekken/fasen vóór in — **de foto vult in, de installateur bevestigt**. Volle resolutie verplicht (geen terugschaling), HEIC-ondersteuning. Testbasis: `claude_fotokalibratie-kasten-herman-2026-08.md`. Levert de faseverdeling aan R3b. |
| **R3b** | **Fasecheck v1** | Spec: `claude_fasecheck-featurespec.md`, uitwerking in roadmap §2.1. Absorbeert de oude belastingcheck. Kern: *fasecompensatie is boekhouding, stroom is fysiek* — de slimme meter saldeert over drie fasen, de hoofdzekering niet. Dus **per fase** rekenen: capaciteit = A × 230 V, vrije ruimte = capaciteit − piek, PV-export telt als negatieve belasting, reserve default 1,0 kW, oordeel groen/oranje/rood + beste-fase-advies, batterij laden én ontladen met waarschuwing voor netto-totaal-sturing. Optionele stap in bat/lp/wp/pv, **voorgevuld uit het meterkastpaspoort** (`grp`-lijst); zonder paspoort aanvinklijst met standaardvermogens en label "indicatie". Vastleggen in rapport + `fase`-veld in MKP spec v0.2. Rekenkern als **pure functies** zodat de extract-logica-tests hem oppakken. Mockups liggen klaar (`fasecheck-mockup-*.png/html`) — eerst langs Maurits & Herman. |
| **R4** | Normcheck-kern (roadmap fase 1) | 1.1 engine met echte grenswaarden over alle disciplines (harmonisatie: fysica-vlag veld-vs-kastmeting overal, Z-max per automaatkarakteristiek, PV's vaste 0,5 Ω-toets herzien) + 1.2 testuitbreiding. Laadpaal-restpunten: RCD-exclusiviteit, IP/IK bij buitenopstelling, karakteristiekveld. Daarna 1.3 IB22-classificatiemotor → 1.4 meetmiddelregistratie/kalibratie → 1.5 SCIOS-ready exportprofiel. |
| **R5+** | Blog is gebouwd ✅. Verder: **betaalintegratie** Mollie/Stripe (HMAC-zegelontwerp ligt klaar), **Dropbox v2** (opslag + gedeelde teammap als collegiaal deelkanaal; key opnieuw configureren in Vercel + Dropbox App Console; keuze volledige back-up vs geanonimiseerd deelbestand), labelprinters (Niimbot als **driverlaag**: generieke print-interface + merk-drivers; Supvan T50 Pro alleen als Web-Bluetooth/BLE blijkt te werken), fase 2-rest (PV Scope 12, constructieverklaring-flow, CV-rekenhulp, normversie via toetsjaartal), fase 3 (brandrisico/Scope 10). **Slotstap: tablet-layout**, pas als de app functioneel stabiel is. |

**Bewust vervallen:** licht/donker-thema (donker is bewuste veldkeuze), cloud sync, internationale expansie, community-laag.

---

## 6. Domeinkennis die je nodig hebt

- **Normen:** NEN 1010:2020 (+C1:2024) wordt getoetst; in de Omgevingsregeling is nog NEN 1010:2015 aangewezen — nieuwere editie toepassen mag. Die nuance staat als voetnoot in het rapport via de constante `NORM_EDITIE`; laat hem staan.
- **Isolatieweerstand naar aarde is altijd ≥ 0,23 MΩ**, ongeacht spanning of faseconfiguratie. (De 0,40 MΩ gold t.o.v. 400 V fase-fase, niet voor metingen naar aarde.) Deze fout is één keer gemaakt en gecorrigeerd — herintroduceer hem niet.
- **Laadpaal:** NEN 1010 hoofdstuk 722 — eindgroep-eis 722.314.101, RCD type B óf type A/F + RDC-DD (niet verplicht ín het laadpunt).
- **Gelijktijdigheidsfactor** zonder gezamenlijke load balancer: 0,6 (richtlijn NEN-EN-IEC 61439).
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
8. De app kan zich **niet** als bestands-opener registreren op Android; deelbestanden gaan als `.txt`/`text-plain` (Android weigert `application/json` in het deelmenu).

---

## 8. Werkafspraken met Martin

- Werk in **afgebakende releases** met expliciete scope; vraag niet om toestemming voor stappen die in het releaseplan staan — voer ze uit.
- Lever bij elke release: gewijzigde bestanden, testresultaat (80/80), buildresultaat, en een korte samenvatting van wat de gebruiker merkt. Meld gedragswijzigingen expliciet, ook kleine.
- Werk `YourWkb-releaseplan-checklist.md` bij (vinkjes zetten) en dit bestand wanneer de stand verandert.
- Nieuwe features toetsen aan de flow-regel **voordat** je bouwt; als de flow langer wordt, herontwerp.
- Bij normvragen of twijfel over grenswaarden: leg de vraag voor aan Martin (hij is de expert) in plaats van te gokken.
- Blogartikelen publiceren = markdown-bestand in `content/blog/` met frontmatter (`title`, `description`, `date`, `author`, `tags`, `coverImage`, optioneel `source` voor reprints) + push. Na publicatie: URL door de LinkedIn Post Inspector halen.
