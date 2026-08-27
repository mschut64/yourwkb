// Rapport per e-mail — met misbruikremmen (audit 25-08, BEV-01).
// De client levert nog de rapport-HTML (structurele server-side bouw volgt bij de
// betaalrelease); tot die tijd: origin-check, rate limits, strikte adresvalidatie,
// vast afzender/onderwerp, groottecap en het strippen van actieve content.
import { rateLimit, origineOk, fout } from "../_lib/guard";

const MAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,24}$/;

export async function POST(request) {
  if (!origineOk(request)) return fout(403, "Niet toegestaan");
  if (!rateLimit(request, { max: 6, perMs: 60 * 60 * 1000, naam: "mail" }))
    return fout(429, "Te veel verzendpogingen — probeer het over een uur opnieuw");
  if (!rateLimit(request, { max: 60, perMs: 24 * 60 * 60 * 1000, naam: "mail-dag" }))
    return fout(429, "Daglimiet bereikt");

  let body;
  try { body = await request.json(); }
  catch {
    return fout(400, "Aanvraag te groot of onleesbaar — zonder foto's proberen te versturen");
  }

  const { to, html, replyTo, subject, qr } = body || {};
  if (typeof to !== "string" || !MAIL_RE.test(to.trim()))
    return fout(400, "Geen geldig e-mailadres opgegeven");
  if (replyTo != null && (typeof replyTo !== "string" || !MAIL_RE.test(replyTo.trim())))
    return fout(400, "Geen geldig antwoordadres opgegeven");
  if (typeof html !== "string" || html.length < 200 || html.length > 3_800_000)
    return fout(400, "Rapportinhoud ontbreekt of is te groot — probeer zonder foto's");

  // Actieve content strippen: mailclients doen dit ook, wij doen het éérst.
  const schoon = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/javascript:/gi, "");

  // Meterkastpaspoort-QR als inline-bijlage (cid) — strikt gevalideerd:
  // alleen een base64-PNG van beperkte omvang.
  let qrBijlage = null;
  if (qr != null) {
    if (typeof qr === "string" &&
        /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(qr) &&
        qr.length < 300_000) {
      qrBijlage = qr.split(",")[1];
    } // ongeldig? → stil zonder bijlage versturen; het rapport zelf blijft compleet
  }

  if (!process.env.RESEND_API_KEY)
    return fout(500, "E-mailversturen is tijdelijk niet beschikbaar");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "YourWkb <rapport@yourwkb.nl>",          // vast — nooit uit de request
        to: [to.trim()],
        reply_to: replyTo ? replyTo.trim() : undefined,
        // Onderwerp: alleen het app-formaat toegestaan (vast prefix, één regel,
        // drukbare tekens, begrensd) — anders de veilige standaardtekst. Zo blijft
        // "Opleverrapport <nr> – <adres>" werken zonder header-injectieruimte.
        subject: (typeof subject === "string" &&
                  /^Opleverrapport [\x20-\x7E\u00A0-\u024F–]{0,110}$/.test(subject))
                 ? subject
                 : "Je opleverrapport van YourWkb",
        html: schoon,
        attachments: qrBijlage ? [{
          filename: "meterkastpaspoort-qr.png",
          content: qrBijlage,
          content_type: "image/png",
          content_id: "mkpqr",
        }] : undefined,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return fout(502, "Versturen mislukt — probeer het later opnieuw", err);
    }
    const data = await response.json();
    return Response.json({ ok: true, id: data.id });
  } catch (err) {
    return fout(502, "Versturen mislukt — probeer het later opnieuw", err?.message);
  }
}
