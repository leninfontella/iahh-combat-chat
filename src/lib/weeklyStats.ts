// IAHH! Weekly Stats — ranking local (XP semanal, streak, fatalities, duelos)
// Reseta toda segunda-feira (UTC). Mantém histórico das últimas 8 semanas.

const KEY = "iahh:weekly:v1";

export type WeekStats = {
  weekId: string; // ex: "2026-W18"
  startedAt: number; // epoch ms (segunda 00:00 UTC)
  xp: number;
  messages: number;
  fatalities: number;
  duelsWon: number;
  challengesDone: number;
  glitches: number;
  lastDayActive: string | null; // YYYY-MM-DD
  streakDays: number; // dias consecutivos ativos NESTA semana
};

export type WeeklyStore = {
  current: WeekStats;
  history: WeekStats[]; // últimas semanas (mais recente primeiro)
};

// ----- ID da semana ISO simplificado -----
export const getWeekStart = (d = new Date()): Date => {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay(); // 0=dom
  const diff = day === 0 ? -6 : 1 - day; // segunda como início
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
};

export const getWeekId = (d = new Date()): string => {
  const start = getWeekStart(d);
  // semana do ano aproximada
  const yearStart = new Date(Date.UTC(start.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((start.getTime() - yearStart.getTime()) / 86400000 + yearStart.getUTCDay() + 1) / 7,
  );
  return `${start.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
};

const todayKey = (d = new Date()): string =>
  `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;

const emptyWeek = (d = new Date()): WeekStats => ({
  weekId: getWeekId(d),
  startedAt: getWeekStart(d).getTime(),
  xp: 0,
  messages: 0,
  fatalities: 0,
  duelsWon: 0,
  challengesDone: 0,
  glitches: 0,
  lastDayActive: null,
  streakDays: 0,
});

export const loadWeekly = (): WeeklyStore => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { current: emptyWeek(), history: [] };
    const store = JSON.parse(raw) as WeeklyStore;
    const nowId = getWeekId();
    if (store.current.weekId !== nowId) {
      // semana mudou → arquiva e zera
      const history = [store.current, ...(store.history ?? [])].slice(0, 8);
      return { current: emptyWeek(), history };
    }
    return store;
  } catch {
    return { current: emptyWeek(), history: [] };
  }
};

const save = (store: WeeklyStore) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {}
};

// ----- Mutators -----
type Bump = Partial<Pick<WeekStats, "xp" | "messages" | "fatalities" | "duelsWon" | "challengesDone" | "glitches">>;

export const bumpWeekly = (delta: Bump): WeeklyStore => {
  const store = loadWeekly();
  const c = store.current;
  const today = todayKey();
  // streak
  if (c.lastDayActive !== today) {
    if (!c.lastDayActive) {
      c.streakDays = 1;
    } else {
      const prev = new Date(c.lastDayActive + "T00:00:00Z");
      const now = new Date(today + "T00:00:00Z");
      const diffDays = Math.round((now.getTime() - prev.getTime()) / 86400000);
      c.streakDays = diffDays === 1 ? c.streakDays + 1 : 1;
    }
    c.lastDayActive = today;
  }
  c.xp += delta.xp ?? 0;
  c.messages += delta.messages ?? 0;
  c.fatalities += delta.fatalities ?? 0;
  c.duelsWon += delta.duelsWon ?? 0;
  c.challengesDone += delta.challengesDone ?? 0;
  c.glitches += delta.glitches ?? 0;
  save(store);
  return store;
};

// ----- Score composto pra ranking -----
export const scoreOf = (w: WeekStats): number =>
  w.xp +
  w.fatalities * 80 +
  w.duelsWon * 60 +
  w.challengesDone * 100 +
  w.glitches * 15 +
  w.streakDays * 25;

// ----- Título de Mestre da Semana -----
export const titleFor = (w: WeekStats): { title: string; emoji: string; color: string } => {
  const s = scoreOf(w);
  if (s >= 1500) return { title: "MESTRE SUPREMO", emoji: "👑", color: "text-neon-magenta" };
  if (s >= 800) return { title: "FAIXA-PRETA DA SEMANA", emoji: "🥋", color: "text-primary" };
  if (s >= 400) return { title: "CAOS CONTROLADO", emoji: "⚔", color: "text-neon-yellow" };
  if (s >= 150) return { title: "GAFANHOTO PERSISTENTE", emoji: "🐛", color: "text-[hsl(var(--neon-cyan))]" };
  if (s > 0) return { title: "INICIANTE DO DOJO", emoji: "🥚", color: "text-muted-foreground" };
  return { title: "AINDA EM SILÊNCIO", emoji: "💤", color: "text-muted-foreground" };
};

// ----- Tempo restante da semana -----
export const timeUntilReset = (now = new Date()): string => {
  const start = getWeekStart(now);
  const end = new Date(start.getTime() + 7 * 86400000);
  const ms = end.getTime() - now.getTime();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
};

export const resetWeekly = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {}
};
