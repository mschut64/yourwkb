export async function POST(request) {
  try {
    const { prompt } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json({ error: "ANTHROPIC_API_KEY ontbreekt in de serverinstellingen" }, { status: 500 });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return Response.json({ error: error.error?.message || "API fout" }, { status: 500 });
    }

    const data = await response.json();
    const html = data.content?.find((b) => b.type === "text")?.text || "";

    return Response.json({ html });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
