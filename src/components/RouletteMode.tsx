import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PERSONAS, type PersonaId } from "@/lib/personas";
import { FORBIDDEN_PERSONAS } from "@/lib/forbiddenPersonas";
import {
  loadRouletteStats,
  recordOutcome,
  survivalRate,
  type RouletteStats,
} from "@/lib/rouletteStats";
import { toast } from "sonner";
import { getSupabaseFunctionHeaders } from "@/lib/supabaseFunctionHeaders";

/* ──────────────────────────────────────────────
   PALETTE & CONSTANTS
─────────────────────────────────────────────── */
const NEON_Y = "#FFE600";
const NEON_M = "#FF00FF";
const BLOOD = "#CC0000";

type ChamberId = "safe" | "bonus" | "random" | "roast" | "all" | "bullet";
type Chamber = {
  id: ChamberId;
  weight: number;
  label: string;
  color: string;
  emoji: string;
  desc: string;
  xp: number;
};

const CHAMBERS: Chamber[] = [
  { id: "safe",   weight: 30, label: "SEGURO",            color: "#00FF88", emoji: "✅", desc: "Sobreviveu. Resposta normal.",        xp: 5  },
  { id: "bonus",  weight: 20, label: "BÔNUS XP",          color: NEON_Y,    emoji: "⭐", desc: "Sobreviveu. XP em dobro.",            xp: 20 },
  { id: "random", weight: 15, label: "PERSONA ALEATÓRIA", color: "#00AAFF", emoji: "🎲", desc: "Uma persona surpresa responde.",      xp: 10 },
  { id: "roast",  weight: 18, label: "VOCÊ É O ALVO",     color: "#FF8C00", emoji: "🔥", desc: "A IA te roasta em vez de responder.", xp: 12 },
  { id: "all",    weight: 10, label: "TODAS AS VOZES",    color: NEON_M,    emoji: "💥", desc: "10 personas respondem ao mesmo tempo.", xp: 25 },
  { id: "bullet", weight: 7,  label: "💀 BALA",           color: BLOOD,     emoji: "💀", desc: "Evento especial. Raro. Sem volta.",   xp: 50 },
];

function pickChamber(): Chamber {
  const total = CHAMBERS.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of CHAMBERS) { r -= c.weight; if (r <= 0) return c; }
  return CHAMBERS[0];
}

type BulletKind = "inverted" | "surprise-roast" | "forbidden" | "confession" | "mirror" | "blackout";
const BULLETS: { id: BulletKind; name: string; emoji: string; color: string; desc: string; bg: string }[] = [
  { id: "inverted",       name: "MODO INVERTIDO",     emoji: "🔄", color: "#00FFFF", desc: "A IA pergunta. Você responde.",          bg: "#001a1a" },
  { id: "surprise-roast", name: "ROAST SURPRESA",     emoji: "🎤", color: "#FF8C00", desc: "Sem aviso. A IA te destrói.",            bg: "#1a0800" },
  { id: "forbidden",      name: "PERSONA PROIBIDA",   emoji: "🚫", color: "#8B0000", desc: "Uma persona que não deveria existir.",   bg: "#1a0000" },
  { id: "confession",     name: "CONFISSÃO FORÇADA",  emoji: "😰", color: "#AA00FF", desc: "A IA quebra o personagem.",              bg: "#0a0014" },
  { id: "mirror",         name: "MODO ESPELHO",       emoji: "🪞", color: NEON_M,    desc: "A IA vira uma versão de você.",          bg: "#1a001a" },
  { id: "blackout",       name: "BLACKOUT TOTAL",     emoji: "⬛", color: "#FFFFFF", desc: "Tela escurece. Resposta sem contexto.",  bg: "#000000" },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const ROULETTE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/roulette`;

/* ──────────────────────────────────────────────
   WEBAUDIO SFX
─────────────────────────────────────────────── */
let _audioCtx: AudioContext | null = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!_audioCtx) {
    const Ctor = (window.AudioContext || (window as any).webkitAudioContext);
    if (Ctor) _audioCtx = new Ctor();
  }
  if (_audioCtx?.state === "suspended") _audioCtx.resume();
  return _audioCtx;
};

function playCylinderSpin(durationMs = 1800) {
  const ctx = getCtx(); if (!ctx) return;
  const now = ctx.currentTime;
  const dur = durationMs / 1000;
  const clicks = 22;
  for (let i = 0; i < clicks; i++) {
    const t = i / (clicks - 1);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const at = now + eased * dur;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(180 + Math.random() * 80, at);
    gain.gain.setValueAtTime(0.12, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.04);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at); osc.stop(at + 0.05);
  }
  const whirr = ctx.createOscillator();
  const wG = ctx.createGain();
  whirr.type = "sawtooth";
  whirr.frequency.setValueAtTime(60, now);
  whirr.frequency.linearRampToValueAtTime(110, now + dur * 0.4);
  whirr.frequency.linearRampToValueAtTime(40, now + dur);
  wG.gain.setValueAtTime(0.0001, now);
  wG.gain.exponentialRampToValueAtTime(0.05, now + 0.1);
  wG.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  whirr.connect(wG).connect(ctx.destination);
  whirr.start(now); whirr.stop(now + dur + 0.05);
}

function playHeartbeat() {
  const ctx = getCtx(); if (!ctx) return;
  const now = ctx.currentTime;
  [0, 0.18].forEach((off) => {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(70, now + off);
    o.frequency.exponentialRampToValueAtTime(40, now + off + 0.15);
    g.gain.setValueAtTime(0.45, now + off);
    g.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.18);
    o.connect(g).connect(ctx.destination);
    o.start(now + off); o.stop(now + off + 0.2);
  });
}

function playGunshot() {
  const ctx = getCtx(); if (!ctx) return;
  const now = ctx.currentTime;
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1800, now);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.6, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  src.connect(filter).connect(g).connect(ctx.destination);
  src.start(now);
  const sub = ctx.createOscillator(); const sG = ctx.createGain();
  sub.type = "sine";
  sub.frequency.setValueAtTime(90, now);
  sub.frequency.exponentialRampToValueAtTime(30, now + 0.25);
  sG.gain.setValueAtTime(0.5, now);
  sG.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  sub.connect(sG).connect(ctx.destination);
  sub.start(now); sub.stop(now + 0.35);
}

function playClickEmpty() {
  const ctx = getCtx(); if (!ctx) return;
  const now = ctx.currentTime;
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(220, now);
  g.gain.setValueAtTime(0.18, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  o.connect(g).connect(ctx.destination);
  o.start(now); o.stop(now + 0.1);
}

/* ──────────────────────────────────────────────
   REVOLVER
─────────────────────────────────────────────── */
const Revolver = ({
  phase,
  chamberIdx,
  chamberColor,
}: {
  phase: Phase;
  chamberIdx: number;
  chamberColor: string;
}) => {
  const [spinAngle, setSpinAngle] = useState(0);
  const [recoil, setRecoil] = useState(false);
  const [flash, setFlash] = useState(false);
  const spinning = phase === "spinning";

  useEffect(() => {
    if (phase === "spinning") {
      const spins = 3 + Math.random() * 4;
      setSpinAngle(spins * 360 + chamberIdx * 60);
    }
  }, [phase, chamberIdx]);

  useEffect(() => {
    if (phase === "reveal") {
      setRecoil(true); setFlash(true);
      setTimeout(() => setRecoil(false), 400);
      setTimeout(() => setFlash(false), 220);
    }
  }, [phase]);

  const positions = [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (i * 60 - 90) * Math.PI / 180;
    return { x: 105 + 20 * Math.cos(a), y: 100 + 20 * Math.sin(a) };
  });

  const isDone = phase === "responding" || phase === "done" || phase === "reveal";

  return (
    <div className="relative flex items-center justify-center">
      {flash && (
        <div
          className="absolute z-10 pointer-events-none rounded-full"
          style={{
            right: -10, top: "50%", transform: "translateY(-50%)",
            width: 70, height: 70,
            background: "radial-gradient(circle,#fff 0%,#FFE600 40%,transparent 70%)",
          }}
        />
      )}
      <svg
        width={300}
        height={210}
        viewBox="0 0 280 200"
        style={{
          filter: `drop-shadow(0 0 22px ${chamberColor}66)`,
          transform: recoil ? "translateX(-10px) rotate(-3deg)" : "none",
          transition: recoil ? "transform .15s" : "transform .3s",
        }}
      >
        {/* Grip */}
        <path d="M 60 130 L 80 175 L 105 178 L 110 130" fill="#1a1a1a" stroke="#333" strokeWidth="1.5" />
        {[138, 148, 158, 168].map((y) => (
          <line key={y} x1="68" y1={y} x2="105" y2={y + 3} stroke="#222" strokeWidth="1" />
        ))}
        {/* Frame */}
        <path d="M 60 80 L 60 135 L 110 135 L 122 120 L 180 120 L 180 80 L 122 75 Z" fill="#1a1a1a" stroke="#333" strokeWidth="1.5" />
        {/* Barrel */}
        <rect x="120" y="86" width="125" height="26" rx="4" fill="#151515" stroke="#333" strokeWidth="1.5" />
        <rect x="122" y="89" width="120" height="4" rx="2" fill="#2a2a2a" />
        {/* Sight */}
        <rect x="160" y="82" width="6" height="6" fill="#2a2a2a" />
        {/* Muzzle */}
        <rect x="240" y="82" width="14" height="34" rx="3" fill="#0c0c0c" stroke="#444" strokeWidth="1" />
        <circle cx="247" cy="99" r="4" fill="#000" />
        {/* Trigger guard */}
        <path d="M 88 135 Q 108 158 122 135" fill="none" stroke="#333" strokeWidth="1.5" />
        <line x1="103" y1="123" x2="108" y2="148" stroke="#444" strokeWidth="2" />
        {/* Hammer */}
        <path d="M 65 80 L 56 65 L 72 62 L 78 80 Z" fill="#222" stroke="#444" strokeWidth="1" />
        {/* Cylinder housing */}
        <circle cx="105" cy="100" r="34" fill="#0e0e0e" stroke="#2a2a2a" strokeWidth="2" />
        {/* Cylinder spinning */}
        <g
          style={{
            transformOrigin: "105px 100px",
            transform: `rotate(${spinAngle}deg)`,
            transition: spinning ? "transform 1.8s cubic-bezier(0.25,0.46,0.45,0.94)" : "none",
          }}
        >
          <circle cx="105" cy="100" r="29" fill="#1a1a1a" stroke="#333" strokeWidth="1.5" />
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i * 60) * Math.PI / 180;
            const x1 = 105 + 21 * Math.cos(a), y1 = 100 + 21 * Math.sin(a);
            const x2 = 105 + 28 * Math.cos(a), y2 = 100 + 28 * Math.sin(a);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2a2a2a" strokeWidth="1" />;
          })}
          {positions.map((pos, i) => {
            const isLoaded = i === 5;
            const isSelected = isDone && i === chamberIdx;
            return (
              <g key={i}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={7}
                  fill={isSelected ? chamberColor : isLoaded ? "#2a0000" : "#050505"}
                  stroke={isSelected ? chamberColor : isLoaded ? "#660000" : "#444"}
                  strokeWidth={isSelected ? 2 : 1}
                  style={{ filter: isSelected ? `drop-shadow(0 0 6px ${chamberColor})` : "none" }}
                />
                {isLoaded && !isSelected && <circle cx={pos.x} cy={pos.y} r={3} fill="#660000" />}
              </g>
            );
          })}
          <circle cx="105" cy="100" r="5" fill="#333" stroke="#555" strokeWidth="1" />
          <circle cx="105" cy="100" r="2" fill="#1a1a1a" />
        </g>
      </svg>
    </div>
  );
};

/* ──────────────────────────────────────────────
   STATS PANEL
─────────────────────────────────────────────── */
const StatsPanel = ({ stats, onClose }: { stats: RouletteStats; onClose: () => void }) => {
  const survival = survivalRate(stats);
  const cells = [
    { l: "DISPAROS",   v: stats.rounds,             c: "#fff" },
    { l: "SOBREVIVEU", v: stats.rounds - stats.bullets, c: "#00FF88" },
    { l: "BALAS",      v: stats.bullets,            c: BLOOD },
    { l: "SEQ. ATUAL", v: stats.safeStreak,         c: NEON_Y },
    { l: "MAIOR SEQ.", v: stats.bestStreak,         c: NEON_M },
    { l: "BLACKOUTS",  v: stats.blackouts,          c: "#fff" },
  ];
  return (
    <div className="fixed inset-0 z-[300] grid place-items-center" style={{ background: "rgba(0,0,0,0.92)" }}>
      <div
        className="rounded-md p-6 w-[min(340px,92vw)]"
        style={{ background: "#0a0a0a", border: `1px solid ${BLOOD}66`, boxShadow: `0 0 40px ${BLOOD}33` }}
      >
        <div className="text-center mb-4 tracking-[3px]" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: NEON_Y }}>
          🔫 FICHA DE SOBREVIVÊNCIA
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {cells.map((s) => (
            <div key={s.l} className="rounded-md px-2.5 py-2" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
              <div className="font-mono" style={{ fontSize: 8, color: "#444", letterSpacing: 1 }}>{s.l}</div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: s.c, lineHeight: 1.2 }}>{s.v}</div>
            </div>
          ))}
        </div>
        <div className="mb-4">
          <div className="flex justify-between font-mono mb-1" style={{ fontSize: 9, color: "#555" }}>
            <span>TAXA DE SOBREVIVÊNCIA</span><span>{survival}%</span>
          </div>
          <div className="h-1.5 rounded-md overflow-hidden" style={{ background: "#1a1a1a" }}>
            <div
              className="h-full transition-all duration-700"
              style={{ width: `${survival}%`, background: `linear-gradient(90deg,${BLOOD},#00FF88)` }}
            />
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full rounded-md tracking-[2px] cursor-pointer"
          style={{ background: BLOOD, border: "none", color: "#fff", padding: "10px", fontFamily: "'Bebas Neue',sans-serif", fontSize: 14 }}
        >
          FECHAR
        </button>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────
   MAIN
─────────────────────────────────────────────── */
type Phase = "idle" | "spinning" | "suspense" | "reveal" | "responding" | "done";

interface Props {
  open: boolean;
  onClose: () => void;
  currentPersona: PersonaId | string;
  recentUserMessages: string[];
  onXp: (amt: number) => void;
}

type ResponseItem = {
  id: string;
  emoji: string;
  label: string;
  color: string;
  text: string;
  streaming: boolean;
};

export const RouletteMode = ({ open, onClose, currentPersona, recentUserMessages, onXp }: Props) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [question, setQuestion] = useState("");
  const [chamber, setChamber] = useState<Chamber | null>(null);
  const [chamberIdx, setChamberIdx] = useState(0);
  const [bullet, setBullet] = useState<typeof BULLETS[number] | null>(null);
  const [forbidden, setForbidden] = useState<typeof FORBIDDEN_PERSONAS[number] | null>(null);
  const [activePersona, setActivePersona] = useState<PersonaId | string>(currentPersona);
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [stats, setStats] = useState<RouletteStats>(() => loadRouletteStats());
  const [showStats, setShowStats] = useState(false);
  const [blackoutCount, setBlackoutCount] = useState<number | null>(null);
  const [shareToast, setShareToast] = useState("");

  useEffect(() => {
    if (!open) {
      setPhase("idle"); setChamber(null); setBullet(null); setForbidden(null);
      setResponses([]); setQuestion(""); setBlackoutCount(null);
    } else {
      setActivePersona(currentPersona);
    }
  }, [open, currentPersona]);

  const personaObj = useMemo(
    () => PERSONAS.find((p) => p.id === activePersona) ?? PERSONAS[0],
    [activePersona],
  );

  const accentColor = chamber?.color || BLOOD;
  const isBlackoutBg = bullet?.id === "blackout" && phase !== "done";
  const bg = isBlackoutBg ? "#000" : bullet ? bullet.bg : "#080808";

  /* ── FIRE ── */
  const fire = async () => {
    if (phase !== "idle") return;
    const ch = pickChamber();
    const idx = Math.floor(Math.random() * 6);
    setChamber(ch); setChamberIdx(idx);
    setResponses([]); setBullet(null); setForbidden(null);

    setPhase("spinning");
    playCylinderSpin(1800);
    await wait(1900);

    setPhase("suspense");
    playHeartbeat();
    await wait(450);
    playHeartbeat();
    await wait(700);

    setPhase("reveal");
    if (ch.id === "bullet") playGunshot(); else playClickEmpty();
    await wait(1200);

    const isBullet = ch.id === "bullet";
    let chosenBullet: typeof BULLETS[number] | null = null;
    let chosenForbidden: typeof FORBIDDEN_PERSONAS[number] | null = null;

    if (isBullet) {
      chosenBullet = BULLETS[Math.floor(Math.random() * BULLETS.length)];
      setBullet(chosenBullet);
      if (chosenBullet.id === "forbidden") {
        chosenForbidden = FORBIDDEN_PERSONAS[Math.floor(Math.random() * FORBIDDEN_PERSONAS.length)];
        setForbidden(chosenForbidden);
      }
      if (chosenBullet.id === "blackout") {
        for (let i = 3; i >= 1; i--) {
          setBlackoutCount(i);
          await wait(900);
        }
        setBlackoutCount(0);
        await wait(500);
        setBlackoutCount(null);
      }
    }

    setPhase("responding");
    const userMsg = question.trim() || "Diga algo.";

    try {
      if (ch.id === "safe" || ch.id === "bonus") {
        await streamSingle(personaObj.emoji, personaObj.name, accentColor, () => callChat(userMsg, activePersona));
      } else if (ch.id === "random") {
        const others = PERSONAS.filter((p) => p.id !== activePersona);
        const pick = others[Math.floor(Math.random() * others.length)];
        setActivePersona(pick.id);
        await streamSingle(pick.emoji, pick.name, "#00AAFF", () => callChat(userMsg, pick.id));
      } else if (ch.id === "roast") {
        await streamSingle("🔥", "ROAST", "#FF8C00", () => callRoulette("user-roast", userMsg));
      } else if (ch.id === "all") {
        await streamAllPersonas(userMsg);
      } else if (ch.id === "bullet" && chosenBullet) {
        await runBullet(chosenBullet, chosenForbidden, userMsg);
      }
    } catch (e) {
      console.error(e);
      toast.error("Falha no disparo.");
    }

    const newStats = recordOutcome(
      ch.id === "bullet" && chosenBullet ? `bullet:${chosenBullet.id}` : ch.id,
      isBullet,
      chosenBullet?.id === "blackout",
      ch.id === "bonus" ? ch.xp : 0,
    );
    setStats(newStats);
    onXp(ch.xp);
    setPhase("done");

    if (isBullet && chosenBullet) {
      toast.error(`💀 BALA! ${chosenBullet.emoji} ${chosenBullet.name}`, { duration: 3500 });
    }
  };

  const streamSingle = async (
    emoji: string,
    label: string,
    color: string,
    fetcher: () => Promise<string>,
  ) => {
    const id = String(Date.now());
    setResponses([{ id, emoji, label, color, text: "", streaming: true }]);
    const text = await fetcher();
    // Fake stream-in for cohesion (backend already returned full text)
    let acc = "";
    for (const ch of text) {
      acc += ch;
      setResponses((p) => p.map((r) => r.id === id ? { ...r, text: acc } : r));
      if (acc.length % 4 === 0) await wait(8);
    }
    setResponses((p) => p.map((r) => r.id === id ? { ...r, streaming: false } : r));
  };

  const streamAllPersonas = async (userMsg: string) => {
    const initial = PERSONAS.map((p, i) => ({
      id: p.id, emoji: p.emoji, label: p.name,
      color: ["#FFE600", "#00FFAA", "#AA00FF", "#00AAFF", "#FF4444", "#FF69B4", "#FF6B35", "#00FF88", NEON_M, "#FFAA00"][i % 10],
      text: "", streaming: true,
    }));
    setResponses(initial);
    await Promise.all(PERSONAS.map(async (p) => {
      try {
        const text = await callChat(userMsg, p.id);
        setResponses((prev) => prev.map((r) => r.id === p.id ? { ...r, text, streaming: false } : r));
      } catch {
        setResponses((prev) => prev.map((r) => r.id === p.id ? { ...r, text: "...", streaming: false } : r));
      }
    }));
  };

  const runBullet = async (
    b: typeof BULLETS[number],
    f: typeof FORBIDDEN_PERSONAS[number] | null,
    userMsg: string,
  ) => {
    if (b.id === "inverted") {
      await streamSingle("🔄", "INVERTIDO", b.color, async () => {
        const resp = await fetch(CHAT_URL, {
          method: "POST",
          headers: await getSupabaseFunctionHeaders(),
          body: JSON.stringify({
            messages: [{ role: "user", content: userMsg }],
            persona: activePersona,
            reverse: true, challenge: "ask",
          }),
        });
        if (!resp.ok || !resp.body) throw new Error();
        return await readSSE(resp.body);
      });
    } else if (b.id === "surprise-roast") {
      const ctx = recentUserMessages.slice(-5).join(" | ") || userMsg;
      await streamSingle("🎤", "ROAST SURPRESA", b.color, () => callRoulette("user-roast", ctx, ctx));
    } else if (b.id === "forbidden" && f) {
      await streamSingle(f.emoji, f.name, "#8B0000", () => callRoulette("forbidden", userMsg, f.prompt));
    } else if (b.id === "confession") {
      await streamSingle("😰", "CONFISSÃO", b.color, () => callRoulette("confession", userMsg));
    } else if (b.id === "mirror") {
      const ctx = recentUserMessages.slice(-5).join(" | ") || userMsg;
      await streamSingle("🪞", "ESPELHO", b.color, () => callRoulette("mirror", userMsg, ctx));
    } else if (b.id === "blackout") {
      await streamSingle("⬛", "BLACKOUT", "#fff", () => callRoulette("absurd", userMsg));
    }
  };

  const reset = () => {
    setPhase("idle"); setChamber(null); setBullet(null);
    setForbidden(null); setResponses([]); setBlackoutCount(null);
  };

  const copyResult = () => {
    const lines = responses.map((r) => `${r.emoji} ${r.label}: ${r.text}`).join("\n\n");
    const text = `🔫 IAHH! Roleta Russa\n\nCâmara: ${chamber?.label}\n\n${lines}`;
    navigator.clipboard?.writeText(text).then(() => {
      setShareToast("📋 Copiado!");
      setTimeout(() => setShareToast(""), 1800);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-full sm:max-w-2xl w-full h-[100dvh] sm:h-[92vh] p-0 gap-0 overflow-hidden flex flex-col"
        style={{ background: bg, color: "#fff", border: `1px solid ${BLOOD}44`, transition: "background 1s", fontFamily: "'JetBrains Mono',monospace" }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');
          @keyframes iahh-hb { 0%,100%{transform:scale(1);} 50%{transform:scale(1.18);} }
          @keyframes iahh-suspense-pulse { 0%,100%{opacity:.35;} 50%{opacity:1;} }
          @keyframes iahh-reveal-pop { 0%{opacity:0;transform:scale(.3) translateY(20px);} 60%{transform:scale(1.08);} 100%{opacity:1;transform:scale(1);} }
          @keyframes iahh-flash-screen { 0%,100%{opacity:0;} 50%{opacity:1;} }
          @keyframes iahh-response-in { from{opacity:0;transform:translateY(10px);} to{opacity:1;transform:none;} }
          @keyframes iahh-cursor { 0%,100%{opacity:1;} 50%{opacity:0;} }
          @keyframes iahh-countdown { from{transform:scale(2);opacity:0;} to{transform:scale(1);opacity:1;} }
          @keyframes iahh-glitch { 0%,95%,100%{text-shadow:0 0 10px ${BLOOD}88;} 96%{text-shadow:3px 0 ${NEON_M},-3px 0 #00ffff;transform:skewX(-2deg);} 98%{text-shadow:-2px 0 ${BLOOD};} }
          @keyframes iahh-scanline { 0%{transform:translateY(-100%);} 100%{transform:translateY(200vh);} }
          @keyframes iahh-forbidden-in { 0%{opacity:0;transform:translateX(-100%) rotate(-5deg);} 60%{transform:translateX(5%) rotate(1deg);} 100%{opacity:1;transform:none;} }
          .iahh-cursor::after { content:"█"; animation: iahh-cursor .7s infinite; color:${accentColor}; font-size:10px; margin-left:2px; }
          .iahh-scanlines::before { content:''; position:absolute; inset:0; background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.1) 2px,rgba(0,0,0,.1) 3px); pointer-events:none; z-index:1; }
          .iahh-scanline-bar { position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(to bottom,transparent,${BLOOD}33,transparent); animation: iahh-scanline 6s linear infinite; pointer-events:none; z-index:2; }
        `}</style>

        {!isBlackoutBg && <div className="iahh-scanlines absolute inset-0 pointer-events-none" />}
        {!isBlackoutBg && <div className="iahh-scanline-bar" />}

        {/* Reveal flash */}
        {phase === "reveal" && chamber && (
          <div
            className="absolute inset-0 z-[5] pointer-events-none"
            style={{ background: chamber.color, opacity: 0, animation: "iahh-flash-screen .4s ease-out forwards" }}
          />
        )}

        {showStats && <StatsPanel stats={stats} onClose={() => setShowStats(false)} />}

        {shareToast && (
          <div
            className="absolute z-[400] left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-md font-mono whitespace-nowrap"
            style={{ top: 70, background: "#0a0a0a", border: `1px solid ${NEON_Y}66`, color: NEON_Y, fontSize: 11 }}
          >
            {shareToast}
          </div>
        )}

        {/* HEADER */}
        <header
          className="shrink-0 flex items-center gap-3 px-4 py-2.5 z-10"
          style={{ borderBottom: `1px solid ${BLOOD}44`, background: "rgba(8,0,0,0.9)" }}
        >
          <div
            className="grid place-items-center rounded-md shrink-0"
            style={{ width: 38, height: 38, background: `${BLOOD}22`, border: `1px solid ${BLOOD}66`, fontSize: 22 }}
          >
            🔫
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="leading-none tracking-[4px] truncate"
              style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(18px,4vw,28px)", color: NEON_Y, animation: "iahh-glitch 5s infinite" }}
            >
              IA.AHH! <span style={{ color: BLOOD }}>ROLETA RUSSA</span>
            </div>
            <div style={{ fontSize: 10, color: "#555" }}>6 câmaras · 1 bala · resultado imprevisível</div>
          </div>
          <button
            onClick={() => setShowStats(true)}
            className="rounded-md cursor-pointer tracking-[1px] hover:opacity-90"
            style={{ background: "transparent", border: `1px solid ${BLOOD}44`, color: BLOOD, padding: "5px 12px", fontFamily: "'Bebas Neue',sans-serif", fontSize: 11 }}
          >
            📊 {stats.rounds}
          </button>
        </header>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center gap-5 px-4 py-5 sm:py-6 relative z-[1]">
          {/* Blackout fullscreen */}
          {blackoutCount !== null && (
            <div className="fixed inset-0 z-[200] grid place-items-center" style={{ background: "#000" }}>
              <div className="text-center">
                <div className="tracking-[4px] mb-4" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: "#333" }}>
                  BLACKOUT TOTAL
                </div>
                {blackoutCount > 0 ? (
                  <div
                    key={blackoutCount}
                    style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 140, color: "#fff", lineHeight: 1, animation: "iahh-countdown .4s ease-out" }}
                  >
                    {blackoutCount}
                  </div>
                ) : (
                  <div
                    style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 64, color: BLOOD, letterSpacing: 4, animation: "iahh-reveal-pop .35s ease-out" }}
                  >
                    💀
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Persona chips */}
          {phase === "idle" && (
            <div className="flex flex-wrap justify-center gap-1.5 w-full max-w-[520px]">
              {PERSONAS.map((p) => {
                const active = activePersona === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActivePersona(p.id)}
                    title={p.name}
                    className="rounded-md cursor-pointer transition-all"
                    style={{
                      background: active ? `${BLOOD}22` : "transparent",
                      border: `1px solid ${active ? BLOOD : "#1e1e1e"}`,
                      color: active ? "#fff" : "#666",
                      padding: "4px 10px",
                      fontSize: 12,
                    }}
                  >
                    {p.emoji}
                  </button>
                );
              })}
            </div>
          )}

          {/* Revolver */}
          <Revolver phase={phase} chamberIdx={chamberIdx} chamberColor={accentColor} />

          {/* IDLE: input + legend + fire */}
          {phase === "idle" && (
            <div className="w-full max-w-[480px] flex flex-col gap-3">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") fire(); }}
                placeholder="Pergunta (opcional) — ou gire no escuro..."
                className="w-full rounded-md outline-none transition-colors font-mono"
                style={{ background: "#0a0a0a", border: `1px solid ${BLOOD}44`, color: "#ccc", padding: "11px 14px", fontSize: 13 }}
                onFocus={(e) => (e.currentTarget.style.borderColor = `${BLOOD}99`)}
                onBlur={(e) => (e.currentTarget.style.borderColor = `${BLOOD}44`)}
              />
              <button
                onClick={fire}
                className="rounded-md tracking-[3px] cursor-pointer transition-transform hover:scale-[1.02] active:scale-100"
                style={{
                  background: `linear-gradient(135deg, ${BLOOD}, #660000)`,
                  border: "none", color: "#fff", padding: "13px 20px",
                  fontFamily: "'Bebas Neue',sans-serif", fontSize: 18,
                  boxShadow: `0 0 24px ${BLOOD}88`,
                }}
              >
                🔫 PUXAR O GATILHO
              </button>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1">
                {CHAMBERS.map((c) => (
                  <div key={c.id} className="flex items-center gap-1.5 font-mono" style={{ fontSize: 9, color: "#444" }}>
                    <span
                      className="inline-block rounded-full shrink-0"
                      style={{ width: 8, height: 8, background: c.color, boxShadow: `0 0 4px ${c.color}aa` }}
                    />
                    <span style={{ color: c.id === "bullet" ? BLOOD : "#555" }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SPINNING */}
          {phase === "spinning" && (
            <div
              className="text-center tracking-[4px]"
              style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: "#666", animation: "iahh-suspense-pulse .5s infinite" }}
            >
              GIRANDO...
            </div>
          )}

          {/* SUSPENSE */}
          {phase === "suspense" && (
            <div className="flex flex-col items-center gap-2">
              <div
                className="rounded-full"
                style={{ width: 44, height: 44, background: BLOOD, boxShadow: `0 0 24px ${BLOOD}`, animation: "iahh-hb .9s ease-out infinite" }}
              />
              <div className="tracking-[4px]" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: BLOOD }}>...</div>
            </div>
          )}

          {/* REVEAL */}
          {phase === "reveal" && chamber && (
            <div className="text-center" style={{ animation: "iahh-reveal-pop .4s ease-out" }}>
              <div style={{ fontSize: 60 }}>{chamber.emoji}</div>
              <div
                className="tracking-[4px] mt-1"
                style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, color: chamber.color, textShadow: `0 0 20px ${chamber.color}` }}
              >
                {chamber.label}
              </div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{chamber.desc}</div>
              {chamber.id !== "bullet" && (
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: chamber.color, marginTop: 6 }}>
                  +{chamber.xp} XP
                </div>
              )}
            </div>
          )}

          {/* Forbidden persona reveal */}
          {forbidden && (phase === "responding" || phase === "done") && (
            <div
              className="rounded-md w-full max-w-[500px] px-4 py-2.5"
              style={{ background: "#1a0000", border: `1px solid ${"#8B0000"}66`, animation: "iahh-forbidden-in .6s cubic-bezier(0.34,1.56,0.64,1)" }}
            >
              <div className="tracking-[2px] mb-1" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 10, color: "#666" }}>
                🚫 PERSONA PROIBIDA DESBLOQUEADA
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 24 }}>{forbidden.emoji}</span>
                <span className="tracking-[2px]" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: "#8B0000" }}>
                  {forbidden.name.toUpperCase()}
                </span>
              </div>
            </div>
          )}

          {/* Bullet info */}
          {bullet && (phase === "responding" || phase === "done") && (
            <div
              className="rounded-md w-full max-w-[500px] px-4 py-2.5 text-center"
              style={{ background: bullet.bg, border: `2px solid ${bullet.color}66` }}
            >
              <div className="tracking-[4px]" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: bullet.color }}>
                {bullet.emoji} {bullet.name}
              </div>
              <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{bullet.desc}</div>
            </div>
          )}

          {/* Responses */}
          {responses.length > 0 && (
            <div className="w-full max-w-[600px] flex flex-col gap-2.5">
              {responses.map((r) => (
                <div
                  key={r.id}
                  className="rounded-md px-3.5 py-3"
                  style={{ background: "#0a0a0a", border: `1px solid ${r.color}33`, animation: "iahh-response-in .4s ease-out" }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div
                      className="grid place-items-center rounded-md shrink-0"
                      style={{ width: 26, height: 26, background: `${r.color}18`, border: `1px solid ${r.color}`, fontSize: 14 }}
                    >
                      {r.emoji}
                    </div>
                    <div className="tracking-[2px]" style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 12, color: r.color }}>
                      {r.label.toUpperCase()}
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap break-words" style={{ fontSize: 13, color: "#ddd", lineHeight: 1.7 }}>
                    {r.text}
                    {r.streaming && <span className="iahh-cursor" />}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DONE actions */}
          {phase === "done" && (
            <div className="flex flex-wrap justify-center gap-2 w-full max-w-[500px]">
              <button
                onClick={reset}
                className="flex-1 min-w-[140px] rounded-md cursor-pointer tracking-[3px] transition-transform hover:scale-[1.02]"
                style={{
                  background: `linear-gradient(135deg,${BLOOD},#660000)`,
                  border: "none", color: "#fff", padding: "11px 20px",
                  fontFamily: "'Bebas Neue',sans-serif", fontSize: 16,
                  boxShadow: `0 0 16px ${BLOOD}66`,
                }}
              >
                🔫 GIRAR NOVAMENTE
              </button>
              <button
                onClick={copyResult}
                className="rounded-md cursor-pointer tracking-[2px]"
                style={{ background: "transparent", border: `1px solid ${NEON_Y}55`, color: NEON_Y, padding: "11px 16px", fontFamily: "'Bebas Neue',sans-serif", fontSize: 12 }}
              >
                📋 COPIAR
              </button>
            </div>
          )}

          {/* Streak info */}
          {phase === "done" && (
            <div className="text-center font-mono" style={{ fontSize: 9, color: "#2a2a2a" }}>
              Sequência atual:{" "}
              <span style={{ color: stats.safeStreak > 5 ? "#00FF88" : "#444" }}>{stats.safeStreak}</span> sem bala
              {chamber?.id !== "bullet" && ` · +${chamber?.xp || 0} XP`}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer
          className="text-center font-mono shrink-0 z-[2]"
          style={{ fontSize: 9, color: "#222", padding: "4px 0 6px", borderTop: `1px solid ${BLOOD}22` }}
        >
          🔫 iahh.app · <span style={{ color: BLOOD }}>ROLETA RUSSA</span> · sobreviveu: {stats.rounds - stats.bullets}/{stats.rounds}
        </footer>
      </DialogContent>
    </Dialog>
  );
};

/* ──────────────────────────────────────────────
   HELPERS
─────────────────────────────────────────────── */
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function callChat(q: string, personaId: PersonaId | string): Promise<string> {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: await getSupabaseFunctionHeaders(),
    body: JSON.stringify({
      messages: [{ role: "user", content: q }],
      persona: personaId,
    }),
  });
  if (!resp.ok || !resp.body) throw new Error("chat failed");
  return await readSSE(resp.body);
}

async function callRoulette(event: string, q: string, context = ""): Promise<string> {
  const resp = await fetch(ROULETTE_URL, {
    method: "POST",
    headers: await getSupabaseFunctionHeaders(),
    body: JSON.stringify({ event, question: q, context }),
  });
  if (!resp.ok) throw new Error("roulette failed");
  const data = await resp.json();
  return data.text ?? "...";
}

async function readSSE(body: ReadableStream<Uint8Array>): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let acc = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") return acc;
      try {
        const parsed = JSON.parse(json);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) acc += delta;
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }
  return acc;
}
