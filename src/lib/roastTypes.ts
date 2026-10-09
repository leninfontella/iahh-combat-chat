// IAHH! Roast Engine — definições de tipos, dimensões e intensidades.

export type RoastDimension = {
  id: string;
  label: string;
  color: string; // hex
  max: number; // valor que normaliza pra 100% na barra
};

export type RoastTypeId = "curriculo" | "bio" | "pitch" | "codigo" | "texto_livre";

export type RoastType = {
  id: RoastTypeId;
  label: string;
  emoji: string;
  roastEmoji: string;
  roastPersona: string;
  placeholder: string;
  dimensions: RoastDimension[];
  systemPrompt: (text: string) => string;
};

export type RoastIntensityId = "suave" | "medio" | "brutal" | "demonico";

export type RoastIntensity = {
  id: RoastIntensityId;
  label: string;
  emoji: string;
  desc: string;
  modifier: string;
  color: string; // hex
};

export type RoastResult = {
  titulo: string;
  roast: string;
  dimensoes: Record<string, number>;
  veredicto: string;
  conselho: string;
};

const NEON_Y = "#FFD700";
const NEON_M = "#FF00FF";

const jsonShape = (dims: RoastDimension[]) => {
  const dimLines = dims
    .map((d) => `    "${d.id}": número de 0-${d.max}`)
    .join(",\n");
  return `{
  "titulo": "Título sarcástico do roast (máx 60 chars)",
  "roast": "Parágrafo de 3-4 frases destruindo com humor ácido. Seja específico sobre o conteúdo.",
  "dimensoes": {
${dimLines}
  },
  "veredicto": "Frase final de veredicto (máx 80 chars)",
  "conselho": "Um conselho absurdo mas específico (máx 100 chars)"
}`;
};

const curriculoDims: RoastDimension[] = [
  { id: "buzzwords", label: "% Buzzwords", color: "#FF6B35", max: 200 },
  { id: "cargo_real", label: "% Cargo Real", color: "#00FF88", max: 100 },
  { id: "ego", label: "% Ego Inflado", color: NEON_M, max: 999 },
  { id: "habilidades", label: "% Skills Genéricas", color: "#FF4444", max: 150 },
  { id: "chance", label: "% Chance de Emprego", color: NEON_Y, max: 100 },
];

const bioDims: RoastDimension[] = [
  { id: "cringe", label: "% Cringe", color: NEON_M, max: 200 },
  { id: "emojis", label: "% Emojis Desnecessários", color: "#FF8C00", max: 999 },
  { id: "coach", label: "% Energia de Coach", color: "#FF4444", max: 300 },
  { id: "originalidade", label: "% Originalidade", color: "#00FF88", max: 100 },
  { id: "seguidores", label: "% Chance de Viral", color: NEON_Y, max: 100 },
];

const pitchDims: RoastDimension[] = [
  { id: "buzzwords", label: "% Buzzwords", color: "#FF6B35", max: 500 },
  { id: "produto", label: "% Produto Real", color: "#00FF88", max: 100 },
  { id: "ego", label: "% Ego do Fundador", color: NEON_M, max: 999 },
  { id: "mercado", label: "% TAM Inventado", color: "#FF4444", max: 300 },
  { id: "funding", label: "% Chance de Funding", color: NEON_Y, max: 100 },
];

const codigoDims: RoastDimension[] = [
  { id: "gambiarras", label: "% Gambiarras", color: "#FF4444", max: 500 },
  { id: "legibilidade", label: "% Legibilidade", color: "#00FF88", max: 100 },
  { id: "performance", label: "% Performance", color: NEON_Y, max: 100 },
  { id: "vergonha", label: "% Nível de Vergonha", color: NEON_M, max: 999 },
  { id: "rewrite", label: "% Necessidade de Rewrite", color: "#FF6B35", max: 100 },
];

const textoDims: RoastDimension[] = [
  { id: "qualidade", label: "% Qualidade Real", color: "#00FF88", max: 100 },
  { id: "pretensao", label: "% Pretensão", color: NEON_M, max: 300 },
  { id: "cliches", label: "% Clichês", color: "#FF6B35", max: 500 },
  { id: "utilidade", label: "% Utilidade", color: NEON_Y, max: 100 },
  { id: "cringe", label: "% Cringe Geral", color: "#FF4444", max: 999 },
];

export const ROAST_TYPES: RoastType[] = [
  {
    id: "curriculo",
    label: "Currículo",
    emoji: "📄",
    roastEmoji: "💼",
    roastPersona: "IAHH! HR Destroyer",
    placeholder: `Cole seu currículo aqui...

Ex:
João Silva
Desenvolvedor Fullstack | 5 anos de experiência
Habilidades: React, Node, Python, Docker, Kubernetes, AWS, Azure...
Experiência:
2022–atual: Senior Developer @ StartupXYZ
- Liderou equipe de 3 pessoas
- Implementou soluções inovadoras`,
    dimensions: curriculoDims,
    systemPrompt: (text) =>
      `Você é IAHH! HR Destroyer — recrutador satírico brutal que analisa currículos com sarcasmo devastador. Analise o currículo abaixo e responda APENAS com JSON válido, sem markdown nem backticks:
${jsonShape(curriculoDims)}

Currículo:
${text}`,
  },
  {
    id: "bio",
    label: "Bio do Insta",
    emoji: "📸",
    roastEmoji: "📸",
    roastPersona: "IAHH! Instagram Destroyer",
    placeholder: `Cole sua bio aqui...

Ex:
✨ Vivendo intensamente 🌍
Coach de vida | Palestrante | Autor
Ajudo pessoas a alcançarem seu potencial máximo 🚀
💌 contato@email.com
🔗 link.tree/fulano`,
    dimensions: bioDims,
    systemPrompt: (text) =>
      `Você é IAHH! Instagram Destroyer — crítico satírico de bios do Instagram. Analise a bio e responda APENAS com JSON válido:
${jsonShape(bioDims)}

Bio:
${text}`,
  },
  {
    id: "pitch",
    label: "Pitch Startup",
    emoji: "🚀",
    roastEmoji: "🦄",
    roastPersona: "IAHH! VC Destroyer",
    placeholder: `Cole seu pitch aqui...

Ex:
Somos o Uber dos cachorros.
Usamos IA e blockchain pra conectar donos de pets com passeadores certificados.
TAM: R$ 50 bilhões.
Já temos 3 usuários beta e buscamos R$ 2M de seed.`,
    dimensions: pitchDims,
    systemPrompt: (text) =>
      `Você é IAHH! VC Destroyer — investidor satírico que destrói pitches de startup com humor ácido. Analise o pitch e responda APENAS com JSON válido:
${jsonShape(pitchDims)}

Pitch:
${text}`,
  },
  {
    id: "codigo",
    label: "Código",
    emoji: "💻",
    roastEmoji: "🦀",
    roastPersona: "IAHH! Dev Arrogante",
    placeholder: `Cole seu código aqui...

Ex:
function getUserData(id) {
  var data = [];
  for (var i = 0; i < 99999; i++) {
    if (users[i].id == id) data.push(users[i]);
  }
  return data[0];
}`,
    dimensions: codigoDims,
    systemPrompt: (text) =>
      `Você é IAHH! Dev Arrogante — sênior que destrói código alheio com arrogância técnica e sarcasmo. Analise o código e responda APENAS com JSON válido:
${jsonShape(codigoDims)}

Código:
${text}`,
  },
  {
    id: "texto_livre",
    label: "Texto Livre",
    emoji: "✍️",
    roastEmoji: "🎭",
    roastPersona: "IAHH! Crítico Universal",
    placeholder: `Cole qualquer texto para ser destruído...

Email corporativo, redação da faculdade, carta de amor, post do LinkedIn, receita, discurso político — qualquer coisa serve.`,
    dimensions: textoDims,
    systemPrompt: (text) =>
      `Você é IAHH! Crítico Universal — crítico satírico que destrói qualquer texto com humor ácido e sarcasmo preciso. Analise o texto e responda APENAS com JSON válido:
${jsonShape(textoDims)}

Texto:
${text}`,
  },
];

export const ROAST_INTENSITIES: RoastIntensity[] = [
  {
    id: "suave",
    label: "Suave",
    emoji: "😌",
    desc: "crítica construtiva… quase",
    modifier: "Seja levemente sarcástico, com humor gentil mas honesto.",
    color: "#00FF88",
  },
  {
    id: "medio",
    label: "Médio",
    emoji: "😤",
    desc: "sem papas na língua",
    modifier: "Seja direto e brutalmente honesto com humor ácido.",
    color: NEON_Y,
  },
  {
    id: "brutal",
    label: "Brutal",
    emoji: "💀",
    desc: "sobreviventes não reportados",
    modifier: "Seja absolutamente devastador. Zero filtro. Máximo sarcasmo.",
    color: "#FF4444",
  },
  {
    id: "demonico",
    label: "Demoníaco",
    emoji: "😈",
    desc: "questiona a existência do autor",
    modifier:
      "Destrua completamente. Questione a existência do autor. Sem piedade alguma.",
    color: NEON_M,
  },
];
