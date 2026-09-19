# Techniek Nederland en de Sticker Gecontroleerd — vooronderzoek

*19-09-2026. Vooronderzoek, nog geen besluit en nog niets gebouwd. Bronnen onderaan.*

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

**Niet gevonden in openbare bronnen:** een QR-code op de sticker, of een uniek volgnummer
per sticker. Dat moet worden nagegaan op een fysieke sticker of bij Techniek Nederland.
(Een zoekresultaat over "check je vakspecialist via een QR-code" bleek over de
*Vakpaspoort*-app van Centraal Register Techniek te gaan, niet over de sticker.)

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

1. **Een fysieke Sticker Gecontroleerd 2026 bekijken.** Staat er een QR of een volgnummer op?
   Welke velden precies? (Openbare bronnen zeggen het niet.)
2. **Controleert Techniek Nederland het opgegeven certificaatnummer** (bij de CI of het
   TloKB-register), of is het een opgave van het lid? Dat bepaalt of TN het mag meeondertekenen.
3. **Wat dekt de ventilatie/koelingssticker** — welke certificering hoort erbij (F-gassen, BRL 100/200)?
4. **Aanspreekpunt bij Techniek Nederland** — klimaattechniek / CO-helpdesk / het team achter het
   publicatieplatform. De InstallQ-demokaart (`demo-erkenningsverklaring-kaart.png`) is het model
   voor een TN-variant.
5. **YourWkb:** `tlokb` als uitgever-keuze herzien (zie §2).

## 5 · Voorstel voor de volgende stap (niet gebouwd)

1. Een **demo**: een demo-uitgever "technieknederland" in de index (demosleutel, zoals `demo`),
   een ondertekende verklaring met `bv=sticker-gecontroleerd:2026`, en een mockup van de sticker
   met die QR — te openen in `v.html`. Zelfde vorm als de InstallQ-demokaart.
2. In `v.html` de bevoegdheid `sticker-gecontroleerd` leesbaar maken ("mag de Sticker
   Gecontroleerd 2026 voeren — lid van Techniek Nederland").
3. Spec §10.3 aanvullen met die soort (documentversie 0.4, datamodel blijft 2).
4. YourWkb: `tlokb` als uitgever vervangen door de CI (Kiwa / InstallQ-schema) met het
   TloKB-register als controleplek.

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
