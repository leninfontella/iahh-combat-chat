import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Share2, Shuffle } from "lucide-react";
import { toast } from "sonner";
import {
  MEME_TEMPLATES,
  pickTemplate,
  buildCaptions,
  type MemeTemplate,
} from "@/lib/memeTemplates";

interface Props {
  open: boolean;
  onClose: () => void;
  question: string;
  answer: string;
}

export const MemeGenerator = ({ open, onClose, question, answer }: Props) => {
  const auto = useMemo(() => pickTemplate(answer), [answer]);
  const [tplId, setTplId] = useState<string>(auto.id);
  const tpl: MemeTemplate =
    MEME_TEMPLATES.find((t) => t.id === tplId) ?? auto;

  const [captions, setCaptions] = useState<string[]>(() =>
    buildCaptions(question, answer, auto.slots.length),
  );
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const switchTpl = (id: string) => {
    setTplId(id);
    const t = MEME_TEMPLATES.find((x) => x.id === id)!;
    setCaptions(buildCaptions(question, answer, t.slots.length));
  };

  // Largura visual fixa, altura mantém aspect ratio
  const VIEW_W = 380;
  const VIEW_H = (tpl.height / tpl.width) * VIEW_W;
  const EXPORT_W = 1080;

  const exportPng = async (download: boolean) => {
    if (!cardRef.current) return null;
    setBusy(true);
    try {
      const node = cardRef.current;
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: EXPORT_W / node.offsetWidth,
        backgroundColor: "#000",
        width: node.offsetWidth,
        height: node.offsetHeight,
      });
      if (download) {
        const a = document.createElement("a");
        a.download = `iahh-meme-${tpl.id}-${Date.now()}.png`;
        a.href = dataUrl;
        a.click();
        toast.success("Meme baixado! 🔥 Posta no Twitter/Reddit");
      }
      return dataUrl;
    } catch (e) {
      console.error(e);
      toast.error("Falha ao gerar meme.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const url = await exportPng(false);
    if (!url) return;
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], "iahh-meme.png", { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "IAHH! Meme",
          text: "feito no iahh.app 🔥",
        });
      } else {
        exportPng(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const cycleTemplate = () => {
    const idx = MEME_TEMPLATES.findIndex((t) => t.id === tpl.id);
    switchTpl(MEME_TEMPLATES[(idx + 1) % MEME_TEMPLATES.length].id);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[440px] p-0 bg-card border-primary/40 max-h-[calc(100dvh-1rem)] sm:max-h-[92dvh] overflow-y-auto">
        <DialogHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-display tracking-widest neon-text text-base">
            🖼️ MEME · {tpl.name.toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-3">
          {/* Template picker */}
          <div className="flex gap-1.5 flex-wrap">
            {MEME_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => switchTpl(t.id)}
                className={`text-[10px] font-display tracking-widest px-2 py-1 rounded-md border transition-colors ${
                  t.id === tpl.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.name}
                {t.id === auto.id && (
                  <span className="ml-1 text-[8px] opacity-70">AUTO</span>
                )}
              </button>
            ))}
          </div>

          {/* Canvas */}
          <div className="mx-auto" style={{ width: VIEW_W }}>
            <div
              ref={cardRef}
              className="relative overflow-hidden bg-black"
              style={{ width: VIEW_W, height: VIEW_H }}
            >
              <img
                src={tpl.image}
                alt={tpl.name}
                width={tpl.width}
                height={tpl.height}
                crossOrigin="anonymous"
                className="absolute inset-0 w-full h-full object-cover select-none"
                draggable={false}
              />
              {tpl.slots.map((slot, i) => {
                // fontSize do template é referente a 1080px → escala pra view
                const fs = (slot.fontSize ?? 32) * (VIEW_W / EXPORT_W);
                return (
                  <div
                    key={i}
                    className="absolute flex items-center justify-center text-center"
                    style={{
                      left: `${slot.x}%`,
                      top: `${slot.y}%`,
                      width: `${slot.w}%`,
                      height: `${slot.h}%`,
                      color: slot.color ?? "#fff",
                      fontSize: `${fs}px`,
                      lineHeight: 1.05,
                      fontWeight: 800,
                      fontFamily:
                        "'Impact', 'Bebas Neue', Anton, sans-serif",
                      letterSpacing: "0.01em",
                      textShadow: slot.stroke
                        ? `-2px -2px 0 ${slot.stroke}, 2px -2px 0 ${slot.stroke}, -2px 2px 0 ${slot.stroke}, 2px 2px 0 ${slot.stroke}`
                        : undefined,
                      background: slot.bg,
                      padding: slot.bg ? "4px 6px" : undefined,
                      textTransform: "uppercase",
                      overflow: "hidden",
                    }}
                  >
                    <span style={{ display: "block" }}>
                      {captions[i] ?? ""}
                    </span>
                  </div>
                );
              })}

              {/* Watermark */}
              <div
                className="absolute right-1.5 bottom-1.5 px-1.5 py-0.5 rounded-md font-display tracking-[0.3em]"
                style={{
                  fontSize: 10,
                  color: "hsl(55 100% 55%)",
                  background: "rgba(0,0,0,0.7)",
                  border: "1px solid hsl(55 100% 55% / 0.6)",
                }}
              >
                IAHH.APP
              </div>
            </div>
          </div>

          {/* Captions edit */}
          <div className="space-y-1.5">
            {captions.map((c, i) => (
              <input
                key={i}
                value={c}
                onChange={(e) => {
                  const next = [...captions];
                    next[i] = e.target.value;
                    setCaptions(next);
                }}
                placeholder={`Texto ${i + 1}`}
                className="w-full bg-input border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary"
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => exportPng(true)}
              disabled={busy}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-display tracking-wider"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar
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
            <Button
              onClick={cycleTemplate}
              variant="outline"
              size="icon"
              className="border-border"
              title="Trocar template"
            >
              <Shuffle className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono text-center">
            Template auto: <span className="text-foreground">{auto.name}</span> · Export 1080px
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
