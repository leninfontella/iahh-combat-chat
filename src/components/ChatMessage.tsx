import { cn } from "@/lib/utils";
import { STRIKES } from "@/lib/personas";
import mascot from "@/assets/iahh-mascot.png";
import { useMemo } from "react";
import { ImageDown, Smartphone, Image as ImageIcon } from "lucide-react";

interface Props {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  onShare?: () => void;
  onStory?: () => void;
  onMeme?: () => void;
  glitched?: boolean;
}

export const ChatMessage = ({ role, content, isStreaming, onShare, onStory, onMeme, glitched }: Props) => {
  const isUser = role === "user";
  const strike = useMemo(
    () => STRIKES[Math.floor(Math.random() * STRIKES.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [content.slice(0, 8)],
  );

  if (isUser) {
    return (
      <div className="flex justify-end animate-kick-in">
        <div className="max-w-[88%] sm:max-w-[80%] rounded-md border border-border bg-secondary px-2.5 py-1.5 sm:px-3 sm:py-2">
          <div className="text-[10px] uppercase font-display tracking-widest text-muted-foreground mb-1">
            Você
          </div>
          <div className="text-[13px] sm:text-sm whitespace-pre-wrap break-words">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 sm:gap-3 items-start animate-kick-in">
      <div className="shrink-0 w-9 h-9 sm:w-12 sm:h-12 rounded border border-primary/40 bg-card grid place-items-center overflow-hidden shadow-neon">
        <img
          src={mascot}
          alt="IAHH mascot"
          width={48}
          height={48}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0 max-w-[88%] sm:max-w-[85%]">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[10px] uppercase font-display tracking-widest neon-text">
            IAHH!
          </span>
          <span className="text-[10px] text-neon-magenta animate-flash-neon truncate">
            {strike.emoji} {strike.name}
          </span>
          {glitched && (
            <span className="text-[10px] font-display tracking-widest text-[hsl(var(--neon-cyan))] animate-glitch">
              ⚡ GLITCH
            </span>
          )}
        </div>
        <div
          className={cn(
            "rounded-md border border-primary/30 bg-card px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-card",
            isStreaming && "animate-pulse-glow",
          )}
        >
          <div className="text-[13px] sm:text-sm whitespace-pre-wrap leading-relaxed break-words">
            {content}
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
            )}
          </div>
        </div>
        {!isStreaming && content && (onShare || onStory || onMeme) && (
          <div className="mt-1 flex items-center gap-3 flex-wrap">
            {onShare && (
              <button
                onClick={onShare}
                className="text-[10px] font-display tracking-widest text-muted-foreground hover:text-neon-magenta transition-colors inline-flex items-center gap-1"
              >
                <ImageDown className="w-3 h-3" />
                CARD VIRAL
              </button>
            )}
            {onStory && (
              <button
                onClick={onStory}
                className="text-[10px] font-display tracking-widest text-muted-foreground hover:text-[hsl(var(--neon-yellow))] transition-colors inline-flex items-center gap-1"
              >
                <Smartphone className="w-3 h-3" />
                STORY 9:16
              </button>
            )}
            {onMeme && (
              <button
                onClick={onMeme}
                className="text-[10px] font-display tracking-widest text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                <ImageIcon className="w-3 h-3" />
                GERAR MEME
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
