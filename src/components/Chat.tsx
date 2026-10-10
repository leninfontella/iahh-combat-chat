import { useEffect, useRef, useState } from "react";
import { PERSONAS, type PersonaId } from "@/lib/personas";
import { PersonaSelector } from "./PersonaSelector";
import { PersonaLab } from "./PersonaLab";
import { ChatMessage } from "./ChatMessage";
import { ViralCard } from "./ViralCard";
import { StoryCard } from "./StoryCard";
import { MemeGenerator } from "./MemeGenerator";
import { DuelMode } from "./DuelMode";
import { DebateMode } from "./DebateMode";
import { DailyChallengeMode } from "./DailyChallengeMode";
import { WeeklyRanking } from "./WeeklyRanking";
import { RoastEngine } from "./RoastEngine";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Skull, RotateCcw, Swords, RefreshCw, Trophy, Flame, Target, Mic, Eye, Crosshair } from "lucide-react";
import { ConfessorMode } from "./ConfessorMode";
import { RouletteMode } from "./RouletteMode";
import { toast } from "sonner";
import { useProgress } from "@/hooks/useProgress";
import { getSupabaseFunctionHeaders } from "@/lib/supabaseFunctionHeaders";
import { XP_RULES } from "@/lib/belts";
import { BeltBadge } from "./BeltBadge";
import { bumpWeekly } from "@/lib/weeklyStats";
import {
  type CustomPersona,
  loadCustomPersonas,
  upsertCustomPersona,
  decodePersonaFromQuery,
  clearPersonaQueryParam,
} from "@/lib/customPersonas";

type Msg = { role: "user" | "assistant"; content: string; glitched?: boolean };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const FATALITY_THRESHOLD = 3;
const GLITCH_CHANCE = 0.12; // 12% por mensagem normal

export const Chat = () => {
  const [persona, setPersona] = useState<PersonaId | string>("sensei");
  const [customs, setCustoms] = useState<CustomPersona[]>(() => loadCustomPersonas());
  const [labOpen, setLabOpen] = useState(false);
  const [labDraft, setLabDraft] = useState<CustomPersona | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [showFatality, setShowFatality] = useState(false);
  const [shake, setShake] = useState(false);
  const [duelOpen, setDuelOpen] = useState(false);
  const [shareIdx, setShareIdx] = useState<number | null>(null);
  const [storyIdx, setStoryIdx] = useState<number | null>(null);
  const [memeIdx, setMemeIdx] = useState<number | null>(null);
  const [reverseMode, setReverseMode] = useState(false);
  const [reversePending, setReversePending] = useState(false); // aguardando user responder
  const [challengeKey, setChallengeKey] = useState(0);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [rankingKey, setRankingKey] = useState(0);
  const [roastOpen, setRoastOpen] = useState(false);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [debateOpen, setDebateOpen] = useState(false);
  const [confessorOpen, setConfessorOpen] = useState(false);
  const [rouletteOpen, setRouletteOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const arenaRef = useRef<HTMLDivElement>(null);
  const { progress, addXp, reset: resetProgress } = useProgress();
  const personaInitRef = useRef(true);

  useEffect(() => {
    const builtin = PERSONAS.find((x) => x.id === persona);
    const custom = customs.find((c) => c.id === persona);
    const greeting = builtin
      ? builtin.greeting
      : custom
      ? `${custom.emoji} ${custom.name} entrou no dojo. "${custom.catchphrase}". Manda.`
      : "Pergunte.";
    setMessages([{ role: "assistant", content: greeting }]);
    setComboCount(0);
    setReverseMode(false);
    setReversePending(false);
    if (personaInitRef.current) personaInitRef.current = false;
    else addXp(XP_RULES.personaSwitch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona]);

  // Importar persona via link compartilhado (?persona=...)
  useEffect(() => {
    const imported = decodePersonaFromQuery();
    if (imported) {
      setLabDraft(imported);
      setLabOpen(true);
      clearPersonaQueryParam();
      toast(`📥 Persona "${imported.name}" recebida!`, {
        description: "Revise e salve no laboratório.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streaming]);

  const triggerScreenShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 800);
  };

  // Daily challenge agora é uma função separada (DailyChallengeMode)

  const stream = async (
    history: Msg[],
    opts: {
      worse?: boolean;
      fatality?: boolean;
      glitch?: boolean;
      glitchTo?: PersonaId;
      reverse?: boolean;
      challenge?: "ask" | "judge";
    } = {},
  ) => {
    setStreaming(true);
    let acc = "";
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", glitched: opts.glitch },
    ]);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: await getSupabaseFunctionHeaders(),
        body: JSON.stringify({
          messages: history,
          persona,
          customPersona: customs.find((c) => c.id === persona) ?? null,
          worse: opts.worse ?? false,
          fatality: opts.fatality ?? false,
          glitch: opts.glitch ?? false,
          glitchTo: opts.glitchTo ?? null,
          reverse: opts.reverse ?? false,
          challenge: opts.challenge ?? null,
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) toast.error("IAHH! tá cansado. Espera um pouco.");
        else if (resp.status === 402) toast.error("Créditos esgotados.");
        else toast.error("Erro no servidor do dojo.");
        setMessages((prev) => prev.slice(0, -1));
        setStreaming(false);
        return;
      }
      if (!resp.body) throw new Error("no body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;

      while (!done) {
        const { done: rd, value } = await reader.read();
        if (rd) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: acc } : m,
                ),
              );
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }

      // Pós-stream: checar desafio e flag glitch
      if (opts.glitch && opts.glitchTo) {
        toast(`⚡ GLITCH! IAHH virou ${PERSONAS.find((p) => p.id === opts.glitchTo)?.name}`, {
          description: "A IA bugou no meio. +5 XP de caos.",
          duration: 4000,
        });
        addXp(5);
        bumpWeekly({ xp: 5, glitches: 1 });
        setRankingKey((k) => k + 1);
      }
      // (desafio diário agora é função separada)
    } catch (e) {
      console.error(e);
      toast.error("Falha no golpe. Tente de novo.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setComboCount(0);
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    const xpGain = XP_RULES.message + (text.length > 80 ? XP_RULES.longMessage : 0);
    addXp(xpGain, "message");
    bumpWeekly({ xp: xpGain, messages: 1 });
    setRankingKey((k) => k + 1);

    // Modo Reverso pendente: usuário está respondendo a uma pergunta da IA
    if (reversePending) {
      setReversePending(false);
      await stream(next, { reverse: true, challenge: "judge" });
      return;
    }

    // Glitch aleatório
    if (Math.random() < GLITCH_CHANCE) {
      const others = PERSONAS.filter((p) => p.id !== persona);
      const target = others[Math.floor(Math.random() * others.length)];
      await stream(next, { glitch: true, glitchTo: target.id });
      return;
    }

    await stream(next);
  };

  const worsen = async () => {
    if (streaming) return;
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) {
      toast("Faça uma pergunta primeiro.");
      return;
    }
    const cutoff = messages.length - 1;
    const trimmed = messages[cutoff].role === "assistant"
      ? messages.slice(0, cutoff)
      : messages;
    setMessages(trimmed);

    const newCombo = comboCount + 1;
    const isFatality = newCombo >= FATALITY_THRESHOLD;

    if (isFatality) {
      setComboCount(0);
      setShowFatality(true);
      triggerScreenShake();
      addXp(XP_RULES.worsen * 3, "worsen");
      bumpWeekly({ xp: XP_RULES.worsen * 3, fatalities: 1 });
      setRankingKey((k) => k + 1);
      toast.error("💀 FATALITY! 💀", {
        description: "3 piorares seguidos. A IAHH ENLOUQUECEU.",
        duration: 4000,
      });
      setTimeout(() => setShowFatality(false), 2200);
      await stream(trimmed, { worse: true, fatality: true });
    } else {
      setComboCount(newCombo);
      addXp(XP_RULES.worsen, "worsen");
      if (newCombo === 2) {
        toast(`⚡ COMBO x${newCombo}! Mais um e é FATALITY...`);
      } else {
        toast(`⚡ COMBO x${newCombo}`);
      }
      await stream(trimmed, { worse: true });
    }
  };

  const startReverse = async () => {
    if (streaming) return;
    setReverseMode(true);
    setReversePending(true);
    setComboCount(0);
    // IA faz uma pergunta. Usamos histórico vazio + uma "user" sintética pra trigger.
    const trigger: Msg[] = [
      { role: "user", content: "Inicie o quiz reverso. Faça sua pergunta." },
    ];
    setMessages(trigger);
    addXp(8);
    await stream(trigger, { reverse: true, challenge: "ask" });
  };

  const reset = () => {
    const p = PERSONAS.find((x) => x.id === persona)!;
    setMessages([{ role: "assistant", content: p.greeting }]);
    setComboCount(0);
    setReverseMode(false);
    setReversePending(false);
  };

  const getQuestionFor = (assistantIdx: number): string => {
    for (let i = assistantIdx - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].content;
    }
    return "";
  };

  const customMeta = customs.find((c) => c.id === persona);
  const personaMeta = customMeta
    ? {
        id: customMeta.id as unknown as PersonaId,
        name: customMeta.name,
        emoji: customMeta.emoji,
        tagline: customMeta.catchphrase,
        greeting: customMeta.catchphrase,
      }
    : PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0];

  const actions = [
    { icon: Swords, label: "DUELO", color: "neon-magenta", onClick: () => setDuelOpen(true), disabled: false },
    { icon: Crosshair, label: "ROLETA", color: "neon-magenta", onClick: () => setRouletteOpen(true), disabled: false },
    { icon: RefreshCw, label: "REVERSO", color: "neon-cyan", onClick: startReverse, disabled: streaming },
    { icon: Trophy, label: "RANKING", color: "primary", onClick: () => setRankingOpen(true), disabled: false },
    { icon: Flame, label: "ROAST", color: "neon-yellow", onClick: () => setRoastOpen(true), disabled: false },
    { icon: Target, label: "DESAFIO", color: "neon-magenta", onClick: () => setChallengeOpen(true), disabled: false },
    { icon: Mic, label: "DEBATE", color: "neon-cyan", onClick: () => setDebateOpen(true), disabled: false },
    { icon: Eye, label: "CONFESSOR", color: "neon-magenta", onClick: () => setConfessorOpen(true), disabled: false },
  ];
  const colorMap: Record<string, string> = {
    "neon-magenta": "border-neon-magenta/60 text-neon-magenta hover:bg-neon-magenta/10",
    "neon-cyan": "border-[hsl(var(--neon-cyan)/0.6)] text-[hsl(var(--neon-cyan))] hover:bg-[hsl(var(--neon-cyan)/0.1)]",
    "primary": "border-primary/60 text-primary hover:bg-primary/10",
    "neon-yellow": "border-[hsl(var(--neon-yellow)/0.6)] text-[hsl(var(--neon-yellow))] hover:bg-[hsl(var(--neon-yellow)/0.1)]",
  };

  return (
    <div ref={arenaRef} className={`flex h-full gap-2 sm:gap-3 ${shake ? "animate-screen-shake" : ""}`}>
      {/* FATALITY overlay */}
      {showFatality && (
        <div className="fixed inset-0 z-50 pointer-events-none grid place-items-center animate-blood-flash">
          <div className="text-center animate-fatality-zoom">
            <div
              className="font-display text-5xl min-[360px]:text-6xl sm:text-9xl tracking-wider sm:tracking-widest"
              style={{
                color: "hsl(var(--blood))",
                textShadow:
                  "0 0 30px hsl(var(--blood)), 0 0 60px hsl(var(--blood) / 0.7), 4px 4px 0 hsl(0 0% 0%)",
                WebkitTextStroke: "2px hsl(0 0% 0%)",
              }}
            >
              FATALITY!
            </div>
            <div className="font-display text-base sm:text-2xl neon-text-magenta mt-2 tracking-widest">
              💀 IAHH! ENLOUQUECEU 💀
            </div>
          </div>
        </div>
      )}

      {/* Barra compacta no touch; expande com hover/foco em telas maiores. */}
      <aside className="group/sidebar shrink-0 flex flex-col items-stretch gap-1.5 py-1 transition-all duration-300 w-11 md:w-10 md:hover:w-36 md:focus-within:w-36 overflow-x-hidden overflow-y-auto border-r border-border pr-1">
        <div className="hidden md:block text-[9px] font-display tracking-widest text-muted-foreground px-1 mb-1 truncate">
          <span className="group-hover/sidebar:hidden group-focus-within/sidebar:hidden">▸</span>
          <span className="hidden group-hover/sidebar:inline group-focus-within/sidebar:inline">DOJO · CAOS</span>
        </div>
        {actions.map(({ icon: Icon, label, color, onClick, disabled }) => (
          <button
            key={label}
            onClick={onClick}
            disabled={disabled}
            title={label}
            aria-label={label}
            className={`h-11 md:h-8 w-full rounded-md border transition-colors inline-flex items-center justify-center md:justify-start px-1.5 gap-2 disabled:opacity-40 ${colorMap[color]}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline text-[10px] font-display tracking-widest whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 group-focus-within/sidebar:opacity-100 transition-opacity">
              {label}
            </span>
          </button>
        ))}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
      <div className="flex items-center justify-end gap-2 mb-2">
        <BeltBadge progress={progress} onReset={resetProgress} />
      </div>


      <PersonaSelector
        value={persona}
        onChange={(id) => setPersona(id)}
        customs={customs}
        onOpenLab={() => {
          setLabDraft(null);
          setLabOpen(true);
        }}
      />

      {reverseMode && (
        <div className="mt-1 mb-1 px-2 py-1 rounded border border-[hsl(var(--neon-cyan)/0.4)] bg-[hsl(var(--neon-cyan)/0.05)] text-[10px] font-mono text-[hsl(var(--neon-cyan))] flex items-center gap-1.5">
          <RefreshCw className="w-3 h-3" />
          MODO REVERSO ATIVO — {reversePending ? "responda à pergunta da IAHH" : "duelo encerrado"}
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-2 sm:py-4 space-y-3 sm:space-y-4 pr-1"
      >
        {messages.map((m, i) => (
          <ChatMessage
            key={i}
            role={m.role}
            content={m.content}
            isStreaming={streaming && i === messages.length - 1 && m.role === "assistant"}
            glitched={m.glitched}
            onShare={
              m.role === "assistant" && m.content && !(streaming && i === messages.length - 1)
                ? () => setShareIdx(i)
                : undefined
            }
            onStory={
              m.role === "assistant" && m.content && !(streaming && i === messages.length - 1)
                ? () => setStoryIdx(i)
                : undefined
            }
            onMeme={
              m.role === "assistant" && m.content && !(streaming && i === messages.length - 1)
                ? () => setMemeIdx(i)
                : undefined
            }
          />
        ))}
      </div>

      <div className="border-t border-border pt-2 sm:pt-3 space-y-2">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              reversePending
                ? "Responda à pergunta da IAHH... ela vai te julgar."
                : "Desafie a IAHH..."
            }
            rows={2}
            disabled={streaming}
            className="resize-none bg-input border-border focus-visible:ring-primary font-mono text-sm min-h-[56px]"
          />
          <Button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 self-stretch px-3 sm:px-4 font-display tracking-wider shadow-neon shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={worsen}
            disabled={streaming || reverseMode}
            className={`border-neon-magenta text-neon-magenta hover:bg-neon-magenta/10 font-display tracking-wider text-[11px] sm:text-xs h-11 sm:h-8 px-2 sm:px-3 ${
              comboCount >= 2 ? "animate-pulse-glow border-destructive text-destructive" : ""
            }`}
          >
            <Skull className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">⚡ Piorar resposta</span>
            <span className="sm:hidden">⚡ Piorar</span>
          </Button>
          {comboCount > 0 && (
            <span
              className={`text-[11px] font-display tracking-widest px-2 py-1 rounded ${
                comboCount === 2
                  ? "bg-destructive/20 text-destructive animate-flash-neon"
                  : "bg-neon-magenta/10 text-neon-magenta"
              }`}
            >
              COMBO x{comboCount}
              {comboCount === 2 && " · FATALITY READY"}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={streaming}
            className="border-border text-muted-foreground hover:text-foreground font-display tracking-wider text-[11px] sm:text-xs h-11 sm:h-8 px-2 sm:px-3 ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Resetar dojo</span>
            <span className="sm:hidden">Reset</span>
          </Button>
        </div>
      </div>
      </div>

      {shareIdx !== null && (
        <ViralCard
          open={shareIdx !== null}
          onClose={() => setShareIdx(null)}
          question={getQuestionFor(shareIdx)}
          answer={messages[shareIdx]?.content ?? ""}
          persona={personaMeta}
        />
      )}
      {storyIdx !== null && (
        <StoryCard
          open={storyIdx !== null}
          onClose={() => setStoryIdx(null)}
          question={getQuestionFor(storyIdx)}
          answer={messages[storyIdx]?.content ?? ""}
          persona={personaMeta}
        />
      )}
      {memeIdx !== null && (
        <MemeGenerator
          open={memeIdx !== null}
          onClose={() => setMemeIdx(null)}
          question={getQuestionFor(memeIdx)}
          answer={messages[memeIdx]?.content ?? ""}
        />
      )}
      <DuelMode
        open={duelOpen}
        onClose={() => setDuelOpen(false)}
        onXp={(amt) => addXp(amt)}
        onWin={() => {
          bumpWeekly({ xp: 40, duelsWon: 1 });
          setRankingKey((k) => k + 1);
        }}
      />
      <WeeklyRanking
        open={rankingOpen}
        onClose={() => setRankingOpen(false)}
        refreshKey={rankingKey}
      />
      <RoastEngine open={roastOpen} onClose={() => setRoastOpen(false)} />
      <PersonaLab
        open={labOpen}
        onClose={() => setLabOpen(false)}
        importDraft={labDraft}
        onUse={(p) => {
          upsertCustomPersona(p);
          setCustoms(loadCustomPersonas());
          setPersona(p.id);
          toast(`${p.emoji} ${p.name} no comando.`);
        }}
      />
      <DebateMode
        open={debateOpen}
        onClose={() => setDebateOpen(false)}
        onWinnerVote={(_w, xp) => {
          addXp(xp);
          bumpWeekly({ xp });
          setRankingKey((k) => k + 1);
        }}
      />
      <DailyChallengeMode
        open={challengeOpen}
        onClose={() => setChallengeOpen(false)}
        onChallengeComplete={(xp) => {
          addXp(xp);
          bumpWeekly({ xp, challengesDone: 1 });
          setRankingKey((k) => k + 1);
        }}
      />
      <ConfessorMode
        open={confessorOpen}
        onClose={() => setConfessorOpen(false)}
        onVote={(xp) => {
          addXp(xp);
          bumpWeekly({ xp });
          setRankingKey((k) => k + 1);
        }}
      />
      <RouletteMode
        open={rouletteOpen}
        onClose={() => setRouletteOpen(false)}
        currentPersona={persona}
        recentUserMessages={messages.filter((m) => m.role === "user").slice(-5).map((m) => m.content)}
        onXp={(xp) => {
          addXp(xp);
          bumpWeekly({ xp });
          setRankingKey((k) => k + 1);
        }}
      />
    </div>
  );
};
