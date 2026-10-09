import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import mascot from "@/assets/iahh-mascot.png";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate("/", { replace: true });
  }, [user, authLoading, navigate]);

  // Modo teste: qualquer email + qualquer senha entra.
  // Trick: derivamos um email "interno" único por (email+senha) para que
  // cada combinação seja sempre o MESMO usuário no backend, e combinações
  // novas criem conta nova automaticamente. Senha interna é fixa.
  const buildInternalCreds = (rawEmail: string, rawPassword: string) => {
    const [local, domain] = rawEmail.toLowerCase().trim().split("@");
    // hash simples e estável da senha (não é segurança real — é base de testes)
    let h = 0;
    for (let i = 0; i < rawPassword.length; i++) {
      h = (h * 31 + rawPassword.charCodeAt(i)) >>> 0;
    }
    const tag = h.toString(36);
    return {
      email: `${local}+test-${tag}@${domain || "dojo.test"}`,
      password: `dojo-test-${tag}-fixed-pw!`,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      const creds = buildInternalCreds(email, password);

      const { error: signInError } = await supabase.auth.signInWithPassword(creds);

      if (signInError) {
        // Provavelmente conta ainda não existe — cria e loga.
        const { error: signUpError } = await supabase.auth.signUp({
          ...creds,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError && !signUpError.message.toLowerCase().includes("already")) {
          throw signUpError;
        }
        const { error: retryError } = await supabase.auth.signInWithPassword(creds);
        if (retryError) throw retryError;
      }

      toast.success("Bem-vindo ao dojo, gafanhoto.");
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] grid place-items-center bg-gradient-hero scanlines px-4 py-8 relative">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src={mascot}
            alt="IAHH! mascote"
            width={80}
            height={80}
            className="w-16 h-16 mx-auto drop-shadow-[0_0_20px_hsl(var(--neon-yellow)/0.5)] animate-kick-in"
          />
          <h1 className="font-display text-3xl sm:text-4xl neon-text animate-flash-neon mt-2">
            IA.AHH!
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Entre no dojo. Tome porrada verbal.
          </p>
        </div>

        {/* Card */}
        <div className="strike-card rounded-md p-5 sm:p-6 space-y-4">
          <div className="text-center">
            <h2 className="font-display text-lg tracking-widest neon-text-magenta">
              ACESSAR DOJO
            </h2>
            <p className="text-[11px] text-muted-foreground font-mono mt-1">
              Modo teste — qualquer email e senha entram.
            </p>
          </div>

          {/* Email/senha */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] font-display tracking-widest text-muted-foreground">
                EMAIL
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@dojo.com"
                disabled={busy}
                className="bg-input border-border font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[11px] font-display tracking-widest text-muted-foreground">
                SENHA
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={busy}
                className="bg-input border-border font-mono"
              />
            </div>

            <Button
              type="submit"
              disabled={busy || !email || !password}
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-display tracking-widest shadow-neon"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "ENTRAR NO DOJO"}
            </Button>
          </form>
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-4 font-mono">
          Ao entrar, você aceita ser zoado por uma IA. 🥋
        </p>

        <div className="text-center mt-2">
          <Link to="/" className="text-[10px] text-muted-foreground hover:text-foreground font-mono underline">
            voltar
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
