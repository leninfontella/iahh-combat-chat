// IAHH! Roast Engine — chama Google Gemini e retorna JSON estruturado.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { systemPrompt, intensityModifier } = await req.json();
    if (typeof systemPrompt !== "string" || systemPrompt.length < 20) {
      return new Response(JSON.stringify({ error: "Prompt inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

    const system =
      systemPrompt +
      (intensityModifier ? `\n\nIntensidade: ${intensityModifier}` : "") +
      `\n\nIMPORTANTE: responda EXCLUSIVAMENTE com JSON válido. Sem texto antes ou depois. Sem markdown. Sem \`\`\`. Os valores numéricos em "dimensoes" PODEM ultrapassar 100 quando o max permitir (ego: 700, cringe: 850, etc) — exagere em métricas absurdas.`;

    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-3.8-flash",
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content:
                "Faça o roast agora. Responda APENAS com o JSON, nada mais.",
            },
          ],
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ error: "IAHH! tá cansado. Tente em 1 minuto." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados. Adicione fundos." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    let raw: string = data.choices?.[0]?.message?.content ?? "{}";
    raw = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // Extrai bloco JSON se vier com ruído
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      raw = raw.slice(first, last + 1);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error("JSON parse fail:", err, raw);
      return new Response(
        JSON.stringify({ error: "IA retornou formato inválido. Tente novamente." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("roast error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
