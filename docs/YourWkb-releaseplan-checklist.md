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

### Paspoort-stap
- [ ] Risicoscore in statuskleur (groen/oranje/rood) i.p.v. `K.yellow`, cijfer 56 px
- [ ] Inspectiepunt van `S.card` naar `S.rij` met 24 px statusvierkant + reden in `S.hint`

### Back-up & delen
- [ ] Knophiërarchie: delen blijft `S.btn` (geel), back-up wordt `S.btnGhost`
- [ ] Compleetheidsmelding als statusvlak (hergebruik uit meetscherm), `level="ok"`
- [ ] Waarschuwing lokale opslag van `K.red` naar `S.hint`

### Meegebundeld in R1
- [ ] Zichtbaar versienummer in de app (doorlopend spoor uit de roadmap)
- [ ] Landing "binnenkort" opschonen: laadpaal, thuisbatterij en QR-meterkastpaspoort zijn live → naar beschikbaar; belastingcheck en eigen logo blijven "binnenkort"

### Oplevering
- [ ] `node tests/extract-logica.js components/WkbApp.jsx` + `node tests/test.js` → 80/80
- [ ] `npx next build` → compiled successfully
- [ ] Versieletter opgehoogd in de kopregel van `WkbApp.jsx`
- [ ] Flow-regel getoetst: geen scherm, stap of bevestiging toegevoegd

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
