// ─────────────────────────────────────────────────────────────────────────────
// Van opleverdata naar de meterkastpaspoort-QR in het rapport
//
// Eén weg, voor app, rapport, PDF en e-mail: mkpBouw (app → paspoort) →
// mkpAfkappen (hoofdstuk 6, ≤ 105 modules) → mkpEncode uit het pakket
// (JSON → deflate-raw → base64url) achter MKP_BASIS → PNG als data-URI.
// Er is geen tweede schema en geen losse QR: wat op de sticker staat is wat de
// volgende monteur terugleest, en tests/test-mkp-qr.js leest hem ook echt terug.
//
// Stond tot 18-09-2026 in WkbApp.jsx en was daarom ongetest.
// ─────────────────────────────────────────────────────────────────────────────

import QRCode from "qrcode";
import { MKP_BASIS, QR_NIVEAU, mkpEncode, mkpAfkappen } from "meterkastpaspoort";
import { mkpBouw } from "./mkp-bouw.js";

// De PNG als data-URI: zo zit de QR ín het rapport-HTML en dus ook in de PDF.
// In de e-mail vervangt verstuurEmail hem door cid:mkpqr (inline-bijlage),
// want mailclients blokkeren data-URI-afbeeldingen — valkuil 3.
export const MKP_QR_OPTIES = {
  errorCorrectionLevel: QR_NIVEAU || "M", margin: 1, width: 480,
  color: { dark: "#000000", light: "#FFFFFF" },
};

export async function mkpQrVoorRapport(data, discipline) {
  const { paspoort, melding, modules } = await mkpAfkappen(mkpBouw(data, discipline));
  const url = MKP_BASIS + await mkpEncode(paspoort);
  const qr = await QRCode.toDataURL(url, MKP_QR_OPTIES);
  return { paspoort, url, qr, melding, modules };
}
