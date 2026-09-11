# Kastscan ↔ YourWkb — inventarisatie voor hergebruik

*Opgesteld 11-09-2026. Aanleiding: de modules van Kastscan zijn zo gebouwd dat delen 1-op-1 naar de YourWkb-app moeten kunnen. Deze inventarisatie legt vast wat er al is, wat botst, en wat er eerst besloten moet worden.*

> **Vooraf.** Ik kende Kastscan niet toen ik op 11-09 aan de Fasecheck begon. Niets in `CLAUDE.md`, de roadmap of het releaseplan wijst naar `~/projects/kastscan`; het enige spoor was één commentaarregel in onze eigen belastingcheck. Een deel van wat ik die dag bouwde heeft daardoor eigen namen gekregen voor dingen die daar al bestaan. Dit document is de correctie daarop.

---

## Wat Kastscan is

| | Kastscan | YourWkb |
|---|---|---|
| Opbouw | **modulair ESM** — `components/kastscan/*.js` | **één bestand** — `components/WkbApp.jsx` |
| Rekenkern | `model.js`, 2016 regels, **103 exports** | verspreid door `WkbApp.jsx` |
| Tests | **1104 groen** | 128 groen |
| Testopzet | importeert de modules rechtstreeks | Babel-extractie van top-level declaraties |
| MKP-spec | **versie 2** | versie 1 |

`model.js` bevat een compleet fase-apparaat: `FASEN`, `faseBalans`, `faseCapaciteitKw`, `FASE_RESERVE_KW`, `cycleFase`, `magEigenFase`, `zetFaseBlok`, `zetFasePositie`, `isMeerpolig`, `indicatiefVermogen`, `FASE_KLEUR`, `FASE_PATROON` — plus `kruiscontrole`, `signalen`, `gedeeldeNulKandidaten` en de hele labelmotor.

---

## 1 · Het structurele obstakel

**Kastscan is modulair, YourWkb is één bestand.** `CLAUDE.md` noemt dat expliciet een keuze: *"de héle app (~5700 regels, één bestand, bewust)"*.

Zolang dat zo blijft, kan er niets 1-op-1 over. Code uit `model.js` kopiëren naar `WkbApp.jsx` betekent: de `export`-regels strippen, de functie in het grote bestand plakken, en vanaf dat moment twee kopieën onderhouden die stilletjes uit elkaar lopen. Dat is precies wat er met de belastingcheck al gebeurd is — zie punt 3.

Daar komt bij dat `tests/extract-logica.js` werkt op top-level declaraties in `WkbApp.jsx`. Stapt YourWkb over op modules, dan verandert die extractor mee (of vervalt hij, want dan kun je gewoon importeren zoals Kastscan doet).

**Dit is de beslissing die alle andere bepaalt.** Drie routes:

| Route | Wat het kost | Wat het oplevert |
|---|---|---|
| **A — YourWkb modulariseren** | `WkbApp.jsx` opsplitsen, extractor herzien; groot en risicovol | echte 1-op-1-overdracht, één bron per rekenregel |
| **B — Gedeeld pakket** | een derde repo of workspace waar beide uit importeren | zelfde winst, maar twee repo's moeten meebewegen |
| **C — Blijven kopiëren** | niets nu | elke gedeelde regel bestaat twee keer; divergentie is een kwestie van tijd |

Route C is wat er nu feitelijk gebeurt.

---

## 2 · Namen die verschillen voor hetzelfde begrip

| Kastscan | YourWkb | Opmerking |
|---|---|---|
| `FASE_RESERVE_KW` = 1.0 | `RESERVE_KW` = 1.0 | **door mij bedacht op 11-09** — hernoemen |
| `komma(waarde, decimalen)` | `.replace(".",",")` op 31 plekken + lokale `kom()` | **door mij bedacht** — vervangen door de Kastscan-vorm |
| `faseCapaciteitKw(hoofd)` | inline `(fasen * a * 230)/1000` | let op: Kastscan rekent **per fase**, wij totaal |
| `positie.fase` = `"L1"\|"L2"\|"L3"` | `aardlekgroep.L` = idem | **door mij bedacht** — zie punt 4 |
| `isMeerpolig(positie)` | `aardlekgroep.fase` = `"1"\|"3"` | Kastscan leidt af, wij slaan op |
| `GROTE_VERBRUIKERS` = volledige namen | `GROTE_VERBRUIKERS_MKP` = MKP-codes | `["laadpaal",…]` vs `["lp","wp","kook","bat"]` |
| `GELIJKTIJDIGHEID` = 0.6 | idem | ✅ gelijk |
| `toNum` | idem | ✅ gelijk |

---

## 3 · Namen die gelijk zijn maar iets anders betekenen — het gevaarlijke deel

### `belastingcheck` rekent niet hetzelfde

Beide heten zo, beide geven `{ r, d }` met `r` uit `"groen"|"oranje"|"rood"`. Maar:

- **Kastscan** roept `faseBalans` aan en neemt de **zwaarst belaste fase**. Capaciteit is `A × 230 V` per fase.
- **YourWkb** telt alle groepen op en toetst tegen de **hele aansluiting**: `fasen × A × 230 V`.

Een 3×25 A-kast met 11 kW op L2 en niets op L1 en L3 komt bij Kastscan op **rood** uit en bij YourWkb op **groen**. Zelfde veldnaam in hetzelfde paspoort, tegengestelde uitkomst.

Dat is geen fout van een van beide — YourWkb *kán* niet per fase rekenen, want daar draagt een groep alleen `f: 1|3`. Maar zolang het verschil niet ergens staat, is `p.chk` uit een paspoort niet te vertrouwen zonder te weten welke app hem schreef.

### Het paspoort is niet dezelfde versie

- Kastscan: `MKP_SPEC_VERSIE = 2`, en schrijft **`grp[].fase`** met L1/L2/L3.
- YourWkb: `MKP_SPEC_VERSIE = 1`, schrijft die fase **niet**.

Kastscans commentaar bij dat veld:

> *"v0.2: fase per apparaat. Alleen meesturen als hij is gekoppeld — een gegokte fase is schadelijker dan een ontbrekende."*

Dat is woordelijk dezelfde regel die ik op 11-09 onafhankelijk in de YourWkb-UI heb gezet. Goed nieuws voor de redenering, slecht nieuws voor de naam: **het veld heet `fase`, niet `L`.**

---

## 3b · Drie antwoorden op dezelfde normvraag

Uit `Ideeen/YourWkb-voorstel-belastingcheck-QR-paspoort.md` (augustus, ter bespreking met Maurits en Herman) blijkt dat twee grenswaarden nooit zijn dichtgetimmerd — en de twee apps hebben ze inmiddels verschillend ingevuld.

### Telt PV mee als belasting?

| Bron | Antwoord |
|---|---|
| Het voorstel | *"PV/batterij: teruglevering geldt óók als belasting van de aansluiting (omvormervermogen telt mee)"* → **positief** |
| Kastscan | `INDICATIEF_KW["zonnepanelen"] = -3.0` → **negatief** |
| YourWkb | voedende groepen worden overgeslagen: *"het slechtste geval is geen zon en een lege accu"* → **nul** |

Drie verschillende antwoorden in één project. Fysiek is verdedigbaar dat teruglevering de hoofdzekering wél belast — de stroom loopt er doorheen, richting daargelaten. Het ongunstigste geval is dan óf maximale afname zonder zon (wat YourWkb aanneemt) óf maximale teruglevering zonder verbruik (wat geen van drieën toetst). **Dit is een normvraag voor Martin, niet iets om in code te beslissen.**

### Gelijktijdigheid: welke factor, en per fase of over het totaal?

Vraag 9 uit het voorstel staat er nog onbeantwoord:

> *"Gelijktijdigheidsfactoren zonder load balancer: kloppen 0,8 standaard en 0,6 boven 4,5 kW met wat jullie hanteren, en per fase of over het totaal toegepast?"*

Wat er sindsdien is gebeurd:

- `CLAUDE.md` §6 legt vast: **0,6**, richtlijn NEN-EN-IEC 61439. De 0,8-variant uit het voorstel lijkt daarmee vervallen.
- Beide apps gebruiken 0,6 over vier benoemde grote verbruikers ✅
- Maar **"per fase of over het totaal" is nooit beantwoord** — en dáár lopen ze uiteen: Kastscan past hem per fase toe, YourWkb over het totaal.

De drempels zijn wél gelijk in beide: `> 1` rood/afwijking, `> 0,7` oranje/let-op.

---

## 4 · De knoop: `fase` betekent twee dingen

In Kastscan is `fase` **welke** fase (L1/L2/L3), en wordt *meerpolig* afgeleid uit de beveiliging.
In YourWkb is `fase` **hoeveel** fasen ("1" of "3"), opgeslagen per aardlekgroep.

Daardoor was `fase` bij ons bezet toen ik de echte fase wilde vastleggen, en heb ik er `L` van gemaakt. Dat is een tweede naam voor een begrip dat al een naam heeft, en het maakt overdracht onmogelijk zonder vertaalslag bij elke grens.

**Voorstel:** `fase` → `fasetype` in YourWkb, met migratie, zodat `fase` vrijkomt voor L1/L2/L3 zoals in Kastscan en in het paspoort.

Kosten: het veld staat in opgeslagen projecten op toestellen van installateurs en wordt op zeven plekken gelezen. Er is dus een migratie nodig bij het inlezen (`saneerProject` is daar de logische plek — die valideert al). Eenmalig werk, en daarna is het weg.

Ik heb dit op 10-09 nog weggewuifd met "hernoemen zou een migratie vragen voor niets". Dat oordeel klopte niet: er staat wél iets tegenover.

---

## 5 · Wat er 1-op-1 over zou kunnen, zodra de structuur het toelaat

Op volgorde van waarde:

1. **`faseBalans` + `faseCapaciteitKw` + `FASE_RESERVE_KW` + `indicatiefVermogen`** — de per-fase-boekhouding. Het commentaar in Kastscan zegt letterlijk dat dit de Fasecheck zijn invoer levert. Dit is precies wat R3b nodig heeft en wat ik anders opnieuw zou schrijven.
2. **`komma`** en `toNum` — triviaal, maar het scheelt 31 losse `.replace(".",",")` bij ons.
3. **`kruiscontrole` en `signalen`** — raakvlak met onze `gkCrossChecks`; apart vergelijken.
4. **`cycleFase` / `magEigenFase` / `zetFaseBlok` / `zetFasePositie`** — de invoerlogica voor het toekennen van fasen, inclusief de regel wanneer een groep een eigen fase mag hebben.
5. **`FASE_KLEUR` / `FASE_KLEUR_DIM` / `FASE_PATROON`** — zodat L2 in beide apps dezelfde kleur heeft.

---

## 6 · Wat dit betekent voor wat er op 11-09 is gebouwd

Niets hoeft weg, maar drie dingen moeten hernoemd voordat er meer op voortbouwt:

- [ ] `RESERVE_KW` → `FASE_RESERVE_KW`
- [ ] lokale `kom()` → `komma()` in Kastscans vorm
- [ ] veld `L` / `Lbron` → `fase` / `fasebron`, ná de hernoeming uit punt 4

`basisbelastingKw` met `bron: 'geschat' | 'gemeten'` is **wel** nieuw: Kastscan kent `indicatie` als woord, maar heeft geen bron-begrip en past de gelijktijdigheidsfactor onvoorwaardelijk toe. De regel dat die factor niet over een gemeten piek gaat, is dus aanwinst — en zou de andere kant op moeten reizen, naar Kastscan.

---

## Wat ik aan Martin voorleg

1. **Welke route voor de structuur** — A (modulariseren), B (gedeeld pakket) of C (blijven kopiëren)? Dit bepaalt of "1-op-1" haalbaar is of een streven blijft.
2. **`fase` → `fasetype` hernoemen met migratie?** Zonder dat blijft elke uitwisseling een vertaalslag.
3. **YourWkb naar MKP-spec v2** en `grp[].fase` meeschrijven? Nu is de standaard asymmetrisch tussen twee eigen producten.
4. **De twee `belastingcheck`-varianten**: laten we het verschil bestaan (en vastleggen), of gaat YourWkb ook per fase rekenen zodra de fase per groep bekend is? Dat laatste is de natuurlijke uitkomst van R3b.
5. **Twee open normvragen uit het augustus-voorstel** (zie punt 3b): telt PV mee als belasting — positief, negatief of niet? En geldt de gelijktijdigheidsfactor per fase of over het totaal? Vraag 9 aan Maurits en Herman staat nog open, en de twee apps hebben het inmiddels verschillend opgelost.
6. **Staat er nog meer dat ik zou moeten kennen** — een gedeelde spec, afspraken over welke modules waarheen gaan, of andere repo's naast deze twee?
