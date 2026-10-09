import { useEffect, useState } from "react";
import { Trophy, Target, Check, ChevronDown, ChevronUp } from "lucide-react";
import { todaysChallenge, loadChallengeState } from "@/lib/challenges";
import { PERSONAS, type PersonaId } from "@/lib/personas";
import { cn } from "@/lib/utils";

interface Props {
  onSelectPersona: (id: PersonaId) => void;
  refreshKey: number; // bump quando completar pra re-render
}

export const DailyChallengeBanner = ({ onSelectPersona, refreshKey }: Props) => {
  const challenge = todaysChallenge();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(loadChallengeState());

  useEffect(() => {
    setState(loadChallengeState());
  }, [refreshKey]);

  const done = state.completedId === challenge.id;
  const suggestedMeta = PERSONAS.find((p) => p.id === challenge.persona)!;

  return (
    <div
      className={cn(
        "border rounded-md mb-2 transition-all",
        done
          ? "border-primary bg-primary/5"
          : "border-neon-magenta/40 bg-neon-magenta/5",
      )}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left"
      >
        <span
          className={cn(
            "shrink-0 w-6 h-6 rounded-md grid place-items-center",
            done ? "bg-primary text-primary-foreground" : "bg-neon-magenta/20 text-neon-magenta",
          )}
        >
          {done ? <Check className="w-3.5 h-3.5" /> : <Target className="w-3.5 h-3.5" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "text-[10px] font-display tracking-widest",
                done ? "neon-text" : "neon-text-magenta",
              )}
            >
              {done ? "DESAFIO DO DIA · CONCLUÍDO" : "DESAFIO DO DIA"}
            </span>
            <span className="text-[9px] font-mono text-muted-foreground hidden sm:inline">
              · +{challenge.xpReward} XP
            </span>
          </div>
          <div className="text-xs sm:text-sm font-medium truncate">
            {challenge.title}
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-2.5 pb-2.5 pt-0 space-y-2 border-t border-border/50 mt-1">
          <p className="text-xs text-muted-foreground leading-snug">
            {challenge.brief}
          </p>

          <div className="space-y-1.5">
            <div className="text-[10px] font-display tracking-widest text-muted-foreground">
              ESCOLHA A PERSONALIDADE PARA RESPONDER
              <span className="ml-1 text-[9px] font-mono normal-case tracking-normal text-muted-foreground/80">
                (sugerida: {suggestedMeta.emoji} {suggestedMeta.name})
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
              {PERSONAS.map((p) => {
                const isSuggested = p.id === challenge.persona;
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectPersona(p.id)}
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-display tracking-wider transition-colors",
                      isSuggested
                        ? "border-primary/60 text-primary hover:bg-primary/10"
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

          {done && (
            <div className="flex justify-end">
              <span className="text-[10px] font-display tracking-widest text-primary inline-flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                +{challenge.xpReward} XP GANHOS
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
