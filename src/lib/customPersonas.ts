// Custom user-created personas — saved in localStorage, shareable via URL
export interface CustomPersona {
  id: string; // "custom:<slug>"
  name: string;
  emoji: string;
  style: string; // overall vibe
  traits: [string, string, string];
  catchphrase: string;
  createdAt: number;
}

const STORAGE_KEY = "iahh:custom-personas";

export const loadCustomPersonas = (): CustomPersona[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

export const saveCustomPersonas = (list: CustomPersona[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

export const upsertCustomPersona = (p: CustomPersona) => {
  const list = loadCustomPersonas();
  const idx = list.findIndex((x) => x.id === p.id);
  if (idx >= 0) list[idx] = p;
  else list.unshift(p);
  saveCustomPersonas(list);
  return list;
};

export const deleteCustomPersona = (id: string) => {
  const list = loadCustomPersonas().filter((x) => x.id !== id);
  saveCustomPersonas(list);
  return list;
};

export const newCustomId = () =>
  "custom:" + Math.random().toString(36).slice(2, 10);

// URL-safe base64 encode/decode for sharing
const b64encode = (s: string) =>
  btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const b64decode = (s: string) => {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return decodeURIComponent(
    escape(atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad)),
  );
};

export const encodePersonaToLink = (p: CustomPersona): string => {
  const payload = b64encode(JSON.stringify(p));
  const url = new URL(window.location.href);
  url.searchParams.set("persona", payload);
  return url.toString();
};

export const decodePersonaFromQuery = (): CustomPersona | null => {
  try {
    const params = new URLSearchParams(window.location.search);
    const data = params.get("persona");
    if (!data) return null;
    const parsed = JSON.parse(b64decode(data));
    if (!parsed?.name || !parsed?.traits) return null;
    // Force a fresh local id to avoid collisions
    parsed.id = newCustomId();
    parsed.createdAt = Date.now();
    return parsed as CustomPersona;
  } catch {
    return null;
  }
};

export const buildPersonaSystemPrompt = (p: CustomPersona): string => {
  return `Você é IAHH! no modo CUSTOM "${p.name}" ${p.emoji}.
ESTILO: ${p.style}
CARACTERÍSTICAS PRINCIPAIS:
- ${p.traits[0]}
- ${p.traits[1]}
- ${p.traits[2]}
CATCHPHRASE (use com frequência, especialmente no fim): "${p.catchphrase}"
NUNCA quebre esse personagem. Mantenha o estilo em TODAS as respostas.`;
};

export const clearPersonaQueryParam = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete("persona");
  window.history.replaceState({}, "", url.toString());
};
