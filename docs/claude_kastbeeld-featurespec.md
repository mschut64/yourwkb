# Het kastbeeld — foto, leerlus en paspoort als gedeelde motor

*Featurespec, 30-09-2026. Vervangt het verloren `claude_kastscan-featurespec.md` dat R3a sinds
11-09-2026 blokkeerde: dit document is afgeleid uit de wérkende code van Kastscan, niet uit een
herinnering eraan.*

**Opdracht (Martin, 30-09-2026), drie delen:**

1. Het inlezen van de kast via foto én het leren van kasten wordt motor, zodat beide apps het
   gebruiken.
2. YourWkb start stap 6 net als Kastscan met een foto, zodat automaten, aardlekschakelaars en
   materiaal daaruit worden ingelezen.
3. Staat de materiaallijst al in het meterkastpaspoort, dan toont YourWkb die in stap 6 in plaats
   van opnieuw te beginnen met een foto. Er komt dan alleen een **uitbreiding** op de kast. Dat
   geldt ook in de andere disciplines zodra er een groep bijkomt.

---

## 1 · De kern: één kastbeeld, drie ingangen

Vandaag heeft elke app zijn eigen voorstelling van een groepenkast:

| | Kastscan | YourWkb |
|---|---|---|
| Datamodel | `posities[]` — modules op een DIN-rail | `aardlekgroepen[]` met `eindgroepen[]` |
| Komt van | een foto | de installateur die het intikt |
| Gaat naar | labels, schema, paspoort | metingen, rapport, paspoort |

Die twee zijn niet te verenigen, en dat hoeft ook niet. Wat ze delen is het **kastbeeld**: welke
toestellen hangen er, waarachter, met welke karakteristiek en welke stroom. Kastscan leest dat uit
een foto, YourWkb vraagt het uit, en het meterkastpaspoort draagt het tussen klussen door.

> **De regel: `posities[]` wordt het gedeelde kastbeeld in de motor. `aardlekgroepen[]` wordt een
> afgeleide, geen tweede waarheid.**

Dat is dezelfde zet als bij de belasting: daar werd de paspoort-`grp[]` de gedeelde vorm, en
verdween de drift. Hier is de gedeelde vorm `posities[]`, omdat een foto nu eenmaal modules ziet en
geen aardlekgroepen — en omdat `blokIndeling(posities)` die modules al groepeert tot precies wat
YourWkb een aardlekgroep noemt.

### Vier vertalingen, elk één kant op

```
        foto ──► /api/kastbeeld ──► ruwe JSON ──► normaliseerAnalyse ──┐
                                                                       │
   paspoort (grp[] + mat[]) ──► positiesUitPaspoort ────────────────►  ├──► posities[]
                                                                       │
                        de installateur zelf ────────────────────────►─┘
                                                                            │
                                    ┌───────────────────────────────────────┤
                                    ▼                                       ▼
                        aardlekgroepenUitPosities              mkpBouw / grpRegels / mkpMateriaal
                            (YourWkb-schermen)                      (terug het paspoort in)
```

Geen enkele vertaling loopt twee kanten op, en geen enkele wordt twee keer geschreven. Dat is de
les van valkuil 9 (*bouw nooit na wat `mkp-bouw.js` al schrijft*) en van de belastingcheck die in
twee apps uiteenliep.

---

## 2 · Wat er naar de motor gaat, en wat niet

De inventarisatie van 30-09-2026 wijst het scherp uit: van de fotoketen is **bijna alles al puur**.
`leerlus.js` heeft nul imports, en `model.js` raakt geen enkele browser-API.

### Wel naar `yourwkb-core`

| Wat | Vandaan | Waarom |
|---|---|---|
| `normaliseerPositie`, `normaliseerAnalyse`, `normaliseerSchema` | `kastscan/model.js` 804/884/916 | de ruwe modeluitvoer betrouwbaar maken |
| `ZEKERHEIDSDREMPEL` (0,75), `INVULDREMPEL` (0,35) | 89/104 | wanneer een aflezing telt — een normkeuze, geen UI |
| `parseBeveiliging`, `formatBeveiliging` | 27/43 | `"B16"` ↔ `{B, 16}`; YourWkb heeft dit nodig om `mat[].typ` te lezen |
| `splitsVerklaring`, `soortVerklaringsregel`, `splitsVerklaringsregels` | 584/607/634 | de groepenverklaring op de kastdeur lezen |
| `volgordeKandidaten`, `koppelOpVolgorde`, `koppelGroepenverklaring` | 657/665/690 | namen aan groepen hangen |
| `pasVuistregelToe`, `pasFotoIndelingToe`, `indelingKoppeling`, `blokIndeling` | 1310/1370/1357/1420 | welke groep achter welke aardlek |
| `groepsnummers`, `sorteerPosities`, `zetStandaardnamen`, `ontdekVoortgang` | 771/793/539/474 | nummering en benoeming |
| `maakCorrectie`, `overtuigdFout`, `correctieStatistiek` | 1991/2012/2018 | het correctielog |
| **`leerlus.js` in zijn geheel** | 452 regels, nul imports | de catalogus, het delen, de vrijgaveregel |
| **De prompt**: `INSTRUCTIE`, `SCHEMA`, `INSTRUCTIE_SCHEMA`, `SCHEMA_TEKENING`, `PROMPTVERSIE` | `api/kastscan/route.js` 185/56/330/275/17 | zie hieronder |

**De prompt hoort in de motor, en dat is de minst vanzelfsprekende keuze in dit document.** Hij
staat nu in een API-route, want daar wordt hij gebruikt en daar hoort hij server-side te blijven
(audit BEV-02). Maar hij is geen infrastructuur: hij is de **gekalibreerde norm** — 8,7 kB
instructie waarin staat dat een aardlekautomaat zichzelf beveiligt, dat een fase nooit uit een
kastfoto komt, en hoe zeker een aflezing moet zijn. Twee apps met elk een eigen kopie daarvan
lopen binnen een maand uiteen, precies zoals `faseBalans` dat deed.

Hij gaat dus als **data** mee in het pakket (`prompt.js`, geen netwerk, geen sleutel), en elke app
houdt zijn eigen dunne route eromheen. De route blijft doen wat een route moet doen: origin
controleren, begrenzen, de sleutel bewaken en de bytes doorgeven.

### Niet naar de motor

| Wat | Waar het blijft | Waarom |
|---|---|---|
| `/api/kastscan/route.js` zelf | per app | rate limiting, `ANTHROPIC_API_KEY`, `origineOk` — dat is infrastructuur en hoort per omgeving |
| `verkleinIndienNodig`, `naarBlob`, de HEIC-omzetting | per app | canvas en `FileReader`; de motor mag geen browser-API's kennen |
| `render.js`, `labels.js`, `schema.js`, `documenten.js`, printers | Kastscan | labels en tekeningen zijn van die app |
| `aardlekgroepenUitPosities` | motor, maar **nieuw** | zie §4 |

### Grenswaarden en drempels: één definitie

De inventarisatie vond **twee definities van dezelfde grens**: `ZEKERHEIDSDREMPEL = 0.75` in
`model.js` en een hardgecodeerde `0.75` op twee plaatsen in `leerlus.js` (regels 349 en 358) —
omdat dat bestand importvrij moest blijven. Die reden vervalt zodra beide in de motor staan.
Samen met `correctieStatistiek` (model.js) en `correctieStatistiekVoorDelen` (leerlus.js), twee
bijna gelijke functies met bijna dezelfde naam, is dat het eerste dat recht getrokken wordt.

---

## 3 · Deel 2 — YourWkb begint stap 6 met een foto

### Waar de stap komt

`GK_STEPS` staat vandaag op elf stappen, met **Groepen als stap 6**. De fotostap komt daar vóór:

```
1 Klant · 2 Installateur · 3 Apparatuur · 4 Foto's (oud) · 5 Materiaal
6 KASTBEELD (nieuw) · 7 Groepen · 8 Meten · 9 Veldmeting · 10 Foto's (nieuw) · 11 Paspoort · 12 Versturen
```

**Dit verlengt de flow niet**, en dat moet het ook niet (⚓ flow-regel). De nieuwe stap *vervangt
handwerk*: wat de installateur nu in stap 7 met de hand intikt — per aardlek een type, een mA, per
eindgroep een naam, een karakteristiek en een ampère — komt eruit voorgevuld. Wie geen foto maakt,
tikt gewoon door naar stap 7 zoals nu. Wie een paspoort scande, ziet de stap helemaal niet (§5).

⚠️ **Valkuil.** Er staan vijftien plekken in `WkbApp.jsx` met een stapnummer in de *tekst*
("meenemen in veldmeting stap 8", "zie stap 3 · Apparatuur"). Die schuiven niet mee met de array.
Dat is eerder misgegaan; het commentaar op regel 6765 legt precies uit waarom. Die teksten moeten
in dezelfde release mee.

### De foto zelf

De bestaande `StapFotos` is **niet bruikbaar** voor het kastbeeld: die comprimeert naar 900 px
breed, JPEG 0,6. Kastscan heeft gemeten dat 700 px 0 van 9 groepsnummers leest, 900 px er 6 leest
en 1200 px alle 9 — en de open foto gaat daar zelfs op **volle resolutie** mee, omdat terugschalen
de opdruk op de modules onleesbaar maakt.

Het kastbeeld krijgt dus de fotoafhandeling van Kastscan, inclusief de ondergrens van 1200 px, de
HEIC-omzetting via canvas op volle resolutie, en de eigen groottecheck tegen de 4,3 MB die Vercel
nog doorlaat. Die code is browser-code en wordt per app gekopieerd noch gedeeld — hij verhuist naar
een eigen module in elke app, met dezelfde constanten uit de motor.

### Wat de foto vult

| Scherm | Veld | Uit de foto |
|---|---|---|
| Materiaal (5) | `stelsel` | `hoofd.stelsel` (TN/TT) |
| | `automaten[]` | `{fab, serie, type, aantal}` uit `fabrikant`+`type`, geteld |
| | `bouwjaar` | nee — staat niet op de modules |
| Groepen (7) | `aardlekgroepen[].naam` | `standaardnaam` / `functie` van de aardlek |
| | `.rcdType` | `aardlektype` (AC/A/F/B) |
| | `.rcdMa` | `IAn` |
| | `.fase` (aantal) | `polen >= 3 ? "3" : "1"` |
| | `.L` (welke) | **nooit** — een kastfoto toont geen fase (prompt regel 5). Blijft handwerk of komt uit een schema/P1-meting |
| | `.eindgroepen[].naam` | `functie` (uit stift, plaat of groepenverklaring) |
| | `.eindgroepen[].kar` | `karakteristiek` |
| | `.eindgroepen[].ampere` | `In` + `"A"` |
| | `.eindgroepen[].type` | afgeleid uit de naam, zoals `mkpType` dat doet |

**De foto vult in, de installateur bevestigt.** Alles krijgt de onzekerheidsmarkering die Kastscan
er al voor heeft, en niets wordt als vastgesteld gepresenteerd (zuiverheidsregel: nooit "keuring",
"goedkeuring", "vastgesteld" — wel "voorgesteld uit foto").

---

## 4 · De nieuwe vertaling: `aardlekgroepenUitPosities`

Dit is het enige echt nieuwe stuk logica. Het is kort, omdat `blokIndeling` het zware werk al doet.

```
blokIndeling(posities) → [{ aardlek, posities }]
      │
      ├─ aardlek === null  → losse groepen; in YourWkb een aardlekgroep met rcdType: "geen"
      └─ aardlek !== null  → één aardlekgroep
                              naam    ← aardlek.functie || aardlek.standaardnaam
                              rcdType ← aardlek.aardlektype || "A"
                              rcdMa   ← aardlek.IAn
                              fase    ← isMeerpolig(aardlek) ? "3" : "1"
                              L       ← aardlek.fase (meestal leeg)
                              eindgroepen ← de posities erachter, elk:
                                  naam   ← functie || standaardnaam
                                  kar    ← karakteristiek
                                  ampere ← In + "A"
                                  type   ← typeUitNaam(functie)
```

Plus `hoogstId`: YourWkb kiest de zwaarst belaste eindgroep per cluster. `autoHoogst` doet dat al
op ampère; die regel blijft, alleen de invoer verandert.

**Gebouwd op 30-09-2026.** Drie dingen die tijdens het bouwen bleken en die het ontwerp scherper
maken dan hierboven stond:

1. **Een smeltveiligheid krijgt `kar: "gG"`, niet "B".** Bij een trage smeltzekering komt Z_max
   uit een tijd-stroomkromme en niet uit factor × In; stilletjes "B" invullen laat het rapport
   slagen op een norm die daar niet geldt. ⚠️ De `kar`-keuze in de groepen-stap kent alleen
   B/C/D — die moet er in K4 "gG" bij krijgen, anders toont het scherm een lege keuze.
2. **Een gelezen stroom van bijvoorbeeld 40 A past niet in de keuzelijst** (`GROEP_A` gaat tot
   32 A). Ook dat is een K4-punt: toon wat er gelezen is in plaats van niets.
3. **De identifiers zijn deterministisch** (`a1`, `a1e1`), geen `Date.now()`. Anders verandert een
   tweede scan stil elke verwijzing — `hoogstId`, en de meetwaarden die per groep-id zijn
   opgeslagen.

### ⚠️ Een warmtepomp bestaat in het paspoort, maar niet als eindgroep

`EINDGROEP_TYPES` in YourWkb kent kook, pv, kracht, laad en batterij — **geen warmtepomp**. Het
paspoort kent `wp` wél, mét de gelijktijdigheidsfactor 0,6 en een terugvalvermogen van 6,9 kW.

Een warmtepompgroep in een groepenkast komt daardoor zonder type binnen en belandt in het paspoort
als `alg`: geen factor, geen terugval, en in de fasebalans telt hij alleen mee als er toevallig een
vermogen is ingevuld. Dat is geen tekortkoming van deze vertaling maar een gat in de app, en het
raakt precies de discipline die het snelst groeit.

**Voorstel voor K4:** `wp` als zesde eindgroeptype toevoegen (🔥 Warmtepomp). Eén regel in
`EINDGROEP_TYPES`, één in `EIND_NAAR_MKP_B`, en `EINDGROEP_ONBEKEND` in de motor kan leeg. Vraagt
wel Martins akkoord: het is een normrelevante toevoeging, want hij zet de factor 0,6 aan voor
groepen die hem nu niet krijgen. Vastgelegd in `tests/test-aardlekgroepen.js` categorie 6, zodat
het een besluit blijft en geen vergetelheid.

**Heen en terug moet kloppen.** Een test bewaakt dat `aardlekgroepenUitPosities` gevolgd door
`mkpBouw` hetzelfde paspoort oplevert als Kastscans `mkpBouw` op dezelfde posities — anders zegt de
QR van de ene app iets anders dan die van de andere over dezelfde kast.

---

## 5 · Deel 3 — het paspoort vult de kast al in

Dit is het deel dat de installateur het meeste scheelt, en het is bijna gratis: **Kastscan schrijft
sinds 19-09-2026 een `mat[]` in het paspoort, en YourWkb leest die vandaag nergens.**

### Wat er in een paspoort zit

| Veld | Inhoud | Wat YourWkb ermee kan |
|---|---|---|
| `grp[]` | `t`, `rol`, `f`, `fn`, `kw`, `n`, `al`, `a`, `mat` | de eindgroepen: naam (`n`), type (`t`), ampère (`a`), achter welke aardlek (`al`), fase (`fn`) |
| `mat[]` | `i`, `s`, `pos`, `fab`, `typ`, `art`, `sn`, `pd` | het toestel: soort (`s`: aut/ala/als/hs/kam), fabrikant, type — en via `parseBeveiliging("B16")` de **karakteristiek en de nominale stroom** |
| `grp[].mat` | index in `mat[]` | welk toestel welke groep beveiligt |
| `ha`, `kam`, `bj`, `lb` | | staan al in `startMetPaspoort` |

Daarmee is een volledige kast te reconstrueren — inclusief `kar` en `ampere`, die uit `grp[]`
alleen niet te halen zijn. Vandaar dat `mat[]` het scharnier is.

### Wat de installateur ziet

Scant hij een paspoort mét `mat[]`, dan **slaat stap 6 zichzelf over**: geen foto, geen lege
velden. Stap 7 toont de kast zoals die er staat, met per regel de herkomst "uit meterkastpaspoort",
en daaronder één knop:

> **+ Groep toevoegen**

Dat is de uitbreidingsmodus. De bestaande groepen blijven staan en worden niet opnieuw gemeten; de
nieuwe groep en zijn aardlek worden gemeten met de velden die de app al kent. Dat sluit één-op-één
aan op `docs/claude_dossiercode-en-uitbreiding-featurespec.md`, dat dezelfde beweging beschrijft
voor het complete opleverdossier.

Heeft het paspoort géén `mat[]` — bijvoorbeeld omdat het van een oudere versie is, of van een app
die het niet schrijft — dan valt de app terug op de foto. Dat is de goede volgorde: **paspoort boven
foto, foto boven handwerk.**

### En in de andere disciplines

Dezelfde regel, zonder nieuw scherm. Komt er een laadpaal, warmtepomp, batterij of PV bij op een
kast waarvan het paspoort bekend is, dan staat die kast er al — het enige wat de installateur
toevoegt is de nieuwe groep. De Fasecheck doet dit sinds `v2026-09-12-F` al met `grp[]`; dit
breidt hetzelfde principe uit naar de materiaal- en groepenkant.

---

## 5b · De kast eruit laten zien zoals in Kastscan

*Vraag van Martin, 30-09-2026: "voor YourWkb is het misschien ook mooi om de look and feel
te gebruiken van de kast zoals deze in Kastscan is gebruikt."*

**Ja — en het is minder werk dan het lijkt, want de helft staat er al.** `tokens.js` in
Kastscan is letterlijk een kopie van het `K`/`S`-blok uit `WkbApp.jsx`: dezelfde kleuren,
dezelfde maten, dezelfde knoppen. De twee apps spreken al dezelfde vormtaal; wat Kastscan
erbovenop heeft is de **railstrook** — de horizontale balk met modules op ware breedte,
gekleurde aardlekbanden eronder en een tegel per groep.

Er zijn drie goede redenen om die naar YourWkb te halen:

1. **Herkenning.** Wie beide apps gebruikt, kijkt naar dezelfde kast. Dat is precies het
   "één motor, meerdere verpakkingen" uit de visie, maar dan zichtbaar.
2. **Een kast is ruimtelijk.** Een lijstje aardlekgroepen vertelt niet dat groep 7 helemaal
   rechts op rail 2 zit. Bij een uitbreiding (§5) is juist dát de vraag: waar is nog plek.
3. **Het is de natuurlijke weergave van `posities[]`**, en dat wordt toch al het gedeelde
   kastbeeld.

### Wat waar hoort

De motor mag geen React kennen — dat is de regel die de hele opzet draagt. De scheiding is
dus dezelfde als bij de fasebalken, die in beide apps hetzelfde tekenen zonder gedeelde
component:

| | Waar | Wat |
|---|---|---|
| **Maatvoering** | motor | hoe breed een module is (18 mm), waar een tegel begint, hoe lang een rail is, welke tegel op welke plek. Pure rekenkunde, en nu nog verdeeld over `render.js` en `KastscanApp.jsx` |
| **Vormtaal** | motor, als data | de kleuren en maten die nu twee keer bestaan (`tokens.js` ↔ het `K`/`S`-blok). Eén bron, zoals `FASE_KLEUR` dat al is |
| **De tekening zelf** | per app | de JSX. Klein zodra de maatvoering en de kleuren van buiten komen, en elke app mag hem anders inbedden — Kastscan tikt tegels aan om ze te benoemen, YourWkb hangt er meetwaarden aan |

**Niet doen: één gedeelde React-component.** Dat vraagt een vierde pakket met React als
peer dependency, en het koppelt twee apps aan dezelfde schermindeling terwijl ze een
verschillende vraag stellen. De fasebalken laten zien dat het zonder kan: dezelfde balk,
dezelfde kleuren, twee stukjes JSX van vijftien regels.

**Gebouwd op 30-09-2026 (K4), en dezelfde dag herzien.** De eerste versie week op twee
punten af van Kastscan — één rij per aardlekgroep in plaats van één rail, en een ondergrens
van 46 px per tegel — allebei omdat een rail van twintig modules niet op 375 px past.

**Dat is teruggedraaid, op verzoek van Martin: "bij stap 6 wilde ik eigenlijk exact hetzelfde
als kastscan".** De afwijking loste het verkeerde probleem op. Een kast is één rail, en juist
wie hem in stukken knipt kan niet meer zien dat er achter de tweede aardlek nog vier modules
ruimte is — en dát is bij een uitbreiding de enige vraag die telt. Een meterkast is breder dan
een telefoon; horizontaal schuiven is het eerlijke antwoord, en Kastscan doet dat sinds het
begin. Sindsdien:

1. **Eén rail**, met de aardlekschakelaar als gewone module van twee breed. Geen kopje boven
   een rij meer: hij hangt in de kast en bezet daar ruimte, dus hoort hij in het beeld.
2. **Een module is 52 px** (`MODULE_PX`, de tapmaat uit design-spec §1.3), niet 26 met een
   ondergrens eroverheen. Ware schaal, en elke tegel blijft met een werkhandschoen te raken.
3. **De kleurband staat ónder de strook**, niet als streepje in de tegel, en gebruikt de
   verzadigde schermladder van Kastscan (`AARDLEK_BAND`) — niet de pastelladder van het
   label (`AARDLEK_KLEUR`). Twee dragers, twee ladders: pastel van 7 px is op een donker
   scherm niet te zien, en dezelfde tint moet op stickerpapier juist wijken voor de tekst.
4. **De tegel draagt de fase ook als randpatroon** (`FASE_PATROON`), zoals in Kastscan —
   fase nooit alleen als kleur.
5. Wat nog ontbreekt staat als **"invullen" in oranje** onderaan de tegel. Eén markering per
   vraag: de rand is van de fase, de tekst van de volledigheid.

**De kaartenlijst onder de strook is vervallen.** Die gaf een tweede keer wat de rail al
toont, met een tweede bewerkpad op hetzelfde gegeven — precies hoe twee weergaven uit elkaar
gaan lopen, dezelfde fout die `faseBalans` tussen de twee apps maakte. Alles wat erop stond
zit nu in de **modulekaart** die onder de strook openklapt zodra je een tegel aantikt: naam,
RCD-type, mA, aantal fasen, de fase zelf, de zwaarst belaste groep van het cluster, de
veldmetingkeuze en weghalen (met bevestiging in de kaart zelf, geen systeemdialoog). Eén
kaart tegelijk open. Dat is Kastscans `Modulekaart`, met de velden die in een opleverrapport
tellen.

De **+** op de rail staat op de plek waar de nieuwe groep komt te hangen — achter de laatste
module van dat blok — en klapt hem meteen open. Zo ook "+ Aardlek" rechtsboven.

Herkomst blijft zichtbaar: een groep uit een gescand paspoort draagt een **geel stipje** in
de hoek van de tegel en het label "uit paspoort" in de modulekaart. Wat uit een sticker komt
is niet bevestigd door déze installateur.

⚠️ **Nu al opschrijven:** `tokens.js` is een kopie en kan dus uit de pas lopen. Zolang dat
zo is, is elke kleurwijziging in YourWkb een stille wijziging in Kastscan die níét meekomt.

---

## 6 · Releases

| # | Wat | Zichtbaar voor de installateur | Risico |
|---|---|---|---|
| **K1** ✅ | **Motor v0.2** *(30-09)*: de pure fotologica, het correctielog en de leerlus naar `yourwkb-core`. Kastscan importeert ze; gedrag ongewijzigd. Twee definities van 0,75 worden er één, `correctieStatistiek` en `correctieStatistiekVoorDelen` worden er één. | niets | laag — mechanisch, met ~347 bestaande asserties eroverheen |
| **K2** ✅ | **Motor v0.3** *(30-09)*: de prompt als data (`prompt.js`, apart pad — 22 kB hoort niet in een browserbundel), `PROMPTVERSIE` mee. Kastscans route ging van 623 naar 314 regels. De drie discrepanties tussen het JSON-voorbeeld en het afgedwongen schema zijn eruit, met 18 tests die ze vangen. ⚠️ **Promptwijziging: vraagt een verse run over de referentieset** (vrijgaveregel). | niets zichtbaar; het model krijgt een voorbeeld dat de API niet meer zou afkeuren | laag, mits de referentierun gedaan wordt |
| **K3** ✅ | **`aardlekgroepenUitPosities`** *(30-09)*, motor v0.4.0. `mkpType` verhuisde mee. 36 tests op de vertaling, 15 in YourWkb op de doorgang naar het paspoort — gecontroleerd dat die een verkeerde fasemapping ook echt afkeurt. | niets | — |
| **K4** ✅ | **Paspoort vult stap 6** (deel 3) *(30-09)*. `mat[]` lezen en de kast voorvullen, met de herkomst per groep, de **railstrook** in de vormtaal van Kastscan (motor v0.6.0) en **"+"** op de plek waar de nieuwe groep komt te hangen. | **veel** — wie een sticker scant heeft de kast al staan, en ziet hem zoals in Kastscan | midden |
| **K5** | **Fotostap in YourWkb** (deel 2). Eigen route `/api/kastbeeld`, de fotoafhandeling van Kastscan, de nieuwe stap vóór Groepen, en de vijftien stapnummers in teksten mee. | **veel** | hoog — nieuwe route, kosten per scan, AVG-tekst erbij |
| **K6** | **De leerlus aan** in YourWkb: catalogus onder een eigen sleutel, `vulAanUitCatalogus` na normaliseren, `catalogusLeer` bij bevestigen, `maakCorrectie` bij elke wijziging. | niets direct; de app wordt beter | laag, maar pas zinvol bij volume |

`docs/INTEGRATIE-YOURWKB.md` in Kastscan beveelt de leerlus bewust **als laatste** aan — "hij wordt
pas waardevol als er volume is". Die volgorde is hier overgenomen.

**K4 vóór K5** is een bewuste omkering van de opdrachtvolgorde. Reden: K4 heeft geen model, geen
route, geen kosten en geen privacyvraag nodig, en levert de grootste tijdwinst in het veld. En hij
is de vangnet-weg voor K5: werkt de foto niet, dan is er altijd nog het paspoort.

---

## 7 · Wat eerst beslist moet worden

1. **Kosten per scan.** Kastscan draait op `claude-opus-5` met `max_tokens: 16000` en adaptief
   denken — "ruwweg een dubbeltje per scan" staat in het commentaar. Bij € 9,50 per rapport is dat
   ~1%, maar het is wel een variabele kostenpost op een vaste prijs. Zelfde vraag als bij R2
   (AI-meekijker, advies was: inbegrepen).
2. **De privacytekst.** De foto gaat naar Anthropic. In YourWkb staat nu dat álles op het toestel
   blijft, en dat klopt vandaag. Met K5 klopt het niet meer zonder nuance: de foto verlaat het
   toestel, wordt niet bewaard, en het antwoord komt terug. Kastscan zegt dat al in de UI; YourWkb
   moet het in de AVG-pagina en bij de knop zeggen.
3. **Twee routes of één.** `/api/kastscan` bestaat en werkt. Wil YourWkb een eigen
   `/api/kastbeeld` (eigen rate limit, eigen sleutel, eigen logs), of roept hij die van Kastscan
   aan? Advies: eigen route, want een gedeelde route koppelt twee hostingprojecten en twee
   rate limits aan elkaar.

## 8 · Fouten die deze inventarisatie aan het licht bracht

Los van het bouwwerk hierboven, en los te repareren:

0. ⚠️ **Nog open, uit K4:** een smeltveiligheid schrijft Kastscan als `s: "ov"`, dezelfde code als "overig"
   (`MKP_SOORT`). Terug is die dus niet te onderscheiden, en een stop uit een paspoort komt binnen als
   "overig" in plaats van als smeltveiligheid. De karakteristiek redt het wel — `parseBeveiliging` leest
   sinds v0.5.1 ook "gG20" — maar de soort niet. Een eigen code (`als` bestaat al voor de
   aardlekschakelaar; `sme` zou passen) is een **spec-wijziging** en vraagt Martins besluit.
1. ✅ **Opgelost 30-09.** ~~De bevestigingslus in Kastscan schrijft niets meer weg.~~ `KastscanApp.jsx:1293` leest
   `p.zekerheid` als object (`(p.zekerheid || {})[veld]`), maar sinds promptversie B is dat een
   **getal**. Elk veld valt daardoor op `undefined` en wordt overgeslagen: bij "Bevestigen en
   verder" komen er geen `"bevestigd"`-regels in het correctielog. De noemer van de correctiegraad
   bestaat dus alleen nog uit correcties, waardoor de vrijgaveregel (`oordeelOverWijziging`) op
   drijfzand staat. Exact dezelfde fout is op regel 1364 wél gerepareerd. **Dit raakt deel 1
   rechtstreeks: de app leert nu niet wat hij goed deed, alleen wat hij fout deed.**
2. ✅ **Opgelost 30-09 (K2).** ~~Het JSON-voorbeeld ín de prompt wijkt af van het afgedwongen schema:~~ `zekerheid` staat er als
   object (schema eist een getal), `"blokken"` staat er twee keer, en `"smeltveiligheid"` ontbreekt
   in de `soort`-opsomming. Het model krijgt dus een voorbeeld dat het schema zou afkeuren.
3. ✅ **Opgelost 30-09.** ~~`docs/INTEGRATIE-YOURWKB.md` noemt `model.js` nog "importvrij".~~ Het
   document heeft een kop gekregen die zegt dat het kopieerplan vervallen is.
4. `data.mkp.grp` in YourWkb wordt geschreven (`WkbApp.jsx:6555`) en nergens gelezen. Dood veld.
5. `Lbron` kent de waarde `"meter"` die nooit geschreven wordt. Met dit spoor komt er een derde
   bron bij (`"foto"`, `"paspoort"`); dat patroon is er dus al op voorbereid.
