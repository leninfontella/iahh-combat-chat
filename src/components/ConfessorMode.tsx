import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PERSONAS, type PersonaId } from "@/lib/personas";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, Loader2, Trophy, RotateCcw } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onVote?: (xp: number) => void;
}

// 5 personas selecionadas pra dar respostas bem contraditórias
const COUNCIL: PersonaId[] = ["sensei", "coach", "linkedin", "filosofo", "ceo"];

interface Verdict {
  persona: PersonaId;
  conselho: string;
  veredito: string;
  loading: boolean;
  error?: boolean;
}

export const ConfessorMode = ({ open, onClose, onVote }: Props) => {
  const [confession, setConfession] = useState("");
  const [verdicts, setVerdicts] = useState<Verdict[] | null>(null);
  const [voted, setVoted] = useState<PersonaId | null>(null);

  const reset = () => {
    setConfession("");
    setVerdicts(null);
    setVoted(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const consult = async () => {
    const text = confession.trim();
    if (text.length < 5) {
      toast("Conta direito, em pelo menos 1 frase.");
      return;
    }
    setVoted(null);
    const initial: Verdict[] = COUNCIL.map((p) => ({
      persona: p,
      conselho: "",
      veredito: "",
      loading: true,
    }));
    setVerdicts(initial);

    await Promise.all(
      COUNCIL.map(async (p, idx) => {
        try {
          const { data, error } = await supabase.functions.invoke("confessor", {
            body: { confession: text, persona: p },
          });
          if (error || !data || data.error) throw error || new Error(data?.error);
          setVerdicts((prev) => {
            if (!prev) return prev;
            const next = [...prev];
            next[idx] = {
              persona: p,
              conselho: data.conselho,
              veredito: data.veredito,
              loading: false,
            };
            return next;
          });
        } catch (e) {
          console.error("confessor", p, e);
          setVerdicts((prev) => {
            if (!prev) return prev;
            const next = [...prev];
            next[idx] = {
              persona: p,
              conselho: "(o conselho se perdeu no éter)",
              veredito: "?",
              loading: false,
              error: true,
            };
            return next;
          });
        }
      }),
    );
  };

  const vote = (id: PersonaId) => {
    if (voted) return;
    setVoted(id);
    const meta = PERSONAS.find((p) => p.id === id)!;
    toast.success(`🔮 Você seguiu ${meta.emoji} ${meta.name}`, {
      description: "+12 XP por encarar a verdade (ou a mentira).",
    });
    onVote?.(12);
  };

  const allDone = verdicts && verdicts.every((v) => !v.loading);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-widest text-xl flex items-center gap-2">
            <Eye className="w-5 h-5 text-neon-magenta" />
            🔮 MODO CONFESSOR
          </DialogTitle>
          <DialogDescription>
            Conta um problema real em 1 frase. 5 personas opinam ao mesmo tempo. Você decide quem ouvir.
          </DialogDescription>
        </DialogHeader>

        {!verdicts && (
          <div className="space-y-3">
            <Textarea
              value={confession}
              onChange={(e) => setConfession(e.target.value.slice(0, 240))}
              placeholder="Ex: 'Quero largar meu emprego pra abrir um cafeteria.'"
              rows={3}
              className="font-mono text-sm resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">
                {confession.length}/240
              </span>
              <Button
                onClick={consult}
                disabled={confession.trim().length < 5}
                className="font-display tracking-widest shadow-neon"
              >
                CONSULTAR O CONCÍLIO
              </Button>
            </div>
          </div>
        )}

        {verdicts && (
          <div className="space-y-3">
            <div className="rounded border border-border bg-secondary px-3 py-2">
              <div className="text-[10px] font-display tracking-widest text-muted-foreground mb-0.5">
                SUA CONFISSÃO
              </div>
              <div className="text-sm font-mono">{confession}</div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {verdicts.map((v) => {
                const meta = PERSONAS.find((p) => p.id === v.persona)!;
                const isWinner = voted === v.persona;
                const isLoser = voted && voted !== v.persona;
                return (
                  <div
                    key={v.persona}
                    className={`rounded-md border p-3 transition-all ${
                      isWinner
                        ? "border-primary bg-primary/10 shadow-neon"
                        : isLoser
                        ? "border-border bg-card opacity-50"
                        : "border-primary/30 bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl shrink-0">{meta.emoji}</span>
                        <div className="min-w-0">
                          <div className="text-[11px] font-display tracking-widest neon-text truncate">
                            {meta.name}
                          </div>
                          <div className="text-[9px] font-mono text-muted-foreground truncate">
                            {meta.tagline}
                          </div>
                        </div>
                      </div>
                      {isWinner && (
                        <Trophy className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </div>
                    <div className="min-h-[60px] text-sm leading-snug whitespace-pre-wrap">
                      {v.loading ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          consultando...
                        </div>
                      ) : (
                        v.conselho
                      )}
                    </div>
                    {!v.loading && v.veredito && (
                      <div className="mt-2 inline-block text-[10px] font-display tracking-widest px-2 py-0.5 rounded-md border border-neon-magenta/50 text-neon-magenta">
                        {v.veredito}
                      </div>
                    )}
                    {!v.loading && !voted && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => vote(v.persona)}
                        className="mt-3 w-full text-[11px] font-display tracking-widest h-7"
                      >
                        SEGUIR ESTE
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {allDone && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  className="font-display tracking-widest text-xs"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  NOVA CONFISSÃO
                </Button>
                {voted && (
                  <span className="text-[10px] font-display tracking-widest text-muted-foreground">
                    DECISÃO REGISTRADA · +12 XP
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
