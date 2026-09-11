# Gemeten Fasecheck v1 — scope en ontwerpbesluiten

*Vastgelegd 11-09-2026 na het scopegesprek met Martin. Bouwt op `claude_p1-meting-featurespec.md` en scherpt die aan voor v1. Meetresultaten van de dongle: `claude_p1-spike-2026-09-11.md`.*

> **Herzien 11-09-2026.** Een eerdere versie van dit document zette het centrale doorgeefluik buiten v1. Dat was een aanname, geen besluit van Martin — en hij klopte niet: het doel is juist dat de installateur de Fasecheck **ziet vóórdat hij naar de klus rijdt**, en dat kan alleen als de data uit zichzelf bij YourWkb komt.

---

## Doel van v1

> De dongle staat bij de klant en stuurt zijn meting via de wifi van de klant in blokken door, per project. De installateur opent de app **voordat hij vertrekt** en ziet: wat draagt elke fase nu, waar kan de uitbreiding het beste komen, en moeten de fasen beter verdeeld worden.

De winst zit in het woord **vooraf**. Een meting die je pas op locatie kunt uitlezen, vertelt je niets wat je bij het plannen van de klus al had willen weten.

## Besluiten van 11-09-2026

| Vraag | Besluit | Gevolg |
|---|---|---|
| Verdelingsadvies in v1? | **ja** | de aardlek-proef is kern, niet sluitstuk — schuift van fase 3 naar v1 |
| Wie plaatst de dongle? | **de installateur** | geen consumentenverzending in v1 |
| Centraal doorgeefluik? | **ja, in v1** | dit is het expliciete besluit dat de P1-spec aan Martin voorlegde |
| Hardware | **Pro+**, met P1-uitgang | doorlussen kan; een bezette P1-poort is geen blokkade |

Blijft staan: de dongle mag na de klus blijven liggen en door de klant worden overgenomen. Met een doorgeefluik vraagt dat een expliciete **stopstap** — zie *Overdracht aan de klant*.

---

## Wat v1 wél kan, en wat niet

De twee helften van het doel hebben **verschillende data** nodig. Dat is de belangrijkste grens in dit document.

### ✅ "Waar komt de uitbreiding het beste?" — uit de passieve meting

Vermogen per fase over een week geeft piek, p95 en gemiddelde. Capaciteit is A × 230 V; vrije ruimte is capaciteit min gemeten piek. Daaruit volgt direct welke fase ruimte heeft.

**Dit vervangt een schatting door een meting.** Nu staat er letterlijk *"indicatie o.b.v. schatting"*.

### ✅ "Staan de fasen scheef?" — uit de passieve meting

Onbalans is zichtbaar zonder te weten wat erachter zit: L2 die op 5,2 kW piekt terwijl L1 op 0,9 kW blijft, is een feit uit de meting.

### ⚠️ "Wat moet ik dan verhangen?" — tot op aardlekniveau, niet per apparaat

Uit verbruiksdata is niet af te leiden welke groep op welke fase zit. De aardlek-proef vult dat gat, maar tot op het niveau van de **aardlek**, en met een **momentopname** van het vermogen.

Wat v1 kan zeggen:

> *L2 draagt de piek (5,2 kW van 5,75 kW capaciteit). Achter L2 zitten aardlek 2 en aardlek 4. L1 heeft 4,8 kW ruimte.*

Wat v1 **niet** kan zeggen:

> ~~*Verhang de wasmachine naar L1.*~~

Hoeveel elk apparaat over een week bijdraagt is niet te scheiden uit het opgetelde vermogen van een fase. De installateur beslist wat hij verhangt; de app levert de feiten. Dat past bij de zuiverheidsregel: **wij verifiëren niets, wij maken controleerbaar.**

---

## Hoe de data bij de installateur komt

### Het doorgeefluik, zoals de P1-spec het ontwierp

Het ontwerp is er juist op gemaakt om *"alle projectdata staat op het toestel"* en *geen cloud sync* overeind te houden:

- **Eindpunt-tot-eindpuntversleuteling.** Elke dongle krijgt bij het flashen een eigen 256-bits sleutel, ook als QR op de behuizing. De installateur scant dat label; de sleutel staat daarna alleen lokaal in het project. **De server ziet uitsluitend versleutelde blobs.**
- **Geen adres, geen klant.** Opslag alleen onder `dongleId`. De koppeling aan klant en adres bestaat alleen in de app.
- **Kort bewaren.** TTL 30 dagen; na ophalen verwijdert de app de batches expliciet.
- **Store-and-forward.** De dongle logt altijd lokaal en verstuurt per 15 minuten; bij wifi-uitval gaat de achterstand later mee, met volgnummers zodat gaten en dubbelen zichtbaar zijn.

Het is dus geen dossier en geen sync: het is een tijdelijke, versleutelde brievenbus waar alleen de app met de gescande sleutel iets uit kan halen.

### De flow bij een klus

1. **Schouwbezoek.** Dongle doorgelust in de P1-lijn; bestaande apparatuur blijft werken. Installateur scant de sleutel-QR, koppelt de dongle aan het project, start de meetmodus.
2. **Wifi.** De **klant** voert zijn eigen wifi-wachtwoord in op de dongle-pagina — niet de installateur.
3. **Aardlek-proef in één doorloop.** Aardlekken één voor één ~15 s uit; zes stuks ≈ twee minuten. Een gebeurtenis triggert een **directe verzending**, los van de cadans van 15 minuten, zodat de app het resultaat binnen seconden toont en de installateur een mislukte proef ter plekke kan overdoen.
4. **Dongle blijft een week liggen** en stuurt passief door.
5. **Vóór het installatiebezoek** opent de installateur het project. De app haalt de batches op, ontsleutelt lokaal, en toont de Fasecheck met `bron: 'gemeten'`. **Dit is de winst.**
6. **Na de klus:** dongle mee terug, of overdragen aan de klant met de stopstap hieronder.

### Terugvalroute als er geen wifi is

Geen of te zwak signaal in de meterkast komt voor. Dan geldt fase 1 uit de P1-spec: de installateur downloadt het bestand van de dongle-pagina en deelt het naar YourWkb via de bestaande Web Share Target.

**Let op waarom dat een aparte route moet zijn:** de app draait op `https://yourwkb.nl` en de dongle serveert `http://`. Een HTTPS-pagina mag geen HTTP-verzoeken doen — browsers blokkeren dat als mixed content, en een `.local`-adres kan geen geldig certificaat krijgen. De app kan de dongle dus **nooit rechtstreeks bevragen**. Via het doorgeefluik speelt dat niet (de app praat met `yourwkb.nl` over HTTPS, de dongle stuurt zelf uit), maar de offline terugval moet het daarom via een bestand doen en niet via een directe verbinding.

---

## Wat er eerst besloten of geregeld moet zijn

Het doorgeefluik is geen losse feature; het maakt van YourWkb een dienst met een serverkant. Vier dingen moeten rond zijn **voordat** er code naar productie gaat:

| Punt | Waarom het niet kan wachten |
|---|---|
| **Verwerkersovereenkomst met de installateur** | Ook versleutelde meetdata van een klant is een verwerking. De installateur is verwerkingsverantwoordelijke, YourWkb verwerker. |
| **`privacy-page.js` en `avg-page.js` bijwerken** | Er staat nu dat wij niets bewaren. Dat wordt: wij bewaren tijdelijk versleutelde blokken die wij zelf niet kunnen lezen. Dat verschil moet er eerlijk staan. |
| **Upstash in de EU-regio** | Volgt uit het bovenstaande. |
| **Vercel-plan** | Het project draait op het hobby-plan. Een betaalde dienst met extra serverfuncties hoort daar niet op. |

Daarnaast een operationeel punt dat de spec noemt maar dat makkelijk wordt vergeten: **elke dongle moet bij het flashen geregistreerd worden** (dongleId, ingest-afgeleide, hash van het ophaaltoken). Een onbekende dongle krijgt 403. Er moet dus een klein uitgifteproces zijn, inclusief intrekken als een dongle kwijtraakt of niet terugkomt.

---

## Wat er gebouwd moet worden

In deze volgorde, omdat elke stap de vorige nodig heeft.

**1 · Rekenkern uitbreiden met `bron`** — kan meteen, hangt aan niets.
Per fase `bron: 'geschat' | 'gemeten'`. Bij `gemeten` gaat de gelijktijdigheidsfactor 0,6 **niet** over de basisbelasting — een gemeten piek bevat de gelijktijdigheid al — wel over het nieuwe apparaat. De reserve van 1,0 kW blijft (een week in september zegt niets over januari met een warmtepomp). Label wordt *"gemeten over n dagen (dd-mm t/m dd-mm)"*. Pure functies, zodat `extract-logica.js` ze oppakt.

**2 · Meetmodus + gebeurtenislogging op de dongle.**
Per minuut per fase. **Bevinding uit de spike: het bestandssysteem is 128 kB en een week minuutrecords past daar in geen realistische vorm op.** Met store-and-forward hoeft alleen de achterstand lokaal te passen, niet de hele week — dat verzacht het probleem maar heft het niet op bij langere wifi-uitval. Uitrekenen vóór de firmware af is. Gebeurtenissen volgen de detectieregels uit de P1-spec (sprong ≥ 250 W op één fase, andere fasen < 30 % daarvan).

**3 · Doorgeefluik.** Sleutel bij het flashen, registratie, `POST /api/p1/ingest`, `GET`/`DELETE /api/p1/batches`, Upstash met TTL. Gedeelde `guard.js` voor rate limiting; **geen** `origineOk` op `ingest` — een dongle heeft geen Origin-header, de HMAC is daar de toegangscontrole.

**4 · App: koppelen, ophalen, ontsleutelen.** Sleutel-QR scannen, batches ophalen, lokaal ontsleutelen, samenvatten met `samenvatP1Meting`, `beoordeelMeetkwaliteit` en `fasePiekUitMeting` — pure functies, fixtures uit de spike als testbasis.

**5 · Aardlek→fase uit de gebeurtenissen.** Matchen op tijdvenster. Meerfasige sprong → *"meerdere fasen — controleer per groep"*. Tegenstrijdig met handmatige invoer → tonen als verschil, **nooit stil overschrijven**.

**6 · Verdelingsadvies.** Per fase capaciteit, gemeten piek, vrije ruimte en welke aardlekken erop zitten. Oordeel groen/oranje/rood plus beste fase voor het nieuwe apparaat. Het advies **noemt aardlekken, geen apparaten**.

---

## Overdracht aan de klant

De dongle mag blijven liggen. Met een doorgeefluik moet dat een bewuste handeling zijn, geen stilzwijgend doorlopen: bij overdracht stopt de meetmodus, wordt de registratie ingetrokken en vervallen de resterende batches. Anders blijft er data van een klant binnenkomen op een project dat allang klaar is.

## Veiligheid en toon

**Een aardlek uitschakelen zet stroom af bij de klant.** Vóór de proef één melding: vriezer, thuiswerkplek, medische apparatuur, domotica — is de klant op de hoogte? Nooit automatisch starten.

Herkomst in het rapport is *"bevestigd met meter"*. Niet "gecontroleerd", niet "vastgesteld". Het advies is een hulpmiddel; de installateur blijft verantwoordelijk.

## Toets aan de flow-regel

Wordt de standaardflow klant-tot-rapport langer? **Nee.**

- **Optioneel:** zonder dongle werkt de Fasecheck zoals hij is, met schatting.
- **Vervangt handwerk:** de aanvinklijst met standaardvermogens verdwijnt voor die klus; de aardlek-proef vervangt gokken of natrekken.
- **Buiten de standaardflow:** de dongle wordt geplaatst bij het schouwbezoek, dat er toch al is. Geen extra rit — en het doorgeefluik haalt er juist één weg, want uitlezen op locatie hoeft niet meer.
- **De analyse staat er al** als de installateur de app opent.

---

## Wat open blijft

- **`claude_fasecheck-featurespec.md` ontbreekt.** Dit document legt de v1-scope en de meetkant vast, maar niet de rekenregels van de Fasecheck zelf (PV-export als negatieve belasting, batterij laden én ontladen, beste-fase-advies). Daarvoor is die spec nodig.
- **Opslagberekening meetmodus** — 128 kB, zie stap 2.
- **De vier randvoorwaarden hierboven** (verwerkersovereenkomst, privacyteksten, EU-regio, Vercel-plan).
- **Fase 0 fysiek afmaken:** doorlussen naast de fasebewaker en de handmatige stapproef (oven → L3, wasmachine → L2, kookplaat → L1) op de referentie-installatie.
