import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Swords, Zap, X } from "lucide-react";
import { PERSONAS, type PersonaId, type Persona } from "@/lib/personas";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

type Turn = { persona: Persona; content: string };

interface Props {
  open: boolean;
  onClose: () => void;
  onXp: (amount: number) => void;
  onWin?: () => void;
}

const TOTAL_TURNS = 6;

export const DuelMode = ({ open, onClose, onXp, onWin }: Props) => {
  const [p1, setP1] = useState<PersonaId>("sensei");
  const [p2, setP2] = useState<PersonaId>("linkedin");
  const [topic, setTopic] = useState("Quem é a melhor IA do mundo?");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [running, setRunning] = useState(false);
  const [winner, setWinner] = useState<Persona | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const persona1 = PERSONAS.find((p) => p.id === p1)!;
  const persona2 = PERSONAS.find((p) => p.id === p2)!;

  const callTurn = async (
    persona: PersonaId,
    opponent: PersonaId,
    history: { role: "user" | "assistant"; content: string }[],
  ): Promise<string> => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: history,
        persona,
        duel: true,
        opponent,
      }),
    });
    if (!resp.ok || !resp.body) throw new Error("duel call failed");
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let acc = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") return acc;
        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) acc += delta;
        } catch {
          buf = line + "\n" + buf;
          break;
        }
      }
    }
    return acc;
  };

  const startDuel = async () => {
    if (p1 === p2) {
      toast.error("Escolha duas IAs diferentes!");
      return;
    }
    setTurns([]);
    setWinner(null);
    setRunning(true);

    const collected: Turn[] = [];
    // history is shared timeline as if both spoke; each side sees it as user turns
    const sharedTimeline: { role: "user" | "assistant"; content: string }[] = [
      { role: "user", content: `TÓPICO DO DUELO: ${topic}\nAtaque o outro lado.` },
    ];

    try {
      for (let i = 0; i < TOTAL_TURNS; i++) {
        const isP1 = i % 2 === 0;
        const me = isP1 ? p1 : p2;
        const opp = isP1 ? p2 : p1;
        // For "me", the timeline so far is "user" messages (opponent's words)
        const reply = await callTurn(me, opp, sharedTimeline);
        const meta = PERSONAS.find((p) => p.id === me)!;
        const turn = { persona: meta, content: reply };
        collected.push(turn);
        setTurns([...collected]);
        sharedTimeline.push({ role: "user", content: reply });
        await new Promise((r) => setTimeout(r, 300));
        scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
      }
      // Random winner
      const won = Math.random() > 0.5 ? persona1 : persona2;
      setWinner(won);
      onXp(40);
      onWin?.();
      toast.success(`${won.emoji} ${won.name} venceu o duelo! +40 XP`);
    } catch (e) {
      console.error(e);
      toast.error("Duelo interrompido.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !running && onClose()}>
      <DialogContent className="max-w-2xl p-0 bg-card border-neon-magenta/40 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between space-y-0 shrink-0">
          <DialogTitle className="font-display tracking-widest neon-text-magenta text-base flex items-center gap-2">
            <Swords className="w-4 h-4" />
            MODO DUELO · 1v1
          </DialogTitle>
          <button
            onClick={onClose}
            disabled={running}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="px-4 pb-4 flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
          {/* Setup */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <PersonaPicker label="LADO ESQUERDO" value={p1} onChange={setP1} disabled={running} color="neon-yellow" />
            <PersonaPicker label="LADO DIREITO" value={p2} onChange={setP2} disabled={running} color="neon-magenta" />
          </div>

          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Tópico do duelo (ex: quem manja mais de IA)"
            disabled={running}
            className="bg-input border-border font-mono text-sm shrink-0"
          />

          <Button
            onClick={startDuel}
            disabled={running}
            className="bg-gradient-to-r from-primary to-neon-magenta text-primary-foreground hover:opacity-90 font-display tracking-widest shadow-strike shrink-0"
          >
            <Zap className="w-4 h-4 mr-2" />
            {running ? "DUELO EM ANDAMENTO..." : turns.length > 0 ? "REVANCHE!" : "INICIAR DUELO"}
          </Button>

          {/* Arena */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto space-y-2 border border-border rounded p-2 bg-background/50"
          >
            {turns.length === 0 && !running && (
              <div className="h-full grid place-items-center text-center text-xs text-muted-foreground font-mono p-4">
                Escolha duas personas e aperte INICIAR.<br />
                Elas vão se atacar por {TOTAL_TURNS} turnos. 💀
              </div>
            )}
            {turns.map((t, i) => {
              const isLeft = (i % 2 === 0);
              return (
                <div
                  key={i}
                  className={cn(
                    "flex animate-kick-in",
                    isLeft ? "justify-start" : "justify-end",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-md border px-3 py-2",
                      isLeft
                        ? "border-primary/40 bg-primary/5"
                        : "border-neon-magenta/40 bg-neon-magenta/5",
                    )}
                  >
                    <div
                      className={cn(
                        "text-[10px] font-display tracking-widest mb-1",
                        isLeft ? "neon-text" : "neon-text-magenta",
                      )}
                    >
                      {t.persona.emoji} {t.persona.name}
                    </div>
                    <div className="text-xs whitespace-pre-wrap break-words leading-relaxed">
                      {t.content}
                    </div>
                  </div>
                </div>
              );
            })}
            {running && (
              <div className="text-center text-[10px] text-muted-foreground font-mono animate-pulse">
                ⚔ próximo golpe...
              </div>
            )}
            {winner && (
              <div className="mt-3 p-3 rounded border-2 border-primary bg-primary/10 text-center animate-flash-neon">
                <div className="font-display text-2xl neon-text">
                  {winner.emoji} {winner.name.toUpperCase()} VENCEU!
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                  +40 XP · IAHH! aprovou a violência verbal
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PersonaPicker = ({
  label,
  value,
  onChange,
  disabled,
  color,
}: {
  label: string;
  value: PersonaId;
  onChange: (id: PersonaId) => void;
  disabled: boolean;
  color: "neon-yellow" | "neon-magenta";
}) => {
  const p = PERSONAS.find((x) => x.id === value)!;
  return (
    <div
      className={cn(
        "border rounded p-2",
        color === "neon-yellow" ? "border-primary/40" : "border-neon-magenta/40",
      )}
    >
      <div
        className={cn(
          "text-[10px] font-display tracking-widest mb-1",
          color === "neon-yellow" ? "neon-text" : "neon-text-magenta",
        )}
      >
        {label}
      </div>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as PersonaId)}
        className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm font-mono"
      >
        {PERSONAS.map((x) => (
          <option key={x.id} value={x.id}>
            {x.emoji} {x.name}
          </option>
        ))}
      </select>
      <div className="text-[10px] text-muted-foreground mt-1 truncate">{p.tagline}</div>
    </div>
  );
};
