import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Share2, X } from "lucide-react";
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

export const ViralCard = ({ open, onClose, question, answer, persona }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0a0a0a",
      });
      const link = document.createElement("a");
      link.download = `iahh-${persona.id}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Card baixado! Posta no X e marca @iahh 😎");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar card.");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "iahh-card.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "IA.AHH!",
          text: `${persona.emoji} ${persona.name} disse:\n\n"${answer.slice(0, 120)}..."\n\nGerado em IA.AHH!`,
        });
      } else {
        download();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 bg-card border-primary/40 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-display tracking-widest neon-text text-base">
            CARD VIRAL
          </DialogTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-3">
          {/* Card a ser exportado */}
          <div
            ref={cardRef}
            className="relative w-full aspect-square p-6 flex flex-col justify-between overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, #0a0a0a 0%, #1a1a05 50%, #1a0010 100%)",
            }}
          >
            {/* Glow corners */}
            <div
              className="absolute top-0 left-0 w-40 h-40 rounded-full opacity-30 blur-3xl"
              style={{ background: "hsl(55 100% 55%)" }}
            />
            <div
              className="absolute bottom-0 right-0 w-40 h-40 rounded-full opacity-30 blur-3xl"
              style={{ background: "hsl(320 100% 55%)" }}
            />

            {/* Header */}
            <div className="relative flex items-center gap-2">
              <img src={mascot} alt="" width={40} height={40} className="w-10 h-10" />
              <div>
                <div
                  className="font-display text-2xl leading-none"
                  style={{
                    color: "hsl(55 100% 55%)",
                    textShadow: "0 0 12px hsl(55 100% 55% / 0.8)",
                    fontFamily: "'Bebas Neue', Impact, sans-serif",
                  }}
                >
                  IA.AHH!
                </div>
                <div className="text-[10px] text-white/60 font-mono">
                  100% confiança · 37% precisão
                </div>
              </div>
            </div>

            {/* Question */}
            <div className="relative">
              <div className="text-[10px] font-display tracking-widest text-white/50 mb-1">
                VOCÊ PERGUNTOU
              </div>
              <div className="text-xs text-white/80 line-clamp-2 font-mono">
                {question || "(sem pergunta)"}
              </div>
            </div>

            {/* Answer */}
            <div className="relative flex-1 flex items-center my-3">
              <div
                className="text-base leading-snug font-medium text-white"
                style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
              >
                "{answer.length > 220 ? answer.slice(0, 217) + "..." : answer}"
              </div>
            </div>

            {/* Footer */}
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xl">{persona.emoji}</span>
                <div>
                  <div
                    className="font-display text-sm leading-none"
                    style={{
                      color: "hsl(320 100% 65%)",
                      fontFamily: "'Bebas Neue', Impact, sans-serif",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {persona.name.toUpperCase()}
                  </div>
                  <div className="text-[9px] text-white/50 font-mono">
                    {persona.tagline}
                  </div>
                </div>
              </div>
              <div
                className="text-[9px] font-display tracking-[0.2em] px-2 py-0.5 border rounded-md"
                style={{
                  color: "hsl(55 100% 55%)",
                  borderColor: "hsl(55 100% 55% / 0.5)",
                }}
              >
                IAHH.DOJO
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={download}
              disabled={busy}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-display tracking-wider"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar PNG
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
