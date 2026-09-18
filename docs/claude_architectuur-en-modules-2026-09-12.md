# YourWkb · Kastscan · Meterkastpaspoort — architectuur, modules en waar je verder kunt

*Stand 12-09-2026. Tussentijds ontwikkeldocument.*

**Lees dit ná `CLAUDE.md`.** CLAUDE.md zegt wát er moet gebeuren en volgens welke regels;
dit document zegt **wat waar staat, waarom het daar staat, en waar de scheuren zitten**.
Het is geschreven om een volgende sessie in één keer op snelheid te brengen zonder drie
repo's te hoeven uitpluizen.

Het vult `claude_kastscan-yourwkb-inventarisatie.md` (11-09) aan. Dat document beschrijft
de situatie *vóór* de ontvlechting en stelde de normvragen; dit beschrijft de situatie
*erna*. De normvragen daaruit zijn op 11 en 12-09 beantwoord — zie §9.

---

## 0 · De kaart

```
                    ┌──────────────────────────────────────────┐
                    │   meterkastpaspoort  (eigen repo, tag)   │
                    │   HET FORMAAT — normneutraal             │
                    │   mkp.js · spec-site · referentielezer   │
                    │   /p → yourwkb.nl/app  (QR-redirect)     │
                    └────────────┬──────────────┬──────────────┘
                                 │  npm-dependency, gepind op v0.3.0
                     ┌───────────┘              └───────────┐
                     ▼                                      ▼
        ┌────────────────────────┐              ┌────────────────────────┐
        │        YourWkb         │              │        Kastscan        │
        │   opleverrapporten     │              │  foto → gelabelde kast │
        │                        │              │                        │
        │  components/wkb/       │              │  components/kastscan/  │
        │    model.js            │◀── namen ───▶│    model.js            │
        │    fasebalans.js       │   kleuren    │    labels.js           │
        │    mkp-bouw.js         │   normregels │    render.js           │
        │    veilig.js           │              │    documenten.js       │
        │  WkbApp.jsx (schermen) │              │  KastscanApp.jsx       │
        └────────────────────────┘              └────────────────────────┘
             333 tests groen                         1107 tests groen
                     │                                      │
                     └──────────────┬───────────────────────┘
                                    ▼
                        dezelfde QR op dezelfde kastdeur
```

**De pijlrichting is de kern.** Beide apps hangen aan het paspoort; het paspoort hangt
nergens aan. Zodra iets in het pakket app-specifiek wordt, staat de standaard niet meer
los van zijn gebruikers en is de architectuur stuk.

---

## 1 · De drie repo's

| Repo | Wat het is | Hosting | Afhankelijk van |
|---|---|---|---|
| **`mschut64/meterkastpaspoort`** | De open standaard: formaat, specificatie, referentielezer, QR-redirect. CC BY 4.0. | Vercel, statisch — **geen buildscript** | niets |
| **`mschut64/yourwkb`** | Wkb-opleverrapporten, zes disciplines, PWA. Repo is **publiek**. | Vercel, auto-deploy op `main` | meterkastpaspoort `v0.3.0` |
| **`~/projects/kastscan`** | Van foto naar gelabelde groepenkast. De foto vult in, de installateur bevestigt. | eigen Vercel-project | meterkastpaspoort `v0.3.0` |

**Waarom het pakket geen buildscript mag krijgen:** die site draagt de redirects
`/p` en `/p/:rest*` → `yourwkb.nl/app` waar **elke QR-sticker in het veld** van afhangt.
Een buildstap die stukloopt, maakt alle stickers dood. Na elke wijziging daar: controleer
dat `/p` nog 307 geeft.

**Waarom de dependency op een tag staat en niet op een branch:**

```json
"meterkastpaspoort": "https://github.com/mschut64/meterkastpaspoort/archive/refs/tags/v0.3.0.tar.gz"
```

Een push naar de spec-repo verandert daarmee niet stilzwijgend wat er in de apps zit; een
nieuwe versie van de standaard vraagt een bewuste bump in beide apps. (`github:user/repo`
werkt niet: npm schrijft dat in de lockfile om naar `git+ssh`, en een buildmachine heeft
geen SSH-sleutel.)

---

## 2 · Het gedeelde hart: `meterkastpaspoort`

`mkp.js` — 125 regels, negen exports:

| Export | Doet |
|---|---|
| `MKP_BASIS`, `MKP_SPEC_VERSIE` | het lege paspoort en de spec-versie (nu `2`) |
| `eanValide` | EAN-18 controlecijfer (GS1 modulo-10) |
| `mkpEncode` / `mkpDecode` | JSON ⇄ `deflate-raw` ⇄ base64url |
| `mkpUrl` | `meterkastpaspoort.nl/p#<payload>` — data in het **fragment** |
| `mkpSamenvatting` | leesbare samenvatting voor een UI |
| `QR_TEKENS_GRENS`, `qrWaarschuwing` | leesbaarheidsgrens van de QR |

**Wat er bewust NIET in zit:** `mkpBouw`. Dat vertaalt de gegevens van één app naar het
formaat, en die datamodellen verschillen fundamenteel — Kastscan denkt in modules op een
DIN-rail, YourWkb in aardlekgroepen met eindgroepen. *De standaard is het formaat, niet de
weg ernaartoe.*

**Het veld dat het vaakst misgaat — `fn`.** Spec v0.2 §4.4:

- `f` = **aantal** fasen: `1` of `3`
- `fn` = **lijst fasenummers**: `[1]`, `[2]`, `[3]` of `[1,2,3]`

Beide apps schreven ooit `fase: "L2"`. Dat veld bestaat in geen enkele versie van de
standaard en de referentielezer kent het niet. Sinds 11-09 schrijven beide `fn`.
**Regel: baseer je op de gepubliceerde spec, niet op wat de zusterapp schrijft.**

---

## 3 · YourWkb — modules

| Bestand | Regels | Wat | Getest door | Deelbaar? |
|---|---:|---|---|---|
| `components/wkb/model.js` | 515 | **De rekenkern.** Grenswaarden, cross-checks, belastingcheck, belasting per fase. | `tests/test.js` (151) | deels — normkeuzes zijn NL |
| `components/wkb/fasebalans.js` | 186 | Belasting per fase + `faseAdvies` (waar past een nieuw apparaat). | `tests/test-fasebalans.js` (75) | **ja, met opzet** |
| `components/wkb/mkp-bouw.js` | 188 | Vertaling app-gegevens → paspoort. | `tests/test-mkp.js` (61) | nee — app-specifiek |
| `components/wkb/veilig.js` | 92 | `esc`, `saneerWaarde/Project/Import` uit de security-audit. | `tests/test-veilig.js` (46) | ja |
| `components/WkbApp.jsx` | 6431 | **Alle schermen.** Bevat ook `genereerRapport`. | — *(ongetest, per definitie)* | nee |

**Totaal: 333 tests, `npm test`.**

### De lagenregel

> **Normlogica hoort in `model.js`, niet in `WkbApp.jsx`.**

Alles in `WkbApp.jsx` is ongetest omdat het niet te importeren is. Dat is precies waarom
`esc()` en `saneerProject` — code uít een beveiligingsaudit — tot 11-09 geen enkele test
hadden. Zit er een grenswaarde, een factor of een oordeel in je nieuwe code, dan hoort dat
in `model.js` of `fasebalans.js` met een test ernaast. In `WkbApp.jsx` staat alleen opmaak.

### Belangrijkste exports van `model.js`

```
toNum · GG_TABEL · GG_IN_WAARDEN · ggIaVoorTijd
GROTE_VERBRUIKERS_MKP · GELIJKTIJDIGHEID (0,6) · GROOT_STANDAARD_KW
isGroteVerbruikerMkp · groepVermogenKw · FASE_RESERVE_KW (1,0)
FASEN · FASE_KLEUR · fasenVanGroep · belastingPerFase
periodeLabel · basisbelastingKw · belastingcheck
gkCrossChecks · pvCrossChecks
```

`belastingPerFase` is de **enige** optelling van een installatie per fase. Zowel
`belastingcheck` als `faseBalans` leunen erop. Twee optellingen van dezelfde kast lopen
vroeg of laat uiteen — dat is letterlijk wat er tussen deze twee apps gebeurd is.

### `⚠️ .js-extensies verplicht`

Binnen `components/wkb/` moeten imports een expliciete `.js` hebben. Webpack vindt het
bestand ook zonder, **Node niet** — en de tests draaien op Node.

---

## 4 · Kastscan — wat er ligt

| Bestand | Regels | Wat |
|---|---:|---|
| `components/kastscan/model.js` | 2023 | 103 exports. Het complete fase-apparaat, indeling, controles. |
| `components/kastscan/labels.js` | 925 | Labelgeneratie voor de meterkast |
| `components/kastscan/render.js` | 570 | Tekenen van de kast |
| `components/kastscan/documenten.js` | 560 | Groepenoverzicht en stickers op papier |
| `components/kastscan/leerlus.js` | 452 | Correctielog — de beeldherkenning leert van correcties |
| `components/kastscan/mkp.js` | 60 | Re-export van het pakket + QR als afbeelding/raster |
| `components/KastscanApp.jsx` | 2563 | Schermen |

**1107 tests groen.** Kastscan is de modulair volwassen van de twee: ESM, kleine bestanden,
alles importeerbaar. YourWkb groeit die kant op maar heeft nog één bestand van 6431 regels.

**Wat 1-op-1 naar YourWkb zou kunnen** zodra er vraag naar is: het groepenoverzicht,
de labels, en `render.js`. Die hangen aan Kastscans eigen datamodel (posities op een
DIN-rail), dus dat vraagt een vertaallaag — of, beter, dat ze net als `fasebalans.js` op de
paspoort-`grp[]` worden gevormd.

---

## 5 · Hoe ze samenwerken — drie ketens

### A · Een paspoort schrijven

```
app-gegevens ──▶ mkp-bouw.js        ──▶ meterkastpaspoort ──▶ QR-sticker
(aardlekgroepen,     eigenApparaatRegels     mkpEncode          op de kastdeur
 eindgroepen,        batterijRegels          mkpUrl
 fc.gekozen)         belastingcheck → p.chk
```

Elke app heeft zijn eigen `mkpBouw`; het formaat en de codering zijn gedeeld.

### B · Een paspoort lezen

```
QR scannen ──▶ /p#payload ──▶ redirect ──▶ yourwkb.nl/app ──▶ mkpDecode ──▶ data.mkpImport
                                            (fragment reist mee)
```

`data.mkpImport.grp` voedt vervolgens de Fasecheck **zonder dat de installateur iets
invult**. Dat is de enige plek waar een feature de flow korter maakt in plaats van langer.

### C · De Fasecheck-keten (compleet sinds 12-09)

```
grp[] + ha ──▶ belastingPerFase ──▶ faseBalans ──▶ faseAdvies
  (paspoort)     (model.js)          (bars in app    (waar past het
                                      + rapport)      nieuwe apparaat)
                       │                    │               │
                       ▼                    ▼               ▼
                belastingcheck        rapporthoofdstuk   fc.gekozen
                  → p.chk             "Belasting          → fn in het
                                       per fase"            paspoort
```

De cirkel is rond: de gekozen fase gaat het paspoort in, en is daarmee de **invoer voor de
fasebalans van de volgende installateur**.

---

## 6 · De regels die dit bij elkaar houden

1. **Eén feit, één definitie.** Twee berekeningen van hetzelfde lopen uiteen — gegarandeerd.
   Dit is vandaag drie keer misgegaan: `belastingcheck` vs `faseBalans` (opgelost via
   `belastingPerFase`), de voorvertoning van het eigen apparaat vs `mkpBouw` (opgelost via
   `eigenApparaatRegels`), en de fasekleuren app vs Kastscan (opgelost via `FASE_KLEUR`).
2. **Bouw nooit na wat `mkp-bouw.js` al schrijft.** Voorvertoningen halen hun regels
   daarvandaan; een test bewaakt dat ze gelijk blijven.
3. **De spec is de baas, niet de zusterapp.** Zie `fn`.
4. **Normlogica in `model.js`**, opmaak in `WkbApp.jsx`.
5. **De flow-regel gaat vóór het releaseplan.** De Fasecheck heet daar een "optionele stap";
   als scherm zou hij de flow verlengen, dus is het een dichtgeklapt blok geworden.
6. **Een gegokte fase is schadelijker dan een ontbrekende** — het advies van de volgende
   bouwt erop voort. Daarom schrijft `fcFase` alleen wat de installateur écht koos.
7. **Het rapport mag zichzelf niet tegenspreken.** De conformverklaring beweegt mee met de
   bevindingen; onvoorwaardelijke claims horen niet in een disciplinetekst.

---

## 7 · Gedeeld, deelbaar, en van één app

| | Wat | Waarom |
|---|---|---|
| **Gedeeld (nu)** | het paspoortformaat, `FASE_KLEUR` | één standaard, één kleurtaal |
| **Deelbaar (klaar, wacht op afnemer)** | `fasebalans.js`, `veilig.js` | gevormd op de paspoort-`grp[]`, dus zonder vertaallaag bruikbaar |
| **Van één app** | `mkp-bouw.js`, alle schermen, Kastscans `labels.js`/`render.js` | hangen aan het interne datamodel |

`fasebalans.js` verhuist naar een eigen gedeeld pakket zodra Kastscan hem gebruikt. Dat is
dan een bestandsverplaatsing, geen herschrijving — de vorm is er al op gemaakt. Hij hoort
**niet** in het paspoort-pakket: daar zitten Nederlandse normkeuzes in (230 V,
gelijktijdigheid 0,6 uit NEN-EN-IEC 61439, de reserve van 1,0 kW) en dat pakket moet
normneutraal blijven.

---

## 8 · Waar het nu staat

**YourWkb `v2026-09-12-G`**, live, 333 tests. R3b (Fasecheck v1) is code-compleet.

Wat er vandaag en gisteren bij kwam, in volgorde:

| | |
|---|---|
| `09-11-A` | `basisbelastingKw` kent `bron: geschat \| gemeten` |
| `09-11-B` | fasebalans zichtbaar in de paspoortstap |
| `09-11-C` | **belastingcheck toetst per fase** (was: over het totaal) |
| `09-12-A` | **teruglevering telt mee, maar telt niet op** — zwaarste van twee richtingen |
| `09-12-B` | thuisbatterij als twee paspoortregels (laden én ontladen) |
| `09-12-C` | ampèrekeuzes als raster; één definitie van het eigen apparaat |
| `09-12-D` | fasebalans in het rapport |
| `09-12-E` | balken zoals Kastscan; conformverklaring beweegt mee met de bevindingen |
| `09-12-F` | optionele Fasecheck in de apparaatstap van bat/lp/wp/pv |
| `09-12-G` | op één fase vervalt de verdeling |

---

## 9 · Normbesluiten die nu vastliggen

Deze stonden open in de inventarisatie van 11-09 en zijn door Martin beslist. Ze zitten in
code **mét tests**, zodat ze niet stil kunnen wegzakken.

| Vraag | Besluit | Waar |
|---|---|---|
| Per fase of over het totaal? | **Per fase**, net als Kastscan. Totaaltoets blijft als vangnet voor groepen zonder fase; strengste wint. | `belastingcheck` |
| Telt teruglevering mee? | **Ja, maar telt niet óp.** Stroom is stroom, maar eigengebruik passeert de hoofdzekering niet. Per fase de zwaarste van twee richtingen. | `belastingPerFase` |
| Gelijktijdigheid op teruglevering? | **Nee.** Spec § kam: "de som van de voedende groepen". De zon schijnt op alle panelen tegelijk. | `belastingPerFase` |
| Gelijktijdigheid op een nieuw apparaat bij een gemeten basis? | **Ja.** Dat apparaat zat niet in de meting. | `faseAdvies` |
| Batterij: één regel of twee? | **Twee** — `voed` (ontladen) en `af` (laden), spec §4.4. | `batterijRegels` |
| Driefaseapparaat: beste fase? | **Geen advies.** Het verdeelt zich; een advies waar geen keuze is, is misleidend. | `faseAdvies` |

---

## 10 · Bekende scheuren — hier zou ik als eerste kijken

### 10a · Kastscan staat uit de pas met twee besluiten van 12-09 ⚠️

Dit is de belangrijkste. Kastscan is *niet* meegegaan met wat Martin gisteren en vandaag
besloot:

- **`INDICATIEF_KW["zonnepanelen"] = -3.0`** — teruglevering als *negatieve* belasting.
  Het besluit is: positief, en nooit optellen bij de afname. Dezelfde kast geeft daar dus
  een ander oordeel dan hier.
- **De batterij is er één regel**, geen twee. Een accu die sneller laadt dan ontlaadt komt
  in Kastscan te licht uit.

Kastscans `belastingcheck` toetst wél al per fase — dáár heeft YourWkb zich vandaag naar
gevoegd, niet andersom.

### 10b · `MKP_SPEC_VERSIE` staat twee keer

`components/kastscan/model.js:1875` declareert zijn eigen `MKP_SPEC_VERSIE = 2`, terwijl
het pakket dezelfde constante exporteert. Nu gelijk, maar precies het patroon dat uiteen
gaat lopen. Hij hoort uit het pakket te komen.

### 10c · `WkbApp.jsx` is terug op 6431 regels

Na de ontvlechting stond hij op ~5700; de Fasecheck, de balansweergave en het
rapporthoofdstuk brachten hem terug. De **normlogica** is er wel uit — dat was het doel —
maar `genereerRapport` (ruim 900 regels HTML-generatie) zit er nog in en is ongetest.
Kandidaat voor `components/wkb/rapport.js`.

### 10d · De conformverklaring is juridisch ongetoetst

De structuur is van mij, de formulering — met name *"deze verklaring strekt zich niet uit
tot dat punt"* — verdient Martins toets vóór het bij een klant op de mat ligt.

---

## 11 · Waar je verder kunt — vier draden

**① Kastscan gelijktrekken** *(geen blokkade, hoogste waarde)*
Breng 10a en 10b in orde. Beter nog: laat Kastscan `fasebalans.js` gebruiken in plaats van
zijn eigen `faseBalans`. Dan is er één per-fase-boekhouding voor beide apps en kan het
bestand naar een gedeeld pakket. Dit is de eerste echte test van "modules die elkaars werk
gebruiken".

**② R4 — normcheck-kern** *(de enige release die op niets wacht)*
Roadmap fase 1: grenswaarden harmoniseren over alle disciplines, fysica-vlag veld-vs-kast,
Z-max per automaatkarakteristiek, PV's vaste 0,5 Ω-toets herzien. Daarna IB22-classificatie,
meetmiddelregistratie, SCIOS-ready export.

**③ P1-meting fase 1** *(spec ligt klaar)*
`claude_p1-meting-featurespec.md` + `claude_fasecheck-v1-scope.md`. De dongle houdt de piek
per fase zelf bij (`/api/v2/stats` → `P1max/P2max/P3max`). `faseBalans` accepteert al een
`meting`-parameter met `{L1,L2,L3}` — dat pad is gebouwd en getest, maar er komt nog niets
in. **Let op:** `basisbelastingKw` neemt nog één totale `piekKw` en geen faseverdeling; dat
is de plek waar de aansluiting gemaakt moet worden.
*Vier randvoorwaarden vóór productie* (doorgeefluik = serverkant): verwerkersovereenkomst,
privacyteksten bijwerken, Upstash in de EU, Vercel-plan van hobby af.

**④ Veldtest R3b**
Langs Maurits en Herman. Drie dingen die zij als eerste zouden moeten zien: de omslag van
groen naar rood door de fasetoets, de nieuwe conformverklaring, en of ze de Fasecheck
vinden waar hij staat.

**Geblokkeerd, niet aan beginnen:** R2 (wacht op de systeemprompt uit de
fototest-kalibratie) en R3a (Kastscan-featurespec ligt niet in de repo).

---

## 12 · Startritueel voor een volgende sessie

```bash
cd ~/projects/yourwkb && git pull origin main
npm test        # moet 333 groen geven
```

Lees `CLAUDE.md` → dit document → `docs/YourWkb-releaseplan-checklist.md`.
Vóór elke commit `npx next build`, en **kijk in de draaiende app** — de runtimefouten van
deze week (scope-fouten, een constante uit de functie ernaast, een stale service worker)
kwamen alle drie langs build én tests heen en bleken pas in de browser.

```bash
# dev-server, config staat in .claude/launch.json
npx next dev -p 3010
```

⚠️ De service worker op `localhost` serveert hardnekkig een oude `/app`. Ziet het scherm er
onveranderd uit terwijl de rekenkern al iets anders zegt: service worker unregistreren en
caches legen vóór je je eigen code gaat verdenken.
