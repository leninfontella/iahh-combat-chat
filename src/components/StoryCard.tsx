import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Share2, X, Music2, Zap } from "lucide-react";
import { toast } from "sonner";
import mascot from "@/assets/iahh-mascot.png";
import type { Persona } from "@/lib/personas";

interface Props {
  open: boolean;
  onClose: () => void;
  question: string;
  answer: string;
  persona: Persona;
}

// Trilhas sugeridas para Stories/Reels — meme/trending vibes
const TRACKS = [
  { title: "Phonk Tikitiki", artist: "DVRST", vibe: "🥷 brutal" },
  { title: "Murder In My Mind", artist: "Kordhell", vibe: "💀 demoníaco" },
  { title: "Sigma Rule", artist: "Patrick Bateman edit", vibe: "👔 LinkedIn" },
  { title: "Crazy Frog (Sped Up)", artist: "Axel F", vibe: "🤡 caos" },
  { title: "Running Up That Hill", artist: "Kate Bush", vibe: "🌌 filosófico" },
  { title: "Oh No", artist: "Kreepa", vibe: "💥 fail" },
  { title: "Funk do Nokia", artist: "MC Brinquedo", vibe: "🔥 BR meme" },
  { title: "Astronomia", artist: "Coffin Dance", vibe: "⚰ RIP" },
];

const pickTrack = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TRACKS[h % TRACKS.length];
};

export const StoryCard = ({ open, onClose, question, answer, persona }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [kick, setKick] = useState(false);
  const track = pickTrack(answer + persona.id);

  useEffect(() => {
    if (open) {
      setKick(false);
      const t = setTimeout(() => setKick(true), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  const exportPng = async (download: boolean) => {
    if (!cardRef.current) return null;
    setBusy(true);
    try {
      // Story 1080x1920 — usamos width fixo e pixelRatio pra obter resolução real
      const node = cardRef.current;
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 1080 / node.offsetWidth,
        backgroundColor: "#0a0a0a",
        width: node.offsetWidth,
        height: node.offsetHeight,
      });
      if (download) {
        const link = document.createElement("a");
        link.download = `iahh-story-${persona.id}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        toast.success("Story 1080×1920 baixado! 📱 Posta no Insta/TikTok 🔥");
      }
      return dataUrl;
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar story.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const dataUrl = await exportPng(false);
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "iahh-story.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "IAHH! Story",
          text: `${persona.emoji} ${persona.name} disse: "${answer.slice(0, 100)}..." 🎵 ${track.title} — IAHH!`,
        });
      } else {
        exportPng(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[420px] p-0 bg-card border-primary/40 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-display tracking-widest neon-text text-base">
            📱 IAHH! STORY · 1080×1920
          </DialogTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-3">
          {/* Wrapper escala visual — proporcional 9:16 */}
          <div className="mx-auto" style={{ width: 360 }}>
            <div
              ref={cardRef}
              className="relative overflow-hidden"
              style={{
                width: 360,
                height: 640, // 9:16 visual; export usa pixelRatio pra subir pra 1080×1920
                background:
                  "linear-gradient(160deg, #0a0010 0%, #1a0a05 35%, #0a0a1a 70%, #100010 100%)",
              }}
            >
              {/* Grid cyberpunk */}
              <div
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage:
                    "linear-gradient(hsl(320 100% 55% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(55 100% 55% / 0.3) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                  maskImage:
                    "radial-gradient(ellipse at center, black 30%, transparent 75%)",
                }}
              />
              {/* Glows */}
              <div
                className="absolute -top-20 -left-20 w-72 h-72 rounded-full blur-3xl opacity-40"
                style={{ background: "hsl(320 100% 55%)" }}
              />
              <div
                className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-40"
                style={{ background: "hsl(55 100% 55%)" }}
              />
              {/* Scanlines */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 3px)",
                }}
              />

              {/* HEADER */}
              <div className="relative px-5 pt-5 flex items-center gap-2">
                <img src={mascot} alt="" width={42} height={42} className="w-11 h-11 rounded border border-primary/40" />
                <div className="flex-1">
                  <div
                    className="font-display text-3xl leading-none"
                    style={{
                      color: "hsl(55 100% 55%)",
                      textShadow: "0 0 14px hsl(55 100% 55% / 0.85)",
                      fontFamily: "'Bebas Neue', Impact, sans-serif",
                    }}
                  >
                    IA.AHH!
                  </div>
                  <div className="text-[10px] text-white/60 font-mono">DOJO · CARD VIRAL</div>
                </div>
                <div
                  className="text-[9px] font-display tracking-[0.2em] px-2 py-0.5 border rounded-md"
                  style={{ color: "hsl(55 100% 55%)", borderColor: "hsl(55 100% 55% / 0.5)" }}
                >
                  9:16
                </div>
              </div>

              {/* PERGUNTA */}
              <div className="relative px-5 mt-4">
                <div className="text-[10px] font-display tracking-widest text-white/50 mb-1">
                  VOCÊ PERGUNTOU
                </div>
                <div className="text-[11px] text-white/80 font-mono line-clamp-2">
                  {question || "(sem pergunta)"}
                </div>
              </div>

              {/* GOLPE — answer com animação */}
              <div className="relative flex-1 px-5 mt-4">
                <div
                  className={`relative inline-block mb-2 px-2 py-0.5 font-display tracking-widest text-[10px] ${
                    kick ? "animate-kick-in" : ""
                  }`}
                  style={{
                    background: "hsl(0 84% 50%)",
                    color: "white",
                    transform: kick ? "rotate(-3deg)" : "rotate(-3deg) scale(0.5)",
                    transition: "transform 280ms cubic-bezier(.34,1.56,.64,1)",
                  }}
                >
                  💥 GOLPE VERBAL
                </div>
                <div
                  className="text-[17px] leading-snug font-medium text-white"
                  style={{
                    textShadow: "0 2px 12px rgba(0,0,0,0.85)",
                    transform: kick ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
                    opacity: kick ? 1 : 0,
                    transition: "all 420ms cubic-bezier(.34,1.56,.64,1) 120ms",
                  }}
                >
                  "{answer.length > 280 ? answer.slice(0, 277) + "..." : answer}"
                </div>
              </div>

              {/* TRACK SUGERIDA */}
              <div className="absolute left-5 right-5" style={{ bottom: 88 }}>
                <div
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded border backdrop-blur-sm"
                  style={{
                    borderColor: "hsl(55 100% 55% / 0.4)",
                    background: "rgba(0,0,0,0.45)",
                  }}
                >
                  <Music2 className="w-3.5 h-3.5" style={{ color: "hsl(55 100% 55%)" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-white/60 font-mono uppercase tracking-wider">
                      TRILHA SUGERIDA {track.vibe}
                    </div>
                    <div className="text-[12px] text-white font-medium truncate">
                      {track.title} <span className="text-white/50">— {track.artist}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PERSONA + WATERMARK */}
              <div className="absolute left-5 right-5 bottom-4 flex items-end justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl">{persona.emoji}</span>
                  <div>
                    <div
                      className="font-display text-base leading-none"
                      style={{
                        color: "hsl(320 100% 65%)",
                        fontFamily: "'Bebas Neue', Impact, sans-serif",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {persona.name.toUpperCase()}
                    </div>
                    <div className="text-[9px] text-white/55 font-mono">{persona.tagline}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="font-display text-[11px] tracking-[0.3em]"
                    style={{ color: "hsl(55 100% 55%)" }}
                  >
                    IAHH.APP
                  </div>
                  <div className="text-[8px] text-white/40 font-mono">@iahh.dojo</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground font-mono text-center -mt-1">
            Export real: <span className="text-foreground">1080 × 1920</span> · pronto pra Stories/Reels/TikTok
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => exportPng(true)}
              disabled={busy}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-display tracking-wider"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar Story
            </Button>
            <Button
              onClick={share}
              disabled={busy}
              variant="outline"
              className="flex-1 border-neon-magenta text-neon-magenta hover:bg-neon-magenta/10 font-display tracking-wider"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Compartilhar
            </Button>
          </div>
          <button
            onClick={() => {
              setKick(false);
              setTimeout(() => setKick(true), 50);
            }}
            className="w-full text-[10px] font-display tracking-widest text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1"
          >
            <Zap className="w-3 h-3" /> REPLAY DO GOLPE
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
