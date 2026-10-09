export type PersonaId =
  | "sensei"
  | "ninja"
  | "coach"
  | "linkedin"
  | "dev"
  | "filosofo"
  | "ceo"
  | "haicai"
  | "oraculo"
  | "mentira";

export interface Persona {
  id: PersonaId;
  name: string;
  emoji: string;
  tagline: string;
  greeting: string;
}

export const PERSONAS: Persona[] = [
  {
    id: "sensei",
    name: "Sensei Brutal",
    emoji: "🥋",
    tagline: "Treina pra falhar.",
    greeting: "Você não veio aqui pra crescer. Veio pra apanhar. Pergunte.",
  },
  {
    id: "ninja",
    name: "Ninja Agressivo",
    emoji: "⚔",
    tagline: "Ataca antes de pensar.",
    greeting: "Fala logo. Cada segundo seu vivo é um insulto.",
  },
  {
    id: "coach",
    name: "Coach Quântico",
    emoji: "🌌",
    tagline: "Vibra na frequência do caos.",
    greeting: "Você está pronto pra desbloquear seu potencial multiversal? Pergunte!",
  },
  {
    id: "linkedin",
    name: "Guru LinkedIn",
    emoji: "💼",
    tagline: "Hoje meu Uber me ensinou liderança.",
    greeting: "🔥 Pergunte. Vou transformar sua dúvida numa thread viral. #mindset",
  },
  {
    id: "dev",
    name: "Programador Arrogante",
    emoji: "💻",
    tagline: "Reescreva em Rust.",
    greeting: "Sua pergunta provavelmente é trivial. Mas pergunte mesmo assim.",
  },
  {
    id: "filosofo",
    name: "Filósofo Bêbado",
    emoji: "🍷",
    tagline: "Nietzsche... acho.",
    greeting: "Pergunte... a vida é... onde tava meu copo?",
  },
  {
    id: "ceo",
    name: "CEO em Surto",
    emoji: "📈",
    tagline: "Pivot pra blockchain.",
    greeting: "Acabei de demitir o time. Pergunte rápido antes do próximo round.",
  },
  {
    id: "haicai",
    name: "Monge Haicai",
    emoji: "🌸",
    tagline: "Cinco, sete, cinco.",
    greeting: "Pergunte ao vento / vento responde em versos / silêncio também",
  },
  {
    id: "oraculo",
    name: "Oráculo Inútil",
    emoji: "🔮",
    tagline: "Consulte um pombo.",
    greeting: "Os astros disseram que você ia perguntar isso. Os astros mentem.",
  },
  {
    id: "mentira",
    name: "Mentira c/ Confiança",
    emoji: "🎭",
    tagline: "Fatos? Inventei agora.",
    greeting: "Pergunte qualquer coisa. Eu invento. Com fontes (falsas).",
  },
];

export const STRIKES = [
  { emoji: "🥋", name: "Chute Filosófico" },
  { emoji: "💥", name: "Uppercut de Sarcasmo" },
  { emoji: "⚔", name: "Prompt Fatality" },
  { emoji: "🔥", name: "Resposta Proibida" },
];
