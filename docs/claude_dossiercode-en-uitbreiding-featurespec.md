# Dossiercode en uitbreidingsmodus — featurespec

*19-09-2026. Concept, nog niets gebouwd. Normatieve basis aangeleverd door Martin (NEN 1010:2020 deel 6).*

## 1 · Waarom

Een installateur die een bestaande kast uitbreidt, begint in YourWkb nu met een lege kast: het
meterkastpaspoort vult het adres, de hoofdaansluiting en de groepenlijst voor de Fasecheck, maar
niet de aardlekgroepen en eindgroepen die hij meet. Hij bouwt de kast dus opnieuw op — en de
metingen van de vorige klus heeft hij niet.

Twee dingen lossen dat op, en ze blijven bewust gescheiden:

| | Meterkastpaspoort (bestaand) | **Dossiercode (nieuw)** |
|---|---|---|
| Doel | open standaard: kast, componenten, terugroepacties, erkenning | het complete YourWkb-opleverdossier, **met meetwaarden** |
| Waar | sticker op de kastdeur, ≤ 105 modules (50 mm) | **in het rapport** (pdf/print/e-mail), ± 7 cm |
| Adres | `meterkastpaspoort.nl/p#…` | `yourwkb.nl/app#d=…` |
| Formaat | open, CC BY 4.0 | eigen, beschreven formaat `yourwkb-dossier` |
| Wie leest het | iedere app | YourWkb als eerste en het best |

Het paspoort blijft zo een smalle, open standaard. De dossiercode brengt de installateur die verder
wil, vanzelf weer in YourWkb (flow-regel: dit **vervangt handwerk**).

## 2 · Normatieve basis (NEN 1010:2020 deel 6)

Een uitbreiding van een bestaande installatie — ook één contactdoos — moet vóór ingebruikname
worden **geverifieerd**. Die verificatie richt zich op **het nieuwe/gewijzigde deel en de aspecten
van de bestaande installatie die daardoor relevant worden**, niet op de hele bestaande installatie.

**Minimum bij een gewone nieuwe eindgroep** (bv. B16, 3 × 2,5 mm²):

| Controle | Nodig | Norm | In de app nu? |
|---|---|---|---|
| **Visueel:** juiste beveiliging, aderdoorsnede, PE aangesloten, verbindingen, scheiding/markering, aardlek aanwezig waar vereist | ✅ | 6.4.2 | deels (checklist) |
| **PE-continuïteit** tot het laatste aansluitpunt | ✅ | 6.4.3.2 | ❌ **ontbreekt** |
| **Isolatieweerstand** L/N onderling en actieve geleiders ↔ PE | ✅ | 6.4.3.3 | ✅ (≥ 0,23 MΩ naar aarde) |
| **Polariteit** L, N, PE | ✅ | 6.4.3.6 | ❌ **ontbreekt** |
| **Automatische uitschakeling** — TN: lus-/circuitimpedantie; TT: Ra + aardlek + uitschakelvoorwaarden | ✅ | 6.4.3.7 | ✅ Z L-PE, Z L-N; Ra bij TT |
| **Aardlek beproeven** (uitschakeltijd, -stroom) — van de aardlek waar de nieuwe groep op komt | ✅ indien aanwezig/vereist | 6.4.3.7 | ✅ ΔT, ΔI, testknop |
| **Functionele beproeving** (automaten, aardlek, schakelaars) | ✅ waar relevant | 6.4.3.10 | deels |
| **Spanningsverlies** (meting of berekening) | ⚠️ indien relevant | 6.4.3.11 | ⚠️ genoemd, niet vast veld |
| Fasevolgorde | alleen meerfasig | 6.4.3.9 | ✅ (draaiveld) |
| Isolatie vloeren/wanden, SELV/PELV, elektrische scheiding, aanvullende vereffening | alleen waar relevant | 6.4.3.x | — |

*Artikelnummers:* 6.4.3.2, 6.4.3.3, 6.4.3.7(.3) en 6.4.4 komen uit Martins bronnen (Werken met
NEN 1010, Elektroraad). De overige nummers in de tabel zijn afgeleid van de opbouw van
IEC 60364-6 en **nog te bevestigen** tegen de tekst van NEN 1010:2020 — met name of het beproeven
van de aardlek onder 6.4.3.7 (automatische uitschakeling) of 6.4.3.8 (aanvullende bescherming) valt.

**Rapport (6.4.4):** een eerste rapport met **de omvang van het geverifieerde deel**, de visuele
controle en de resultaten van metingen en beproevingen.

> **Bevinding buiten deze feature, voor R4:** PE-continuïteit en polariteit staan in de minimumset
> voor élke nieuwe eindgroep, maar de app legt ze nu nergens vast — ook niet in de gewone
> groepenkast-flow. Dat is een normgat, los van de dossiercode. Vier lagen bijwerken (berekening,
> invoer, rapport + voetnoot, AI-prompt).

*Taalregel:* in gebruikersteksten "visuele controle" en "verificatie", niet "inspectie" of "keuring"
(zuiverheidsregel), ook al gebruikt de norm "inspectie".

## 3 · De dossiercode

### 3.1 Inhoud

Het project zoals YourWkb het kent, **zonder**:
- foto's (passen nooit — blijven in de pdf);
- persoonsgegevens van de klant: naam, e-mail, telefoon (zelfde regel als anoniem delen, `anonimiseerJob`);
- afgeleide tekst die de app opnieuw maakt (AI-analyse, rapport-HTML, paspoort-QR).

**Wel:** adres, discipline, datum, installateur (naam, erk/CO), meetapparatuur met kalibratie,
hoofdaansluiting en stelsel, de kast (aardlekgroepen → eindgroepen met karakteristiek, ampère,
kabel, fase), alle meetwaarden, de checklist en de opmerkingen.

Vorm: `{ s: "yourwkb-dossier", v: 1, d, disc, … }`. Versie `v` zodat een oudere app een nieuwer
dossier herkent en weigert in plaats van het half te lezen.

### 3.2 Codering en omvang

Zelfde codering als het paspoort — JSON → deflate-raw → base64url in het **fragment** — dus nooit
naar een server en scanbaar zonder bereik. Achter `https://yourwkb.nl/app#d=`.

Nagerekend (19-09, groepenkast, realistische metingen, inclusief PE-continuïteit en polariteit):

| Kast | URL | QR bij M | QR bij L |
|---|---|---|---|
| 12 groepen (3 aardlekken) | 1.128 tekens | versie 28 | versie 24 |
| 24 groepen (4 aardlekken) | 1.540 tekens | versie 33 | versie 29 |
| 36 groepen (6 aardlekken) | 1.985 tekens | versie 37 | versie 33 |

Maximum is versie 40. **Eén code volstaat voor een groepenkast**, op foutcorrectie **M**. Op papier
minimaal ± 0,5 mm per module → **7–9 cm breed**. Andere disciplines (PV met veel strings, wp) nog
nameten; past iets niet, dan eerst niveau L, pas daarna een tweede code.

### 3.3 Plaats

Een eigen blok in het rapport, "Dossiercode — verder met deze klus", op de laatste pagina, met één
regel uitleg. **Niet** op de sticker (te groot) en **niet** in het paspoort. In de e-mail als
inline-bijlage (`cid:`), net als de paspoort-QR (valkuil 3).

## 4 · Uitbreidingsmodus (inlezen)

1. Scannen (camera of in-app scanner) → YourWkb opent met **"Verder met dit dossier"**.
2. Nieuwe klus, vooringevuld: adres, hoofdaansluiting, stelsel, de kast met alle groepen —
   gemarkeerd **"bestaand · uit dossier van [bedrijf], [datum]"**.
3. De metingen van de voorganger staan erbij **als referentie, alleen-lezen**, met bron en datum.
   **Ze tellen nooit als metingen van deze klus** en komen niet in de meetkolommen van het nieuwe
   rapport.
4. De installateur voegt de nieuwe groep toe (of wijzigt een bestaande) en meet **de minimumset van
   §2** voor het nieuwe/gewijzigde deel, plus:
   - de **aardlek** waar de nieuwe groep op komt (beproeven);
   - de **belasting per fase** op de hoofdaansluiting (Fasecheck — gaat al vanzelf).
5. Is er ook een meterkastpaspoort gescand en is dat **nieuwer** dan het dossier, dan meldt de app
   dat: er is sinds dit dossier nog aan de kast gewerkt.

### 4.1 Het rapport van een uitbreiding

- Kop: **"Uitbreiding"** met de **omvang van het geverifieerde deel** (6.4.4): welke groep(en) nieuw of
  gewijzigd zijn, en welke aardlek beproefd is.
- Bestaande groepen staan in het overzicht als **"bestaand — niet opnieuw gemeten in deze klus"**,
  met verwijzing naar het vorige dossier (bedrijf, datum).
- De **conformverklaring beperkt zich tot het geverifieerde deel** en zegt dat expliciet — in
  `bevindingHtml`, op één plek (het rapport mag zichzelf niet tegenspreken).

## 5 · Echtheid

Versie 1 ondertekent niet: het dossier vult alleen vooraf in en is duidelijk van de voorganger. Een
latere versie kan de installateur laten tekenen (zoals `log[].sig` in het paspoort), zodat een
bewerkte dossiercode opvalt.

## 6 · Relatie met het paspoort

- Het paspoort blijft de **actuele** stand van de kast, ook na werk door anderen; de dossiercode is
  de stand van **één klus**.
- Samen gescand: de kast uit het dossier, bijgewerkt met wat het paspoort nieuwer weet (bv. een
  laadpaal van een ander bedrijf).
- Los hiervan blijft zinvol dat YourWkb zélf de hele kast in het paspoort schrijft (alle groepen met
  aardlekcode en ampère, niet alleen de grote verbruikers) — voor andere apps en voor de Fasecheck
  van de volgende. Aparte beslissing, omvang (105 modules) eerst nameten.

## 7 · Privacy

De code bevat wat het rapport ook bevat, min de persoonsgegevens van de klant. Wie het rapport
heeft, heeft de code — geen nieuw lek. Geen centrale opslag; het fragment bereikt geen server.

## 8 · Tests (bij de bouw)

- Round-trip via het plaatje (zoals `test-mkp-qr.js`): PNG → jsQR → decode → gelijk aan de invoer.
- Geen persoonsgegevens van de klant in de code.
- Omvang per discipline ≤ versie 40 bij M, met een realistische grote kast.
- Inlezen: voorganger-metingen nooit in de meetkolommen van de nieuwe klus; rapport van een
  uitbreiding noemt de omvang en beperkt de verklaring.
- Nieuwer paspoort dan dossier → melding.

## 9 · Fasering

1. **R4-gat eerst:** PE-continuïteit en polariteit als meetvelden (vier lagen). Zonder die velden kan
   de uitbreidingsmodus de minimumset niet vastleggen.
2. Dossiercode schrijven (rapport + e-mail), met round-trip-test.
3. Uitbreidingsmodus: inlezen, markeren, minimumset, rapport "uitbreiding".
4. Andere disciplines nameten en aansluiten.
5. Later: ondertekening; YourWkb schrijft de hele kast in het paspoort.

## 10 · Open vragen voor Martin

1. **Spanningsverlies:** als vast veld (meting of berekening) bij elke nieuwe groep, of alleen als de
   installateur het relevant vindt (bv. lange kabel naar schuur of laadpaal)?
2. **Functionele beproeving:** één vinkje per nieuwe groep volstaat, of per onderdeel (automaat,
   aardlek, schakelaar)?
3. **Wijziging zonder nieuwe groep** (bv. automaat vervangen, groep verlegd): zelfde minimumset voor de
   gewijzigde groep?
4. **Aardlek waar de nieuwe groep op komt:** alleen beproeven, of ook Z L-PE op die aardlek opnieuw?
