// IAHH! Roleta Russa — stats persistentes em localStorage
const KEY = "iahh:roulette:stats:v1";

export type RouletteStats = {
  rounds: number;
  bullets: number;
  blackouts: number;
  safeStreak: number;
  bestStreak: number;
  bonusXp: number;
  outcomes: Record<string, number>;
};

const DEFAULT: RouletteStats = {
  rounds: 0,
  bullets: 0,
  blackouts: 0,
  safeStreak: 0,
  bestStreak: 0,
  bonusXp: 0,
  outcomes: {},
};

export const loadRouletteStats = (): RouletteStats => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
};

export const saveRouletteStats = (s: RouletteStats) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
};

export const recordOutcome = (outcomeId: string, isBullet: boolean, isBlackout: boolean, bonusXp = 0): RouletteStats => {
  const s = loadRouletteStats();
  s.rounds += 1;
  s.outcomes[outcomeId] = (s.outcomes[outcomeId] ?? 0) + 1;
  if (isBullet) {
    s.bullets += 1;
    s.safeStreak = 0;
  } else {
    s.safeStreak += 1;
    s.bestStreak = Math.max(s.bestStreak, s.safeStreak);
  }
  if (isBlackout) s.blackouts += 1;
  s.bonusXp += bonusXp;
  saveRouletteStats(s);
  return s;
};

export const survivalRate = (s: RouletteStats): number => {
  if (s.rounds === 0) return 100;
  return Math.round(((s.rounds - s.bullets) / s.rounds) * 100);
};
