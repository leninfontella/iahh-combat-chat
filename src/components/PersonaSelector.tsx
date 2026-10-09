import { PERSONAS, type PersonaId } from "@/lib/personas";
import type { CustomPersona } from "@/lib/customPersonas";
import { cn } from "@/lib/utils";
import { FlaskConical } from "lucide-react";

interface Props {
  value: PersonaId | string;
  onChange: (id: PersonaId | string) => void;
  customs?: CustomPersona[];
  onOpenLab?: () => void;
}

export const PersonaSelector = ({ value, onChange, customs = [], onOpenLab }: Props) => {
  return (
    <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
      {onOpenLab && (
        <button
          onClick={onOpenLab}
          className="shrink-0 px-2 py-1.5 sm:px-3 sm:py-2 rounded border border-dashed border-neon-magenta/60 text-neon-magenta hover:bg-neon-magenta/10 transition-strike min-w-[90px] sm:min-w-[110px]"
          title="Laboratório de Personas"
        >
          <div className="flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4" />
            <span className="font-display text-xs sm:text-sm tracking-wide">LAB</span>
          </div>
          <div className="text-[9px] sm:text-[10px] mt-0.5 opacity-80">criar persona</div>
        </button>
      )}
      {[...PERSONAS, ...customs.map((c) => ({
        id: c.id,
        name: c.name,
        emoji: c.emoji,
        tagline: c.catchphrase,
        custom: true as const,
      }))].map((p) => {
        const active = p.id === value;
        const isCustom = "custom" in p;
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={cn(
              "shrink-0 px-2 py-1.5 sm:px-3 sm:py-2 rounded border transition-strike text-left min-w-[110px] sm:min-w-[140px]",
              "hover:border-primary hover:-translate-y-0.5",
              active
                ? "border-primary bg-primary/10 shadow-neon"
                : isCustom
                ? "border-neon-magenta/40 bg-card"
                : "border-border bg-card",
            )}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg">{p.emoji}</span>
              <span
                className={cn(
                  "font-display text-xs sm:text-sm tracking-wide truncate",
                  active && "neon-text",
                )}
              >
                {p.name}
              </span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 truncate">
              {p.tagline}
            </div>
          </button>
        );
      })}
    </div>
  );
};
