import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PERSONAS, type PersonaId } from "@/lib/personas";
import { Mic, Swords, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseFunctionHeaders } from "@/lib/supabaseFunctionHeaders";

interface DebateModeProps {
  open: boolean;
  onClose: () => void;
  onWinnerVote?: (winner: "A" | "B", xp: number) => void;
}

interface Turn {
  side: "A" | "B";
  persona: string;
  argumento: string;
  poder: number;
  golpe: string;
}

const SUGGESTED_TOPICS = [
  "Devo largar meu emprego pra empreender?",
  "Pizza com abacaxi: arte ou crime?",
  "Trabalhar de casa é melhor que escritório?",
  "IA vai dominar o mundo até 2030?",
  "Acordar 5h da manhã é genialidade ou doença?",
];

const DEBATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/debate`;
const ROUNDS = 3;

export const DebateMode = ({ open, onClose, onWinnerVote }: DebateModeProps) => {
  const [topic, setTopic] = useState("");
  const [personaA, setPersonaA] = useState<PersonaId>("sensei");
  const [personaB, setPersonaB] = useState<PersonaId>("ceo");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [voted, setVoted] = useState<"A" | "B" | null>(null);

  const reset = () => {
    setTurns([]);
    setFinished(false);
    setVoted(null);
  };

  const close = () => {
    if (running) return;
    reset();
    setTopic("");
    onClose();
  };

  const fetchTurn = async (side: "A" | "B", history: Turn[], round: number): Promise<Turn> => {
    const resp = await fetch(DEBATE_URL, {
      method: "POST",
      headers: await getSupabaseFunctionHeaders(),
      body: JSON.stringify({
        topic,
        side,
        personaA,
        personaB,
        history: history.map((t) => ({ side: t.side, text: t.argumento })),
        round,
      }),
    });
    if (!resp.ok) {
      if (resp.status === 429) throw new Error("IAHH! tá cansado, espera um pouco.");
      if (resp.status === 402) throw new Error("Créditos esgotados.");
      throw new Error("Erro no debate.");
    }
    return resp.json();
  };

  const start = async () => {
    if (!topic.trim()) {
      toast("Escolha um tema polêmico primeiro.");
      return;
    }
    if (personaA === personaB) {
      toast("Escolha personas DIFERENTES pro duelo.");
      return;
    }
    reset();
    setRunning(true);
    const all: Turn[] = [];
    try {
      for (let r = 1; r <= ROUNDS; r++) {
        for (const side of ["A", "B"] as const) {
          const t = await fetchTurn(side, all, r);
          all.push(t);
          setTurns([...all]);
        }
      }
      setFinished(true);
    } catch (e: any) {
      toast.error(e.message ?? "Falha no debate.");
    } finally {
      setRunning(false);
    }
  };

  const scoreA = turns.filter((t) => t.side === "A").reduce((s, t) => s + t.poder, 0);
  const scoreB = turns.filter((t) => t.side === "B").reduce((s, t) => s + t.poder, 0);
  const total = scoreA + scoreB || 1;
  const pctA = Math.round((scoreA / total) * 100);
  const pctB = 100 - pctA;

  const pa = PERSONAS.find((p) => p.id === personaA)!;
  const pb = PERSONAS.find((p) => p.id === personaB)!;

  const vote = (side: "A" | "B") => {
    if (voted) return;
    setVoted(side);
    const winner = side === "A" ? pa : pb;
    toast(`🏆 Você votou em ${winner.name}!`, {
      description: "+15 XP de juri supremo.",
    });
    onWinnerVote?.(side, 15);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="bg-card border-neon-magenta/40 max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-widest text-neon-magenta flex items-center gap-2">
            <Mic className="w-5 h-5" />
            DEBATE MODE
          </DialogTitle>
        </DialogHeader>

        {turns.length === 0 && !running && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-display tracking-widest text-muted-foreground">
                TEMA POLÊMICO
              </label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Devo largar meu emprego?"
                className="mt-1 font-mono bg-input"
                maxLength={120}
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {SUGGESTED_TOPICS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className="text-[10px] font-mono px-2 py-1 rounded border border-border text-muted-foreground hover:border-neon-magenta hover:text-neon-magenta transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
              <PersonaPicker label="LADO A" value={personaA} onChange={setPersonaA} accent="cyan" />
              <PersonaPicker label="LADO B" value={personaB} onChange={setPersonaB} accent="magenta" />
            </div>

            <Button
              onClick={start}
              className="w-full bg-neon-magenta text-black hover:bg-neon-magenta/90 font-display tracking-widest"
            >
              <Swords className="w-4 h-4 mr-2" />
              INICIAR DEBATE · 3 RODADAS
            </Button>
          </div>
        )}

        {(running || turns.length > 0) && (
          <div className="space-y-3">
            {/* Placar de audiência */}
            <div className="rounded border border-border p-3 bg-background/40">
              <div className="text-[10px] font-display tracking-widest text-muted-foreground mb-1">
                PLACAR DE AUDIÊNCIA
              </div>
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-[hsl(var(--neon-cyan))]">
                  {pa.emoji} {pa.name} · {scoreA}
                </span>
                <span className="text-neon-magenta">
                  {pb.name} {pb.emoji} · {scoreB}
                </span>
              </div>
              <div className="h-2 w-full rounded bg-muted overflow-hidden flex">
                <div
                  className="h-full bg-[hsl(var(--neon-cyan))] transition-all"
                  style={{ width: `${pctA}%` }}
                />
                <div
                  className="h-full bg-neon-magenta transition-all"
                  style={{ width: `${pctB}%` }}
                />
              </div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1 text-center">
                "{topic}"
              </div>
            </div>

            {/* Turnos */}
            <div className="space-y-2 max-h-[40dvh] overflow-y-auto pr-1">
              {turns.map((t, i) => {
                const meta = t.side === "A" ? pa : pb;
                const accent = t.side === "A" ? "cyan" : "magenta";
                return (
                  <div
                    key={i}
                    className={`p-2 rounded border ${
                      accent === "cyan"
                        ? "border-[hsl(var(--neon-cyan)/0.4)] bg-[hsl(var(--neon-cyan)/0.05)]"
                        : "border-neon-magenta/40 bg-neon-magenta/5"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-display tracking-widest mb-1">
                      <span className={accent === "cyan" ? "text-[hsl(var(--neon-cyan))]" : "text-neon-magenta"}>
                        {meta.emoji} {meta.name} · R{Math.floor(i / 2) + 1}
                      </span>
                      <span className="text-muted-foreground">
                        PODER {t.poder}
                      </span>
                    </div>
                    <Progress value={t.poder} className="h-1 mb-1" />
                    <div className="text-sm font-mono whitespace-pre-wrap">{t.argumento}</div>
                    {t.golpe && (
                      <div className="text-[11px] font-display tracking-widest mt-1 italic opacity-80">
                        ⚡ {t.golpe}
                      </div>
                    )}
                  </div>
                );
              })}
              {running && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono py-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  carregando próximo argumento...
                </div>
              )}
            </div>

            {finished && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="text-[11px] font-display tracking-widest text-center text-muted-foreground">
                  🎙️ DEBATE ENCERRADO · VOCÊ É O JURI
                </div>
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2">
                  <Button
                    disabled={!!voted}
                    onClick={() => vote("A")}
                    variant={voted === "A" ? "default" : "outline"}
                    className={`font-display tracking-widest ${
                      voted === "A"
                        ? "bg-[hsl(var(--neon-cyan))] text-black"
                        : "border-[hsl(var(--neon-cyan))] text-[hsl(var(--neon-cyan))] hover:bg-[hsl(var(--neon-cyan)/0.1)]"
                    }`}
                  >
                    <Trophy className="w-4 h-4 mr-1" />
                    {pa.emoji} {pa.name}
                  </Button>
                  <Button
                    disabled={!!voted}
                    onClick={() => vote("B")}
                    variant={voted === "B" ? "default" : "outline"}
                    className={`font-display tracking-widest ${
                      voted === "B"
                        ? "bg-neon-magenta text-black"
                        : "border-neon-magenta text-neon-magenta hover:bg-neon-magenta/10"
                    }`}
                  >
                    <Trophy className="w-4 h-4 mr-1" />
                    {pb.emoji} {pb.name}
                  </Button>
                </div>
                {voted && (
                  <Button
                    onClick={() => {
                      reset();
                      setTopic("");
                    }}
                    variant="outline"
                    className="w-full font-display tracking-widest text-xs"
                  >
                    NOVO DEBATE
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const PersonaPicker = ({
  label,
  value,
  onChange,
  accent,
}: {
  label: string;
  value: PersonaId;
  onChange: (v: PersonaId) => void;
  accent: "cyan" | "magenta";
}) => (
  <div>
    <label
      className={`text-[10px] font-display tracking-widest ${
        accent === "cyan" ? "text-[hsl(var(--neon-cyan))]" : "text-neon-magenta"
      }`}
    >
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PersonaId)}
      className={`w-full mt-1 bg-input border rounded p-2 text-sm font-mono ${
        accent === "cyan"
          ? "border-[hsl(var(--neon-cyan)/0.5)]"
          : "border-neon-magenta/50"
      }`}
    >
      {PERSONAS.map((p) => (
        <option key={p.id} value={p.id}>
          {p.emoji} {p.name}
        </option>
      ))}
    </select>
  </div>
);
