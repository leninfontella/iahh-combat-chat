import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, X, Flame, Skull, Swords, Target, Zap, MessageSquare } from "lucide-react";
import {
  loadWeekly,
  scoreOf,
  titleFor,
  timeUntilReset,
  type WeekStats,
} from "@/lib/weeklyStats";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  refreshKey: number;
}

export const WeeklyRanking = ({ open, onClose, refreshKey }: Props) => {
  const [store, setStore] = useState(() => loadWeekly());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!open) return;
    setStore(loadWeekly());
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, [open, refreshKey]);

  const cur = store.current;
  const score = scoreOf(cur);
  const title = titleFor(cur);
  const reset = timeUntilReset(new Date(now));

  // best historical week
  const allWeeks = [cur, ...store.history];
  const best = allWeeks.reduce(
    (acc, w) => (scoreOf(w) > scoreOf(acc) ? w : acc),
    cur,
  );
  const isBestThisWeek = best.weekId === cur.weekId && score > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 bg-card border-primary/40 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between space-y-0 shrink-0">
          <DialogTitle className="font-display tracking-widest neon-text text-base flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            RANKING SEMANAL
          </DialogTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="px-4 pb-4 overflow-y-auto space-y-3">
          {/* Título da semana */}
          <div className="border-2 border-primary/40 rounded-md p-3 bg-gradient-to-br from-primary/10 to-neon-magenta/5 text-center">
            <div className="text-[10px] font-display tracking-widest text-muted-foreground mb-1">
              SEU TÍTULO ATUAL
            </div>
            <div className={cn("font-display text-2xl tracking-widest", title.color)}>
              {title.emoji} {title.title}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground mt-1">
              SCORE: <span className="neon-text">{score}</span> · semana {cur.weekId}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              ⏱ reseta em <span className="text-neon-magenta">{reset}</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Stat icon={<Zap className="w-3.5 h-3.5" />} label="XP" value={cur.xp} color="text-primary" />
            <Stat icon={<Flame className="w-3.5 h-3.5" />} label="STREAK" value={`${cur.streakDays}d`} color="text-neon-magenta" />
            <Stat icon={<MessageSquare className="w-3.5 h-3.5" />} label="MSGS" value={cur.messages} color="text-foreground" />
            <Stat icon={<Skull className="w-3.5 h-3.5" />} label="FATALITIES" value={cur.fatalities} color="text-destructive" />
            <Stat icon={<Swords className="w-3.5 h-3.5" />} label="DUELOS" value={cur.duelsWon} color="text-neon-magenta" />
            <Stat icon={<Target className="w-3.5 h-3.5" />} label="DESAFIOS" value={cur.challengesDone} color="text-primary" />
          </div>

          {/* Fórmula */}
          <details className="text-[10px] font-mono text-muted-foreground border border-border rounded p-2">
            <summary className="cursor-pointer hover:text-foreground">como o score é calculado?</summary>
            <div className="mt-2 space-y-0.5 leading-relaxed">
              <div>XP × 1 + Fatalities × 80</div>
              <div>+ Duelos × 60 + Desafios × 100</div>
              <div>+ Glitches × 15 + Streak × 25</div>
            </div>
          </details>

          {/* Histórico */}
          {store.history.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-display tracking-widest text-muted-foreground">
                ÚLTIMAS SEMANAS
              </div>
              <div className="space-y-1">
                {store.history.slice(0, 5).map((w) => {
                  const t = titleFor(w);
                  const isBest = w.weekId === best.weekId && !isBestThisWeek;
                  return (
                    <div
                      key={w.weekId}
                      className={cn(
                        "flex items-center justify-between border rounded px-2 py-1.5 text-xs",
                        isBest ? "border-primary/60 bg-primary/5" : "border-border",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{t.emoji}</span>
                        <div className="min-w-0">
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {w.weekId} {isBest && "· 🏆 RECORDE"}
                          </div>
                          <div className={cn("text-[11px] font-display tracking-wider truncate", t.color)}>
                            {t.title}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-[10px] font-mono text-muted-foreground">SCORE</div>
                        <div className="text-sm font-display neon-text">{scoreOf(w)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dicas */}
          <div className="border border-neon-magenta/30 rounded p-2 bg-neon-magenta/5 text-[10px] font-mono text-muted-foreground leading-relaxed">
            💡 <span className="text-neon-magenta">DICA:</span> Fatality (+80), Desafio do Dia (+100) e
            streak diária (+25/dia) são as formas mais rápidas de subir no ranking.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Stat = ({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) => (
  <div className="border border-border rounded p-2 bg-background/50">
    <div className="flex items-center gap-1 text-[9px] font-display tracking-widest text-muted-foreground">
      {icon}
      {label}
    </div>
    <div className={cn("text-lg font-display mt-0.5", color)}>{value}</div>
  </div>
);
