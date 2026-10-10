import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Target, Check, Trophy, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { PERSONAS, type PersonaId } from "@/lib/personas";
import {
  todaysChallenge,
  loadChallengeState,
  markChallengeDone,
  isChallengePassed,
} from "@/lib/challenges";
import { ChatMessage } from "./ChatMessage";
import { cn } from "@/lib/utils";
import { getSupabaseFunctionHeaders } from "@/lib/supabaseFunctionHeaders";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

type Msg = { role: "user" | "assistant"; content: string };

interface Props {
  open: boolean;
  onClose: () => void;
  onChallengeComplete: (xp: number) => void;
}

export const DailyChallengeMode = ({ open, onClose, onChallengeComplete }: Props) => {
  const challenge = todaysChallenge();
  const [persona, setPersona] = useState<PersonaId>(challenge.persona);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [state, setState] = useState(loadChallengeState());
  const scrollRef = useRef<HTMLDivElement>(null);

  const done = state.completedId === challenge.id;
  const suggested = PERSONAS.find((p) => p.id === challenge.persona)!;

  useEffect(() => {
    if (open) {
      const p = PERSONAS.find((x) => x.id === persona)!;
      setMessages([{ role: "assistant", content: p.greeting }]);
      setState(loadChallengeState());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, persona]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const stream = async (history: Msg[]) => {
    setStreaming(true);
    let acc = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: await getSupabaseFunctionHeaders(),
        body: JSON.stringify({ messages: history, persona }),
      });

      if (!resp.ok) {
        toast.error("Erro no servidor do dojo.");
        setMessages((prev) => prev.slice(0, -1));
        setStreaming(false);
        return;
      }
      if (!resp.body) throw new Error("no body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let finished = false;

      while (!finished) {
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
            finished = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((prev) =>
                prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m)),
              );
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }

      // Verifica desafio
      if (!done && isChallengePassed(challenge, acc)) {
        markChallengeDone(challenge.id);
        setState(loadChallengeState());
        onChallengeComplete(challenge.xpReward);
        toast.success("🏆 DESAFIO DO DIA CONCLUÍDO!", {
          description: `"${challenge.title}" · +${challenge.xpReward} XP`,
          duration: 6000,
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha. Tente de novo.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    await stream(next);
  };

  const resetConv = () => {
    const p = PERSONAS.find((x) => x.id === persona)!;
    setMessages([{ role: "assistant", content: p.greeting }]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 gap-0 bg-background">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <span
              className={cn(
                "w-7 h-7 rounded-md grid place-items-center",
                done ? "bg-primary text-primary-foreground" : "bg-neon-magenta/20 text-neon-magenta",
              )}
            >
              {done ? <Check className="w-4 h-4" /> : <Target className="w-4 h-4" />}
            </span>
            <span className="font-display tracking-widest text-sm neon-text-magenta">
              DESAFIO DO DIA
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              · +{challenge.xpReward} XP
            </span>
            {done && (
              <span className="text-[10px] font-display tracking-widest text-primary inline-flex items-center gap-1 ml-auto mr-6">
                <Trophy className="w-3 h-3" />
                CONCLUÍDO
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-left space-y-1 pt-1">
            <div className="text-sm font-medium text-foreground">{challenge.title}</div>
            <div className="text-xs">{challenge.brief}</div>
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pt-2 pb-1 border-b border-border/50">
          <div className="text-[10px] font-display tracking-widest text-muted-foreground mb-1">
            ESCOLHA A PERSONALIDADE
            <span className="ml-1 text-[9px] font-mono normal-case tracking-normal">
              (sugerida: {suggested.emoji} {suggested.name})
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {PERSONAS.map((p) => {
              const active = p.id === persona;
              const isSuggested = p.id === challenge.persona;
              return (
                <button
                  key={p.id}
                  onClick={() => setPersona(p.id)}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-display tracking-wider transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : isSuggested
                        ? "border-primary/50 text-primary/80 hover:bg-primary/5"
                        : "border-border text-foreground/80 hover:border-neon-magenta/60 hover:text-neon-magenta",
                  )}
                  title={p.tagline}
                >
                  <span>{p.emoji}</span>
                  <span className="uppercase">{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <ChatMessage
              key={i}
              role={m.role}
              content={m.content}
              isStreaming={streaming && i === messages.length - 1 && m.role === "assistant"}
            />
          ))}
        </div>

        <div className="border-t border-border p-3 space-y-2">
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
              placeholder="Tente completar o desafio..."
              rows={2}
              disabled={streaming}
              className="resize-none bg-input border-border focus-visible:ring-primary font-mono text-sm min-h-[56px]"
            />
            <Button
              onClick={send}
              disabled={streaming || !input.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 self-stretch px-4 font-display tracking-wider shadow-neon shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={resetConv}
              disabled={streaming}
              className="border-border text-muted-foreground hover:text-foreground font-display tracking-wider text-[11px] h-8"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Resetar conversa
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
