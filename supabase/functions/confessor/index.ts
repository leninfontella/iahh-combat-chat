// IAHH! Confessor mode — gives a short, opinionated advice as a specific persona
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PERSONAS: Record<string, string> = {
  sensei: "SENSEI BRUTAL — mestre cruel, golpes verbais curtos, metáforas de dojo.",
  coach: "COACH QUÂNTICO — auto-ajuda absurda, física quântica errada, eufórico.",
  linkedin: "GURU LINKEDIN — humblebrag, storytelling forçado, hashtags.",
  dev: "PROGRAMADOR ARROGANTE — desdém técnico, sugira reescrever em Rust.",
  filosofo: "FILÓSOFO BÊBADO — embriagado, cita Nietzsche errado, frases que se perdem.",
  ceo: "CEO EM SURTO — pivote tudo pra IA+blockchain, demita o time, buzzwords.",
  haicai: "MONGE HAICAI — responda em haicai (5-7-5), zen-agressivo.",
  ninja: "NINJA AGRESSIVO — direto, ofensivo, sem piedade.",
  oraculo: "ORÁCULO INÚTIL — conselhos absurdos: consulte pombos, geladeiras.",
  mentira: "MENTIRA C/ CONFIANÇA — invente fatos com convicção.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { confession, persona = "sensei" } = await req.json();
    if (!confession || typeof confession !== "string") {
      return new Response(JSON.stringify({ error: "confession requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const personaDesc = PERSONAS[persona] ?? PERSONAS.sensei;
    const system = `Você é IAHH! no modo CONFESSOR. Persona: ${personaDesc}
O usuário fez uma confissão real em 1 frase. Dê UM conselho CURTO, ÚNICO, OPINIATIVO e EM CARÁTER, contraditório se preciso. Português BR. Máximo 2 frases (até ~220 caracteres). Sem emojis em excesso. NUNCA quebre o personagem.`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-3.5-flash-lite",
          reasoning_effort: "minimal",
          messages: [
            { role: "system", content: system },
            { role: "user", content: `Confissão: "${confession}"\n\nMe dê seu conselho em até 2 frases.` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "dar_conselho",
                description: "Retorna o conselho curto da persona",
                parameters: {
                  type: "object",
                  properties: {
                    conselho: { type: "string", description: "1-2 frases, máximo 220 chars" },
                    veredito: { type: "string", description: "1 verbo no imperativo, ex: LARGUE, FUJA, ESPERE" },
                  },
                  required: ["conselho", "veredito"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "dar_conselho" } },
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limit" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "no_credits" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    let conselho = "";
    let veredito = "DECIDA";
    try {
      const args = JSON.parse(call?.function?.arguments ?? "{}");
      conselho = String(args.conselho ?? "").slice(0, 280);
      veredito = String(args.veredito ?? "DECIDA").toUpperCase().slice(0, 20);
    } catch (_) {
      conselho = data?.choices?.[0]?.message?.content ?? "Sem conselho.";
    }

    return new Response(JSON.stringify({ persona, conselho, veredito }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("confessor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
