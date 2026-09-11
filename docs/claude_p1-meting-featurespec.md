# P1-meting — feature-/ontwikkelprompt (YourWkb-app)

> Plak deze spec in de ontwikkelchat zodat de P1-meting in het ontwikkeldocument wordt opgenomen.
> Meten via de P1-poort van de slimme meter: een logger die de installateur een week achterlaat, en later een bevestiging van de fase per aardlek zonder de kast te openen. Sluit aan op `claude_fasecheck-featurespec.md` (R3b) en `claude_kastscan-featurespec.md` (R3a).

## Context

De Fasecheck (R3b) rekent per fase, maar de bestaande belasting per fase is nu een **schatting**: een aanvinklijst met standaardvermogens of een ingevoerd piekvermogen, met het label *"indicatie o.b.v. schatting"*. De Kastscan (R3a) legt vast welke groep op welke fase zit, maar de fase per aardlek komt uit een tik van de installateur — en voor wie de kast niet open wil of mag maken, is die koppeling lastig.

De slimme meter weet het wel. Via de P1-poort geeft hij elke seconde (DSMR 5) per fase het vermogen, de stroom en de spanning. Een P1-dongle die een week meeloopt, maakt van de schatting een meting. En een aardlek die even uitgaat, is op de P1-data zichtbaar als een vermogenssprong op precies één fase.

**Referentie-installatie:** Martins eigen aansluiting (3 × 25 A) met de gemeten faseverdeling van 22-08-2026 uit `fasebewaker.yaml` — L1 kookplaat/close-in boiler/zoldervloer, L2 meterkast/wasmachine/airco/PV, L3 oven/vaatwasser/droger/schuur. Omdat daar de juiste antwoorden al bekend zijn, is dit de testbank voor fase 0 en fase 3.

## Doel

1. **Gemeten belasting per fase** over een meetperiode van enkele dagen tot een week, als invoer voor de Fasecheck, het opleverrapport en het meterkastpaspoort.
2. **Later:** de fase per aardlek bevestigen in de Kastscan door de aardlek kort te schakelen en de sprong op de P1-data te lezen — zonder de afdekplaat eraf.

## Kerngedachte

**Een week meten zegt *hoeveel*, een foto zegt *waar*.** De P1-logger en de Kastscan beantwoorden verschillende vragen en zijn niet inwisselbaar. Uit een week verbruiksdata is niet af te leiden welke groep op welke fase zit; uit een foto is niet af te leiden hoe zwaar een fase belast wordt.

Drie technische feiten bepalen het ontwerp:

- **De meter geeft per fase alleen momentane waarden** (W, A, V), geen kWh per fase. Een piek of gemiddelde per fase bestaat alleen als de dongle hem zelf bijhoudt.
- **Stroom per fase is in DSMR 5 een geheel getal zonder richting** (ampère, geen teken). Vermogen per fase komt in W-resolutie én gescheiden naar afname en teruglevering. **Log dus vermogen, niet stroom.**
- **Een gemeten piek bevat de gelijktijdigheid al.** De Fasecheck mag op een gemeten basisbelasting niet opnieuw een gelijktijdigheidsfactor toepassen — alleen op het nieuwe apparaat.

## Besluit: eerst Fasecheck, daarna Kastscan

Kastscan (R3a) en Fasecheck (R3b) zitten allebei in YourWkb. De keuze is dus niet "Kastscan of YourWkb" maar **aan welke module de P1-data eerst hangt**. Antwoord: de Fasecheck.

| | Fasecheck (R3b) | Kastscan (R3a) |
|---|---|---|
| Wat P1 levert | gemeten piek per fase over n dagen | bevestiging: aardlek X zit op fase Ly |
| Wat het vervangt | aanvinklijst/schatting → label "gemeten" | een tik die de installateur gokt of moet natrekken |
| Verbinding nodig | geen — bestand importeren achteraf | (bijna) live koppeling tussen dongle en app |
| Moeilijkheid | laag | hoog (PWA-netwerk, timing, veiligheid) |
| Waarde per klus | elke bat/lp/wp/pv-klus | alleen waar de kast dicht blijft |

Redenen, in volgorde van gewicht:

1. **Het gat is het grootst bij de Fasecheck.** Daar staat nu letterlijk "indicatie o.b.v. schatting". Een meting is het verschil tussen een advies en een onderbouwde vastlegging.
2. **Het is het eenvoudigste stuk.** Een bestand importeren werkt offline, vraagt geen server en past binnen de privacy-architectuur zoals die nu is.
3. **De Kastscan-koppeling vraagt de moeilijkste techniek** — een (bijna) live verbinding tussen dongle en telefoon — en die komt vanzelf beschikbaar zodra fase 2 (doorgeefluik) staat.
4. **R3b kan nu al P1-klaar gebouwd worden:** als de rekenkern een `bron`-veld accepteert (`'geschat' | 'gemeten'`), hoeft er later niets herbouwd te worden.

## Toets aan de flow-regel

Wordt de flow hierdoor langer? **Nee.**

- **Optioneel:** zonder dongle werkt de Fasecheck precies zoals gespecificeerd.
- **Vervangt handwerk:** een geïmporteerde meting vult de per-fase-belasting in; de aanvinklijst verdwijnt voor die klus.
- **Buiten de standaardflow:** de dongle wordt achtergelaten bij het schouw- of offertebezoek en uitgelezen bij het installatiebezoek. Er komt geen extra rit en geen extra stap in de klant-tot-rapportflow bij.
- **Importeren is één handeling:** delen naar YourWkb via de bestaande Web Share Target, of één bestandskiezer.

---

## Fasering

### Fase 0 — Spike met standaardhardware en -firmware (Martin, thuis)

Doel: aannames toetsen vóór er één regel app-code wordt geschreven.

1. **Dongle doorlussen.** Pro+ in de P1-poort, de bestaande P1-uitlezing voor de fasebewaker op de P1-uitgang van de Pro+. Controleer dat de fasebewaker gewoon doordraait.
2. **Meter identificeren.** `GET /api/v2/sm/info` → P1-versie en meter-ID noteren.
3. **Testdata vastleggen.** `GET /api/v2/sm/telegram` → tien ruwe telegrammen opslaan als fixtures in `tests/fixtures/p1/`. Controleer welke OBIS-velden per fase aanwezig zijn en met welke resolutie (zie tabel hieronder).
4. **Voeding.** Draait de Pro+ parasitair op de P1-poort van deze meter, ook met doorgelust apparaat? Zo niet: USB-voeding, en noteren.
5. **Ingebouwde historie.** "Lokaal opslaan" aan, na 24 uur `GET /api/v2/hist/hours` en `/api/v2/dev/info` bekijken: zit er iets per fase in, en hoeveel flash is er vrij?
6. **Referentiereeks.** Een week via MQTT naar de broker in de eigen Home Assistant/Proxmox-omgeving, per fase afname en teruglevering. Vergelijk met de bestaande `sensor.electricity_meter_energieverbruik_fase_l*`-reeksen.
7. **Handmatige stapproef.** Met de bekende faseverdeling: oven aan → sprong op L3, wasmachine → L2, kookplaat → L1. Noteer per proef de sprong in W en na hoeveel telegrammen hij zichtbaar is.

**Exitcriterium:** per-fase-vermogen afname/teruglevering aanwezig in W-resolutie · doorlussen werkt zonder storing van het andere apparaat · de stapproef wijst drie van de drie keer de juiste fase aan · de spike-uitkomst staat in `claude_p1-spike-<datum>.md`.

### Fase 1 — Meetmodus op de dongle + import in de Fasecheck

- **Firmware "YourWkb-meetmodus":** uitbreiding op DSMR-API (of eigen ESPHome-build) die per minuut per fase een record logt — zie *Meetmodus*.
- **Uitvoer:** downloadbaar bestand `yourwkb-p1-<dongleId>-<start>.json` via de webpagina van de dongle (telefoon verbindt met de dongle).
- **App:** import in het project, samenvatting via pure functies, overdracht naar de Fasecheck met `bron: 'gemeten'`.
- **Vastlegging:** rapport + analytics. Het MKP-veld volgt in een latere spec-versie (zie *Vastlegging*).

**Exitcriterium:** een meting van ≥ 5 dagen op de referentie-installatie levert in de Fasecheck per fase een piek op die binnen 5 % ligt van de referentiereeks uit fase 0; alle rekenregels zitten in de regressiesuite.

### Fase 2 — Centraal doorgeefluik (optioneel, na principebesluit)

De dongle stuurt versleutelde batches via de wifi van de klant naar YourWkb; de app haalt ze op en ontsleutelt lokaal. Geen tweede bezoek meer nodig om uit te lezen. **Vraagt een expliciet besluit van Martin**, want het raakt twee vaste principes — zie *Centraal doorgeefluik*.

### Fase 3 — Fase per aardlek bevestigen in de Kastscan

Op de strip van interactie 4 een optionele knop *"bevestig met meter"* per aardlek. De installateur schakelt de aardlek kort uit; de dongle meldt welke fase sprong. Werkt via het doorgeefluik van fase 2 (bijna live) of offline via de gebeurtenissen in het meetbestand.

---

## Hardware

**Keuze: Smartstuff Wifi P1 Dongle Pro+, zonder watermodule, met DSMR-API-firmware.**

| Criterium | Pro | Pro+ | Waarom het telt |
|---|---|---|---|
| P1-uitgang (doorlussen) | nee | **ja** | De P1-poort van de klant is steeds vaker bezet: laadpaal-loadbalancer, thuisbatterij, HomeWizard. Een week lang de loadbalancer van een laadpaal loskoppelen is geen optie. |
| Moduleslot (water, Modbus, IO) | nee | ja | Niet nodig voor deze toepassing. |
| Universele hardware (DSMR-API/ESPHome/Tasmota) | ja | ja | Eigen firmware voor de meetmodus blijft mogelijk. |
| HomeWizard-compatibele API | ja | ja | Dezelfde app-code werkt later voor HomeWizard- én Smartstuff-dongles. |

- **DSMR-API boven ESPHome:** stand-alone webpagina, lokale opslag en een eigen API zonder Home Assistant. Dat is precies de situatie bij een klant.
- **Niet de Ethernet-variant:** er ligt bij een klant geen netwerkkabel in de meterkast.
- **Voor de spike één exemplaar.** Voor de veldpilot met Maurits en Herman drie tot vijf, pas na het exitcriterium van fase 0.

## Wat de meter levert (DSMR 5.0.2)

| OBIS | Betekenis | Eenheid/resolutie | Gebruik |
|---|---|---|---|
| `0-0:1.0.0` | tijdstempel telegram | JJMMDDuummssX (S/W = zomer-/wintertijd) | tijdas, geen NTP nodig |
| `1-0:21.7.0` / `41.7.0` / `61.7.0` | vermogen afname L1/L2/L3 | kW, 3 decimalen (= W) | **kernveld** |
| `1-0:22.7.0` / `42.7.0` / `62.7.0` | vermogen teruglevering L1/L2/L3 | kW, 3 decimalen | **kernveld** |
| `1-0:32.7.0` / `52.7.0` / `72.7.0` | spanning L1/L2/L3 | V, 1 decimaal | onderspanning, controle fase aanwezig |
| `1-0:31.7.0` / `51.7.0` / `71.7.0` | stroom L1/L2/L3 | A, geheel getal, zonder richting | alleen informatief |
| `1-0:1.7.0` / `1-0:2.7.0` | totaal afname/teruglevering | kW | controle: som fasen ≈ totaal |
| `0-0:96.7.21` / `0-0:96.7.9` | stroomstoringen kort/lang | teller | gat in de meting verklaren |

- **Telegramcadans:** DSMR 5 ≈ 1 s, DSMR 4 ≈ 10 s. Voor een minuutrecord zijn beide voldoende; voor de stapproef (fase 3) is DSMR 5 sterk te verkiezen.
- **Oudere meters** (DSMR 2.2/3): vaak geen per-fase-velden → meting "niet mogelijk op deze meter", geen gok.
- **Belgische meters:** de P1-poort moet eerst via Fluvius worden geactiveerd; per-fase-velden en telegramopbouw apart valideren.
- **Te verifiëren in fase 0:** exacte veldaanwezigheid en resolutie op de referentiemeter.

## Meetmodus — wat de dongle logt

**Starten:** via de webpagina van de dongle of een knop in de app (fase 2). Invoer: projectcode (6 tekens, geen klantgegevens) en gewenste duur (default 7 dagen).

**Record per minuut:**

```
minuutrecord {
  t:       epoch-seconden (begin van de minuut, uit telegramtijd),
  n:       aantal geldige telegrammen in deze minuut,
  L1..L3: {
    pa:   gemiddeld vermogen afname (W),
    pax:  hoogste 1-s-waarde afname (W),
    pt:   gemiddeld vermogen teruglevering (W),
    ptx:  hoogste 1-s-waarde teruglevering (W),
    un:   laagste spanning (0,1 V)
  }
}
```

- **Omvang:** circa 40 bytes binair per record → circa 400 kB voor 7 dagen. Past op de flash van de dongle; in fase 0 de vrije ruimte naast de DSMR-API-bestanden controleren.
- **Ringbuffer:** bij vol overschrijft het oudste; de meetduur staat in het statusbestand.
- **Gebeurtenissen:** stroomstoring, dongle herstart, meterwissel (ander meter-ID) en — voor fase 3 — **fasesprongen** (plotselinge ΔP > drempel op één fase) als losse regels met tijdstempel.
- **Tijd komt uit het telegram**, niet uit wifi of NTP. De meting blijft dus kloppen zonder internet.

## Uitvoerformaat `yourwkb-p1` v1

```json
{
  "formaat": "yourwkb-p1",
  "versie": 1,
  "dongle": { "id": "PRO-3F9A21", "firmware": "ywkb-meet 1.0.0" },
  "meter":  { "p1Versie": "50", "fasen": 3 },
  "project": "K7Q2MX",
  "periode": { "start": 1788998400, "eind": 1789603200 },
  "records": [ { "t": 1788998400, "n": 60,
                 "L1": { "pa": 412, "pax": 2310, "pt": 0, "ptx": 0, "un": 2291 },
                 "L2": { "pa": 95,  "pax": 140,  "pt": 820, "ptx": 1205, "un": 2334 },
                 "L3": { "pa": 230, "pax": 1980, "pt": 0, "ptx": 0, "un": 2287 } } ],
  "gebeurtenissen": [ { "t": 1789101120, "soort": "stroomstoring" } ]
}
```

- **Geen klantnaam, geen adres, geen meternummer.** Het meter-ID wordt op de dongle gehasht; de ruwe waarde verlaat de dongle niet.
- Records mogen binair/gecomprimeerd in een `data`-veld (base64url) komen zodra de omvang dat vraagt; de app ondersteunt dan beide.

## Rekenregels (pure functies, in de regressiesuite)

Alle functies zonder bijwerkingen in `WkbApp.jsx`, zodat `tests/extract-logica.js` ze oppakt. Fixtures uit fase 0 zijn de testbasis.

- **`samenvatP1Meting(meting)`** → per fase:
  - `nettoPiek1min` = max over minuten van (`pa − pt`) — **dit is de waarde voor de Fasecheck**
  - `p95Netto1min` = 95e percentiel van (`pa − pt`)
  - `gemAfname`, `gemTeruglevering`
  - `max1s` = max van `pax` (informatief; de hoofdzekering is thermisch traag)
  - `minSpanning`
  - daarnaast `gelijktijdigePiek3f` (hoogste som over drie fasen in één minuut) en `onbalans` (grootste verschil tussen fasen in de minuut van de gelijktijdige piek).
- **`beoordeelMeetkwaliteit(meting)`** → `dekking` (% minuten met `n ≥ 50` bij DSMR 5, `n ≥ 5` bij DSMR 4), `dagen`, en een label:
  - dekking ≥ 90 % en ≥ 5 dagen → **"gemeten"**
  - dekking 70–90 % of 2–5 dagen → **"gemeten — onvolledig"**, met reden
  - anders → **"onvoldoende meetdata"**; de Fasecheck valt terug op schatting
- **`fasePiekUitMeting(samenvatting, kwaliteit)`** → invoerobject voor de Fasecheck:
  `{ L1, L2, L3, bron: 'gemeten', label, periode }`. Bij kwaliteit "onvoldoende" `null`.

**Aanpassing Fasecheck-rekenkern (meenemen in R3b):**

- Invoer per fase krijgt `bron: 'geschat' | 'gemeten'`.
- Bij `gemeten` wordt de gelijktijdigheidsfactor **niet** op de basisbelasting toegepast, wel op het nieuwe apparaat waar relevant.
- De reserve (default 1,0 kW) blijft staan: een week in september zegt niets over een koude week in januari met warmtepomp.
- Het label in rapport en UI wordt "gemeten over n dagen (dd-mm t/m dd-mm)" in plaats van "indicatie o.b.v. schatting".

## Import in de app (fase 1)

1. Installateur verbindt de telefoon met de wifi van de dongle en opent de dongle-pagina.
2. **"Download meting"** → het bestand deelt hij naar YourWkb (bestaande Web Share Target), of hij kiest het bestand in de app.
3. De app valideert naar het patroon van `saneerProject`: formaat en versie, maximale omvang (2 MB), maximaal 20.160 records (14 dagen), getallen in plausibel bereik, onbekende velden weg.
4. De meting wordt aan het project gekoppeld en **lokaal** opgeslagen, net als alle projectdata.
5. In de Fasecheck verschijnt boven de per-fase-invoer één statusvlak: meetkwaliteit + periode, en een compacte balk met netto piek per fase. De invoervelden zijn voorgevuld; aanpassen blijft mogelijk en zet de bron terug op `geschat` voor die fase.

**UI-regels (conform `design-spec.md`):** meetwaarden in `S.inputMeting`; meetkwaliteit als statusvlak met teken + kleur + rand; nooit kleur-alleen. Geen grafiek in de standaardweergave; een inklapbare dagcurve per fase mag.

## Centraal doorgeefluik (fase 2)

### Botsing met vaste principes — eerst besluiten

`CLAUDE.md` legt vast: *"alle projectdata staat op het toestel van de gebruiker — wij hebben geen database met dossiers"*, en *cloud sync* staat onder **bewust vervallen**. Een doorgeefluik is geen sync en geen dossier, maar het is wel data op onze server. Het ontwerp hieronder is gemaakt om beide principes overeind te houden; het besluit ligt bij Martin.

### Ontwerp

- **Eindpunt-tot-eindpuntversleuteling.**
  - Elke dongle krijgt bij het flashen een eigen sleutel (256 bit), opgeslagen in de NVS van de dongle.
  - Dezelfde sleutel staat als QR-label op de behuizing: `ywkb-p1:<dongleId>:<sleutel-base64url>`.
  - De dongle versleutelt elke batch met AES-256-GCM.
  - De installateur scant het label in de app; de sleutel staat daarna alleen lokaal in het project.
  - **De server ziet alleen versleutelde blobs.**
- **Geen adres, geen klant.** Opslag uitsluitend onder `dongleId`; de koppeling aan klant en adres bestaat alleen in de app.
- **Kort bewaren.** Elke batch krijgt een TTL van 30 dagen; na succesvol ophalen verwijdert de app de batches expliciet.
- **Store-and-forward.** De dongle logt altijd lokaal en verstuurt per 15 minuten; bij wifi-uitval gaat de achterstand later mee. Volgnummer per batch, zodat gaten en dubbelen detecteerbaar zijn.

### Endpoints

| Route | Aanroeper | Beveiliging | Werking |
|---|---|---|---|
| `POST /api/p1/ingest` | dongle | HMAC over body met apparaatsleutel-afgeleide (`HKDF(sleutel, "ingest")`); server kent alleen die afgeleide; rate limit 8/uur per dongle; max 64 kB | slaat `{dongleId, seq, nonce, ciphertext}` op met TTL |
| `GET /api/p1/batches?dongle=&vanaf=` | app | ophaaltoken `HKDF(sleutel, "ophalen")`, server bewaart alleen de hash; rate limit per IP | geeft ciphertext-batches terug |
| `DELETE /api/p1/batches?dongle=&tot=` | app | zelfde ophaaltoken | verwijdert opgehaalde batches |

- **Opslag:** Upstash Redis (al voorzien in `claude_endpoint-hardening-featurespec.md`), sleutel `p1:<dongleId>:<seq>`, TTL 30 dagen.
- **Gedeelde guard:** `app/api/_lib/guard.js` voor rate limiting en foutafhandeling. **Geen** `origineOk` en **geen** Turnstile op `ingest` — een dongle heeft geen Origin-header en geen browser; de HMAC is daar de toegangscontrole.
- **Registratie:** bij het flashen worden `dongleId`, de ingest-afgeleide en de hash van het ophaaltoken server-side geregistreerd. Een onbekende `dongleId` krijgt 403.
- **Intrekken:** dongle kwijt of niet teruggekomen → registratie verwijderen; batches vervallen vanzelf.
- **Monitoring:** geweigerde requests loggen (reden, dongleId), geen payload.

### Aandachtspunten fase 2

- **AVG:** ook versleutelde data van een klant blijft een verwerking. Verwerkersovereenkomst met de installateur (hij is verwerkingsverantwoordelijke), bijwerken van `privacy-page.js` en `avg-page.js`, EU-regio voor Upstash.
- **Vercel-plan:** het project draait op het hobby-plan. Controleer vóór fase 2 of dat past bij een betaalde dienst met extra serverfuncties.
- **Wifi van de klant:** de klant voert het wachtwoord in op de dongle-pagina, niet de installateur. Geen wifi of te zwak signaal in de meterkast → terugvallen op fase 1 (offline uitlezen).

## Fase per aardlek bevestigen (fase 3)

### Werking

1. In interactie 4 van de Kastscan tikt de installateur op *"bevestig met meter"* bij RCD n.
2. De app vraagt: *"Zet RCD n uit, wacht 5 seconden, zet hem weer aan."* en start een venster van 60 s.
3. De dongle detecteert in dat venster een daling en herstel van netto vermogen, en stuurt die gebeurtenis direct door via het doorgeefluik, of logt hem voor latere import.
4. De app matcht op tijdvenster en toont: *"RCD 2 → L3 (−1,4 kW)"*. De installateur bevestigt; de fase wordt ingevuld met herkomst *"bevestigd met meter"*.

### Detectieregels

- Sprong telt als **ΔP ≥ 250 W** op één fase, gevolgd door herstel binnen ±20 % van de uitgangswaarde.
- De andere twee fasen veranderen in hetzelfde telegram minder dan 30 % van die sprong.
- Sprongen op **twee of drie fasen tegelijk** → het blok bevat meerfasige belasting of hangt achter een vierpolige aardlek. Uitkomst: *"meerdere fasen — controleer per groep"*, geen enkelvoudige toewijzing.
- **Geen sprong ≥ 250 W:** de uitkomst is *"te weinig belasting achter deze aardlek"*, met de suggestie een waterkoker of kachel op een groep van dat blok aan te zetten en opnieuw te proberen.
- **DSMR 4 (10 s-cadans):** uit-periode verlengen naar 25 s; oordeel labelen als "lagere zekerheid".
- **Tegenstrijdig met Kastscan-invoer:** tonen als verschil, nooit stil overschrijven. Achter een tweepolige aardlek geldt de Kastscan-regel: één fase voor het hele blok.

### Veiligheid en toon

- **Een aardlek uitschakelen zet stroom af bij de klant.** Vóór de proef één melding: vriezer, thuiswerkplek, medische apparatuur, domotica — klant op de hoogte? Nooit automatisch starten.
- De bevestiging is een hulpmiddel; herkomst *"bevestigd met meter"* in het rapport, geen "gecontroleerd" of "vastgesteld".

## Vastlegging

- **Opleverrapport:**
  - meetperiode en meetkwaliteit;
  - per fase netto piek (1-min), P95 en laagste spanning;
  - gelijktijdige 3-fasepiek en onbalans;
  - bron per waarde in de Fasecheck (`gemeten`/`geschat`);
  - bij fase 3 de herkomst per aardlek.
- **Meterkastpaspoort:** voorstel voor een compact veld in spec v0.3 (niet in v0.2, om die niet op te houden), zodat een volgende installateur weet dat er gemeten is en hoe zwaar:
  `bm: { d: 7, p: [3.1, 1.2, 4.6], j: "2026-09" }` — dagen, netto piek per fase in kW (1 decimaal), jaar-maand. QR-omvang blijft beperkt.
- **Analytics:**
  - `p1_meting_geimporteerd` (dagen, dekking-klasse, fasen, DSMR-versie);
  - `p1_fasecheck_gemeten` (oordeel);
  - `p1_fase_bevestigd` (resultaat: enkelvoudig / meerfasig / te weinig belasting).
  - Nooit dongleId, projectcode of meetwaarden.

## Privacy & AVG

- **Een weekprofiel is een persoonsgegeven:** het laat zien wanneer iemand thuis is, kookt en slaapt. Toestemming van de klant bij het achterlaten, vastgelegd in het project.
- **Dataminimalisatie:** in rapport en paspoort komen alleen afgeleide waarden. De minuutrecords blijven bij het project op het toestel en worden niet meegestuurd in e-mail of PDF.
- **Label op de dongle:** *"YourWkb-meting — niet verwijderen vóór [datum]"* plus contactnummer van de installateur. Geen klantgegevens op het label.
- **Fase 2** alleen met de versleuteling en bewaartermijn zoals beschreven.

## Aansprakelijkheid / toon

De P1-meting is een meethulpmiddel over een beperkte periode. Hij geeft geen garantie over toekomstige belasting en vervangt geen beoordeling door de installateur conform NEN 1010. In de UI: "gemeten over n dagen", "bevestigd met meter" — nooit "gekeurd", "goedgekeurd" of "vastgesteld".

## Randgevallen

- **P1-poort bezet:** doorlussen via de P1-uitgang van de Pro+. Vóór vertrek controleren dat het doorgeluste apparaat (loadbalancer, batterij) weer data krijgt.
- **Geen parasitaire voeding** (DSMR 2.2/3/4, of een gevoelig afgestelde 5.0-meter): USB-voeding. Geen stopcontact in de meterkast → geen meting, niet improviseren met verlengkabels door de kastdeur.
- **1-fase aansluiting:** meten werkt; alleen L1 in samenvatting en Fasecheck; fase 3 overbodig.
- **Stroomstoring of dongle-herstart tijdens meting:** gat in de records; dekking daalt; gebeurtenis in rapport.
- **Meterwissel tijdens meting:** ander meter-ID → meting splitsen; alleen het deel na de wissel gebruiken.
- **Klant trekt dongle eruit:** meting tot dat moment is bruikbaar als de kwaliteitsregels het toelaten.
- **Thuisbatterij of laadpaal met eigen sturing:** de meting toont de *gestuurde* situatie. Label in het rapport: *"gemeten met actieve sturing van [apparaat]"* — de ongestuurde piek kan hoger zijn.
- **PV op één fase:** netto per fase kan langdurig negatief zijn; `nettoPiek1min` blijft de hoogste afname, niet de hoogste absolute waarde.
- **Zomermeting vóór een warmtepomp-installatie:** de reserve niet verlagen op basis van de meting; hint *"meetperiode buiten stookseizoen"* bij mei t/m september.
- **Belgische meter zonder geactiveerde P1-poort:** dongle meldt geen telegrammen → melding met verwijzing naar activeren via Fluvius.

## Buiten scope

- Realtime load balancing of sturen van apparaten (dat blijft de Home Assistant-fasebewaker).
- Groep- of aardlek-fase afleiden uit weekdata zonder schakelproef — niet betrouwbaar, niet doen.
- Eigen hardwareproductie; eventueel later in samenwerking met Smartstuff.
- HomeWizard Energy+-export als bron (data zit in het account van de klant) — mogelijk later via de HomeWizard-compatibele API.

## Acceptatiecriteria

**Fase 0**
- Ruwe telegrammen van de referentiemeter staan als fixtures in de repo.
- Per-fase-vermogen afname en teruglevering aanwezig; resolutie genoteerd.
- Doorlussen via de Pro+ verstoort de bestaande P1-uitlezing niet.
- De handmatige stapproef wijst drie van de drie keer de juiste fase aan.

**Fase 1**
- Een meting van ≥ 5 dagen levert per fase een `nettoPiek1min` binnen 5 % van de referentiereeks.
- Een bestand met dekking < 70 % leidt tot "onvoldoende meetdata" en de Fasecheck valt terug op schatting — zonder foutmelding.
- Bij bron `gemeten` past de Fasecheck geen gelijktijdigheidsfactor toe op de basisbelasting; de reserve blijft 1,0 kW.
- Handmatig aanpassen van een voorgevulde fase zet de bron van die fase op `geschat`.
- Een bestand met klantnaam, adres of meternummer in onbekende velden wordt geschoond vóór opslag.
- Rapport toont meetperiode, kwaliteit en bron; e-mail en PDF bevatten geen minuutrecords.
- `samenvatP1Meting`, `beoordeelMeetkwaliteit` en `fasePiekUitMeting` zitten in de regressiesuite; suite volledig groen.

**Fase 2**
- De server bevat na ingest alleen ciphertext; zonder QR-sleutel is een batch niet te lezen.
- Een `ingest` zonder geldige HMAC of van een onbekende dongle krijgt 403.
- Batches zijn na ophalen verwijderd, en uiterlijk na 30 dagen verlopen.
- Wifi-uitval van 6 uur leidt na herstel tot een complete reeks zonder gaten of dubbelen.

**Fase 3**
- Op de referentie-installatie geeft de schakelproef per aardlek de fase uit `fasebewaker.yaml`.
- Een blok met meerfasige belasting geeft "meerdere fasen", nooit een enkele fase.
- Zonder voldoende belasting komt de uitkomst "te weinig belasting", nooit een gok.
- Een uitkomst die afwijkt van de Kastscan-invoer wordt als verschil getoond, niet overschreven.

## Open vragen / te verifiëren

1. **Licentie DSMR-API-firmware** (repo `mhendriks/DSMR-API-V2` en de actuele v5): mag een commerciële fork met meetmodus? Alternatief: samenwerking met Smartstuff zodat de meetmodus in hun firmware komt.
2. **Principebesluit fase 2:** past een versleuteld doorgeefluik binnen "geen database met dossiers"?
3. **Vrije flash** op de Pro+ naast DSMR-API-historie: genoeg voor 7 dagen minuutrecords? (fase 0, stap 5)
4. **Parasitaire voeding met doorgelust apparaat:** werkt de Pro+ plus bijv. een laadpaal-loadbalancer samen op één DSMR 5-poort? (fase 0, stap 4, en bij de veldpilot)
5. **Vercel-plan** voor extra serverfuncties in een betaalde dienst.
6. **MKP spec v0.3:** veld `bm` afstemmen met de open-standaardroute (meterkastpaspoort.nl).
7. **Belgische meters:** testexemplaar nodig vóór uitrol buiten Nederland.

---
*Opgesteld september 2026, op basis van de P1-verkenning (HomeWizard- en Smartstuff-documentatie), `claude_fasecheck-featurespec.md`, `claude_kastscan-featurespec.md`, `claude_endpoint-hardening-featurespec.md` en `CLAUDE.md`.*
