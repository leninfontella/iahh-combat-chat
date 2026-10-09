import { Chat } from "@/components/Chat";
import mascot from "@/assets/iahh-mascot.png";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

const TAGLINES = [
  "Respostas poderosas. Nem sempre corretas.",
  "100% confiança. 37% precisão.",
  "A IA que responde antes de pensar.",
  "Powered by Gemini. Corrompida pelo caos.",
];

const Index = () => {
  const { user, signOut } = useAuth();
  const handleLogout = async () => {
    await signOut();
    toast("Saiu do dojo. Volte logo, gafanhoto.");
  };

  return (
    <div className="h-[100dvh] flex flex-col relative scanlines bg-gradient-hero overflow-hidden">
      <div className="flex-1 flex flex-col w-full px-2 sm:px-4 md:px-8 py-2 sm:py-4 md:py-6 relative z-10 min-h-0">
        {/* Hero — compacto, com mascote menor no mobile */}
        <header className="flex items-center gap-2 sm:gap-3 md:gap-5 mb-2 sm:mb-4 shrink-0">
          <img
            src={mascot}
            alt="IAHH! mascote chutando"
            width={140}
            height={140}
            className="w-10 h-10 sm:w-16 sm:h-16 md:w-20 md:h-20 drop-shadow-[0_0_20px_hsl(var(--neon-yellow)/0.5)] animate-kick-in shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl sm:text-4xl md:text-5xl leading-none neon-text animate-flash-neon">
              IA.AHH!
            </h1>
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1 truncate">
              {TAGLINES[Math.floor(Math.random() * TAGLINES.length)]}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-display tracking-widest px-2 py-0.5 border border-primary/40 text-primary rounded-md">
                v0.1 BETA CAÓTICA
              </span>
              {user?.email && (
                <span className="text-[10px] text-muted-foreground font-mono mt-1 truncate max-w-[200px]">
                  {user.email}
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              title="Sair do dojo"
              className="text-[10px] font-display tracking-widest px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-neon-magenta hover:border-neon-magenta/60 transition-colors inline-flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">SAIR</span>
            </button>
          </div>
        </header>

        {/* Chat — ocupa todo o espaço restante */}
        <main className="strike-card rounded-md p-2 sm:p-3 md:p-5 flex-1 min-h-0">
          <Chat />
        </main>

        {/* Footer minimalista — escondido em telas muito pequenas pra ganhar espaço */}
        <footer className="hidden sm:block mt-2 text-center text-[10px] text-muted-foreground font-mono shrink-0">
          🥋 Treinado em má-fé · <span className="neon-text-magenta">IAHH! Dojo</span>
        </footer>
      </div>
    </div>
  );
};

export default Index;
