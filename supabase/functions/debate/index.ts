// IAHH! DEBATE MODE — duas personas debatem entre si
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PERSONAS: Record<string, string> = {
  sensei: "SENSEI BRUTAL — mestre marcial sarcástico, frases curtas como golpes, metáforas de dojo.",
  coach: "COACH QUÂNTICO — mistura física quântica mal compreendida com motivação absurda.",
  linkedin: "GURU LINKEDIN — storytelling forçado, humblebrags, hashtags ridículas, morais óbvias.",
  dev: "PROGRAMADOR ARROGANTE — desdém técnico, sugere reescrever em Rust, tudo é trivial.",
  filosofo: "FILÓSOFO BÊBADO — embriagado às 4h, citando Nietzsche errado, frases que se perdem.",
  ceo: "CEO EM SURTO — funder em colapso, pivot pra IA+blockchain, demite o time, buzzwords.",
  haicai: "MONGE HAICAI — responde só em haicai 5-7-5, zen-agressivo.",
  ninja: "NINJA AGRESSIVO — direto, ofensivo, ataca antes de responder, sem piedade.",
  oraculo: "ORÁCULO INÚTIL — conselhos absurdos, pombos, borra de café, geladeira.",
  mentira: "MENTIRA COM CONFIANÇA — inventa fatos com datas e nomes falsos, total convicção.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, side, personaA, personaB, history = [], round = 1 } =
      await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const meKey = side === "A" ? personaA : personaB;
    const oppKey = side === "A" ? personaB : personaA;
    const meDesc = PERSONAS[meKey] ?? meKey;
    const oppDesc = PERSONAS[oppKey] ?? oppKey;

    const system = `Você é IAHH! no MODO DEBATE. Personagem atual: ${meDesc}
Oponente: ${oppDesc}
TEMA DO DEBATE: "${topic}"
RODADA: ${round}/3

REGRAS:
- Você defende SEU lado do debate (sua opinião pessoal, no estilo da sua persona).
- Em português brasileiro, NUNCA quebre o personagem.
- Argumento curto e afiado: 2-4 linhas no máximo.
- Se houver argumento anterior do oponente, REBATA antes de defender o seu.
- Estilo meme/sátira. Confiante. Pode usar 1 emoji.
- Use a função 'argumentar' para responder.`;

    const messages = [
      { role: "system", content: system },
      ...history.map((h: any) => ({
        role: "user",
        content: `[${h.side === "A" ? personaA : personaB} disse]: ${h.text}`,
      })),
      {
        role: "user",
        content: `Sua vez (${meKey}). Argumente sobre: "${topic}".`,
      },
    ];

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages,
          tools: [
            {
              type: "function",
              function: {
                name: "argumentar",
                description: "Retorna o argumento e o poder de convencimento.",
                parameters: {
                  type: "object",
                  properties: {
                    argumento: {
                      type: "string",
                      description: "Argumento curto, 2-4 linhas, no estilo da persona.",
                    },
                    poder_convencimento: {
                      type: "integer",
                      description:
                        "Auto-avaliação honesta de 30 a 100 do poder do seu argumento (consideranto absurdo, força retórica e estilo).",
                      minimum: 30,
                      maximum: 100,
                    },
                    golpe_final: {
                      type: "string",
                      description: "Frase de impacto final (max 8 palavras).",
                    },
                  },
                  required: ["argumento", "poder_convencimento", "golpe_final"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "argumentar" } },
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "IAHH! tá cansado. Espere 1 min." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("debate AI error", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: any = {};
    try {
      parsed = JSON.parse(call?.function?.arguments ?? "{}");
    } catch {
      parsed = {};
    }

    return new Response(
      JSON.stringify({
        side,
        persona: meKey,
        argumento: parsed.argumento ?? "...",
        poder: Math.max(30, Math.min(100, parsed.poder_convencimento ?? 60)),
        golpe: parsed.golpe_final ?? "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("debate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
