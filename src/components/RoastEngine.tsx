import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download, Copy, Flame, Loader2, RotateCcw } from "lucide-react";
import {
  ROAST_TYPES,
  ROAST_INTENSITIES,
  type RoastType,
  type RoastIntensity,
  type RoastResult,
  type RoastDimension,
} from "@/lib/roastTypes";
import mascot from "@/assets/iahh-mascot.png";
import { getSupabaseFunctionHeaders } from "@/lib/supabaseFunctionHeaders";

const ROAST_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/roast`;
const NEON_Y = "#FFD700";
const NEON_M = "#FF00FF";

type Props = {
  open: boolean;
  onClose: () => void;
};

/* ─── BAR (animada) ─────────────────────────────────────── */
const RoastBar = ({
  dim,
  value,
  delay,
}: {
  dim: RoastDimension;
  value: number;
  delay: number;
}) => {
  const [width, setWidth] = useState(0);
  const pct = Math.min((value / dim.max) * 100, 100);
  const overflow = value > 100;

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay + 80);
    return () => clearTimeout(t);
  }, [pct, delay]);

  return (
    <div className="mb-3">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px] font-mono tracking-widest text-muted-foreground">
          {dim.label.toUpperCase()}
        </span>
        <span
          className="font-display text-sm tracking-wider"
          style={{
            color: dim.color,
            textShadow: `0 0 6px ${dim.color}88`,
          }}
        >
          {value}%{overflow ? " 🔥" : ""}
        </span>
      </div>
      <div className="h-2.5 bg-secondary rounded-md overflow-visible relative">
        <div
          className="h-full rounded-md transition-[width] duration-1000 ease-out relative"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${dim.color}66, ${dim.color})`,
            boxShadow: `0 0 8px ${dim.color}aa`,
          }}
        />
      </div>
    </div>
  );
};

/* ─── CANVAS RENDER (1080×1920) ─────────────────────────── */
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lh: number,
) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      ctx.fillText(line, x, y + lines * lh);
      line = w;
      lines++;
    } else line = t;
  }
  if (line) {
    ctx.fillText(line, x, y + lines * lh);
    lines++;
  }
  return lines;
}

async function renderCard(
  canvas: HTMLCanvasElement,
  type: RoastType,
  intensity: RoastIntensity,
  data: RoastResult,
) {
  await document.fonts.ready;
  const W = 1080;
  const H = 1920;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const accent = "#FF2222";

  // BG
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0a0000");
  bg.addColorStop(0.5, "#100008");
  bg.addColorStop(1, "#080000");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Glow
  const r1 = ctx.createRadialGradient(200, 300, 0, 200, 300, 800);
  r1.addColorStop(0, accent + "20");
  r1.addColorStop(1, "transparent");
  ctx.fillStyle = r1;
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = accent + "12";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Scanlines
  ctx.fillStyle = "rgba(0,0,0,0.07)";
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);

  // Border
  ctx.strokeStyle = accent + "66";
  ctx.lineWidth = 4;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 24;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.shadowBlur = 0;

  // Top bar
  ctx.fillStyle = accent;
  ctx.fillRect(24, 24, W - 48, 80);
  ctx.fillStyle = "#000";
  ctx.font = "bold 46px Impact, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    `⚠ IAHH! ROAST ENGINE  ·  ${intensity.label.toUpperCase()} ${intensity.emoji}`,
    W / 2,
    64,
  );

  // Logo
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = NEON_Y;
  ctx.shadowColor = NEON_Y;
  ctx.shadowBlur = 30;
  ctx.font = "bold 96px Impact, Arial, sans-serif";
  ctx.fillText("IA.AHH!", 60, 230);
  ctx.shadowBlur = 0;

  // Type badge
  ctx.fillStyle = accent + "22";
  rrect(ctx, W - 320, 140, 270, 70, 6);
  ctx.fill();
  ctx.strokeStyle = accent + "66";
  ctx.lineWidth = 1;
  rrect(ctx, W - 320, 140, 270, 70, 6);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = "bold 32px Impact, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${type.emoji} ${type.label.toUpperCase()}`, W - 185, 187);

  // Divider
  const dg = ctx.createLinearGradient(60, 0, W - 60, 0);
  dg.addColorStop(0, "transparent");
  dg.addColorStop(0.5, accent);
  dg.addColorStop(1, "transparent");
  ctx.strokeStyle = dg;
  ctx.lineWidth = 2;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(60, 260);
  ctx.lineTo(W - 60, 260);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Title
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "bold 60px Impact, Arial, sans-serif";
  const titleLines = wrapText(ctx, `"${data.titulo}"`, 60, 290, W - 120, 76);
  const afterTitle = 290 + titleLines * 76 + 24;

  // Roast paragraph
  ctx.fillStyle = "#FFD0D0";
  ctx.font = "36px 'Courier New', monospace";
  const roastLines = wrapText(ctx, data.roast, 60, afterTitle, W - 120, 54);
  const afterRoast = afterTitle + roastLines * 54 + 40;

  // Divider 2
  ctx.strokeStyle = accent + "44";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, afterRoast);
  ctx.lineTo(W - 60, afterRoast);
  ctx.stroke();

  // Análise header
  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 14;
  ctx.font = "bold 50px Impact, Arial, sans-serif";
  ctx.fillText("📊 ANÁLISE DIMENSIONAL", 60, afterRoast + 36);
  ctx.shadowBlur = 0;

  // Bars
  let barY = afterRoast + 120;
  const barH = 46;
  const barGap = 70;
  const barMaxW = W - 160;
  for (const dim of type.dimensions) {
    const val = data.dimensoes?.[dim.id] ?? 0;
    const fillPct = Math.min(val / dim.max, 1);

    ctx.fillStyle = "#AAAAAA";
    ctx.font = "30px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillText(dim.label.toUpperCase(), 60, barY - 4);
    ctx.fillStyle = dim.color;
    ctx.font = "bold 32px Impact, Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${val}%`, W - 60, barY - 4);

    ctx.fillStyle = "#1a1a1a";
    rrect(ctx, 60, barY + 6, barMaxW, barH, 4);
    ctx.fill();

    if (fillPct > 0) {
      const fillG = ctx.createLinearGradient(60, 0, 60 + barMaxW * fillPct, 0);
      fillG.addColorStop(0, dim.color + "99");
      fillG.addColorStop(1, dim.color);
      ctx.fillStyle = fillG;
      ctx.shadowColor = dim.color;
      ctx.shadowBlur = 12;
      rrect(ctx, 60, barY + 6, Math.max(barMaxW * fillPct, 8), barH, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    barY += barH + barGap;
  }

  // Total
  const total = Object.values(data.dimensoes || {}).reduce(
    (a, b) => a + (Number(b) || 0),
    0,
  );
  barY += 4;
  ctx.strokeStyle = accent + "44";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, barY);
  ctx.lineTo(W - 60, barY);
  ctx.stroke();
  ctx.fillStyle = "#666";
  ctx.font = "26px 'Courier New', monospace";
  ctx.textAlign = "left";
  ctx.fillText("PONTUAÇÃO TOTAL DE CAOS", 60, barY + 40);
  ctx.fillStyle = accent;
  ctx.font = "bold 44px Impact, Arial, sans-serif";
  ctx.shadowColor = accent;
  ctx.shadowBlur = 14;
  ctx.textAlign = "right";
  ctx.fillText(`${total} pts 🔥`, W - 60, barY + 46);
  ctx.shadowBlur = 0;

  // Veredicto
  ctx.textAlign = "left";
  ctx.fillStyle = NEON_Y;
  ctx.shadowColor = NEON_Y;
  ctx.shadowBlur = 18;
  ctx.font = "bold 50px Impact, Arial, sans-serif";
  ctx.fillText("⚡ VEREDICTO", 60, barY + 130);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "36px 'Courier New', monospace";
  const vLines = wrapText(ctx, data.veredicto || "", 60, barY + 190, W - 120, 50);

  // Conselho
  const adviceY = barY + 190 + vLines * 50 + 30;
  ctx.fillStyle = NEON_M;
  ctx.font = "bold 32px Impact, Arial, sans-serif";
  ctx.fillText("💡 CONSELHO", 60, adviceY);
  ctx.fillStyle = "#FFCCFF";
  ctx.font = "30px 'Courier New', monospace";
  wrapText(ctx, data.conselho || "", 60, adviceY + 44, W - 120, 44);

  // Mascot watermark
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((res) => {
      img.onload = () => res();
      img.onerror = () => res();
      img.src = mascot;
    });
    if (img.width) {
      ctx.globalAlpha = 0.12;
      ctx.drawImage(img, W - 380, H - 540, 360, 360);
      ctx.globalAlpha = 1;
    }
  } catch {
    // ignore
  }

  // Footer
  ctx.fillStyle = accent + "22";
  ctx.fillRect(24, H - 100, W - 48, 76);
  ctx.strokeStyle = accent + "55";
  ctx.lineWidth = 1;
  ctx.strokeRect(24, H - 100, W - 48, 76);
  ctx.fillStyle = NEON_Y;
  ctx.shadowColor = NEON_Y;
  ctx.shadowBlur = 12;
  ctx.font = "bold 38px Impact, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("🥋 iahh.app  ·  ROAST ENGINE  ·  IA COM EXCESSO DE CONFIANÇA", 44, H - 46);
  ctx.shadowBlur = 0;
}

/* ─── COMPONENTE ────────────────────────────────────────── */
export const RoastEngine = ({ open, onClose }: Props) => {
  const [type, setType] = useState<RoastType>(ROAST_TYPES[0]);
  const [intensity, setIntensity] = useState<RoastIntensity>(ROAST_INTENSITIES[1]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [result, setResult] = useState<RoastResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setResult(null);
      setText("");
      setType(ROAST_TYPES[0]);
      setIntensity(ROAST_INTENSITIES[1]);
    }
  }, [open]);

  const loadingMsgs = [
    `${type.roastEmoji} Analisando o desastre...`,
    "🔍 Encontrando pontos fracos...",
    "💀 Preparando o ataque...",
    "🔥 Calibrando o sarcasmo...",
    "⚡ Destruição em andamento...",
  ];

  const runRoast = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setLoadMsg(loadingMsgs[0]);
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % loadingMsgs.length;
      setLoadMsg(loadingMsgs[i]);
    }, 1100);

    try {
      const resp = await fetch(ROAST_URL, {
        method: "POST",
        headers: await getSupabaseFunctionHeaders(),
        body: JSON.stringify({
          systemPrompt: type.systemPrompt(text),
          intensityModifier: intensity.modifier,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        toast.error(err.error || "Falha no roast.");
        return;
      }
      const data: RoastResult = await resp.json();
      setResult(data);
      setTimeout(
        () => resultRef.current?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar roast.");
    } finally {
      clearInterval(timer);
      setLoading(false);
      setLoadMsg("");
    }
  };

  const exportPNG = async () => {
    if (!result || !canvasRef.current || exporting) return;
    setExporting(true);
    try {
      await renderCard(canvasRef.current, type, intensity, result);
      const url = canvasRef.current.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `iahh-roast-${type.id}-${Date.now()}.png`;
      a.click();
      toast.success("⬇ PNG baixado! Posta nos Stories 📱");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PNG.");
    } finally {
      setExporting(false);
    }
  };

  const copyImage = async () => {
    if (!result || !canvasRef.current || exporting) return;
    setExporting(true);
    try {
      await renderCard(canvasRef.current, type, intensity, result);
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) {
          setExporting(false);
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          toast.success("📋 Imagem copiada!");
        } catch {
          await exportPNG();
        }
        setExporting(false);
      }, "image/png");
    } catch {
      setExporting(false);
    }
  };

  const total = result
    ? Object.values(result.dimensoes || {}).reduce(
        (a, b) => a + (Number(b) || 0),
        0,
      )
    : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92dvh] overflow-y-auto bg-card border-primary/40">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-widest neon-text flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            IAHH! ROAST ENGINE
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground font-mono">
            Cole qualquer coisa. A IA destrói em 5 dimensões.
          </p>
        </DialogHeader>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Tipo */}
        <section>
          <div className="text-[10px] font-display tracking-widest text-muted-foreground mb-2">
            📋 O QUE VOCÊ QUER DESTRUIR?
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ROAST_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setType(t);
                  setResult(null);
                }}
                className={`text-[11px] font-mono px-2.5 py-1.5 rounded-md border transition-colors ${
                  type.id === t.id
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                }`}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* Intensidade */}
        <section>
          <div className="text-[10px] font-display tracking-widest text-muted-foreground mb-2">
            ⚡ NÍVEL DE DESTRUIÇÃO
          </div>
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-4 gap-1.5">
            {ROAST_INTENSITIES.map((i) => {
              const active = intensity.id === i.id;
              return (
                <button
                  key={i.id}
                  onClick={() => setIntensity(i)}
                  style={
                    active
                      ? {
                          borderColor: i.color,
                          color: i.color,
                          background: `${i.color}14`,
                        }
                      : undefined
                  }
                  className={`text-center px-2 py-2 rounded-md border transition-colors ${
                    active
                      ? ""
                      : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="text-lg leading-none">{i.emoji}</div>
                  <div className="text-[11px] font-display tracking-wider mt-1">
                    {i.label.toUpperCase()}
                  </div>
                  <div className="text-[9px] opacity-60 font-mono mt-0.5 leading-tight">
                    {i.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Input */}
        <section>
          <div className="flex justify-between items-center mb-2">
            <div className="text-[10px] font-display tracking-widest text-muted-foreground">
              {type.emoji} COLE SEU {type.label.toUpperCase()} AQUI
            </div>
            <span
              className={`text-[10px] font-mono ${
                text.length > 30 ? "text-muted-foreground" : "text-muted-foreground/40"
              }`}
            >
              {text.length} chars
            </span>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={type.placeholder}
            rows={8}
            disabled={loading}
            className="resize-none bg-input border-border focus-visible:ring-primary font-mono text-xs"
          />
        </section>

        {/* Botão */}
        <div className="flex justify-center">
          <Button
            onClick={runRoast}
            disabled={!text.trim() || loading}
            className="bg-gradient-to-r from-primary to-neon-magenta text-primary-foreground hover:opacity-90 font-display tracking-widest shadow-neon h-11 px-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {loadMsg || "DESTRUINDO..."}
              </>
            ) : (
              <>🔥 DESTRUIR {type.label.toUpperCase()} {intensity.emoji}</>
            )}
          </Button>
        </div>

        {/* Resultado */}
        {result && (
          <section
            ref={resultRef}
            className="space-y-3 animate-fade-in"
          >
            {/* Card título */}
            <div className="rounded border border-primary/40 bg-gradient-to-br from-[hsl(0_60%_8%)] to-[hsl(280_50%_6%)] p-4 shadow-neon">
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0">{type.roastEmoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-display tracking-widest text-primary mb-1">
                    {type.roastPersona.toUpperCase()} · {intensity.label.toUpperCase()} {intensity.emoji}
                  </div>
                  <div className="font-display text-lg sm:text-xl tracking-wide neon-text mb-2 leading-tight">
                    "{result.titulo}"
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed font-mono">
                    {result.roast}
                  </p>
                </div>
              </div>
            </div>

            {/* Bars */}
            <div className="rounded border border-border bg-card/50 p-4">
              <div className="text-[10px] font-display tracking-widest text-muted-foreground mb-3">
                📊 ANÁLISE DIMENSIONAL
              </div>
              {type.dimensions.map((dim, i) => (
                <RoastBar
                  key={dim.id}
                  dim={dim}
                  value={Number(result.dimensoes?.[dim.id] ?? 0)}
                  delay={i * 150}
                />
              ))}
              <div className="border-t border-border pt-3 mt-2 flex justify-between items-center">
                <span className="text-[10px] font-mono tracking-widest text-muted-foreground">
                  PONTUAÇÃO TOTAL DE CAOS
                </span>
                <span className="font-display text-2xl text-primary neon-text">
                  {total} pts 🔥
                </span>
              </div>
            </div>

            {/* Veredicto + conselho */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded border border-[hsl(var(--neon-yellow)/0.4)] bg-[hsl(var(--neon-yellow)/0.05)] p-3">
                <div className="text-[10px] font-display tracking-widest text-[hsl(var(--neon-yellow))] mb-1">
                  ⚡ VEREDICTO
                </div>
                <div className="text-xs text-foreground/90 font-mono leading-relaxed">
                  {result.veredicto}
                </div>
              </div>
              <div className="rounded border border-neon-magenta/40 bg-neon-magenta/5 p-3">
                <div className="text-[10px] font-display tracking-widest text-neon-magenta mb-1">
                  💡 CONSELHO
                </div>
                <div className="text-xs text-foreground/90 font-mono leading-relaxed">
                  {result.conselho}
                </div>
              </div>
            </div>

            {/* Export */}
            <div className="flex flex-wrap gap-2 items-center pt-1">
              <span className="text-[10px] font-display tracking-widest text-muted-foreground mr-auto">
                📱 EXPORTAR ROAST
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={exportPNG}
                disabled={exporting}
                className="border-primary/60 text-primary hover:bg-primary/10 h-8 text-[11px] font-display tracking-wider"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                PNG 1080×1920
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={copyImage}
                disabled={exporting}
                className="border-[hsl(var(--neon-yellow)/0.6)] text-[hsl(var(--neon-yellow))] hover:bg-[hsl(var(--neon-yellow)/0.1)] h-8 text-[11px] font-display tracking-wider"
              >
                <Copy className="w-3.5 h-3.5 mr-1" />
                COPIAR IMG
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={runRoast}
                disabled={loading}
                className="h-8 text-[11px] font-display tracking-wider text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                NOVO
              </Button>
            </div>
            <div className="text-center text-[9px] text-muted-foreground/60 font-mono pt-1">
              🥋 Resultado gerado por IA satírica · Não leve a sério · Talvez leve um pouco
            </div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
};
