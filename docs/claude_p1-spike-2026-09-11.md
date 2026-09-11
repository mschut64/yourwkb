# P1-spike — tussenrapport 11-09-2026

*Fase 0 uit `claude_p1-meting-featurespec.md`. Uitgevoerd op de referentie-installatie (Martins eigen aansluiting, 3×25 A). Dit is een **tussenrapport**: de softwarematige stappen zijn gedaan, de fysieke niet.*

---

## Apparaat dat antwoordde

| | |
|---|---|
| Hostnaam | `NRG-Dongle-Pro` (`nrg-dongle-pro.local`, 192.168.88.85) |
| Hardware | **`NRGD`** — compileoptions `[NRGD][MODBUS]` |
| Firmware | 5.8.13 (13-08-2026), DSMR-API (`DSMRindexEDGE.html`) |
| Meter | `KFM5KAIFA-METER`, **P1-versie 50 (DSMR 5.0)** |
| Verbinding | 115200 baud 8N1 (SMR 4/5), wifi `smart`, RSSI −63 |
| Telegrammen | 11.143 ontvangen, **0 fouten** |

> ⚠️ **Dit is een Dongle Pro, geen Pro+.** De spec kiest expliciet voor de **Pro+**, en om precies één reden: de **P1-uitgang om door te lussen**. De Pro heeft die niet. Zolang dit apparaat in de meterkast zit, is fase 0 stap 1 (doorlussen naast de bestaande fasebewaker-uitlezing) niet uitvoerbaar. Controleren of de aangeschafte Pro+ al geplaatst is, of dat dit nog de oude dongle is.

---

## ✅ Wat is bevestigd

### Per-fase-velden aanwezig in W-resolutie — het hoofdexitcriterium

Uit een live telegram:

| OBIS | Waarde | Betekenis |
|---|---|---|
| `1-0:21.7.0` / `41.7.0` / `61.7.0` | `00.254` / `00.000` / `00.424` kW | **afname per fase, 3 decimalen = W** |
| `1-0:22.7.0` / `42.7.0` / `62.7.0` | `00.000` / `00.677` / `00.000` kW | **teruglevering per fase, W** |
| `1-0:32.7.0` / `52.7.0` / `72.7.0` | `234.4` / `236.4` / `238.5` V | spanning per fase |
| `1-0:31.7.0` / `51.7.0` / `71.7.0` | `001` / `003` / `001` A | stroom — **geheel getal, zonder richting** |
| `0-0:96.7.21` / `96.7.9` | `00004` / `00004` | stroomstoringen kort/lang |

De aanname uit de spec klopt dus: **log vermogen, niet stroom.** Stroom komt binnen als afgeronde hele ampères zonder teken — op 230 V is dat een korrel van ~230 W en niet te gebruiken voor een piekbepaling.

### Somcontrole klopt exact

- Afname: `1.7.0` = 0,678 kW · som per fase 0,254 + 0,000 + 0,424 = **0,678** ✅
- Teruglevering: `2.7.0` = 0,677 kW · som per fase 0,000 + 0,677 + 0,000 = **0,677** ✅

### En meteen een illustratie van waar de Fasecheck over gaat

In dit ene telegram wordt er **tegelijk afgenomen én teruggeleverd**: L1 en L3 nemen samen 678 W af, L2 levert 677 W terug. Netto staat de meter op ongeveer nul — maar fysiek loopt er stroom door L1 en L3.

Dat is exact de stelling onder R3b: *fasecompensatie is boekhouding, stroom is fysiek.* De slimme meter saldeert over drie fasen, de hoofdzekering niet. Het staat hier in Martins eigen live data.

---

## ⚠️ Twee bevindingen die het ontwerp raken

### 1 · De ingebouwde historie is onbruikbaar voor de Fasecheck

`GET /api/v2/hist/hours` en `/hist/days` leveren alleen **metertotalen** — de kWh-registers (1.8.1, 1.8.2, 2.8.1, 2.8.2) plus gas. **Niets per fase.**

Dat bevestigt de kernaanname van de spec: een piek of gemiddelde per fase bestáát niet in de meter, alleen als de dongle hem zelf bijhoudt. De meetmodus uit fase 1 is dus geen luxe maar noodzaak.

### 2 · Een week minuutrecords past niet op de dongle

`FSsize: 128 kB`. Een week minuutrecords is 7 × 1440 = **10.080 records**.

| Opslagvorm | Per record | Totaal | Past in 128 kB? |
|---|---|---|---|
| JSON zoals in de spec | ~200 B | ~2,0 MB | nee, 16× te groot |
| Compact binair | ~30 B | ~300 kB | nee, 2,4× te groot |
| Om te passen | ~13 B | 128 kB | onrealistisch met 3 fasen × 5 velden |

Drie uitwegen, te kiezen in fase 1:

1. **Interval omhoog** — 5-minuutrecords geeft 2.016 records, dan is ~60 B per record genoeg. Kost piekdetail: een piek van één minuut middelt weg. Voor een hoofdzekeringstoets is dat bezwaarlijk.
2. **Minuutpiek bewaren in plaats van minuutgemiddelde**, binair gepakt, en alleen de velden die de rekenregels gebruiken. Vraagt uitrekenen of het onder 128 kB komt.
3. **Niet op de dongle bewaren maar wegstromen** (MQTT of het doorgeefluik uit fase 2). Dat verplaatst het probleem naar fase 2, die een principebesluit van Martin vraagt.

De vrije *sketch*-ruimte (1920 kB) is geen bestandssysteem en niet zomaar bruikbaar voor logdata.

---

## 🔒 Geen fixtures vastgelegd — bewust

De spec vraagt om tien ruwe telegrammen als fixtures in `tests/fixtures/p1/`. **Niet gedaan**, om één reden: **`github.com/mschut64/yourwkb` is een publieke repository** (geverifieerd: de GitHub-API geeft zonder authenticatie HTTP 200).

Een ruw telegram bevat `0-0:96.1.1` (het serienummer van de elektriciteitsmeter) en `0-1:96.1.0` (dat van de gasmeter), plus de standen en de storingshistorie van Martins eigen aansluiting. Dat publiek wegschrijven botst met de privacyregel uit de spec zelf — *"geen meternummer; de ruwe waarde verlaat de dongle niet"* — en met het privacy-anker van het hele project.

**Voorstel:** fixtures wél maken, maar met `96.1.1` en `96.1.0` vervangen door een vaste placeholder, en dat in het fixture-bestand vermelden. De rekenregels raken die velden niet, dus de testwaarde blijft gelijk. Te doen zodra Martin akkoord is.

---

## Nog te doen — vraagt Martin fysiek

| Stap | Status |
|---|---|
| 1 · Doorlussen naast de fasebewaker | ⛔ **geblokkeerd** — dit apparaat is een Pro zonder P1-uitgang |
| 2 · Meter identificeren | ✅ gedaan |
| 3 · Tien telegrammen als fixtures | ⏸ wacht op besluit over anonimisering |
| 4 · Voeding parasitair met doorgelust apparaat | ⛔ hangt aan stap 1 |
| 5 · Ingebouwde historie | ✅ gedaan — bevat niets per fase |
| 6 · Referentiereeks week via MQTT | ⏸ MQTT staat nu uit (`mqttbroker_connected: no`, broker leeg) |
| 7 · Handmatige stapproef (oven→L3, wasmachine→L2, kookplaat→L1) | ⏸ vraagt Martin bij de kast |

**Exitcriterium fase 0:** deels gehaald. Per-fase-vermogen in W-resolutie is bevestigd ✅. Doorlussen en de stapproef staan nog open.
