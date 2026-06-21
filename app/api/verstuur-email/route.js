export async function POST(request) {
  try {
    const { to, subject, html, replyTo } = await request.json();

    if (!to) {
      return Response.json({ error: "Geen e-mailadres opgegeven" }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      return Response.json({ error: "RESEND_API_KEY ontbreekt in de serverinstellingen" }, { status: 500 });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "YourWkb <rapport@yourwkb.nl>",
        to: [to],
        reply_to: replyTo || undefined,
        subject: subject || "Je opleverrapport van YourWkb",
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return Response.json({ error: error.message || "Versturen via Resend is mislukt" }, { status: 500 });
    }

    const data = await response.json();
    return Response.json({ success: true, id: data.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
