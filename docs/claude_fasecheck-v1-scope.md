# Gemeten Fasecheck v1 — scope en ontwerpbesluiten

*Vastgelegd 11-09-2026 na het scopegesprek met Martin. Bouwt op `claude_p1-meting-featurespec.md` en scherpt die aan voor v1. Meetresultaten van de dongle: `claude_p1-spike-2026-09-11.md`.*

---

## Doel van v1

> Er staat een P1-dongle bij de klant vóór het werk begint. Bij aankomst weet de installateur **wat elke fase nu draagt**, **waar de uitbreiding het beste komt**, en **of de fasen beter verdeeld moeten worden**.

Dat is geen advies achteraf in het rapport — het is informatie die de installateur nodig heeft vóór hij begint.

## Besluiten van 11-09-2026

| Vraag | Besluit | Gevolg |
|---|---|---|
| Verdelingsadvies in v1? | **ja** | de aardlek-proef is kern, niet sluitstuk — schuift van fase 3 naar v1 |
| Wie plaatst de dongle? | **de installateur** | geen consumenten-onboarding nodig; wifi-koppeling doet de vakman |
| Centraal doorgeefluik? | **niet in v1** | alles blijft lokaal; het privacy-anker blijft ongemoeid |
| Hardware | **Pro+**, met P1-uitgang | doorlussen kan; een bezette P1-poort is geen blokkade |

Blijft staan uit de oorspronkelijke spec: de dongle mag na de klus blijven liggen en door de klant worden overgenomen. Dat is v2-gebied — zodra hij blijft doorsturen zit je in het doorgeefluik.

---

## Wat v1 wél kan, en wat niet

Dit is de belangrijkste paragraaf van dit document, omdat de twee helften van het doel **verschillende data** nodig hebben.

### ✅ "Waar komt de uitbreiding het beste?" — kan met de passieve meting

Een week vermogen per fase geeft per fase de piek, de p95 en het gemiddelde. Capaciteit is A × 230 V; vrije ruimte is capaciteit min gemeten piek. Daaruit volgt direct welke fase ruimte heeft voor de laadpaal of warmtepomp.

**Dit vervangt een schatting door een meting.** Nu staat er letterlijk *"indicatie o.b.v. schatting"*.

### ✅ "Staan de fasen scheef?" — kan met de passieve meting

Onbalans is zichtbaar zonder dat je weet wat erachter zit: als L2 op 5,2 kW piekt en L1 op 0,9 kW, is dat een feit uit de meting.

### ⚠️ "Wat moet ik dan verhangen?" — alleen tot op aardlekniveau

Hier zit de grens. Uit verbruiksdata is **niet** af te leiden welke groep op welke fase zit — dat is de kern van de P1-spec. De aardlek-proef vult dat gat, maar tot op het niveau van de **aardlek**, niet de losse groep, en met een **momentopname** van het vermogen.

Wat v1 dus kan zeggen:

> *L2 draagt de piek (5,2 kW van de 5,75 kW capaciteit). Achter L2 zitten aardlek 2 en aardlek 4. L1 heeft 4,8 kW ruimte.*

Wat v1 **niet** kan zeggen:

> ~~*Verhang de wasmachine naar L1.*~~

Want hoeveel elk apparaat over een week bijdraagt is niet te scheiden uit het opgetelde vermogen van een fase. De installateur beslist wat hij verhangt; de app levert de feiten. Dat past ook bij de zuiverheidsregel: **wij verifiëren niets, wij maken controleerbaar.**

---

## Het obstakel dat de flow bepaalt

De aardlek-proef zoals de P1-spec hem beschrijft gaat uit van directe terugkoppeling: de app zegt "zet RCD 2 uit", kijkt mee, en meldt *"RCD 2 → L3 (−1,4 kW)"*. Dat vraagt dat de app tijdens de proef met de dongle praat.

**Dat kan niet rechtstreeks.** De app draait op `https://yourwkb.nl`; de dongle serveert gewone `http://`. Een HTTPS-pagina mag geen HTTP-verzoeken doen — browsers blokkeren dat als mixed content. Dat is geen instelling die je omzet, en het is ook niet op te lossen door de dongle: die heeft geen geldig certificaat en kan dat op een `.local`-adres ook niet krijgen.

Het doorgeefluik zou dit oplossen, maar dat is bewust uit v1 gehouden.

### De route die wél werkt, en on-site blijft

Terugkoppeling hoeft niet *tijdens* de proef te komen — alleen vóórdat de installateur weer in de bus stapt.

1. **Schouwbezoek.** Dongle in de P1-lijn (doorgelust, bestaande apparatuur blijft werken). Projectcode invoeren, meetmodus starten.
2. **Aardlek-proef, in één doorloop.** De installateur schakelt de aardlekken één voor één ~15 s uit. Zes aardlekken ≈ twee minuten. De dongle logt de sprongen als gebeurtenissen.
3. **Direct uitlezen.** Installateur opent de dongle-pagina, downloadt het bestand, deelt het naar YourWkb via de bestaande Web Share Target.
4. **De app rekent en toont het meteen.** *"Aardlek 2 → L3 · Aardlek 3 → te weinig belasting, zet een waterkoker aan en herhaal."* De installateur staat er nog — hij kan een mislukte proef meteen overdoen.
5. **Dongle blijft een week liggen** en meet passief door.
6. **Installatiebezoek.** Nogmaals uitlezen; nu met een week meetdata. De Fasecheck rekent met `bron: 'gemeten'`.

Stap 3 en 4 kosten samen ongeveer een minuut en vragen geen server, geen account en geen internetverbinding bij de klant. **De meetdata verlaat het lokale netwerk niet totdat de installateur hem zelf in de app zet.**

---

## Wat er gebouwd moet worden

In deze volgorde, omdat elke stap de vorige nodig heeft.

### 1 · Rekenkern uitbreiden met `bron` — kan nu meteen

De Fasecheck-rekenkern accepteert per fase `bron: 'geschat' | 'gemeten'`. Bij `gemeten`:
- de gelijktijdigheidsfactor 0,6 gaat **niet** over de basisbelasting — een gemeten piek bevat de gelijktijdigheid al — wel over het nieuwe apparaat;
- de reserve van 1,0 kW blijft staan (een week in september zegt niets over januari met een warmtepomp);
- het label wordt *"gemeten over n dagen (dd-mm t/m dd-mm)"* in plaats van *"indicatie o.b.v. schatting"*.

Pure functies, zodat `extract-logica.js` ze oppakt. **Dit hangt aan geen enkele ontbrekende spec en kan los.**

### 2 · Meetmodus op de dongle

Logt per minuut per fase. **Let op de bevinding uit de spike:** het bestandssysteem is 128 kB en een week minuutrecords past daar in geen realistische vorm op. Te kiezen: grover interval, binair gepakt, of alleen de velden die de rekenregels gebruiken. Dit moet uitgerekend zijn vóór de firmware af is.

Daarnaast logt hij **gebeurtenissen**: een vermogenssprong op één fase met herstel, volgens de detectieregels uit de P1-spec (≥ 250 W, andere fasen < 30 % van die sprong).

### 3 · Import en samenvatting in de app

`samenvatP1Meting`, `beoordeelMeetkwaliteit`, `fasePiekUitMeting` — pure functies, fixtures uit de spike als testbasis.

### 4 · Aardlek→fase uit de gebeurtenissen

Matchen op tijdvenster, met de bestaande detectieregels. Meerfasige sprong → *"meerdere fasen — controleer per groep"*. Tegenstrijdig met handmatige invoer → tonen als verschil, **nooit stil overschrijven**.

### 5 · Verdelingsadvies

Per fase: capaciteit, gemeten piek, vrije ruimte, en welke aardlekken erop zitten. Oordeel groen/oranje/rood en beste fase voor het nieuwe apparaat. Advies over verhangen **noemt aardlekken, geen apparaten** — zie de grens hierboven.

---

## Veiligheid en toon

**Een aardlek uitschakelen zet stroom af bij de klant.** Vóór de proef één melding: vriezer, thuiswerkplek, medische apparatuur, domotica — is de klant op de hoogte? Nooit automatisch starten.

Herkomst in het rapport is *"bevestigd met meter"*. Niet "gecontroleerd", niet "vastgesteld". Het advies is een hulpmiddel; de installateur blijft verantwoordelijk.

## Toets aan de flow-regel

Wordt de standaardflow klant-tot-rapport langer? **Nee.**

- **Optioneel:** zonder dongle werkt de Fasecheck zoals hij is, met schatting.
- **Vervangt handwerk:** de aanvinklijst met standaardvermogens verdwijnt voor die klus, en de aardlek-proef vervangt gokken of natrekken.
- **Buiten de standaardflow:** de dongle wordt geplaatst bij het schouwbezoek, dat er toch al is. Geen extra rit.
- **Importeren is één handeling** via de bestaande Web Share Target.

---

## Wat open blijft

- **De fasecheck-featurespec zelf ontbreekt nog** (`claude_fasecheck-featurespec.md`). Dit document vervangt hem niet — het legt alleen de v1-scope en de meetkant vast. Voor de rekenregels van de Fasecheck (PV-export als negatieve belasting, batterij laden én ontladen, beste-fase-advies) is die spec nodig.
- **Opslagberekening meetmodus** — zie stap 2, moet vóór de firmware rond zijn.
- **De dongle overnemen door de klant** — v2, raakt het doorgeefluik.
- **Fase 0 fysiek afmaken:** doorlussen naast de fasebewaker en de handmatige stapproef (oven → L3, wasmachine → L2, kookplaat → L1) op de referentie-installatie.
