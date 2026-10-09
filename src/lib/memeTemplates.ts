import drakeImg from "@/assets/meme-drake.jpg";
import boyfriendImg from "@/assets/meme-boyfriend.jpg";
import fineImg from "@/assets/meme-fine.jpg";

export type MemeTemplateId = "drake" | "boyfriend" | "fine";

export interface TextSlot {
  // posições em % relativas à imagem
  x: number;
  y: number;
  w: number;
  h: number;
  align?: "left" | "center" | "right";
  color?: string;
  stroke?: string;
  fontSize?: number; // px no canvas 1080
  bg?: string;
}

export interface MemeTemplate {
  id: MemeTemplateId;
  name: string;
  image: string;
  width: number;
  height: number;
  slots: TextSlot[]; // quantidade = nº de captions necessárias
  // palavras-chave para auto-detect
  keywords: string[];
}

export const MEME_TEMPLATES: MemeTemplate[] = [
  {
    id: "drake",
    name: "Drake",
    image: drakeImg,
    width: 768,
    height: 768,
    slots: [
      { x: 50, y: 12, w: 45, h: 30, align: "left", color: "#fff", stroke: "#000", fontSize: 38 },
      { x: 50, y: 62, w: 45, h: 30, align: "left", color: "#fff", stroke: "#000", fontSize: 38 },
    ],
    keywords: ["nao", "não", "evitar", "ruim", "errado", "melhor", "prefiro", "vs", "ou", "ao invés"],
  },
  {
    id: "boyfriend",
    name: "Distracted Boyfriend",
    image: boyfriendImg,
    width: 1024,
    height: 768,
    slots: [
      { x: 4, y: 32, w: 22, h: 12, align: "center", color: "#000", fontSize: 28, bg: "#fff" },
      { x: 39, y: 28, w: 22, h: 12, align: "center", color: "#000", fontSize: 28, bg: "#fff" },
      { x: 74, y: 32, w: 22, h: 12, align: "center", color: "#000", fontSize: 28, bg: "#fff" },
    ],
    keywords: ["distra", "tenta", "novo", "tentação", "ignorar", "desejo", "vontade", "trair"],
  },
  {
    id: "fine",
    name: "This is Fine",
    image: fineImg,
    width: 1024,
    height: 768,
    slots: [
      { x: 5, y: 82, w: 90, h: 14, align: "center", color: "#fff", stroke: "#000", fontSize: 44 },
    ],
    keywords: ["caos", "fogo", "tudo bem", "desastre", "morrer", "morto", "perdido", "fudido", "fim", "destruí", "queim"],
  },
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function pickTemplate(answer: string): MemeTemplate {
  const text = norm(answer);
  let best = MEME_TEMPLATES[0];
  let bestScore = -1;
  for (const t of MEME_TEMPLATES) {
    const score = t.keywords.reduce((acc, k) => acc + (text.includes(norm(k)) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  if (bestScore <= 0) {
    // fallback: escolha por hash determinístico do texto
    const idx = Math.abs(hash(answer)) % MEME_TEMPLATES.length;
    best = MEME_TEMPLATES[idx];
  }
  return best;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** Quebra resposta em N captions curtos. */
export function buildCaptions(question: string, answer: string, n: number): string[] {
  const cleanA = answer.replace(/\s+/g, " ").trim();
  const cleanQ = question.replace(/\s+/g, " ").trim();
  // tenta usar sentenças
  const sentences = cleanA
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const cap = (s: string, max = 70) =>
    s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;

  if (n === 1) return [cap(sentences[0] ?? cleanA, 80)];
  if (n === 2) {
    const a = cleanQ ? cap(cleanQ, 60) : cap(sentences[0] ?? "", 60);
    const b = cap(sentences[0] ?? cleanA, 70);
    return [a, b];
  }
  // n === 3 (boyfriend)
  return [
    cap(cleanQ || sentences[0] || "VOCÊ", 30),
    cap(sentences[0] || cleanA, 30),
    cap(sentences[1] || sentences[0] || cleanA, 30),
  ];
}
