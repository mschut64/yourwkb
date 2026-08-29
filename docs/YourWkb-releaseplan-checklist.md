# YourWkb — releaseplan & afvinklijst

*Gereconstrueerd op 29-08-2026 uit `CLAUDE.md` §5 en `docs/design-spec.md`. Het origineel uit de claude.ai-chats stond niet in de repo en is op de werkmachine niet teruggevonden; deze versie is vanaf nu de bron. Koers: `docs/YourWkb-roadmap-2026-08.md`.*

Afvinkregel: een punt is pas ✅ als de wijziging in `main` staat, de regressietests 80/80 groen zijn en `npx next build` compileert.

---

## R0 — basis ✅
## R0.5 — security-release + blog ✅

Zie `CLAUDE.md` §4 voor de inhoud van beide.

---

## R1 — Design fase 2 🔄

Doorvoeren van `docs/design-spec.md` **sectie 4** (per scherm — wat niet via de tokens meekomt). Secties 2a, 2b en 3 van de spec (de `K`/`S`-tokens en het landing-CSS-blok) zijn in een eerdere ronde al doorgevoerd; de tokens `S.rij`, `S.eenheid`, `S.inputMeting` en `S.btnGhost` bestaan dus wél maar worden nog nergens gebruikt.

### Meetscherm
- [ ] Meetwaardevelden van `S.input` naar `S.inputMeting` (32 px / 700, tabular-nums)
- [ ] Eenheid uit het label naar `<span style={S.eenheid}>` naast het veld
- [ ] Normvlak onder het meetveld: statuskleur, ✓/✗-teken, uitspraak + grenswaarde
- [ ] Stapteller "Stap i van n" in `S.hdr` + voortgangsbalk (`S.bar`/`S.barFill`)
- [ ] `fontVariantNumeric:"tabular-nums"` op meetwaarden in lijstweergaven

### Startscherm
- [ ] Projectrij van `S.card` naar `S.rij` (56 px, status rechts uitgelijnd)
- [ ] Disciplinetegel: 28 px kleurvlak boven, label + norm eronder

### Paspoort-stap — ⚠️ geblokkeerd, wacht op Martin
- [ ] ~~Risicoscore in statuskleur, cijfer 56 px~~ — **bestaat niet in de app.** Geen enkele treffer op `risico`/`score` behalve `dubbeleBalancerRisico`. Vermoedelijk door de ontwerper afgeleid uit een screenshot van een ander scherm, of nooit gebouwd.
- [ ] ~~Inspectiepunt naar `S.rij` met statusvierkant + reden~~ — **bestaat niet als UI.** Alleen `// Visuele inspectiepunten` in de rekenlogica ([WkbApp.jsx:466](../components/WkbApp.jsx:466)).

Beide punten uit spec §4 zijn niet uitvoerbaar zoals geschreven. Uit R1 gehaald tot Martin aanwijst waar ze op slaan.

### Back-up & delen
- [ ] Knophiërarchie: delen blijft `S.btn` (geel), back-up wordt `S.btnGhost`
- [ ] Compleetheidsmelding als statusvlak (hergebruik uit meetscherm), `level="ok"`
- [ ] Waarschuwing lokale opslag van `K.red` naar `S.hint`

### Meegebundeld in R1
- [x] **S0 — `@babel/core` en `@babel/preset-react` als devDependency, gepind op 7.** Stonden nergens in `package.json`, waardoor `extract-logica.js` op een verse checkout faalde. Babel 8 breekt de extractor (`parse` wil een callback), dus de pin op 7 is noodzakelijk, geen luiheid.
- [x] **S1 — zichtbaar versienummer.** Constante `APP_VERSIE`, rechts in de header van het beginscherm. De kopregel liep twee releases achter en is nu afgeleid van de constante.
- [x] **Landing "binnenkort" opschonen — was al gebeurd.** Het blok op [app/landing/page.js:458](../app/landing/page.js:458) bevat nog precies belastingcheck + eigen logo, exact de twee die moesten blijven. Laadpaal, thuisbatterij en QR-paspoort staan al als beschikbaar (regel 247, 435 en de paspoort-sectie). Vermoedelijk meegegaan in v2026-08-16-B.

### Oplevering
- [ ] `node tests/extract-logica.js components/WkbApp.jsx` + `node tests/test.js` → 80/80
- [ ] `npx next build` → compiled successfully
- [ ] Versieletter opgehoogd in de kopregel van `WkbApp.jsx`
- [ ] Flow-regel getoetst: geen scherm, stap of bevestiging toegevoegd

### Afwijkingen van spec §4 — voorgelegd aan Martin 29-08-2026, nog geen akkoord

De spec is geschreven tegen een mentaal model van "één meting per scherm". De app heeft dichte meetrasters. Letterlijk doorvoeren verlengt de flow en botst dus met de flow-regel. Vier voorstellen:

1. **Meetvelden.** Niet `S.input` → `S.inputMeting`, maar `MiniInput` zelf opwaarderen (13 → 20 px/700, tabular-nums, eenheid via `S.eenheid`). De meetwaarden zitten in `MiniInput` ([WkbApp.jsx:732](../components/WkbApp.jsx:732)), 70–80 px breed en naast elkaar in `flexWrap`-rijen — zes Z-waarden op een rij. Volle breedte à 64 px maakt daar een scrollmarathon van.
2. **Normvlak.** Eén vlak per meetblok (A-impedantie, B-isolatie, C-spanning) in plaats van per veld. De statuspil per veld blijft, dus je ziet nog steeds wélke waarde afwijkt.
3. **Stapteller.** `StepBar` ([WkbApp.jsx:830](../components/WkbApp.jsx:830)) blijft. De spec vervangt hem door een display-only regel, wat het terugspringen naar een afgeronde stap zou weghalen — functieverlies. Alleen "Stap i van n" + schermtitel 20 px toevoegen.
4. **Disciplinetegel.** Kleurvlak toevoegen mét behoud van de emoji-iconen; de spec-variant haalt icoon en per-discipline kleur weg.

**Aandachtspunt uit spec §7:** `S.input` (±40 → 52 px) en `S.btn` (±48 → 56 px) maken lange formulieren ~25% langer. Als de paspoort- of materiaalstap daardoor een extra scroll krijgt, dichtheid uit de spacing halen — niet uit de tapmaat. Ter beoordeling van Martin in het veld.

---

## R2 — Controleerbaar vakmanschap + AI-meekijker (fotocheck stap 8) ⏸

Erkenningsblok in bedrijfsprofiel (InstallQ-erkenningsnummer, CO/BRL 6000-25, F-gassen BRL 100/200 — elk optioneel, eenmalig; rapport toont per discipline het relevante nummer + controleregel via echteinstallateur.nl / tlokb.nl). AI-meekijker op werkfoto's: optionele knop per checkpoint, foto's naar de beveiligde `/api/rapport`-route, bevindingen als signaal (nooit keuring-taal), privacymelding, offline grijs.

**Blokkeert op:** de systeemprompt uit de fototest-kalibratie (aparte chat). Prijsmodel: advies optie A (inbegrepen, ~€0,03/analyse, ~€0,09/rapport).

## R3a — Kastscan (fotocheck stap 6) ⏸

Spec `claude_kastscan-featurespec.md` (niet in de repo). Foto van de geopende verdeler vult groepen/aardlekken/fasen vóór in — de foto vult in, de installateur bevestigt. Volle resolutie verplicht, HEIC-ondersteuning. Testbasis `claude_fotokalibratie-kasten-herman-2026-08.md`. Levert de faseverdeling aan R3b.

## R3b — Fasecheck v1 ⏸

Spec `claude_fasecheck-featurespec.md` (niet in de repo), uitwerking in roadmap §2.1. Absorbeert de oude belastingcheck. Per fase rekenen: capaciteit = A × 230 V, vrije ruimte = capaciteit − piek, PV-export als negatieve belasting, reserve default 1,0 kW, oordeel groen/oranje/rood + beste-fase-advies. Optionele stap in bat/lp/wp/pv, voorgevuld uit het meterkastpaspoort (`grp`-lijst). Rekenkern als pure functies zodat extract-logica hem oppakt. Eerst langs Maurits & Herman.

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
