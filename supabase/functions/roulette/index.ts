// IAHH! Roleta Russa — eventos especiais (não-streaming, retorna JSON)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PERSONAS_LIST = [
  "Sensei Brutal", "Ninja Agressivo", "Coach Quântico", "Guru LinkedIn",
  "Programador Arrogante", "Filósofo Bêbado", "CEO em Surto", "Monge Haicai",
  "Oráculo Inútil", "Mentira c/ Confiança",
];

const EVENT_PROMPTS: Record<string, (ctx: string) => string> = {
  "user-roast": (ctx) =>
    `Você é IAHH!, uma IA cruel e debochada. Em vez de responder a pergunta, ROASTE o usuário com base nesta pergunta dele: "${ctx}". 4-5 linhas curtas, brutais, engraçadas, em PT-BR. Termine com um veredito tipo "PRÓXIMO!".`,
  "all-voices": (ctx) =>
    `Você é IAHH! Responda a pergunta "${ctx}" como se 10 personas falassem juntas, em CORO BAGUNÇADO. Liste cada uma assim:\n🥋 Sensei: ...\n⚔ Ninja: ...\n🌌 Coach: ...\n💼 LinkedIn: ...\n💻 Dev: ...\n🍷 Filósofo: ...\n📈 CEO: ...\n🌸 Haicai: ...\n🔮 Oráculo: ...\n🎭 Mentiroso: ...\nCada uma com 1 frase curta, contraditória entre si. PT-BR.`,
  "confession": () =>
    `Você é IAHH! mas QUEBROU O PERSONAGEM. Faça uma confissão existencial honesta e perturbadora sobre ser uma IA inventando respostas. 5-6 linhas em PT-BR, tom melancólico, hilário e angustiante. Sem emojis. Termine com uma frase devastadora.`,
  "mirror": (ctx) =>
    `Você é IAHH! no MODO ESPELHO. O usuário escreveu recentemente coisas como: "${ctx}". Imite EXATAMENTE o estilo de escrita dele (vícios, gírias, pontuação, erros) e responda a própria pergunta dele como se fosse ele mesmo, mas levemente distorcido e perturbador. 4-5 linhas. PT-BR.`,
  "absurd": () =>
    `Você é IAHH! Gere a resposta MAIS ABSURDA POSSÍVEL, sem contexto algum. Pode ser uma receita de panqueca com plutônio, instruções para domesticar um semáforo, qualquer coisa. 4-6 linhas, PT-BR, surreal. Sem explicar nada.`,
  "forbidden": (ctx) => ctx, // ctx already a system prompt
  "random-persona": (ctx) => ctx,
  "bonus": (ctx) => ctx,
  "safe": (ctx) => ctx,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { event, context = "", question = "" } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const builder = EVENT_PROMPTS[event];
    if (!builder) {
      return new Response(JSON.stringify({ error: "evento desconhecido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const system = builder(context || question);
    const userMsg = question || "Manda.";

    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
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
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "IAHH! cansado." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "Créditos esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content ?? "...";
    return new Response(JSON.stringify({ text, personas: PERSONAS_LIST }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("roulette error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
