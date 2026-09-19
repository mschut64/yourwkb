# YourWkb · Kastscan · Meterkastpaspoort — architectuur, modules en waar je verder kunt

*Stand 19-09-2026, eind van de dag (eerste versie 12-09-2026). Tussentijds ontwikkeldocument.*

**Lees dit ná `CLAUDE.md`.** CLAUDE.md zegt wát er moet gebeuren en volgens welke regels;
dit document zegt **wat waar staat, waarom het daar staat, en waar de scheuren zitten**.
Het is geschreven om een volgende sessie in één keer op snelheid te brengen zonder drie
repo's te hoeven uitpluizen.

Het vult `claude_kastscan-yourwkb-inventarisatie.md` (11-09) aan. Dat document beschrijft
de situatie *vóór* de ontvlechting; dit beschrijft de situatie *erna*.

**Wat er sinds 12-09 veranderde, in één alinea:** het paspoort is van een formaat een
*vertrouwensketen* geworden. Het pakket kan nu samenvoegen (velden van een ander blijven
behouden), afkappen (≤ 105 modules) én controleren (handtekeningen, erkenning,
terugroepmeldingen). Beide apps en de lezer op meterkastpaspoort.nl gebruiken diezelfde
code, dus ze komen over hetzelfde paspoort tot hetzelfde oordeel. De sleutel van de
beheerder is vervangen en staat vast in de code. **Kastscan schrijft nu zelf de
materiaallijst** (`mat[]`), zodat terugroepmeldingen iets hebben om op te treffen. En het
erkenningslandschap is uitgezocht (Techniek Nederland, Kiwa, TloKB): TloKB is geen uitgever,
het CO-certificaat heeft in YourWkb een eigen plek. Zie §2, §2b, §5D en §13.

---

## 0 · De kaart

```
                    ┌────────────────────────────────────────────────┐
                    │     meterkastpaspoort  (eigen repo, tag)       │
                    │     HET FORMAAT + DE CONTROLE — normneutraal   │
                    │  mkp.js · spec-site · lezer.html · /p-redirect │
                    │  veldnotities/index.json (door Martin getekend)│
                    └──────────┬───────────────────────┬─────────────┘
                               │ npm-dependency, gepind op v0.3.2
                   ┌───────────┘                       └───────────┐
                   ▼                                               ▼
    ┌──────────────────────────────┐              ┌──────────────────────────────┐
    │           YourWkb            │              │           Kastscan           │
    │     opleverrapporten         │              │    foto → gelabelde kast     │
    │  components/wkb/             │              │  components/kastscan/        │
    │    model.js     fasebalans.js│◀── namen ───▶│    model.js   labels.js      │
    │    mkp-bouw.js  mkp-qr.js    │   kleuren    │    render.js  documenten.js  │
    │    mkp-bronnen.js veilig.js  │   normregels │    mkp.js     mkp-bronnen.js │
    │  WkbApp.jsx (schermen)       │              │    PaspoortScanner/-Weergave │
    │                              │              │  KastscanApp.jsx (schermen)  │
    └──────────────────────────────┘              └──────────────────────────────┘
          381 tests groen                                1275 tests groen
                   │                                               │
                   └───────────────────┬───────────────────────────┘
                                       ▼
                         dezelfde QR op dezelfde kastdeur
                     (pakket zelf: 109 tests, `npm test` daar)
```

**De pijlrichting is de kern.** Beide apps hangen aan het paspoort; het paspoort hangt
nergens aan. Zodra iets in het pakket app-specifiek wordt, staat de standaard niet meer
los van zijn gebruikers en is de architectuur stuk.

---

## 1 · De drie repo's

| Repo | Wat het is | Hosting | Afhankelijk van |
|---|---|---|---|
| **`mschut64/meterkastpaspoort`** | De open standaard: formaat, controle, specificatie, referentielezer, QR-redirect, de index van sleutels. CC BY 4.0. | Vercel, statisch — **geen buildscript** | niets |
| **`mschut64/yourwkb`** | Wkb-opleverrapporten, zes disciplines, PWA. Repo is **publiek**. | Vercel `yourwkb-yndu`, auto-deploy op `main` | meterkastpaspoort `v0.3.2` |
| **`mschut64/kastscan`** | Van foto naar gelabelde groepenkast. De foto vult in, de installateur bevestigt. | Vercel, **eigen project buiten het team van de connector** — controleer live met `curl`/de browser | meterkastpaspoort `v0.3.2` |

**Waarom het pakket geen buildscript mag krijgen:** die site draagt de redirects
`/p` en `/p/:rest*` → `yourwkb.nl/app` waar **elke QR-sticker in het veld** van afhangt.
Een buildstap die stukloopt, maakt alle stickers dood. Na elke wijziging daar: controleer
dat `/p` nog doorstuurt (kaal domein 308 → www, dan 307 naar yourwkb.nl/app).

**Waarom de dependency op een tag staat en niet op een branch:**

```json
"meterkastpaspoort": "https://github.com/mschut64/meterkastpaspoort/archive/refs/tags/v0.3.2.tar.gz"
```

Een push naar de spec-repo verandert daarmee niet stilzwijgend wat er in de apps zit; een
nieuwe versie vraagt een bewuste bump. (`github:user/repo` werkt niet: npm schrijft dat in
de lockfile om naar `git+ssh`, en een buildmachine heeft geen SSH-sleutel.)

**Volgorde bij een nieuwe pakketversie:** eerst het pakket pushen mét tag, dan in de app
`package.json` bumpen + `npm install` + committen, dan de app pushen. Andersom faalt de
Vercel-build op een ontbrekende export. (Lokaal ontwikkelen vóór de tag: `mkp.js`
tijdelijk naar `node_modules/meterkastpaspoort/` kopiëren en de webpack-cache legen.)

**Drie versienummers, bewust niet gelijk:** documentversie van de spec (**0.3**),
datamodel `v` in elk paspoort (**2**), pakketversie (**0.3.2** — patch = aanvulling in de
implementatie zonder formaatwijziging).

---

## 2 · Het gedeelde hart: `meterkastpaspoort/mkp.js`

511 regels, geen imports, draait in browser én Node 18+.

| Groep | Exports | Sinds |
|---|---|---|
| **Formaat** | `MKP_BASIS`, `MKP_SPEC_VERSIE` (2), `eanValide`, `mkpEncode`, `mkpDecode`, `mkpUrl`, `mkpSamenvatting` | v0.2.0 |
| **Omvang** | `QR_TEKENS_GRENS`, `qrWaarschuwing`, `QR_MODULES_GRENS` (105), `QR_NIVEAU` ("M"), `qrModules`, `mkpAfkappen` | v0.3.0 |
| **Hergebruik** | `mkpSamenvoegen` (velden van een ander blijven staan; sinds v0.3.2 ook per toestel in `mat[]`), `mkpZegels` | v0.3.0 / v0.3.2 |
| **Controle** | `mkpCanon`, `mkpVerifieer`, `mkpVerifieerIndex`, `mkpErkenning`, `mkpVeldnotities`, `mkpControleer` | v0.3.1 |
| **Vindplaatsen** | `MKP_INDEX_URL`, `MKP_DEMO_FEED_URL` (beide op **www** — zie §10e), `MKP_WORTEL_SLEUTEL` | v0.3.1 |

**Wat er bewust NIET in zit:** `mkpBouw`. Dat vertaalt de gegevens van één app naar het
formaat, en die datamodellen verschillen fundamenteel — Kastscan denkt in modules op een
DIN-rail, YourWkb in aardlekgroepen met eindgroepen. *De standaard is het formaat, niet de
weg ernaartoe.* Ook niet: normkeuzes (230 V, 0,6, 1,0 kW reserve) en het ophalen van de
lijsten (`mkp-bronnen.js` — zie §10f).

**Hoofdstuk 6 (afkappen).** Een paspoort blijft **maximaal 105 modules** (besluit Martin
18-09), gemeten op foutcorrectie M in byte-modus — leesbaar op een sticker van 50 mm.
Afkapvolgorde: oudste logregels → `sn`/`pd` van toestellen zonder `art` → hele
`mat`-regels (eerst zonder `art` en `sn`) → groepsomschrijvingen inkorten. **Nooit** op een
onbekend veld, **nooit** een logregel inkorten (die kan ondertekend zijn). `mkpAfkappen`
geeft één regel `melding` voor de gebruiker.

**Hergebruik.** `mkpSamenvoegen(bron, nieuw)` begint bij een diepe kopie van het gescande
paspoort: `grp` gekoppeld op `t`+`n`, anders index, nooit over typen heen; het logboek wordt
nooit herschreven (oude regels byte-identiek, zodat hun handtekening blijft kloppen); `v`
gaat nooit omlaag. Tot 18-09 wisten beide apps bij elke nieuwe QR stil de materiaallijst,
erkenning, zegels en handtekeningen van de voorganger.

**Materiaal samenvoegen (v0.3.2).** Levert de app zelf een `mat[]` (Kastscan), dan wordt die
per toestel gekoppeld aan de bron op **plaats (`pos`) + soort (`s`)**, en alleen als fabrikant
en type niet botsen. Bij een koppeling blijven de velden van de bron staan die de app niet
kent — **artikelnummer, serienummer, productiecode**, onbekende velden. Een ánder toestel op
dezelfde plaats vervangt de oude regel; een toestel dat de app niet ziet blijft staan (een
gemiste terugroepactie is erger dan een melding die ter plekke wordt nagekeken). Daarna worden
de volgnummers `i` opnieuw uitgedeeld en alle `grp[].mat` mee omgezet. `mkpAfkappen` ruimt
bovendien `grp[].mat`-verwijzingen op naar een toestel dat het weghaalt.

**Het veld dat het vaakst misgaat — `fn`.** `f` = **aantal** fasen (1/3), `fn` = **lijst
fasenummers** ([1]/[2]/[3]/[1,2,3]). Een veld `fase` per apparaat bestaat **niet**, en ook
geen apart veld voor de belasting per fase: een lezer rekent die uit `grp[].fn` + `kw`.
**Regel: baseer je op de gepubliceerde spec, niet op wat de zusterapp schrijft.**

**`log[].erk` — wie is de uitgever?** Wie het nummer **afgeeft**, niet wie een register
bijhoudt: `installq:14718` (erkenning), `kiwa:K0213477` (CO-certificaat van de certificerende
instelling). Het specvoorbeeld zei tot 19-09 `"tlokb:…"`; TloKB beheert alleen het CO-register,
en dat toont het certificaatnummer niet.

### 2b · Vertrouwen: drie handtekeningen, drie sleutelhouders

| Wat | Ondertekend door | Sleutel staat in | Veld |
|---|---|---|---|
| Een logboekregel | de installateur | `index.installateurs[].publieke_sleutel` (op `sid`) | `log[].sig` |
| Een feed met veldnotities | de fabrikant | `index.uitgevers[].publieke_sleutel` | `feed.handtekening` |
| De index zelf | **de beheerder van de standaard (Martin)** | **vast in de code**: `MKP_WORTEL_SLEUTEL` | `index.handtekening` |

- Getekend wordt met **Ed25519** over `mkpCanon(object zonder het handtekeningveld)` —
  sleutels gesorteerd, geen spaties. **De index wordt bovendien getekend zónder
  `wortel_publieke_sleutel`**: dat veld is informatie, geen inhoud.
- **De sleutel van de beheerder komt nooit uit de index zelf.** Anders bevestigt de index
  zijn eigen echtheid: wie de index vervangt, vervangt de sleutel mee (spec §8.4).
- **Vervangen op 19-09-2026.** De vorige privésleutel was in een chatomgeving gemaakt en niet
  terug te vinden; een sleutel die door een chat gaat, geldt als gelekt. Martin heeft lokaal
  een nieuw paar gemaakt. Privésleutel: `~/.meterkastpaspoort/wortel.pem` op zijn Mac
  (rechten 600, buiten elke repo, niet gesynchroniseerd, offline reservekopie).
- **Na elke wijziging van `veldnotities/index.json`** (nieuwe fabrikant, installateur,
  erkenner) ondertekent **Martin**, nooit Claude:
  ```bash
  cd ~/projects/meterkastpaspoort && node scripts/onderteken-index.mjs onderteken ~/.meterkastpaspoort/wortel.pem
  ```
  Het script weigert een sleutel binnen de repo, overschrijft nooit, controleert achteraf, en
  zegt het als de sleutel niet meer overeenkomt met `MKP_WORTEL_SLEUTEL`. `.gitignore` weert
  `*.pem`/`*.key` als vangnet.
- **Demo-sleutels** (Installatiebedrijf Jansen, Voorbeeld Elektro B.V., de demo-erkenner) zijn
  in chats gemaakt en dus alleen voor de demo. Echte uitgevers maken en bewaren hun eigen sleutel.
- **Kandidaat-uitgevers van verklaringen** (§10 van de spec): InstallQ (staat in de index,
  nog zonder sleutel), **Techniek Nederland** (lidmaatschap en het recht op de Sticker
  Gecontroleerd — niet het CO-certificaat), **Kiwa** en andere certificerende instellingen
  (CO-certificaat, F-gassen). Een QR draagt één verklaring van één uitgever; de route is
  herbruikbaar, de handtekening niet. Uitgewerkt in `docs/claude_techniek-nederland-vooronderzoek-2026-09-19.md`.

**Wat een handtekening wel en niet zegt** (staat ook in beide viewers): dat de regel
onveranderd is en van de houder van die sleutel komt — niet dat de installatie deugt, en
niet dat de sticker op de juiste kast zit. *Wij verifiëren niets; wij maken controleerbaar.*

---

## 3 · YourWkb — modules

| Bestand | Regels | Wat | Getest door |
|---|---:|---|---|
| `components/wkb/model.js` | 515 | **De rekenkern.** Grenswaarden, cross-checks, belastingcheck, belasting per fase. | `tests/test.js` (151) |
| `components/wkb/fasebalans.js` | 186 | Belasting per fase + `faseAdvies`. Gevormd op de paspoort-`grp[]`. | `tests/test-fasebalans.js` (75) |
| `components/wkb/mkp-bouw.js` | 240 | App-gegevens → paspoort, incl. `log[].erk` per klus (`erkVoorKlus`: cv → CO-certificaat `kiwa:…`, anders erkenning `installq:…`) en samenvoegen met `data.mkpImport`. | `tests/test-mkp.js` (70), `tests/test-mkp-qr.js` |
| `components/wkb/mkp-qr.js` | 30 | **Eén weg naar de QR** voor app, rapport, PDF en e-mail: `mkpBouw` → `mkpAfkappen` → `mkpEncode` → PNG-data-URI. | `tests/test-mkp-qr.js` (27) — leest de PNG terug met jsQR; ook erk/CO |
| `components/wkb/mkp-bronnen.js` | 53 | Index + feeds ophalen (rechtstreeks van www), offline de laatst bewaarde versie. | `tests/test-mkp-bronnen.js` (6) |
| `components/wkb/veilig.js` | 118 | `esc`, sanering bij import, `anonimiseerJob`. | `tests/test-veilig.js` (52) |
| `components/WkbApp.jsx` | 6644 | **Alle schermen**, incl. `genereerRapport` en `MkpViewer`. | — *(ongetest, per definitie)* |
| `scripts/demo-opleverrapport.mjs` | 412 | Maakt `public/voorbeeld-opleverrapport.html` + `.pdf` door de echte code (`npm run demo-rapport`). | leest de QR terug vóór het wegschrijven |

**Totaal: 381 tests, `npm test`.**

### De lagenregel

> **Normlogica hoort in `model.js`, niet in `WkbApp.jsx`.**

Alles in `WkbApp.jsx` is ongetest omdat het niet te importeren is. Zit er een grenswaarde,
een factor, een oordeel of een vertaling naar het paspoort in je nieuwe code, dan hoort dat
in een module onder `components/wkb/` met een test ernaast. De QR-opbouw stond tot 18-09 in
`WkbApp.jsx` — nu in `mkp-qr.js`, met een test die het plaatje echt terugleest.

### `belastingPerFase` is de enige optelling

Zowel `belastingcheck` als `faseBalans` leunen erop. Twee optellingen van dezelfde kast
lopen vroeg of laat uiteen — dat is letterlijk wat er tussen deze twee apps gebeurd is.

### `⚠️ .js-extensies verplicht`

Binnen `components/wkb/` moeten imports een expliciete `.js` hebben. Webpack vindt het
bestand ook zonder, **Node niet** — en de tests draaien op Node.

---

## 4 · Kastscan — wat er ligt

| Bestand | Regels | Wat |
|---|---:|---|
| `components/kastscan/model.js` | 2632 | Het complete fase-apparaat, indeling, controles, `mkpBouw`, en sinds 19-09 `mkpMateriaal`/`mkpPlaatsen` (toestellen als `mat[]`, plaats als `R1-5`). **Pure functies, géén imports.** |
| `components/kastscan/labels.js` | 925 | Labelgeneratie |
| `components/kastscan/documenten.js` | 651 | Groepenoverzicht en stickers op papier |
| `components/kastscan/render.js` | 570 | Tekenen van de kast |
| `components/kastscan/schema.js` | 499 | Eendraadschema |
| `components/kastscan/leerlus.js` | 452 | Correctielog — de beeldherkenning leert van correcties. Ook zonder imports. |
| `components/kastscan/mkp.js` | 111 | Re-export van het pakket, QR als afbeelding/raster, `mkpVoorKast` (samenvoegen met `kast.mkpBron`), `mkpLeesTekst`, `mkpAndereKast` |
| `components/kastscan/PaspoortScanner.jsx` | 101 | Bestaande sticker inlezen: camera (BarcodeDetector → jsQR uit de bundel) of plakveld |
| `components/kastscan/PaspoortWeergave.jsx` | 132 | Wat het ingelezen paspoort draagt: veldnotities, materiaal, logboek met erkenning/zegels/handtekening |
| `components/kastscan/mkp-bronnen.js` | 46 | Index + demo-feed ophalen **via het eigen domein** (`/mkp/…`) |
| `components/KastscanApp.jsx` | 3567 | Schermen |

**1275 tests groen** (`node tests/test.js`). Kastscan is modulair het volwassenst: ESM,
kleine bestanden, alles importeerbaar.

**De CSP van Kastscan wordt afgedwongen, met `connect-src 'self'`** — de belofte dat data
het toestel niet naar een andere host verlaat. Daarom haalt Kastscan de openbare lijsten
op via rewrites in `next.config.js` (`/mkp/index.json`, `/mkp/demo-feed.json` →
www.meterkastpaspoort.nl). Een test bewaakt dat `connect-src 'self'` blijft staan.

---

## 5 · Hoe ze samenwerken — vier ketens

### A · Een paspoort schrijven

```
app-gegevens ──▶ mkpBouw (per app) ──▶ mkpSamenvoegen ──▶ mkpAfkappen ──▶ mkpEncode ──▶ QR
                  YourWkb: mkp-bouw.js   (met het gescande    (≤ 105 modules,  (pakket)    rapport, pdf,
                  Kastscan: model.js      paspoort, als dat    melding)                     e-mail (cid),
                                          er is)                                            sticker
```

YourWkb: `mkp-qr.js`. Kastscan: `mkpVoorKast` + `mkpQrDataUrl`/`mkpQrRaster`.

Kastscan schrijft daarbij de toestellen op de rail als `mat[]` — alleen met gelezen of
ingevulde fabrikant of type, hoofdschakelaar en aardlekken vóór automaten (die vallen bij een
te grote QR als eerste weg) — en elke groep wijst met `grp[].mat` naar zijn eigen automaat.
YourWkb schrijft nog geen `mat[]`; het geeft die alleen door uit een gescand paspoort.

### B · Een paspoort lezen

```
YourWkb:   camera ──▶ meterkastpaspoort.nl/p#… ──▶ 308 www ──▶ 307 yourwkb.nl/app#… ──▶ mkpDecode ──▶ MkpViewer
Kastscan:  "Bestaande sticker inlezen" (camera of plakveld) ──▶ mkpLeesTekst ──▶ kast.mkpBron ──▶ PaspoortWeergave
Lezer:     meterkastpaspoort.nl/lezer.html#… ──▶ importeert /mkp.js
```

In YourWkb voedt `data.mkpImport.grp` daarna de Fasecheck **zonder dat de installateur
iets invult**.

### C · De Fasecheck-keten

```
grp[] + ha ──▶ belastingPerFase ──▶ faseBalans ──▶ faseAdvies
                     │                    │               │
                     ▼                    ▼               ▼
              belastingcheck        rapporthoofdstuk   fc.gekozen ──▶ fn in het paspoort
                → p.chk             "Belasting per fase"             (invoer voor de volgende)
```

### D · De controleketen (nieuw, 19-09)

```
openbaar, voor iedereen gelijk                    op het toestel
────────────────────────────────                  ─────────────────────────────────────────
index.json  (getekend door Martin) ─┐
demo-feed.json (getekend door VBE) ─┼──▶ mkpControleer(paspoort, {index, feeds})
                                    │      ├─ indexStatus   ← MKP_WORTEL_SLEUTEL (vast)
                                    │      ├─ log[]: handtekening · ondertekenaar · erkenning · zegels
                                    │      └─ notities: veldnotitie × mat[]  (artikelnummer / type)
paspoort (uit de QR) ───────────────┘
```

Ophalen verraadt niets over de kast: de vergelijking gaat naar de data, niet de data naar
de vergelijking. Per afnemer:

| | Haalt op van | Waarom |
|---|---|---|
| YourWkb | `https://www.meterkastpaspoort.nl/…` rechtstreeks | CSP nog Report-Only; `connect-src` noemt www.meterkastpaspoort.nl |
| Kastscan | `/mkp/…` op kastscan.nl (rewrite) | CSP afgedwongen op `connect-src 'self'` |
| lezer.html | `/veldnotities/…` (zelfde site) | — |

Offline: beide apps bewaren de laatst opgehaalde lijsten in `localStorage` en tonen de datum.

---

## 6 · De regels die dit bij elkaar houden

1. **Eén feit, één definitie.** Twee berekeningen van hetzelfde lopen uiteen — gegarandeerd.
   Voorbeelden: `belastingPerFase`, `eigenApparaatRegels`, `FASE_KLEUR`, en sinds 19-09 de
   **controle**: de lezer had een eigen kopie die de index verkeerd controleerde; nu
   importeert hij `mkp.js`.
2. **Bouw nooit na wat `mkp-bouw.js` al schrijft.** Voorvertoningen halen hun regels
   daarvandaan; een test bewaakt dat ze gelijk blijven.
3. **De spec is de baas, niet de zusterapp.** Zie `fn`.
4. **Normlogica in modules met tests**, opmaak in de schermbestanden.
5. **De flow-regel gaat vóór het releaseplan.** Optionele functies zijn dichtgeklapte
   blokken of automatisch — de erkenningsuitgever in het profiel, de Fasecheck, het inlezen
   van een bestaande sticker, de paspoortweergave.
6. **Een gegokte waarde is schadelijker dan een ontbrekende.** Geldt voor de fase (`fn`) én
   de erkenning: zonder gekozen uitgever geen `erk` — een nummer zonder register stuurt de
   lezer naar het verkeerde register.
7. **Het rapport mag zichzelf niet tegenspreken.** De conformverklaring beweegt mee met de
   bevindingen.
8. **Demo's maakt de app zelf.** Een QR met een verzonnen payload heeft ooit een "storing"
   veroorzaakt. Het voorbeeldrapport gaat door dezelfde code als de app en de QR wordt
   teruggelezen vóór het wegschrijven.
9. **Privésleutels nooit in een chat, repo of e-mail.** Alleen de publieke helft reist.
10. **Test een scan ook als eerste bezoek** (service worker weg, caches leeg). Een
    herlaadactie bij het eerste bezoek wiste de paspoortweergave; wie de app al had, zag dat nooit.
11. **De uitgever is wie het nummer afgeeft**, niet wie een register bijhoudt — en controleer
    of het register dat nummer ook tóónt voordat je het als controleplek noemt (TloKB doet dat niet).

---

## 7 · Gedeeld, deelbaar, en van één app

| | Wat | Waarom |
|---|---|---|
| **Gedeeld (nu)** | formaat, samenvoegen (ook `mat[]`), afkappen, **controle** (pakket); `FASE_KLEUR`; design-tokens (Kastscan `tokens.js` = kopie van YourWkb) | één standaard, één oordeel, één uitstraling |
| **Deelbaar (klaar, wacht op afnemer)** | `fasebalans.js`, `veilig.js` | gevormd op de paspoort-`grp[]` resp. generiek |
| **Twee kopieën (scheur)** | `mkp-bronnen.js` in beide apps | zie §10f |
| **Van één app** | `mkp-bouw.js` / Kastscans `mkpBouw`, alle schermen, `labels.js`/`render.js`/`schema.js` | hangen aan het interne datamodel |

`fasebalans.js` hoort **niet** in het paspoortpakket: daar zitten Nederlandse normkeuzes in
(230 V, gelijktijdigheid 0,6, reserve 1,0 kW) en dat pakket moet normneutraal blijven.

---

## 8 · Waar het nu staat

| | Versie | Tests |
|---|---|---|
| YourWkb | **`v2026-09-19-B`**, live | 381 |
| Kastscan | **`v2026-09-19-B`**, live | 1275 |
| meterkastpaspoort | pakket **`v0.3.2`**, spec 0.3, live | 109 |

Sinds de vorige stand (12-09):

| Datum | Wat |
|---|---|
| 15-09 | Landing: blog in de navigatie, koppen in IBM Plex Sans (Syne kapte g/j/p af) |
| 18-09 | **Paspoort v0.3.0**: samenvoegen, afkappen ≤ 105 modules, `log[].zeg`. YourWkb `-18-A` en Kastscan nemen de historie van de voorganger mee. |
| 18-09 | Kastscan: **bestaande sticker inlezen** (camera of plakveld), waarschuwing bij een ander adres |
| 18-09 | YourWkb `-18-B`: **`log[].erk`** via de uitgever in het profiel; QR-opbouw naar `mkp-qr.js` met terugleestest; **fix: eerste scan viel terug naar het startscherm**; **nieuw voorbeeldrapport** (html + pdf) met werkende QR op de landing |
| 19-09 | **Pakket v0.3.1**: controlefuncties, vaste beheerderssleutel, lijsten op www; **nieuwe sleutel, index opnieuw getekend**; lezer rekent met `mkp.js` |
| 19-09 | YourWkb `-19-A` en Kastscan `-19-A`: **de paspoortweergave** — terugroepmeldingen, materiaal, erkenning, zegels, handtekeningen |
| 19-09 | **Pakket v0.3.2**: materiaal per toestel samenvoegen, verwijzingen opruimen na afkappen. **Kastscan `-19-B` schrijft zelf `mat[]`** |
| 19-09 | Vooronderzoek **Techniek Nederland** (Sticker Gecontroleerd, landschap, AVIC t.o.v. Wkb en BW) + demo-sticker 2027 met QR |
| 19-09 | YourWkb `-19-B`: **TloKB weg als uitgever**; CO-certificaat (Kiwa/andere) als eigen profielveld, bij cv in de logregel en in het rapport. Specvoorbeeld `tlokb:…` → `kiwa:K0213477` |

---

## 9 · Besluiten die nu vastliggen

| Vraag | Besluit | Waar |
|---|---|---|
| Per fase of over het totaal? | **Per fase**; totaaltoets als vangnet; strengste wint. | `belastingcheck` |
| Telt teruglevering mee? | **Ja, maar telt niet óp** — per fase de zwaarste van twee richtingen. | `belastingPerFase` |
| Gelijktijdigheid op teruglevering? | **Nee.** | `belastingPerFase` |
| Gelijktijdigheid op een nieuw apparaat bij een gemeten basis? | **Ja.** | `faseAdvies` |
| Batterij: één regel of twee? | **Twee** (`voed` en `af`). | `batterijRegels` |
| Driefaseapparaat: beste fase? | **Geen advies.** | `faseAdvies` |
| Grens van de QR | **Maximaal 105 modules** (18-09). | `QR_MODULES_GRENS` |
| Erkenning zonder uitgever? | **Niet schrijven.** | `erkVanProfiel` |
| Beheerderssleutel | **Vast in de code, vervangen 19-09, alleen Martin tekent.** | `MKP_WORTEL_SLEUTEL`, `onderteken-index.mjs` |
| Welke erk in de logregel? | **Per klus:** cv → CO-certificaat (wettelijke bevoegdheid), anders de erkenning. Eén `erk` per regel. | `erkVoorKlus` |
| Materiaal zonder fabrikant én type? | **Niet schrijven** — kan nergens op treffen en maakt de QR groter. | `mkpMateriaal` (Kastscan) |
| Ander toestel op dezelfde plaats bij hergebruik? | **Oude regel vervalt**; een toestel dat de app niet ziet blijft staan. | `mkpSamenvoegen` |

---

## 10 · Bekende scheuren — hier zou ik als eerste kijken

### 10a · Kastscan staat uit de pas met twee normbesluiten van 12-09 ⚠️ *(nog open)*

- `INDICATIEF_KW["zonnepanelen"] = -3.0` in `components/kastscan/model.js` — teruglevering
  als *negatieve* belasting. Het besluit: positief, en nooit optellen bij de afname.
- **De batterij is er één regel**, geen twee.

Dezelfde kast kan daardoor in Kastscan een ander oordeel geven dan in YourWkb.

### 10b · `MKP_SPEC_VERSIE` staat twee keer *(afgedekt)*

Kastscans `model.js` declareert hem zelf, omdat dat bestand geen imports mag hebben; een
test bewaakt dat hij gelijk blijft aan het pakket. Geen actie nodig zolang die test bestaat.

### 10c · `WkbApp.jsx` groeit: 6644 regels

`genereerRapport` (~900 regels HTML) en `MkpViewer` zitten er nog in en zijn ongetest.
Kandidaten voor `components/wkb/rapport.js` en een eigen viewercomponent.

### 10d · De conformverklaring is juridisch ongetoetst

*"Deze verklaring strekt zich niet uit tot dat punt"* verdient Martins toets vóór het bij een
klant op de mat ligt.

### 10e · Feeds van echte fabrikanten komen er nog niet vanzelf in

De index verwijst naar `https://<domein>/.well-known/meterkastpaspoort-veldnotities.json`.
- **YourWkb** haalt ze op, maar `connect-src` noemt alleen www.meterkastpaspoort.nl. Zolang
  de CSP Report-Only is werkt het; vóór afdwingen moeten de domeinen erbij (of een vaste lijst).
- **Kastscan** kan ze niet ophalen zonder per fabrikant een rewrite; een algemene
  doorgeefroute zou een open proxy zijn.
- Nu bestaat er alleen de demo-feed; `voorbeeldelektro.nl` bestaat niet.
- Leerpunt van 19-09: **het kale domein meterkastpaspoort.nl stuurt met een 308 door, en die
  doorverwijzing draagt geen CORS-kop.** Alles wat een browser ophaalt moet rechtstreeks op www.

### 10f · `mkp-bronnen.js` bestaat twee keer

Klein en bijna gelijk, maar met andere adressen (www vs `/mkp/…`) en een andere
opslagsleutel. Kandidaat voor het pakket als `mkpHaalBronnen({ urls, opslag })` — het is
geen normkeuze en geen app-datamodel.

### 10g · Terugroepmeldingen treffen alleen op fabrikant + type *(deels opgelost)*

**Opgelost 19-09:** Kastscan schrijft zelf `mat[]`. **Nog open:** Kastscan leest geen
artikelnummer of productiecode van het typeplaatje. Een melding treft dan alleen op
fabrikant + type ("mogelijk van toepassing"), en het type moet exact gelezen zijn. YourWkb
schrijft nog geen `mat[]`. Zie draad ① in §11.

### 10h · Kleinere punten

- ~~Erkenningsnummer verplicht voor een cv-monteur zonder InstallQ-erkenning~~ — **opgelost
  `v2026-09-19-C`**: in de cv-flow volstaat het erkenningsnummer óf het CO-certificaat.
- Van certificerende instellingen naast Kiwa kennen we geen code; "Andere CI" schrijft daarom
  niets in het paspoort. Het cv-rapport met CO-certificaat is nog niet in de browser gezien.
- InstallQ's `opzoek` in de index is de voorpagina van echteinstallateur.nl, niet het nummer.
- De landing heeft een al langer bestaande hydration-fout in de console.
- Open normvragen voor Martin: isolatieweerstand bij een **nieuwe** installatie (≥ 1,0 MΩ bij
  500 V volgens het marketingontwerp, de app toetst overal ≥ 0,23 MΩ) en de bron van
  "certificaten ≥ 5 jaar bewaard (TD17)" in het voorbeeldrapport.
- Het voorbeeldrapport op de landing en de demo-sticker op de landing zijn twee verschillende
  demo's op hetzelfde adres (2801 AB 12) met andere installaties.

---

## 11 · Waar je verder kunt

**① Artikelnummer en productiecode van het typeplaatje** *(maakt terugroepmeldingen scherp)*
`mat[]` schrijven is gedaan (Kastscan, 19-09). Wat ontbreekt is `art` en `pd`: de
beeldherkenning laten uitlezen wat op het typeplaatje staat, vooral bij aardlekschakelaars.
Raakt de prompt van R3a. Let op de 105-modulegrens; flow-regel: vooringevuld, niet verplicht.

**② Kastscan gelijktrekken** — 10a oplossen; beter nog: `fasebalans.js` gebruiken in plaats
van een eigen `faseBalans`.

**③ Echte uitgevers aansluiten** — InstallQ (erkenningsverklaring, `opzoek` met `{nummer}`),
een eerste fabrikant met een feed. Per uitgever: publieke sleutel in de index → Martin
tekent → CSP (YourWkb) en rewrite (Kastscan) bijwerken (10e).

**④ R4 — normcheck-kern** *(de enige release die op niets wacht)* — grenswaarden
harmoniseren, Z-max per karakteristiek, PV's 0,5 Ω-toets, dan IB22, meetmiddelregistratie,
SCIOS-ready export. Neem de isolatievraag uit 10h mee.

**⑤ P1-meting fase 1** — `faseBalans` accepteert al `meting: {L1,L2,L3}`; `basisbelastingKw`
neemt nog één totale piek. Vier randvoorwaarden vóór een serverkant: verwerkersovereenkomst,
privacyteksten, Upstash in de EU, Vercel van hobby af.

**⑥ Veldtest** — langs Maurits en Herman: de fasetoets, de conformverklaring, de Fasecheck,
en nu ook het inlezen van een bestaande sticker en de paspoortweergave.

**⑦ Techniek Nederland** — pitch klaar: vooronderzoek (pdf) en demo-sticker 2027 in Drive ›
Meterkastpaspoort › Partijen › TechniekNederland. Sterkste punten: een ondertekende QR op de
jaarsticker, en dat de AVIC (2016) niet is bijgewerkt na de Wkb — YourWkb levert het dossier
(7:757a) en de schriftelijke waarschuwing (7:754 lid 2) die de voorwaarden niet regelen. Open:
controleert TN het certificaatnummer; wat dekt de ventilatie/koelingssticker; aanspreekpunt.

**Geblokkeerd:** R2 (systeemprompt fototest-kalibratie) en R3a (Kastscan-featurespec).

---

## 12 · Startritueel voor een volgende sessie

```bash
cd ~/projects/yourwkb && git pull origin main && npm test          # 381 groen
cd ~/projects/kastscan && git pull origin main && node tests/test.js # 1275 groen
cd ~/projects/meterkastpaspoort && git pull origin main && npm test  # 109 groen
```

Lees `CLAUDE.md` → dit document → `docs/YourWkb-releaseplan-checklist.md`.
Vóór elke commit `npx next build`, en **kijk in de draaiende app** — runtimefouten komen
langs build én tests heen.

Dev-servers staan in `.claude/launch.json` van YourWkb (lokaal, niet in git):
`yourwkb-dev` (3010), `kastscan-dev` (3020, app op `/app`), `mkp-site` (3030, statische
server voor de spec-site en `lezer.html`).

Testpaspoort met alles erin (handtekening, erkenning, zegel, materiaal in de terugroepreeks):
de QR op `demo-qr-sticker-lezer.png` (Drive › Meterkastpaspoort). Het fragment staat ook als
`DEMO_FRAG` in `meterkastpaspoort/tests/test-formaat.js`.

⚠️ De service worker op `localhost` serveert hardnekkig een oude `/app`. Ziet het scherm er
onveranderd uit terwijl de code iets anders zegt: service worker unregistreren en caches legen
vóór je je eigen code gaat verdenken. En test een scan altijd ook als **eerste bezoek**.

---

## 13 · Het erkenningslandschap in één tabel

| Wat | Uitgever (tekent / geeft nummer) | Openbaar te controleren via | In het paspoort |
|---|---|---|---|
| Erkenning (elektro, warmtepomp, PV …) | **InstallQ** | echteinstallateur.nl, CentraalRegisterTechniek.nl | `log[].erk = installq:<nr>` |
| CO-bedrijfscertificaat (Gasketelwet) | **certificerende instelling**, bv. Kiwa (BRL 6000-25 / BRL K25000 / NHK) | **TloKB-register** (co-vrijregister.nl → register.tlokb.nl/co) — op bedrijfsnaam/KVK; toont het nummer **niet** | bij cv-klussen `kiwa:<nr>` |
| Bewijs van Vakmanschap CO (persoon) | examen | Vakpaspoort (Centraal Register Techniek), persoonsgebonden QR | — |
| Lidmaatschap + Sticker Gecontroleerd | **Techniek Nederland** | ledenzoeker; de sticker zelf is papier, zonder QR | — (kandidaat voor een eigen verklaring) |
| Zegelrecht (meterkast) | erkenner, met nummerreeks | de ondertekende erkenningsverklaring | `log[].zeg` |
| Terugroepmeldingen | **fabrikant** (feed, ondertekend) | index op meterkastpaspoort.nl | vergeleken met `mat[]` |

Consumentenbescherming zit **niet** in de erkenning maar in het lidmaatschap: AVIC-voorwaarden,
Geschillencommissie en de nakomingsgarantie van Techniek Nederland (€ 5.500 per bindend advies).
De AVIC dateert van 1 maart 2016 en regelt het opleverdossier (7:757a) en de schriftelijke
waarschuwing (7:754 lid 2) van de Wkb niet — details in het TN-vooronderzoek, §8.
