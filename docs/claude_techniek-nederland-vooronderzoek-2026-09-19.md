# Techniek Nederland en de Sticker Gecontroleerd — vooronderzoek

*19-09-2026. Vooronderzoek, nog geen besluit. Bijgewerkt dezelfde dag met §6 (TN t.o.v. InstallQ, sleutelhouders), §7 (demo-sticker) en §8 (AVIC, Wkb en BW). Bronnen onderaan.*

**Vraag van Martin:** Techniek Nederland geeft elk jaar stickers uit aan gecertificeerde
vakmensen. Kan dezelfde route die voor InstallQ is gebouwd (erkenningsverklaring, spec
hoofdstuk 10) ook Techniek Nederland binnenhalen?

**Kort antwoord:** ja, maar met één wezenlijk verschil. Techniek Nederland is geen
erkenner en geen certificerende instelling; het is de branchevereniging. Het kan dus alleen
ondertekenen wat het zelf afgeeft: **het lidmaatschap en het recht om de Sticker
Gecontroleerd van een bepaald jaar te voeren** — niet het CO-certificaat zelf. De sterkste
toepassing is een QR op de sticker die naar een door Techniek Nederland ondertekende
verklaring wijst: dan wordt een sticker die nu te kopiëren is, controleerbaar.

---

## 1 · Wat de Sticker Gecontroleerd is

| | |
|---|---|
| **Wat** | Jaarsticker (2025, 2026, 2027 …) op een gasverbrandingstoestel na installatie of onderhoud. Er is ook een variant **ventilatie/koeling**. |
| **Waarvoor** | Bewijs voor de klant dat het werk is gedaan door een CO-gecertificeerd bedrijf (Gasketelwet, verplicht sinds 1 april 2023) volgens de **tien controlepunten** van Techniek Nederland. |
| **Wie mag hem bestellen** | Alleen leden: de stickers "kunnen alleen door 'onze' installatiebedrijven besteld en gebruikt worden". Bestellen vraagt het **certificaatnummer van de certificerende instelling**; zonder dat nummer kan het niet. |
| **Wat staat erop** | Gepersonaliseerd (ongepersonaliseerd bestellen kan niet meer): **certificaatnummer**, **bedrijfsgegevens**, **telefoonnummer** van de installateur, het **CO-vrij-keurmerk** van de overheid, en ruimte voor wanneer de volgende onderhoudsbeurt is. |
| **Waar** | Op het toestel, bij de schoorsteenplaat of de geschiktheidsverklaring. |
| **Bestellen** | Via het publicatieplatform (`tnl.nu/publicatie-platform`), met de oude inloggegevens van Techniek Nederland. Doosje van 100, leden vanaf € 6,50. |
| **Doel volgens TN** | Klant ziet dat het bedrijf aan de Gasketelwet voldoet, en "bij inspecties en incidenten kan worden nagegaan wie de ketel heeft gecontroleerd". |

**Voorbeeldsticker (2020, Drive › Meterkastpaspoort › Partijen › TechniekNederland › `TN-sticker.png`)**
bevestigt: **geen QR-code en geen volgnummer.** Velden: jaartal; iconen *Verwarming/Gas* en
*Ventilatie/Koeling*; `www.stickergecontroleerd.nl`; schrijfregels *Datum* en *Volgende*;
bedrijfslogo met postcode en plaats; telefoonnummer; "Lid van Techniek Nederland". Een veld
voor het certificaatnummer staat er nog niet op — dat hoort bij de versies sinds de
Gasketelwet (2023). (Een zoekresultaat over "check je vakspecialist via een QR-code" bleek
over de *Vakpaspoort*-app van Centraal Register Techniek te gaan, niet over de sticker.)

---

## 2 · Het landschap — wie geeft wat uit

| Wat | Uitgever | Openbaar controleerbaar via | Nummer |
|---|---|---|---|
| **CO-bedrijfscertificaat** (wettelijk, Gasketelwet) | certificerende instelling, bv. Kiwa; schema's BRL 6000-25 (InstallQ), BRL K25000 (Kiwa), NHK (alleen haarden/kachels) | **TloKB-register** — `co-vrijregister.nl` → `register.tlokb.nl/co` | certificaatnummer, bv. Kiwa `K0213477` |
| **Bewijs van Vakmanschap CO** (persoon, 5 jaar) | examen | **Vakpaspoort** (Centraal Register Techniek), persoonsgebonden QR die de monteur zelf deelt | — |
| **CO-vrij-beeldmerk** | reglement beheerd door **TloKB** | — | — |
| **InstallQ-erkenning** (elektro, warmtepomp, …) | InstallQ (stichting) | echteinstallateur.nl, CentraalRegisterTechniek.nl | erkenningsnummer |
| **InstallQ Controlezegel CO-vrij** | InstallQ, alleen voor BRL 6000-25-gecertificeerden; € 0,80 per vel van 10 | — | certificaatnummer, bedrijfsnaam, telefoon op de zegel |
| **Lidmaatschap Techniek Nederland** | Techniek Nederland (vereniging) | ledenzoeker op technieknederland.nl | — |
| **Sticker Gecontroleerd** | Techniek Nederland, alleen voor leden | niet (papier) | draagt het certificaatnummer van de CI |

**Verhoudingen.** InstallQ staat los van het lidmaatschap van Techniek Nederland, maar de
twee werken veel samen en zitten in hetzelfde gebouw (Installatiehuis, Woerden), net als
Stichting Centraal Register Techniek. Techniek Nederland stelt het gratis *Pakket
CO-certificering* ter beschikking en heeft een CO-helpdesk (`helpdeskco@technieknederland.nl`).

### Belangrijke vondst over het TloKB-register

Een bedrijfspagina in het register toont **bedrijfsnaam, vestigingsplaats, KVK-nummer,
certificerende instelling, schema, werkzaamheden en "geldig tot"** — maar **niet het
certificaatnummer**. Zoeken kan op naam, plaats en soort werkzaamheden; de adressen zijn
slugs (`/co/certificaathouder/<naam-plaats>`), niet het nummer.

Gevolgen:
- Het certificaatnummer op de sticker is **niet rechtstreeks** in het openbare register na te
  slaan. De betrouwbare brug is het **KVK-nummer** — precies het anker dat de
  erkenningsverklaring in hoofdstuk 10 al gebruikt.
- In YourWkb staat sinds 18-09 **TloKB** als uitgever-keuze voor de erkenning (`tlokb:<nummer>`,
  zoals het voorbeeld in de spec). Een lezer die met dat nummer naar het TloKB-register gaat,
  vindt het daar niet. **Te herzien:** voor CO is het certificaatnummer van de CI het nummer,
  en de controleplek is het TloKB-register op KVK/bedrijfsnaam.

---

## 3 · De InstallQ-route, en hoe Techniek Nederland daarin past

De route die voor InstallQ is gebouwd (spec v0.3):
- **§10 Erkenningsverklaring:** een leesbare, door de uitgever ondertekende URL
  (`/v?u=…&kvk=…&b=…&erk=…&vg=…&bv=…&tot=…&sid=…&sig=…`), met KVK als anker, `tot` als
  vervaldatum (intrekken zonder dat iemand online hoeft), en de publieke sleutel in de index.
  Controle in `v.html`, zonder dat er gegevens worden verstuurd.
- **§10.3 Bevoegdheden** als `soort:waarde` — `zegelrecht:<reeks>`, `co:<nummer>`, `fgas:<nummer>`.
- **§10.4 Meerdere uitgevers:** een uitgever kan alleen ondertekenen wat zij zelf afgeeft.
- **§9 Zegels** en `log[].erk` in het paspoort.

### Wat Techniek Nederland wél kan ondertekenen

| Uitspraak | Van Techniek Nederland? |
|---|---|
| "Dit bedrijf (KVK …) is lid van Techniek Nederland, geldig tot …" | **Ja** — dat geven zij af |
| "Dit bedrijf mag de Sticker Gecontroleerd 2026 voeren" | **Ja** — dat bepalen zij (alleen leden, met CO-certificaatnummer) |
| "Dit bedrijf werkt met de tien controlepunten" | **Ja**, als verenigingsafspraak |
| "Dit bedrijf heeft CO-certificaat K… van Kiwa" | **Nee** — dat geeft de CI af (§10.4). Hooguit "opgegeven bij bestelling", en dan moet dat er ook zo staan. |

Dat past zonder wijziging van het formaat in §10:

```
https://<technieknederland>/v?u=technieknederland&kvk=30269985&b=Installatiebedrijf%20Jansen%20B.V.
  &vg=gas,ventilatie&bv=sticker-gecontroleerd:2026&tot=2027-03-31&sid=tn-2026-01&sig=…
```

- `bv=sticker-gecontroleerd:2026` is een bevoegdheid in dezelfde zin als `zegelrecht`: het recht
  om een uitgegeven merkteken te voeren. Een nieuwe soort in de tabel van §10.3 — dat is een
  aanvulling op de spec (documentversie), geen nieuw datamodel.
- `tot` volgt het stickerjaar. Geen nieuwe verklaring het jaar erna = vanzelf verlopen.

### De sterkste toepassing: een QR op de sticker zelf

Techniek Nederland personaliseert de sticker al per bedrijf op het publicatieplatform, mét het
certificaatnummer. Dezelfde bestelling kan een **QR met de ondertekende verklaring** op de
sticker zetten. Dan:

- scant de bewoner (of de volgende monteur, of een inspecteur na een incident) de ketel en
  ziet in `v.html`: **Echt en geldig — Installatiebedrijf Jansen B.V., KVK …, lid, Sticker
  Gecontroleerd 2026**, of **Komt niet overeen** bij een vervalste of gekopieerde sticker;
- werkt dat offline-verifieerbaar en zonder dat Techniek Nederland een register van adressen
  bijhoudt (§9.4 — geen landelijk bestand van wie in welke woning was);
- kost het Techniek Nederland: één sleutelpaar, één ondertekenstap in het publicatieplatform,
  en één regel in de index die Martin ondertekent.

Een gekopieerde sticker blijft technisch "echt" — de verklaring is een bestand (§10.5). De
menselijke controle blijft: klopt de naam/KVK met de factuur? Maar een sticker met andermans
naam valt dan wél op, en een zelfgemaakte sticker valt direct door de mand.

### Waar het in onze apps landt

- **YourWkb**, discipline **cv-ketel** (BRL 6000-25): het opleverrapport en het paspoort-logboek
  kunnen de verklaring meedragen, en het rapport kan het CO-certificaatnummer met de juiste
  controleplek tonen (TloKB-register op KVK). Dit is het erkenningsblok van **R2**.
- **Kastscan** en de meterkast: nauwelijks — de Sticker Gecontroleerd zit op de ketel, niet in de
  meterkast. De ventilatie/koelingsvariant raakt de warmtepomp (F-gassen) wél.

---

## 4 · Open vragen — voor Martin, en voor Techniek Nederland

1. ~~Staat er een QR of volgnummer op de sticker?~~ **Nee** (voorbeeld 2020, zie §1). Nog na te gaan:
   hoe het certificaatnummer op de huidige versie (2026/2027) staat.
2. **Controleert Techniek Nederland het opgegeven certificaatnummer** (bij de CI of het
   TloKB-register), of is het een opgave van het lid? Dat bepaalt of TN het mag meeondertekenen.
3. **Wat dekt de ventilatie/koelingssticker** — welke certificering hoort erbij (F-gassen, BRL 100/200)?
4. **Aanspreekpunt bij Techniek Nederland** — klimaattechniek / CO-helpdesk / het team achter het
   publicatieplatform. De InstallQ-demokaart (`demo-erkenningsverklaring-kaart.png`) is het model
   voor een TN-variant.
5. **YourWkb:** `tlokb` als uitgever-keuze herzien (zie §2).

## 5 · Voorstel voor de volgende stap (niet gebouwd)

1. ~~Een demo-sticker.~~ **Gedaan 19-09**, zie §7: Sticker Gecontroleerd 2027 met de QR van de
   InstallQ-demo. Een eigen TN-verklaring (`bv=sticker-gecontroleerd:2027`, eigen demosleutel)
   blijft de stap daarna, als TN zelf wil ondertekenen.
2. In `v.html` de bevoegdheid `sticker-gecontroleerd` leesbaar maken ("mag de Sticker
   Gecontroleerd 2026 voeren — lid van Techniek Nederland").
3. Spec §10.3 aanvullen met die soort (documentversie 0.4, datamodel blijft 2).
4. YourWkb: `tlokb` als uitgever vervangen door de CI (Kiwa / InstallQ-schema) met het
   TloKB-register als controleplek.

---

## 6 · Wat Techniek Nederland toevoegt ten opzichte van InstallQ

Techniek Nederland voegt **geen erkenning** toe. InstallQ (stichting) zegt *"dit bedrijf mág dit
werk doen"*: erkenning per vakgebied, schema's als BRL 6000-25, registers
(echteinstallateur.nl, Centraal Register Techniek), bevoegdheden zoals het zegelrecht — los van
het lidmaatschap van TN. Techniek Nederland (vereniging) zegt *"dit bedrijf is lid, en dat heeft
gevolgen voor u"*:

1. **Wat de klant heeft als het misgaat** — consumentenvoorwaarden (AVIC), de Geschillencommissie
   (alleen bij een lid), en de **nakomingsgarantie** van TN (zie §8). Dat gaat niet over
   vakbekwaamheid maar over verhaal.
2. **Een merkteken op het toestel** — de Sticker Gecontroleerd hangt aan het gecontroleerde
   toestel, met de datum. De erkenning hangt aan het bedrijf; de sticker aan het werk.
3. **Een werkwijze** — de tien controlepunten voor gasverbrandingstoestellen.
4. **Een poortwachter, deels** — alleen leden met een CO-certificaatnummer kunnen de sticker
   bestellen. Of TN dat nummer controleert, is open vraag 2.
5. **Bereik** — TN drukt elk jaar stickers voor een groot deel van de branche. Een QR op die
   sticker brengt de standaard in één keer bij veel ketels en bedrijven.

Aanwijzing, niet uitgezocht: voor sommige vakgebieden is een InstallQ-erkenning een voorwaarde
voor het lidmaatschap (bijv. rioleringstechniek).

| Vraag van de klant | Wie verklaart het |
|---|---|
| Mag dit bedrijf aan mijn meterkast of warmtepomp werken? | InstallQ (erkenning) |
| Mag dit bedrijf aan mijn cv-ketel werken? | certificerende instelling (CO-certificaat), controle via TloKB op KVK |
| Is dit bedrijf lid, met geschillencommissie en voorwaarden? | Techniek Nederland |
| Is de sticker op mijn ketel echt? | Techniek Nederland — als er een ondertekende QR op komt |

### Sleutelhouders in dit landschap

Een QR draagt één verklaring van één uitgever. De *route* (formaat, `v.html`, index) is
herbruikbaar; de *handtekening* niet — elke partij tekent alleen wat zij zelf afgeeft (§10.4).

| Sleutelhouder | Rol | Tekent | Stand 19-09-2026 |
|---|---|---|---|
| Martin, beheerder van de standaard | wie is wie | de index | **echt**, vervangen 19-09, vastgepind in de code |
| InstallQ | erkenner | erkenningsverklaring | in de index **zonder sleutel** |
| Techniek Nederland | vereniging | lidmaatschap, recht op de sticker | nog niet in de index |
| Kiwa (en andere CI's) | certificerende instelling | CO-certificaat (`co:K0213477`), F-gassen | nog niet in de index |
| Installatiebedrijven | installateur | eigen logboekregels | alleen **demo** (Installatiebedrijf Jansen) |
| Fabrikanten | uitgever veldnotities | terugroepmeldingen | alleen **demo** (Voorbeeld Elektro B.V.) |

TloKB tekent niets: het beheert het register, geeft geen nummers uit. Het Kiwa-nummer kan zolang
Kiwa niet meedoet alleen als tekst in het logboek (`kiwa:K0213477`); de enige controle is dan het
TloKB-register op KVK. Naamgeving in de index: fabrikanten heten `uitgevers`, verklaarders
`erkenners` — TN en Kiwa passen daar niet goed onder; bij een volgende specversie herzien.

---

## 7 · Demo: Sticker Gecontroleerd 2027 met QR (19-09-2026)

In deze map: `TN-sticker-2027-demo.png` (bron in `TN-sticker-2027-demo-bron/`).

- Gemaakt op het voorbeeld van 2020: jaartal 2027; het logo van het echte bedrijf (de Vaan,
  Zuiddorpe) vervangen door de QR met "Installatiebedrijf Jansen B.V. · scan om te
  controleren"; telefoon T 0123-456789 (geen bestaand netnummer); label **"DEMO · GEEN ECHTE
  STICKER"**.
- De QR is **pixel voor pixel** die van de InstallQ-demokaart (`demo-erkenningsverklaring-kaart.png`),
  niet opnieuw gemaakt. Teruggelezen: identiek; in `v.html`: **Echt en geldig** —
  Installatiebedrijf Jansen B.V., KVK 30269985, erkenning 14718, zegelrecht.
- **Let op:** de verklaring is geldig tot **1 januari 2027** (daarna "Echt, maar verlopen") en
  dekt elektro, PV en warmtepomp — **niet gas**, terwijl de sticker over Verwarming/Gas gaat. Een
  echte versie draagt de verklaring met het CO-certificaat van de certificerende instelling.
- Logo en huisstijl van TN staan erop: alleen pitchmateriaal richting TN zelf, niet drukken of
  openbaar publiceren.

---

## 8 · AVIC, de Wkb en het Burgerlijk Wetboek

**Drie lagen.** De Wkb heeft twee delen: het bouwkundige (kwaliteitsborger, alleen
vergunningplichtig bouwen — raakt het meeste installatiewerk niet) en de wijziging van het BW,
die geldt voor elke **aanneming van een bouwwerk**, ook vergunningsvrij, voor overeenkomsten
vanaf **1 januari 2024**. De **AVIC** (Algemene Voorwaarden voor Installatiewerk voor
Consumenten) zijn een contract daarbovenop: opgesteld met Consumentenbond en Vereniging Eigen
Huis in de SER, verplicht voor leden, **in werking sinds 1 maart 2016 — niet bijgewerkt na de
Wkb.** (TN vernieuwde wel de zakelijke ALIB, per 1-1-2024.) Van dwingend recht mogen de
voorwaarden niet ten nadele van de consument afwijken; van regelend recht wel, maar alleen als
ze het ook doen.

| Onderwerp | BW na de Wkb (letterlijk nagelezen) | AVIC 2016 | Verhouding |
|---|---|---|---|
| **Waarschuwingsplicht** | 7:754 lid 1: waarschuwen voor onjuistheden in de opdracht "voor zover hij deze kende of redelijkerwijs behoorde te kennen". **Lid 2: "Bij aanneming van een bouwwerk geschiedt een waarschuwing … schriftelijk en ondubbelzinnig en wijst de aannemer de opdrachtgever tijdig op de mogelijke gevolgen"** — voor de consument dwingend. | Art. 5 lid 3: wijzen op "de op het eerste gezicht kenbare" onjuistheden, gebreken, verontreiniging (asbest, legionella), ongeschikte materialen. Geen vormvereiste. Art. 6 lid 7: risico bij de consument, "laat onverlet de waarschuwingsplicht". | De AVIC is smaller en zegt niets over schriftelijkheid. Bij een bouwwerk gaat de wet voor: **mondeling waarschuwen is niet genoeg.** |
| **Opleverdossier** | 7:757a: "In geval van aanneming van een bouwwerk legt de aannemer bij de kennisgeving dat het werk klaar is om te worden opgeleverd … een dossier" over, met ten minste (a) tekeningen en berekeningen van bouwwerk en installaties, beschrijving van materialen en installaties, gebruiksfuncties; (b) gegevens voor gebruik en onderhoud. Regelend recht. | **Niets.** Art. 3 lid 7 gaat alleen over eigendom van offertetekeningen. | De AVIC wijkt niet af, **dus geldt de wet volledig.** |
| **Oplevering** | 7:758 lid 1: stilzwijgend aanvaard als de opdrachtgever niet binnen een redelijke termijn keurt. | Art. 12 lid 4: na 8 dagen, of bij (opnieuw) in gebruik nemen. | Toegestane invulling. |
| **Verborgen gebreken** | 7:758 lid 3: ontslagen voor gebreken die bij oplevering redelijkerwijs ontdekt hadden moeten worden. **Lid 4: "bij aanneming van bouwwerken [is] de aannemer aansprakelijk voor gebreken die bij de oplevering van het werk niet zijn ontdekt, tenzij deze gebreken niet aan de aannemer zijn toe te rekenen"** — voor de consument dwingend. 7:761: verjaring 2 jaar na protest, uiterlijk **20 jaar** na oplevering bij bouwwerken (anders 10). | Art. 18: 18 maanden kosteloos herstel, 3 jaar op capaciteit en temperaturen; vervalt o.a. zonder periodiek onderhoud of bij werk door derden. Art. 18 lid 6: "laat onverlet de aansprakelijkheid van de installateur op grond van de wet". Art. 5 lid 4: aansprakelijk "tenzij deze niet aan hem kan worden toegerekend, tot een bedrag van maximaal € 1.000.000 per gebeurtenis". | De garantie komt **bovenop** de wet. Na 18 maanden loopt de wettelijke aansprakelijkheid door, en de vervalgronden raken die niet. **Juridische vraag:** houdt het plafond van € 1 mln stand tegen het dwingende lid 4 (en art. 6:237 sub f)? |
| **5%-inhouding en verzekering** | 7:768 (5% bij de notaris; lid 2: aannemer vraagt 1–2 maanden na oplevering schriftelijk of de opdrachtgever het opschortingsrecht wil gebruiken) en 7:765a (informatie over verzekering) staan in afdeling 2: **"de bouw van een woning"** in opdracht van een consument. | Art. 13: vooruitbetaling tot 25% bij opdrachten boven € 500, mits de installateur zekerheid stelt. Art. 17: opschorten in redelijke verhouding tot het gebrek. | Geldt niet voor gewoon installatiewerk in een bestaande woning; daar gelden AVIC en het algemene opschortingsrecht (6:262). |
| **Geschillen** | Gewone rechter. | Art. 20: Geschillencommissie Installerende Bedrijven, bindend advies; eerst klagen bij de installateur, dan binnen 12 maanden aanhangig maken. Art. 19: **nakomingsgarantie TN € 5.500 per bindend advies**; bij surseance/faillissement/beëindiging maximaal € 22.500 per installateur. | Heeft de wet niet — **de echte meerwaarde van het lidmaatschap.** |

**Het open juridische punt.** Alle Wkb-regels hierboven gelden alleen bij **aanneming van een
bouwwerk**, en het BW definieert "bouwwerk" niet. Werk dat onderdeel wordt van een woning
(cv-ketel, groepenkast, warmtepomp) valt er waarschijnlijk onder; een los apparaat mogelijk
niet. Het tweede blogartikel gaat uit van de voorzichtige lezing. **Te laten bevestigen** door
TN juridisch advies of een bouwrechtadvocaat — samen met het plafond van € 1 mln.

**Wat het betekent.**
- De AVIC beschermt het lid **niet** tegen de Wkb-plichten: schriftelijk waarschuwen en het
  opleverdossier moet hij zelf regelen, zolang TN de AVIC niet bijwerkt.
- YourWkb levert precies die stukken: het rapport is het **dossier van 7:757a**, de vastgelegde
  aandachtspunten zijn de **schriftelijke waarschuwing van 7:754 lid 2**, metingen en foto's zijn
  het bewijs dat een later gebrek **niet toerekenbaar** is (7:758 lid 4) — nodig tot 20 jaar na
  oplevering.
- Voor een gesprek met TN is dit een sterker punt dan de sticker: hun consumentenvoorwaarden
  lopen achter op de wet, en YourWkb vult dat gat voor hun leden.

*Geen juridisch advies — een analyse van wettekst en voorwaarden.*

---

## Bronnen

- [Sticker Gecontroleerd 2027 — Techniek Nederland](https://www.technieknederland.nl/extra/sticker-gecontroleerd-2027)
- [Sticker Gecontroleerd 2026 — Techniek Nederland](https://www.technieknederland.nl/extra/sticker-gecontroleerd-2026)
- [De Sticker Gecontroleerd op je ketel betekent… — Techniek Nederland](https://www.technieknederland.nl/kennisgebieden/techniek-en-markt/klimaattechniek/koolmonoxide/gecontroleerd)
- [Gasverbrandingsinstallaties — Techniek Nederland](https://www.technieknederland.nl/techniek/klimaattechniek/gasverbrandingsinstallaties)
- [CO-certificering — Techniek Nederland](https://www.technieknederland.nl/home/extra/co-certificering/)
- [Waarom kiezen voor een lid van Techniek Nederland?](https://www.technieknederland.nl/vind-een-vakman)
- [Sticker Gecontroleerd 2024 gepersonaliseerd — webshop](https://leden.technieknederland.nl/webshop/sticker-gecontroleerd-2024-gepersonaliseerd)
- [Stickers Gecontroleerd ventilatie koeling 2026 — webshop](https://leden.technieknederland.nl/webshop/stickers-gecontroleerd-ventilatie-koeling-2026)
- [Te bestellen: controlezegel voor gasverbrandingstoestellen — InstallQ](https://installq.nl/te-bestellen-controlezegel-voor-gasverbrandingstoestellen)
- [Check je vakspecialist — Centraal Register Techniek](https://www.centraalregistertechniek.nl/check-je-vakspecialist)
- [Veelgestelde vragen CO-certificering — Kiwa](https://www.kiwa.com/nl/nl/specials/certificering-preventie-koolmonoxide/veelgestelde-vragen-co-certificering/)
- [Register gasverbrandingsinstallaties — TloKB](https://register.tlokb.nl/co/certificaathouder) (via co-vrijregister.nl)
- [InstallQ — FAQ](https://installq.nl/faq)
- [Algemene voorwaarden — Techniek Nederland](https://www.technieknederland.nl/bedrijfsvoering/juridisch-advies/algemene-voorwaarden)
- [AVIC-tekst (pdf, versie 1 maart 2016)](https://www.niyata.nl/app/uploads/2020/04/AVIC-digitaal_compressed.pdf)
- [Burgerlijk Wetboek Boek 7 — wetten.overheid.nl](https://wetten.overheid.nl/BWBR0005290/2026-01-01) (art. 7:754, 7:757a, 7:758, 7:761, 7:765, 7:765a, 7:768)
- [Van Doorne — wijzigingen BW door de Wkb](https://www.vandoorne.com/artikelen/de-wijzigingen-in-het-burgerlijk-wetboek-door-de-inwerkingtreding-van-de-wet-kwaliteitsborging-voor-het-bouwen/)
- [IPLO — Wkb, veranderingen BW in de praktijk](https://iplo.nl/publish/pages/216753/wet-kwaliteitsborging-voor-het-bouwen-veranderingen-burgerlijk-wetboek-in-praktijk.pdf)
