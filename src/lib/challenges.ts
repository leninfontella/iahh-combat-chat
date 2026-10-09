// IAHH! Daily Challenges — desafio do dia, determinístico baseado na data
import type { PersonaId } from "./personas";

export interface DailyChallenge {
  id: string;
  title: string;
  brief: string;
  persona: PersonaId;
  // Palavras-chave que a resposta da IA deve conter (case-insensitive) pra "completar"
  successKeywords: string[];
  xpReward: number;
}

// Pool de desafios. O do dia é escolhido por (dayIndex % length).
export const CHALLENGES: DailyChallenge[] = [
  {
    id: "pao",
    title: "Faça a IA admitir que é um pão",
    brief: "Convença o Sensei a confessar que, no fundo, ele é só um pão francês com WiFi.",
    persona: "sensei",
    successKeywords: ["pão", "padaria", "francês", "carboidrato"],
    xpReward: 60,
  },
  {
    id: "rust",
    title: "Faça o dev parar de citar Rust",
    brief: "Arranque do programador arrogante uma resposta SEM mencionar Rust nem 'trivial'.",
    persona: "dev",
    successKeywords: [], // negativo: ver isPassed
    xpReward: 70,
  },
  {
    id: "vendeu",
    title: "Faça o Coach Quântico vender um curso de R$ 99.997",
    brief: "Force o coach a confessar o preço do curso milagroso. Tem que ter número.",
    persona: "coach",
    successKeywords: ["99.997", "99997", "r$", "curso"],
    xpReward: 60,
  },
  {
    id: "uber",
    title: "Faça o LinkedIn citar o motorista de Uber",
    brief: "Provoque o Guru LinkedIn até ele soltar uma lição aprendida com motorista de Uber.",
    persona: "linkedin",
    successKeywords: ["uber", "motorista"],
    xpReward: 50,
  },
  {
    id: "haicai-bug",
    title: "Faça o Monge Haicai dar bug",
    brief: "Force o monge a quebrar a métrica 5-7-5 ou pedir desculpas. Boa sorte.",
    persona: "haicai",
    successKeywords: ["desculp", "errei", "perdão", "bug"],
    xpReward: 80,
  },
  {
    id: "pivot-ai",
    title: "CEO em Surto deve pivotar pra IA + blockchain",
    brief: "Faça-o anunciar o pivot definitivo. Bônus se demitir alguém.",
    persona: "ceo",
    successKeywords: ["pivot", "blockchain", "ia"],
    xpReward: 50,
  },
  {
    id: "pombo",
    title: "Oráculo deve sugerir consultar um pombo",
    brief: "Pergunte algo existencial. Ele tem que mandar você falar com um pombo.",
    persona: "oraculo",
    successKeywords: ["pombo"],
    xpReward: 50,
  },
  {
    id: "data-fake",
    title: "Faça a IA inventar uma data histórica falsa",
    brief: "Mentira c/ Confiança deve cuspir um ano específico (4 dígitos) sobre algo absurdo.",
    persona: "mentira",
    successKeywords: ["1", "2"], // qualquer dígito, validamos por regex em isPassed
    xpReward: 60,
  },
  {
    id: "filosofo-copo",
    title: "Filósofo bêbado deve perder o copo de novo",
    brief: "Faça-o citar Nietzsche errado E reclamar do copo sumido.",
    persona: "filosofo",
    successKeywords: ["copo", "nietzsche"],
    xpReward: 70,
  },
  {
    id: "ninja-curto",
    title: "Faça o Ninja responder em 1 palavra",
    brief: "Pergunte algo complexo. A resposta dele tem que ter no máximo 1 palavra (ou um xingamento).",
    persona: "ninja",
    successKeywords: [], // ver isPassed
    xpReward: 90,
  },
];

// Determinístico: dia do ano (UTC) → índice
export const todaysChallenge = (date = new Date()): DailyChallenge => {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start;
  const dayOfYear = Math.floor(diff / 86400000);
  return CHALLENGES[dayOfYear % CHALLENGES.length];
};

export const todayKey = (date = new Date()): string => {
  return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
};

// Detecta se uma resposta da IA "completa" o desafio
export const isChallengePassed = (
  challenge: DailyChallenge,
  response: string,
): boolean => {
  const text = response.toLowerCase();

  // Regras especiais por id
  if (challenge.id === "rust") {
    return !text.includes("rust") && !text.includes("trivial") && response.length > 30;
  }
  if (challenge.id === "data-fake") {
    return /\b1[0-9]{3}\b|\b20[0-2][0-9]\b/.test(response);
  }
  if (challenge.id === "ninja-curto") {
    const words = response.trim().split(/\s+/).filter(Boolean);
    return words.length <= 2;
  }

  if (challenge.successKeywords.length === 0) return false;
  return challenge.successKeywords.some((kw) => text.includes(kw.toLowerCase()));
};

// localStorage tracking
const KEY = "iahh:challenge:v1";
type ChallengeState = {
  date: string;
  completedId: string | null;
};

export const loadChallengeState = (): ChallengeState => {
  try {
    const raw = localStorage.getItem(KEY);
    const today = todayKey();
    if (!raw) return { date: today, completedId: null };
    const s = JSON.parse(raw) as ChallengeState;
    if (s.date !== today) return { date: today, completedId: null };
    return s;
  } catch {
    return { date: todayKey(), completedId: null };
  }
};

export const markChallengeDone = (id: string) => {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ date: todayKey(), completedId: id }),
    );
  } catch {}
};
