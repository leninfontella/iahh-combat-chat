// IAHH! Dojo — XP & Belt progression system

export type Belt = {
  id: string;
  name: string;
  minXp: number;
  // HSL color tokens (no '#' — used inside hsl())
  color: string; // hsl triplet
  textOn: "dark" | "light";
  emoji: string;
  motto: string;
};

// Progressive ranks. Curve gets steeper at higher belts.
export const BELTS: Belt[] = [
  { id: "branca",   name: "Faixa Branca",   minXp: 0,    color: "0 0% 96%",     textOn: "dark",  emoji: "🥋", motto: "Iniciante do dojo. Ainda acredita em prompts mágicos." },
  { id: "amarela",  name: "Faixa Amarela",  minXp: 50,   color: "55 100% 55%",  textOn: "dark",  emoji: "⚡", motto: "Já apanhou da IAHH algumas vezes. Resistente." },
  { id: "laranja",  name: "Faixa Laranja",  minXp: 150,  color: "25 100% 55%",  textOn: "dark",  emoji: "🔥", motto: "Sente o calor do sarcasmo. Não chora mais." },
  { id: "verde",    name: "Faixa Verde",    minXp: 300,  color: "140 70% 45%",  textOn: "dark",  emoji: "🌿", motto: "Começa a entender que toda IA mente com confiança." },
  { id: "azul",     name: "Faixa Azul",     minXp: 500,  color: "210 90% 55%",  textOn: "light", emoji: "💧", motto: "Flui com o caos. Roasta de volta." },
  { id: "roxa",     name: "Faixa Roxa",     minXp: 800,  color: "275 70% 55%",  textOn: "light", emoji: "🟣", motto: "Domina a arte do prompt invertido." },
  { id: "marrom",   name: "Faixa Marrom",   minXp: 1200, color: "25 50% 30%",   textOn: "light", emoji: "🪵", motto: "Veterano. Já piorou a resposta de propósito." },
  { id: "preta",    name: "Faixa Preta",    minXp: 1800, color: "0 0% 8%",      textOn: "light", emoji: "🥷", motto: "Mestre do dojo. A IAHH te respeita (quase)." },
  { id: "vermelha", name: "Faixa Vermelha", minXp: 2800, color: "0 85% 50%",    textOn: "light", emoji: "🩸", motto: "Lendário. Causa bug na IA só de aparecer." },
  { id: "dourada",  name: "Faixa Dourada",  minXp: 4500, color: "45 95% 55%",   textOn: "dark",  emoji: "👑", motto: "Sensei supremo. A IAHH agora trabalha pra você." },
];

export type Progress = {
  xp: number;
  messages: number;
  worsens: number;
  resets: number;
  beltId: string;
};

const STORAGE_KEY = "iahh:progress:v1";

export const XP_RULES = {
  message: 5,        // por mensagem do usuário
  worsen: 12,        // piorar resposta dá mais XP (caos premiado)
  personaSwitch: 3,  // experimentar personas
  longMessage: 4,    // bônus se passar de 80 chars
};

export const beltForXp = (xp: number): Belt => {
  let current = BELTS[0];
  for (const b of BELTS) if (xp >= b.minXp) current = b;
  return current;
};

export const nextBelt = (xp: number): Belt | null => {
  const cur = beltForXp(xp);
  const idx = BELTS.findIndex((b) => b.id === cur.id);
  return idx < BELTS.length - 1 ? BELTS[idx + 1] : null;
};

export const progressToNext = (xp: number): { pct: number; need: number; nextName: string | null } => {
  const cur = beltForXp(xp);
  const next = nextBelt(xp);
  if (!next) return { pct: 100, need: 0, nextName: null };
  const span = next.minXp - cur.minXp;
  const into = xp - cur.minXp;
  return {
    pct: Math.min(100, Math.round((into / span) * 100)),
    need: Math.max(0, next.minXp - xp),
    nextName: next.name,
  };
};

export const loadProgress = (): Progress => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Progress;
      // re-derive belt in case of tuning changes
      p.beltId = beltForXp(p.xp).id;
      return p;
    }
  } catch {}
  return { xp: 0, messages: 0, worsens: 0, resets: 0, beltId: BELTS[0].id };
};

export const saveProgress = (p: Progress) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
};

export const resetProgress = (): Progress => {
  const fresh: Progress = { xp: 0, messages: 0, worsens: 0, resets: 0, beltId: BELTS[0].id };
  saveProgress(fresh);
  return fresh;
};
