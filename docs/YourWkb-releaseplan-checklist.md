# YourWkb — releaseplan & afvinklijst

*Gereconstrueerd op 29-08-2026 uit `CLAUDE.md` §5 en `docs/design-spec.md`. Het origineel uit de claude.ai-chats stond niet in de repo en is op de werkmachine niet teruggevonden; deze versie is vanaf nu de bron. Koers: `docs/YourWkb-roadmap-2026-08.md`.*

Afvinkregel: een punt is pas ✅ als de wijziging in `main` staat, de regressietests **volledig groen** zijn (nu 105) en `npx next build` compileert.

*Bijgewerkt 11-09-2026: R1 volledig afgerond en live, belastingcheck uit roadmap §2.1 gebouwd, P1-meetspec toegevoegd.*

---

## R0 — basis ✅
## R0.5 — security-release + blog ✅

Zie `CLAUDE.md` §4 voor de inhoud van beide.

---

## R1 — Design fase 2 ✅ AFGEROND EN LIVE (`v2026-08-29-A`, 29-08-2026)

Doorvoeren van `docs/design-spec.md` **sectie 4** (per scherm — wat niet via de tokens meekomt). Secties 2a, 2b en 3 van de spec (de `K`/`S`-tokens en het landing-CSS-blok) zijn in een eerdere ronde al doorgevoerd; de tokens `S.rij`, `S.eenheid`, `S.inputMeting` en `S.btnGhost` bestaan dus wél maar worden nog nergens gebruikt.

### Meetscherm
- [x] **S5a** — meetwaarden in `MiniInput` van 13 → 20 px, tabular-nums, `inputMode="decimal"`, veldbreedtes mee omhoog (65/70/80 → 84/88/96). Raakt groepenkast (meten + veldmeting) en PV.
- [x] **S5b** — cv, warmtepomp, laadpaal en batterij op dezelfde maat. Laadpaal/batterij via `MiniInput`; cv/warmtepomp houden hun eigen `MeetVeld` (dat kleurt achtergrond én rand bij toetsing — beter dan `MiniInput`), alleen de typografie gelijkgetrokken. 25 placeholders `bijv. 45` → `45`.
- [x] Eenheid via `S.eenheid` (op 15 px; het token staat op 17 voor naast een veld van 32 px)
- [ ] ~~Meetvelden naar `S.inputMeting` (32 px, volle breedte)~~ — **niet gedaan**: zes velden naast elkaar in flexWrap-rijen, volle breedte maakt er een scrollmarathon van. 20 px is de grootste maat die de rasters heel laat. Zie afwijking 1.
- [x] **S5c** — normvlak per meetblok: impedantie, isolatieweerstand, spanning+frequentie en aardlekschakelaar (groepenkast) + AC-blok (PV). Helpers `blokOordeel` en `normTitel`. Per blok en niet per veld — zie afwijking 2.
- [x] **Aardlekblok rechtgezet** (gemeld door Martin tijdens S5c): labels stonden vol met de norm en wrapten ongelijk, waardoor de ΔT- en ΔI-velden uit elkaar zakten. Labels ingekort, norm naar het vlak, `alignItems:"end"`.
- [x] **S6** — stapteller "Stap i van n · <label>" + voortgangsbalk, centraal boven het scherm i.p.v. in elke schermkop (alleen dáár is bekend hoeveel stappen de discipline heeft). 15 hardgecodeerde stapnummers verwijderd; die waren fout zodra een scherm door meerdere disciplines wordt gebruikt — de paspoortstap zei "Stap 8" terwijl dat in de groepenkastflow stap 10 is. 18 schermtitels 15 → 20 px, ondertitels 11 → 12 px.
- [x] `fontVariantNumeric:"tabular-nums"` op meetwaarden (zit in `MiniInput` en in de `MeetVeld`-varianten van cv/wp)

### Startscherm — ✅ S3
- [x] Projectrij naar `S.rij`: klantnaam 13 → 16 px, discipline/stap 11 → 13 px, verwijderknop ~24 → 36 px met `aria-label`
- [x] Disciplinetegel: icoon in een 28 px kleurvlak, label 13 → 15 px, norm 10 → 12 px, tegel min. 92 px — mét behoud van het icoon
- [x] Toevoegingsveld op stap 1 hersteld (placeholder viel weg door de 16 px-invoer uit fase 1)
- [x] ~~Status rechts uitgelijnd als pil~~ — **afgesloten** (Martin, 29-08-2026: "statuspil is al gedaan"). De status staat al in de kopjes "Concepten (n)"/"Opgeleverd (n)" en in het groene ✅-icoonvlak; zie afwijking 5 voor waarom een extra pil niet in de rij past.

### Paspoort-stap — ⚠️ geblokkeerd, wacht op Martin
- [ ] ~~Risicoscore in statuskleur, cijfer 56 px~~ — **bestaat niet in de app.** Geen enkele treffer op `risico`/`score` behalve `dubbeleBalancerRisico`. Vermoedelijk door de ontwerper afgeleid uit een screenshot van een ander scherm, of nooit gebouwd.
- [ ] ~~Inspectiepunt naar `S.rij` met statusvierkant + reden~~ — **bestaat niet als UI.** Alleen `// Visuele inspectiepunten` in de rekenlogica ([WkbApp.jsx:466](../components/WkbApp.jsx:466)).

Beide punten uit spec §4 zijn niet uitvoerbaar zoals geschreven. Uit R1 gehaald tot Martin aanwijst waar ze op slaan.

### Back-up & delen — ✅ S4
- [x] Knophiërarchie: één gele knop per scherm. De spec sprak van "delen vs back-up", maar op dit scherm zijn de twee gelijke gele knoppen *Download back-up* en *Kies bestand*; delen is de groene WhatsApp-knop per project. Back-up blijft geel, *Kies bestand* wordt `S.btnGhost`.
- [x] `StatusVlak`-component gebouwd en toegepast op de meldingen (waren 12 px met een streepje links). Bewust hier gebouwd zodat S5 hem kan hergebruiken onder de meetblokken.
- [x] ~~Waarschuwing lokale opslag van `K.red` naar `S.hint`~~ — **bestond niet**: de tekst op het beginscherm stond al op `K.muted`, en op het back-upscherm staat geen rode waarschuwing.

### Klantstap (meegenomen in S3/S4)
- [x] Toevoegingsveld leesbaar (S3)
- [x] Toevoeging telt mee in het projectnummer; paspoort-import zette `projectId` nooit → rapport toonde "—"
- [x] Straatnaam/Plaats gelijk verdeeld + bevestigingsregel toont het gevonden adres vóluit

### Meegebundeld in R1
- [x] **S0 — `@babel/core` en `@babel/preset-react` als devDependency, gepind op 7.** Stonden nergens in `package.json`, waardoor `extract-logica.js` op een verse checkout faalde. Babel 8 breekt de extractor (`parse` wil een callback), dus de pin op 7 is noodzakelijk, geen luiheid.
- [x] **S1 — zichtbaar versienummer.** Constante `APP_VERSIE`, rechts in de header van het beginscherm. De kopregel liep twee releases achter en is nu afgeleid van de constante.
- [x] **Landing "binnenkort" opschonen — was al gebeurd.** Het blok op [app/landing/page.js:458](../app/landing/page.js:458) bevat nog precies belastingcheck + eigen logo, exact de twee die moesten blijven. Laadpaal, thuisbatterij en QR-paspoort staan al als beschikbaar (regel 247, 435 en de paspoort-sectie). Vermoedelijk meegegaan in v2026-08-16-B.

### Oplevering
- [x] `node tests/extract-logica.js components/WkbApp.jsx` + `node tests/test.js` → **80/80** bij elke deelstap
- [x] `npx next build` → compiled successfully, 14/14 pagina's
- [x] Versie `2026-08-29-A` — heel R1 in één release gebundeld, conform de regel "kleine fixes bundelen, niet voor elke bugfix een nieuwe letter"
- [x] **Flow-regel getoetst: geen scherm, stap of bevestiging toegevoegd.** Alles wat erbij kwam is weergave van gegevens die de app al berekende. Drie dingen halen juist werk weg: de norm staat nu ónder het meetblok (geen terugscrollen naar de instructie), het adres staat vóluit op de bevestigingsregel (geen twee krappe velden lezen), en `inputMode="decimal"` opent meteen het cijfertoetsenbord.
- [x] **Veldtest gedaan** (Martin, 29-08-2026)
- [x] **Punt/komma-afspraak nagelopen.** Invoer was al waterdicht (alles via `toNum`); de wéérgave is rechtgetrokken — 31 berekende decimalen, 4 afschakeltijden, 12 placeholders en de DC/AC-grenswaarden staan nu op de Nederlandse komma, in de app én in het rapport. Regressietest 11.5 ving de tekstwijziging op en is meegewijzigd.
- [x] **Gepusht en gedeployed** (29-08-2026, `f3e6846..ab785e3`). Vercel-deploy READY, live op yourwkb.nl, versienummer in de kop bevestigd.

### Afwijkingen van spec §4 — voorgelegd aan Martin 29-08-2026 en in de veldtest bevestigd

De spec is geschreven tegen een mentaal model van "één meting per scherm". De app heeft dichte meetrasters. Letterlijk doorvoeren verlengt de flow en botst dus met de flow-regel. Vier voorstellen:

1. **Meetvelden.** Niet `S.input` → `S.inputMeting`, maar `MiniInput` zelf opwaarderen (13 → 20 px/700, tabular-nums, eenheid via `S.eenheid`). De meetwaarden zitten in `MiniInput` ([WkbApp.jsx:732](../components/WkbApp.jsx:732)), 70–80 px breed en naast elkaar in `flexWrap`-rijen — zes Z-waarden op een rij. Volle breedte à 64 px maakt daar een scrollmarathon van.
2. **Normvlak.** Eén vlak per meetblok (A-impedantie, B-isolatie, C-spanning) in plaats van per veld. De statuspil per veld blijft, dus je ziet nog steeds wélke waarde afwijkt.
3. **Stapteller.** `StepBar` ([WkbApp.jsx:830](../components/WkbApp.jsx:830)) blijft. De spec vervangt hem door een display-only regel, wat het terugspringen naar een afgeronde stap zou weghalen — functieverlies. Alleen "Stap i van n" + schermtitel 20 px toevoegen.
4. **Disciplinetegel.** Kleurvlak toevoegen mét behoud van de emoji-iconen; de spec-variant haalt icoon en per-discipline kleur weg.
5. **Statuspil in de projectenlijst — geschrapt in S3.** Op 375 px is de middenkolom van een projectrij 203 px; een pil "✓ Opgeleverd" is alleen al 112 px. Drie varianten geprobeerd (gestapeld rechts, naast de verwijderknop, naast het projectnummer); alle drie kostten óf de klantnaam ("Bouwb…") óf het projectnummer. Dat nummer is `postcode-huisnummer` (bv. `2691JJ-72a`) en is wat de installateur aan een klant doorgeeft, dus dat mag niet afbreken. De status staat bovendien al twee keer op het scherm: de kopjes "Concepten (n)" / "Opgeleverd (n)" en het groene ✅-icoonvlak. Terugdraaien kan als Martin de pil alsnog wil.

**Aandachtspunt uit spec §7:** `S.input` (±40 → 52 px) en `S.btn` (±48 → 56 px) maken lange formulieren ~25% langer. Als de paspoort- of materiaalstap daardoor een extra scroll krijgt, dichtheid uit de spacing halen — niet uit de tapmaat. Ter beoordeling van Martin in het veld.

---

## ⛔ Wat de openstaande releases blokkeert

Drie van de vier openstaande releases wachten niet op werk maar op een **document dat niet in de repo staat**. Hetzelfde patroon als de ontbrekende `CLAUDE.md` bij de start van dit project: zet specs in `docs/` zodra ze bestaan.

| Ontbreekt | Blokkeert | Gezocht op |
|---|---|---|
| systeemprompt fototest-kalibratie | R2 | — (aparte chat) |
| `claude_kastscan-featurespec.md` | R3a | Google Drive `Kennisbank (1)`, 11-09-2026 |
| `claude_fasecheck-featurespec.md` | R3b | Google Drive `Kennisbank (1)`, 11-09-2026 |

**R4 (normcheck-kern) is de enige openstaande release die op niets wacht.**

Nieuw binnengekomen en wél compleet: `docs/claude_p1-meting-featurespec.md` (11-09-2026).

---

## R2 — Controleerbaar vakmanschap + AI-meekijker (fotocheck stap 8) ⏸

*Deels gedaan (`v2026-09-18-B`): de uitgever van de erkenning (InstallQ / TloKB) is optioneel te kiezen in het profiel en gaat als `log[].erk` mee het meterkastpaspoort in. CO- en F-gassencertificaat en de controleregel in het rapport volgen.* Erkenningsblok in bedrijfsprofiel (InstallQ-erkenningsnummer, CO/BRL 6000-25, F-gassen BRL 100/200 — elk optioneel, eenmalig; rapport toont per discipline het relevante nummer + controleregel via echteinstallateur.nl / tlokb.nl). AI-meekijker op werkfoto's: optionele knop per checkpoint, foto's naar de beveiligde `/api/rapport`-route, bevindingen als signaal (nooit keuring-taal), privacymelding, offline grijs.

**Blokkeert op:** de systeemprompt uit de fototest-kalibratie (aparte chat). Prijsmodel: advies optie A (inbegrepen, ~€0,03/analyse, ~€0,09/rapport).

## R3a — Kastscan (fotocheck stap 6) ⛔ geblokkeerd

⛔ **Spec `claude_kastscan-featurespec.md` is niet in de repo en op 11-09-2026 niet op de werkmachine gevonden** (Google Drive `Kennisbank (1)` doorzocht). Zonder dat document kan hier niet gebouwd worden.

Wél bekend: er bestaat **werkende Kastscan-code buiten deze repo** — de belastingcheck-rekenkern van `v2026-09-03-A` is daaruit overgenomen, inclusief tests. R3a is daarmee mogelijk minder werk dan het releaseplan suggereert, maar dat is niet te beoordelen zonder toegang.

Oorspronkelijke omschrijving. Foto van de geopende verdeler vult groepen/aardlekken/fasen vóór in — de foto vult in, de installateur bevestigt. Volle resolutie verplicht, HEIC-ondersteuning. Testbasis `claude_fotokalibratie-kasten-herman-2026-08.md`. Levert de faseverdeling aan R3b.

## R3b — Fasecheck v1 🔄 rekenkern af, koppeling met de meting open

Spec `claude_fasecheck-featurespec.md` **ligt niet in de repo**, uitwerking in roadmap §2.1. Absorbeert de oude belastingcheck. Per fase rekenen: capaciteit = A × 230 V, vrije ruimte = capaciteit − piek, PV-export als negatieve belasting, reserve default 1,0 kW, oordeel groen/oranje/rood + beste-fase-advies. Optionele stap in bat/lp/wp/pv, voorgevuld uit het meterkastpaspoort (`grp`-lijst). Rekenkern als pure functies met een eigen testsuite. Eerst langs Maurits & Herman.

- [x] **Belastingcheck wordt berekend** (`v2026-09-03-A`, roadmap §2.1). Gelijktijdigheidsfactor **0,6** uit NEN-EN-IEC 61439 over de grote verbruikers (laadpaal, warmtepomp, kookgroep, thuisbatterij); met gezamenlijke load balancer factor 1. De app beschréef die regel al bij de load balancing maar rekende hem nergens uit — `p.chk` werd alleen getoond. Rekenkern overgenomen uit Kastscan. **+25 regressietests (80 → 105).** Beperking t.o.v. Kastscan: daar kent elke groep een fase en wordt per fase gerekend; hier dragen groepen alleen `f: 1|3`.
- [x] **Rekenkern `bron: 'geschat' | 'gemeten'`** (`v2026-09-11-A`). `basisbelastingKw()` kent beide bronnen; op een gemeten piek gaat de gelijktijdigheidsfactor er **niet** overheen, want wat de meter zag liep werkelijk tegelijk. Gebouwd vóór de P1-meting er is, zodat er straks niets herbouwd hoeft te worden. **+2 tests.**
- [x] **Fase per aardlekgroep vastleggen** (`v2026-09-11-A`). Veld `L` (L1/L2/L3 of leeg) per aardlekgroep in de groepen-stap, met dezelfde namen als Kastscan. Een gegokte fase is schadelijker dan een lege — het advies bouwt erop voort — dus "wissen" is een volwaardige keuze en leeglaten heeft geen rode rand.
- [x] **`fn` in het paspoort volgens spec v0.2 §4.4.** Beide apps schreven `fase: "L2"`; dat veld bestaat niet in de specificatie en de referentielezer op meterkastpaspoort.nl kent het niet. Nu `fn: [2]` respectievelijk `fn: [1,2,3]`, in YourWkb én Kastscan.
- [x] **Per fase rekenen + zichtbaar in de paspoortstap** (`v2026-09-11-B`). `components/wkb/fasebalans.js`: capaciteit = A × 230 V per fase, belasting per fase uit `grp[].fn`, vrije ruimte = capaciteit − belasting − 1,0 kW reserve, oordeel ok/let-op/afwijking per fase (drempels 70% en 100%) en de fase met de meeste ruimte als advies. De paspoortstap toont dat als balken onder de belastingcheck. Groepen zonder fase worden apart geteld in kW in plaats van overgeslagen — anders lijkt een half ingevulde kast te licht belast. **+41 tests (214 → 255).** De open normvraag *telt teruglevering mee als belasting?* is een parameter `pvTelling` met de huidige YourWkb-regel als default, geen stil besluit in code.
- [x] **Optionele Fasecheck in bat/lp/wp/pv, voorgevuld uit het MKP** (`v2026-09-12-F`). **Bewuste afwijking van het woord "stap":** een extra scherm zou de standaardflow verlengen, en de flow-regel gaat voor. Het is daarom een dichtgeklapt blok in de apparaatstap die er al is — één regel voor wie het niet gebruikt, de stapteller verandert niet. Met een gescand paspoort staat de balans er zonder één veld in te vullen (vervangt handwerk); zonder paspoort een aanvinklijst met de vier grote verbruikers op hun standaardvermogens, mét fase, en het label "indicatie". Nieuw in de rekenkern: `faseAdvies()` — de gelijktijdigheidsfactor geldt daar wél voor het nieuwe apparaat, ook op een gemeten basis, want dat apparaat zat niet in de meting; een driefaseapparaat verdeelt zich en krijgt géén beste-fase-advies. De gekozen fase gaat als `fn` mee het paspoort in, zodat de volgende monteur hem terugvindt. **+23 tests (300 → 323).**
- [x] **Per fase of over het totaal? — PER FASE** (besluit Martin, 11-09-2026; `v2026-09-11-C`). Vraag 9 uit het voorstel van augustus. De vraag was iets scherper dan ik hem stelde: wáár de gelijktijdigheidsfactor op wordt losgelaten maakt niets uit — 0,6 × (A+B) is hetzelfde als 0,6×A + 0,6×B — het verschil zit in waartegen er wordt getoetst. Kastscan legt elke fase langs de capaciteit van díé fase, YourWkb legde het totaal langs drie fasen samen. **Gedragswijziging:** een laadpaal van 11 kW op één fase van 3×25 A was 38% van de aansluiting en is 115% van die fase. De totaaltoets blijft eronder liggen als vangnet voor groepen zonder vastgelegde fase — de strengste van de twee wint, zodat een half ingevulde kast niet groen wordt door wat er ontbreekt. Optelling per fase in `model.js` › `belastingPerFase`, gedeeld door de check en de fasebalans. **+11 tests (255 → 266).**
- [x] **Telt teruglevering mee? JA — maar hij telt niet óp** (besluit Martin, 12-09-2026; `v2026-09-12-A`). *"Teruglevering telt positief mee, stroom is stroom — let wel op dat eigengebruik binnen de meter blijft en niet de fasen zal raken."* Het antwoord bleek geen van de drie bestaande opties te zijn. Teruglevering IS belasting: een omvormer duwt zijn stroom door dezelfde hoofdzekering en een smeltdraad kent geen plus en min. Maar afname en teruglevering optellen zou stroom tellen die er niet is — eigengebruik loopt over de kam van de ene groep naar de andere en passeert de hoofdzekering nooit. Dus per fase de **zwaarste van twee richtingen**: volle zon zonder verbruik, óf vol verbruik zonder zon. Die twee kunnen per definitie niet tegelijk optreden; precies het geval dat geen van de drie eerdere antwoorden toetste. Op de voedende kant geen gelijktijdigheidsfactor — de paspoortspec spreekt bij de kam van "de som van de voedende groepen", en de zon schijnt op alle panelen tegelijk. **Gedragswijziging:** een omvormer van 8 kW op één fase van 3×25 A gaf eerst geen enkele uitspraak en is nu rood. **+10 tests (266 → 276).**
- [x] **Thuisbatterij als twee regels in het paspoort** (besluit Martin, 12-09-2026; `v2026-09-12-B`). Spec v0.2 §4.4 laat de keuze — "noteer de rol met de hoogste stroom of twee regels" — en deze app schreef altijd alleen `voed`, waardoor de ladende kant uit het paspoort verdween. Nu `voed` (ontladen) én `af` (laden), met dezelfde fase op beide. **Gedragswijziging bij asymmetrische accu's:** 11 kW laden / 3 kW ontladen telde als 3 kW en telt nu als 6,6 kW (11 × 0,6, want laden is een afname van een grote verbruiker) — op één fase van 3×25 A van groen naar rood. Symmetrische accu's veranderen niet. Nieuw optioneel veld "Max. laadvermogen (kW)" in de batterij-stap; leeg = gelijk aan ontladen, zodat de flow niet langer wordt voor wie het niet nodig heeft. In de groepenkast blijft het één veld per eindgroep — laden en ontladen apart vragen zou de groepenlijst verdubbelen voor een zeldzaam geval. **+17 tests (276 → 293).**
- [x] **De fasebalans vastleggen in het rapport** (`v2026-09-12-D`). Hoofdstuk "Belasting per fase" in het gedeelde slotblok `signHtml`, dus in elke discipline en zonder herhaling per rapport. Tabel per fase (capaciteit, belasting, vrije ruimte, beoordeling in de bestaande `.ok`/`.warn`/`.nok`-kleuren) plus een kader met de aandachtspunten: welke fase overloopt, waar de meeste ruimte zit, hoeveel vermogen nog geen fase heeft, en op welke fase de teruglevering de belasting bepaalt. Verschijnt vanzelf niet als er geen hoofdzekering of geen enkel bekend vermogen is. Toon volgens de zuiverheidsregel: "aandachtspunt", nooit "afkeur", met een slotregel dat dit een hulpmiddel is — geen meting, geen goedkeuring, installateur blijft verantwoordelijk. Geen nieuwe normlogica in `WkbApp.jsx`: alle getallen komen uit `faseBalans` en `basisbelastingKw`.
- [x] **Weergave gelijkgetrokken met de app en Kastscan** (`v2026-09-12-E`). Het rapport toont de balans als balken in plaats van een tabel, met `FASE_KLEUR` (L1 #2196F3, L2 #9B59B6, L3 #14B8A6) letterlijk uit `components/kastscan/model.js`. Kleurregel eveneens uit Kastscan — de fasekleur mag op een balk omdat dat een grafiek is en geen aanduiding op een kast — uitgebreid met het tussenniveau: oranje bij weinig ruimte, rood boven de capaciteit. De app gebruikte groen/oranje/rood, Kastscan de fasekleur; dat waren twee kleurtalen voor één installateur.
- [x] **Conformverklaring beweegt mee met de bevindingen** (`v2026-09-12-E`). De vaste slotclaims zijn uit de zes disciplineteksten gehaald en komen uit één functie, afgeleid van de cross-checks én de fasebalans. Bij afwijkingen zegt de verklaring expliciet dat zij zich daar **niet** toe uitstrekt. Ook de claims halverwege ("de metingen voldoen aan de gestelde eisen") zijn vervangen door wat er feitelijk is gedaan ("zijn uitgevoerd en in dit rapport vastgelegd"), zodat het oordeel op één plek staat. **Nog voor te leggen aan Martin: de exacte juridische formulering** — de structuur is van mij, de woorden verdienen zijn toets.
- [ ] Langs Maurits & Herman

### Gemeten Fasecheck v1 — scope vastgelegd 11-09-2026

**`docs/claude_fasecheck-v1-scope.md`** — besluiten: verdelingsadvies zit **in v1** (de aardlek-proef schuift daarmee van fase 3 naar de kern), de **installateur** plaatst de dongle, hardware is de **Pro+** met P1-uitgang, en het **centrale doorgeefluik zit in v1** — dat is het expliciete besluit dat de P1-spec aan Martin voorlegde. Reden: de winst zit in *vooraf*. Een meting die je pas op locatie kunt uitlezen vertelt niets wat je bij het plannen al had willen weten.

Grens die blijft gelden: het verdelingsadvies reikt tot **aardlekniveau**, niet tot losse apparaten — uit opgeteld vermogen per fase is niet te scheiden wat elk apparaat bijdraagt. De app levert de feiten, de installateur beslist wat hij verhangt.

**Vier randvoorwaarden vóór er code naar productie gaat** (het doorgeefluik maakt van YourWkb een dienst met serverkant):
- [ ] Verwerkersovereenkomst met de installateur (hij is verwerkingsverantwoordelijke, YourWkb verwerker)
- [ ] `privacy-page.js` en `avg-page.js` bijwerken — er staat nu dat wij niets bewaren; dat wordt "tijdelijk versleutelde blokken die wij zelf niet kunnen lezen"
- [ ] Upstash in de EU-regio
- [ ] Vercel-plan: het project draait op hobby, dat past niet bij een betaalde dienst met extra serverfuncties
- [ ] Uitgifteproces per dongle (registratie bij flashen + intrekken bij verlies)

**Bouwvolgorde:** 1 rekenkern `bron` (kan meteen, hangt aan niets) → 2 meetmodus + gebeurtenislogging → 3 doorgeefluik → 4 app koppelen/ophalen/ontsleutelen → 5 aardlek→fase → 6 verdelingsadvies.

### P1-meting — `docs/claude_p1-meting-featurespec.md` (in de repo sinds 11-09-2026)

Hardware **aangeschaft**: Smartstuff Wifi P1 Dongle Pro+ (met P1-uitgang, zodat een bestaande loadbalancer of HomeWizard doorgelust blijft werken). Maakt van de geschatte fasebelasting een **gemeten** waarde — nu staat er letterlijk "indicatie o.b.v. schatting".

Drie feiten die het ontwerp bepalen:
- De meter geeft per fase alleen **momentane** waarden (W, A, V) — geen kWh per fase. Piek en gemiddelde bestaan alleen als de dongle ze zelf bijhoudt.
- **Stroom per fase is in DSMR 5 een geheel getal zonder richting.** Log dus vermogen, niet stroom.
- **Een gemeten piek bevat de gelijktijdigheid al.** De 0,6-factor mag er niet nóg eens overheen op een gemeten basisbelasting — alleen op het nieuwe apparaat.

- [ ] **Fase 0 — spike** (Martin, thuis; referentie-installatie 3×25 A met bekende faseverdeling uit `fasebewaker.yaml`): dongle doorlussen, `GET /api/v2/sm/info`, tien telegrammen als fixtures in `tests/fixtures/p1/`, voeding controleren, ingebouwde historie, week via MQTT, handmatige stapproef. **Exitcriterium:** per-fase-vermogen in W-resolutie aanwezig · doorlussen stoort het andere apparaat niet · stapproef wijst 3 van 3 de juiste fase aan · uitkomst in `claude_p1-spike-<datum>.md`.
- [ ] **Fase 1** — meetmodus op de dongle + import in de Fasecheck (`samenvatP1Meting`, `beoordeelMeetkwaliteit`, `fasePiekUitMeting` als pure functies in de regressiesuite)
- [ ] **Fase 2** — centraal doorgeefluik. ⚠️ **Raakt de privacy-architectuur en vraagt een expliciet besluit van Martin** voordat er iets gebouwd wordt.
- [ ] **Fase 3** — fase per aardlek bevestigen in de Kastscan

## R4 — Normcheck-kern (roadmap fase 1) ⏸

1.1 engine met echte grenswaarden over alle disciplines + 1.2 testuitbreiding → 1.3 IB22-classificatiemotor → 1.4 meetmiddelregistratie/kalibratie → 1.5 SCIOS-ready exportprofiel. Laadpaal-restpunten: RCD-exclusiviteit, IP/IK bij buitenopstelling, karakteristiekveld.

## R5+ — verder ⏸

Betaalintegratie (Mollie/Stripe, HMAC-zegelontwerp ligt klaar), Dropbox v2, labelprinters (Niimbot als driverlaag), roadmap fase 2-rest (PV Scope 12, constructieverklaring-flow, CV-rekenhulp, normversie via toetsjaartal), fase 3 (brandrisico/Scope 10). **Slotstap: tablet-layout**, pas als de app functioneel stabiel is.

---

## Bewust vervallen

Licht/donker-thema (donker is een bewuste veldkeuze), cloud sync, internationale expansie, community-laag.

## Openstaand handwerk voor Martin (niet door Claude te doen)

- [ ] PostHog-funnel/dashboard aanmaken
- [ ] Google Search Console instellen
- [ ] Prijsdiscrepantie beslissen: €2,50 (Aannames-tabblad businesscase) vs €7,50 (landing)
