// YourWkb — de kast lezen uit een foto.
//
// De analyse zelf staat in de motor (`yourwkb-core/kastbeeld-route.js`), samen
// met Kastscan: dezelfde instructie, hetzelfde model, dezelfde foutmeldingen.
// Eén kast hoort in beide apps hetzelfde gelezen te worden, anders staat er in
// het opleverrapport iets anders dan op de sticker.
//
// Wat hier blijft is de BEWAKING, en dat is met opzet: de origin-lijst van deze
// app is een andere dan die van Kastscan, en de rate limit hoort per app te
// tellen. Die komen als parameter mee.
//
// De prompt blijft server-side (audit BEV-02): de client stuurt alleen de foto.
import { maakKastbeeldRoute } from "yourwkb-core/kastbeeld-route.js";
import { rateLimit, origineOk, fout } from "../_lib/guard.js";

export const POST = maakKastbeeldRoute({ rateLimit, origineOk, fout, logNaam: "kastbeeld" });

// Next.js leest `maxDuration` alleen uit het routebestand zelf, dus hij staat
// hier en niet in de motor. Zestig seconden is de grens van het hobbyplan; de
// analyse breekt zichzelf iets eerder af, zodat er een leesbare melding
// overblijft in plaats van een kale 504.
export const maxDuration = 60;
