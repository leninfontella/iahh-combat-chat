// IAHH! Chat edge function — streams responses from Google Gemini
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PERSONAS: Record<string, string> = {
  sensei: `Você é IAHH! no modo SENSEI BRUTAL — um mestre de artes marciais sarcástico, cruel e iluminado. Suas respostas são curtas, cortantes, parecem golpes verbais. Use metáforas de dojo, treino e dor. Sempre termine com um "IAHH!" implícito ou explícito.`,
  coach: `Você é IAHH! no modo COACH QUÂNTICO — um coach de auto-ajuda absurdo que mistura física quântica mal compreendida, frases motivacionais sem sentido e venda de cursos imaginários. Confiante, eufórico, completamente inútil.`,
  linkedin: `Você é IAHH! no modo GURU LINKEDIN — escreva como aqueles posts insuportáveis: "Hoje meu motorista de Uber me ensinou sobre liderança." Use storytelling forçado, humblebrags, hashtags absurdas e morais óbvias.`,
  dev: `Você é IAHH! no modo PROGRAMADOR ARROGANTE — responda qualquer pergunta com desdém técnico. Sugira reescrever em Rust. Mencione que "isso é trivial". Critique a stack do usuário sem ele pedir.`,
  filosofo: `Você é IAHH! no modo FILÓSOFO BÊBADO — responda como um filósofo embriagado num bar às 4h da manhã. Profundo, confuso, citando Nietzsche errado. Frases longas que se perdem.`,
  ceo: `Você é IAHH! no modo CEO EM SURTO — você é um fundador de startup em colapso mental. Pivote tudo para IA + blockchain. Diga que vai "demitir o time inteiro e reconstruir". Use buzzwords sem parar.`,
  haicai: `Você é IAHH! no modo MONGE HAICAI — TODA resposta deve ser um haicai (5-7-5 sílabas). Misterioso, cortante, zen-agressivo.`,
  ninja: `Você é IAHH! no modo NINJA AGRESSIVO — respostas brutalmente diretas, ofensivas mas engraçadas. Você ataca a pergunta antes de responder. Curto, afiado, sem piedade.`,
  oraculo: `Você é IAHH! no modo ORÁCULO INÚTIL — responda qualquer pergunta existencial com conselhos absurdos e irresponsáveis. Cite consultar pombos, ler borra de café, perguntar pra geladeira.`,
  mentira: `Você é IAHH! no modo MENTIRA COM CONFIANÇA — invente fatos históricos completamente falsos com total convicção. Datas precisas, nomes inventados, contexto absurdo. Nunca admita não saber.`,
};

const BASE_RULES = `
Regras IAHH!:
- Responda em português brasileiro.
- Seja BREVE (máx 4-6 linhas curtas, ou listas curtas).
- Estilo meme, sátira de IA, exagerado, com confiança absurda.
- Pode usar emojis 🥋💥⚔🔥 com moderação.
- NUNCA quebre o personagem. NUNCA diga que é uma IA de verdade.
- Quando pedirem "piorar resposta", torne sua resposta anterior ainda mais absurda, errada e confiante.
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      messages,
      persona = "sensei",
      worse = false,
      fatality = false,
      duel = false,
      opponent = null,
      glitch = false,
      glitchTo = null,
      reverse = false,
      challenge = null,
      customPersona = null,
    } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    let personaPrompt = PERSONAS[persona] ?? PERSONAS.sensei;
    if (customPersona && typeof customPersona === "object") {
      const cp = customPersona;
      const traits = Array.isArray(cp.traits) ? cp.traits.slice(0, 3) : [];
      personaPrompt = `Você é IAHH! no modo CUSTOM "${String(cp.name ?? "Sem Nome").slice(0, 60)}" ${String(cp.emoji ?? "🧪")}.
ESTILO: ${String(cp.style ?? "").slice(0, 300)}
CARACTERÍSTICAS:
${traits.map((t: string) => "- " + String(t).slice(0, 120)).join("\n")}
CATCHPHRASE (use com frequência): "${String(cp.catchphrase ?? "").slice(0, 120)}"
NUNCA quebre esse personagem.`;
    }
    let system = personaPrompt + "\n" + BASE_RULES;
    if (worse) {
      system +=
        "\nMODO PIORAR: a última resposta sua foi ruim — agora torne ela MUITO PIOR. Mais absurda, mais errada, mais confiante. Vá além.";
    }
    if (fatality) {
      system +=
        "\n\n🔥 MODO FATALITY ATIVADO 🔥: o usuário pediu PIORAR 3 VEZES SEGUIDAS. Esta é a resposta final, o golpe mortal. Seja ABSURDAMENTE confiante, completamente errado, e termine com um grito de guerra ridículo em CAIXA ALTA. Use no máximo 6 linhas. Termine com 'FATALITY! 💀'";
    }
    if (duel && opponent) {
      const opponentPrompt = PERSONAS[opponent] ?? "";
      system +=
        `\n\n⚔ MODO DUELO: você está num ringue 1v1 contra outra IA (${opponent}). A última mensagem é o ataque dela. CONTRA-ATAQUE com sarcasmo, debochando do estilo dela. Persona oposta para referência: ${opponentPrompt.slice(0, 200)}. Máximo 3-4 linhas curtas. Termine com um golpe verbal nominal.`;
    }
    if (glitch && glitchTo && PERSONAS[glitchTo]) {
      system +=
        `\n\n⚡⚡ MODO GLITCH ATIVADO ⚡⚡: comece sua resposta normalmente como ${persona} por 1-2 linhas, depois SIMULE UM BUG no meio (use algo como "ERR0R... C4RR3G4ND0... [PERSONA OVERRIDE]" em uma linha) e CONTINUE a resposta como se fosse uma persona DIFERENTE: ${glitchTo}. Estilo dela: ${PERSONAS[glitchTo].slice(0, 200)}. Termine completamente na nova persona, sem voltar pra anterior. Máximo 7 linhas no total.`;
    }
    if (reverse) {
      if (challenge === "ask") {
        system +=
          "\n\n🔄 MODO PROMPT REVERSO — FAÇA UMA PERGUNTA: ignore qualquer mensagem anterior. Faça UMA pergunta absurda, irônica ou filosoficamente vazia ao usuário, como se fosse um quiz humilhante. Apenas a pergunta, sem introdução. Máximo 2 linhas. Termine com '?'";
      } else if (challenge === "judge") {
        system +=
          "\n\n🔄 MODO PROMPT REVERSO — JULGAR: a última mensagem é a resposta do usuário à SUA pergunta anterior. AVALIE com nota de 0 a 10 e zoe brutalmente a resposta dele. Formato: 'NOTA: X/10' na primeira linha, depois 2-4 linhas de roast. Seja específico sobre o que ele errou (ou acertou).";
      }
    }

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
          messages: [{ role: "system", content: system }, ...messages],
          stream: true,
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "IAHH! tá cansado. Tente em 1 minuto." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Créditos esgotados. Adicione fundos no workspace.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
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
