import { beltForXp, progressToNext, type Progress } from "@/lib/belts";
import { Progress as ProgressBar } from "@/components/ui/progress";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  progress: Progress;
  onReset: () => void;
  compact?: boolean;
}

export const BeltBadge = ({ progress, onReset, compact }: Props) => {
  const belt = beltForXp(progress.xp);
  const { pct, need, nextName } = progressToNext(progress.xp);

  const pillStyle = {
    backgroundColor: `hsl(${belt.color})`,
    color: belt.textOn === "dark" ? "hsl(0 0% 8%)" : "hsl(0 0% 98%)",
    boxShadow: `0 0 14px hsl(${belt.color} / 0.55)`,
  };

  return (
    <HoverCard openDelay={120}>
      <HoverCardTrigger asChild>
        <button
          className="group inline-flex items-center gap-2 cursor-help focus:outline-none"
          aria-label={`${belt.name} — ${progress.xp} XP`}
        >
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-display tracking-widest text-[11px] border border-black/30"
            style={pillStyle}
          >
            <span>{belt.emoji}</span>
            <span>{belt.name.toUpperCase()}</span>
          </span>
          {!compact && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {progress.xp} XP
            </span>
          )}
        </button>
      </HoverCardTrigger>

      <HoverCardContent className="w-72 bg-card border-border" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{belt.emoji}</span>
              <div>
                <div className="font-display tracking-wider text-sm text-foreground">
                  {belt.name}
                </div>
                <div className="text-[10px] text-muted-foreground font-mono">
                  {progress.xp} XP totais
                </div>
              </div>
            </div>
            <Trophy className="w-4 h-4 text-primary" />
          </div>

          <p className="text-xs text-muted-foreground italic leading-snug">
            "{belt.motto}"
          </p>

          {nextName ? (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                <span>Próxima: {nextName}</span>
                <span>{need} XP restantes</span>
              </div>
              <ProgressBar value={pct} className="h-1.5" />
            </div>
          ) : (
            <div className="text-[10px] font-mono text-primary text-center py-1 border border-primary/30 rounded-md">
              ⭐ RANK MÁXIMO ATINGIDO ⭐
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-border">
            <Stat label="Msgs" value={progress.messages} />
            <Stat label="Caos" value={progress.worsens} />
            <Stat label="Resets" value={progress.resets} />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="w-full h-7 text-[10px] font-display tracking-widest text-muted-foreground hover:text-destructive"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            ZERAR PROGRESSO
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="font-display text-sm text-foreground">{value}</div>
    <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
      {label}
    </div>
  </div>
);
