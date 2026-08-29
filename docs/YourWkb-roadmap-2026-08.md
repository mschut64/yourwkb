# YourWkb — Ontwikkelroadmap
*Integratie van de SCIOS-analyse (strategie + kennisbank, 13-08-2026) met de lopende ontwikkelagenda.*

**Status vertrekpunt (13-08-2026):** zes disciplines live · meterkastpaspoort (QR + in-app scanner + startpaspoort) · offline op iOS & Android (sw v6) · back-up/restore + collegiaal delen via Web Share Target · InstallPrompt · 80 regressietests op de groepenkast-normlogica.

---

## ⚓ Ontwerpprincipe boven alles: de flow-regel

**De standaardflow van klant-tot-rapport mag door géén enkele nieuwe feature langer worden.** Elke toevoeging is óf *automatisch* (vult zichzelf in — zoals de gG-tabel nu), óf *optioneel* (een variant of instelling die je pas ziet als je hem kiest — zoals het SCIOS-ready exportprofiel), óf *vervangt handwerk* (zoals de IB22-motor het zelf-formuleren van bevindingen vervangt). Complexiteit hoort onder de motorkap, niet op het scherm.

Toets bij elke feature, vóór het bouwen: *"wordt de flow hierdoor langer?"* → het antwoord moet nee zijn. Praktijkthermometer: een veldtester (Maurits/Herman) doorloopt een klus — duurt die langer dan vóór de update, dan is de feature fout ontworpen, ongeacht hoe waardevol hij inhoudelijk is. Nieuwe werelden (Scope 10/thermografie) komen achter een eigen discipline-keuze, nooit in de bestaande flows.


**Strategische koers (uit het ontwikkeladvies):** Optie A — *SCIOS-ready toeleverancier*. YourWkb concurreert niet met SCIOS maar levert het rapport dat een gecertificeerd bedrijf 1-op-1 als EBI-input kan gebruiken. Optie B (brandrisico-signalering) bouwt daar bovenop. Optie C (eigen borgingsschema) blijft visie, geen businesscase-afhankelijkheid. In alle communicatie: een YourWkb-rapport *vervangt geen* SCIOS-afmelding en *geeft geen* verzekeringsdekking — het bereidt een inspectie voor en versnelt hem.

---

## Fase 1 — De normcheck-kern (eerstvolgende 2–3 sessies)
*Maakt van de app een echte normcheck-tool i.p.v. registratieformulier — én lost de openstaande harmonisatie-schuld in. Dit is de "snelste concrete winst" uit het advies.*

**1.1 Normcheck-engine met echte grenswaarden** *(kennisbank §2)*
Eén centrale rekenmodule (zoals `ggIaVoorTijd` nu) voor álle disciplines: isolatieweerstand (0,23 MΩ naar aarde; PI-criterium 1000×U bij periodiek), aardlek-uitschakeltijden, Z-max per automaat-karakteristiek (vervangt o.a. PV's vaste 0,5 Ω waar passend), hfst-705-grens ≤300 mA, spanningsgrenzen. Meetwaarde in → voldoet/afgekeurd + suggestie uit.
→ *Absorbeert het geparkeerde punt "meetnormen groepenkast gelijktrekken naar andere disciplines" (incl. fysica-vlag in PV).*

**1.2 Regressietests mee laten groeien**
`extract-logica.js`-workflow uitbreiden zodat de suite alle disciplines dekt. Harde regel blijft: geen normwijziging zonder verse testrun.

**1.3 IB22-classificatiemotor** *(kennisbank §1)*
Elke bevinding krijgt kleur 1–4 (+ optioneel groep A–F), actie en richttermijn; eindoordeel-logica "alleen blauw = zonder constateringen". Bouwt direct op 1.1: een afgekeurde meting genereert automatisch een classificatie-voorstel.

**1.4 Meetmiddel-registratie + kalibratiecheck** *(kennisbank §3)*
De bestaande apparatuur-stap verrijken: NEN-EN-IEC 61557-mapping per meettype, kalibratie-vervaldatum met waarschuwing, meetmiddel gekoppeld per meting, verplichte rapportbijlage (≥5 jaar bewaren).

**1.5 "SCIOS-ready" exportprofiel** *(kennisbank §8)*
Rapportvariant met alle verplichte EBI-inputvelden: stelsel, toetsjaartal, BAG-locatie, meetmiddelen, IB22-classificaties. Dit is het tastbare product van Optie A — en een verkoopargument richting installateurs die met inspectiebedrijven samenwerken.

*Volgorde binnen fase 1: 1.1+1.2 samen (één ronde), dan 1.3, dan 1.4, dan 1.5 als sluitstuk.*

---

## Fase 2 — Disciplines verdiepen (middellang)

**2.1 Belastingcheck-rekenkern** *(bestaande agenda — geparkeerd, nu inplannen)*
De 0,6-gelijktijdigheidsfactor (NEN-EN-IEC 61439-richtlijn), kam-toetsing, dubbele-balancer-logica → de `chk`-uitkomst in het meterkastpaspoort wordt eindelijk berekend i.p.v. handmatig. Kan parallel aan fase 1 (eigen rekenmodule, zelfde teststramien).

**2.2 PV-module naar Scope 12-niveau** *(kennisbank §5)*
Uoc/Isc per string met instralingstolerantie, aarde onderconstructie ≤10 Ω, spanningsopdrijving ≤1,5%, isolatie DC droog/nat, en de zichtbaarheidsregel (100% visueel óf uitzondering-met-fotobewijs) gekoppeld aan de foto-checkpoints.

**2.3 Constructieverklaring-flow (TD18 Bijlage 4)** *(kennisbank §6 — het docx-formulier staat al in het project)*
Aparte deelbare mini-flow met rol "constructeur", vrijstellingslogica (<50 panelen & <1150 kg), ondertekende PDF automatisch in het dossier. Hergebruikt de deel-infrastructuur van sessie 2.

**2.4 CV-rekenhulp** *(kennisbank §7)*
Automatisch λ, rendement, giftigheidsindex en CO-luchtvrij uit de al verzamelde rookgaswaarden (IB26-formules, aardgas/HBO1-constanten) + EBI-herinnering "binnen 6 weken na ingebruikname".

**2.5 Normversiebeheer via toetsjaartal** *(TD12-eis; sluit aan op `NORM_EDITIE` en het bouwjaar-veld)*
De app kiest de juiste normeditie o.b.v. bouwjaar — het "rechtens verkregen niveau" dat al in de paspoort-voetnoot staat, nu ook in de toetsing.

---

## Fase 3 — Onderscheidend (groter, na fase 1–2)

**3.1 Brandrisico-signalering (Optie B, lichte variant eerst)**
De app attendeert wanneer een object waarschijnlijk verzekeringsplichtig Scope 10-inspectie nodig heeft (agrarisch, opslag, NEN 1010 hfst 705-ruimten). Alleen signaleren + uitleg, niet certificeren.

**3.2 Brandrisico-/thermografie-module (Scope 10 / NTA 8220)** *(kennisbank §4)*
Thermografie-invoer met ε-defaults, T-reflected, validatie-vlaggen. Pas starten als 3.1 tractie toont.

**3.3 Dossierregister met audit-trail**
Versiebeheer per dossier, herinspectie-workflow ("met → zonder constateringen" binnen 1 jaar). Fundament voor eventuele Optie C — bouwen zodra er een concrete partij (InstallQ/verzekeraar) aan tafel zit, niet eerder. **Let op het privacy-anker:** dit botst potentieel met "wij bewaren niets"; als het er komt, dan als opt-in en nooit adres-doorzoekbaar (zelfde principe als de MKP-kluisdiscussie).

---

## Doorlopende sporen (naast de fasen)

- **Meterkastpaspoort/MKP:** Lootens-vervolgacties, spec v0.2 na veldfeedback, EAN-codeboek-route (sectorgesprek), NEN 1010-8:2026 review bij de batterij-veldtest.
- **Niimbot-labelprinter** (premium route — printer ligt klaar; inplannen als tussenklus).
- **Zichtbaar versienummer in de app** (klein; eerste de beste ronde meenemen).
- **Sessie-3-restjes:** licht/donker thema, tablet-layout (bewust uitgesteld).
- **Kennislacune dichten:** de elektro-edities van IB21/IB26 ontbreken (alleen stook aanwezig) — nodig voor waterdichte onderbouwing van de verzekeringsplicht (Arbobesluit 3.4/7.4a, NTA 8220, polisvoorwaarden). Actie: opvragen/zoeken vóór fase 3.
- **Marketing-taalregel** (permanent): nooit suggereren dat het rapport een afmelding vervangt of dekking geeft; wel "SCIOS-ready" en "bereidt de EBI voor".

---

## Waarom deze volgorde

1. **Fase 1 verzilvert de bestaande belofte** ("Automatische normcheck" staat al in het manifest) en lost tegelijk de harmonisatie-schuld in — twee agenda's, één bouwstroom.
2. **De IB22-motor is de scharnier:** hij maakt elk rapport rijker én is de brug naar SCIOS-ready (fase 1.5), dat op zijn beurt de deur opent naar samenwerkingen met inspectiebedrijven — distributie zonder marketingbudget.
3. **Fase 2 verdiept waar de gebruikers al zijn** (PV is de grootste groep; CV-rekenhulp is zichtbare magie uit bestaande invoer).
4. **Fase 3 pas als het fundament er ligt** — Scope 10 is de grootste marktkans (de verzekeringsdrempel) maar ook het zwaarste bouwwerk; de lichte signaleringsvariant test de vraag eerst.

*Vuistregel per sessie blijft: één afgebakend blok, tests groen, bundelen van kleine fixes, versienummer per dag-letter.*
