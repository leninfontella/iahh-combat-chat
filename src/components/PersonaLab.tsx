import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FlaskConical, Trash2, Share2, Plus, Play } from "lucide-react";
import { toast } from "sonner";
import {
  type CustomPersona,
  loadCustomPersonas,
  upsertCustomPersona,
  deleteCustomPersona,
  encodePersonaToLink,
  newCustomId,
} from "@/lib/customPersonas";

interface Props {
  open: boolean;
  onClose: () => void;
  onUse: (p: CustomPersona) => void;
  importDraft?: CustomPersona | null;
}

const EMOJI_OPTIONS = ["🧪", "👻", "🤖", "🦄", "🐙", "👽", "🧙", "🦖", "🍕", "🎃", "🪦", "🦠"];

const empty = (): CustomPersona => ({
  id: newCustomId(),
  name: "",
  emoji: "🧪",
  style: "",
  traits: ["", "", ""],
  catchphrase: "",
  createdAt: Date.now(),
});

export const PersonaLab = ({ open, onClose, onUse, importDraft }: Props) => {
  const [list, setList] = useState<CustomPersona[]>([]);
  const [draft, setDraft] = useState<CustomPersona>(empty());
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (open) setList(loadCustomPersonas());
  }, [open]);

  useEffect(() => {
    if (importDraft) {
      setDraft(importDraft);
      setEditing(true);
    }
  }, [importDraft]);

  const reset = () => {
    setDraft(empty());
    setEditing(false);
  };

  const valid =
    draft.name.trim().length >= 2 &&
    draft.style.trim().length >= 5 &&
    draft.catchphrase.trim().length >= 2 &&
    draft.traits.every((t) => t.trim().length >= 2);

  const save = () => {
    if (!valid) {
      toast.error("Preencha tudo (nome, estilo, 3 traços, catchphrase).");
      return;
    }
    const updated = upsertCustomPersona(draft);
    setList(updated);
    toast.success(`Persona "${draft.name}" salva no laboratório.`);
    reset();
  };

  const remove = (id: string) => {
    setList(deleteCustomPersona(id));
    toast("Persona descartada.");
  };

  const share = async (p: CustomPersona) => {
    const link = encodePersonaToLink(p);
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado!", { description: "Cole pra desafiar alguém." });
    } catch {
      prompt("Copie o link:", link);
    }
  };

  const use = (p: CustomPersona) => {
    onUse(p);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-card border-neon-magenta/40 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-widest text-neon-magenta flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            LABORATÓRIO DE PERSONAS
          </DialogTitle>
        </DialogHeader>

        {/* Builder */}
        <div className="space-y-3 border border-border rounded p-3 bg-background/40">
          <div className="text-[10px] font-display tracking-widest text-muted-foreground">
            {editing ? "EDITAR" : "CRIAR NOVA"}
          </div>

          <div className="flex gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-muted-foreground">EMOJI</label>
              <select
                value={draft.emoji}
                onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
                className="bg-input border border-border rounded h-10 px-2 text-lg"
              >
                {EMOJI_OPTIONS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] font-mono text-muted-foreground">NOME</label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value.slice(0, 40) })}
                placeholder="Ex: Vovó Punk"
                className="bg-input"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-muted-foreground">
              ESTILO (como ela fala / vibe geral)
            </label>
            <Textarea
              value={draft.style}
              onChange={(e) => setDraft({ ...draft, style: e.target.value.slice(0, 240) })}
              placeholder="Ex: Fala como uma vovó dos anos 80 que ouviu muito Ramones e detesta tecnologia."
              rows={2}
              className="bg-input resize-none font-mono text-sm"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-[10px] font-mono text-muted-foreground">3 CARACTERÍSTICAS</label>
            {draft.traits.map((t, i) => (
              <Input
                key={i}
                value={t}
                onChange={(e) => {
                  const tr = [...draft.traits] as [string, string, string];
                  tr[i] = e.target.value.slice(0, 80);
                  setDraft({ ...draft, traits: tr });
                }}
                placeholder={`Traço #${i + 1} (ex: sempre cita banda obscura)`}
                className="bg-input"
              />
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-muted-foreground">CATCHPHRASE</label>
            <Input
              value={draft.catchphrase}
              onChange={(e) => setDraft({ ...draft, catchphrase: e.target.value.slice(0, 80) })}
              placeholder='Ex: "no meu tempo o erro era em COBOL, gafanhoto."'
              className="bg-input"
            />
          </div>

          <div className="flex gap-2 justify-end">
            {editing && (
              <Button variant="outline" size="sm" onClick={reset}>
                Cancelar
              </Button>
            )}
            <Button
              size="sm"
              onClick={save}
              disabled={!valid}
              className="bg-neon-magenta text-background hover:bg-neon-magenta/80 font-display tracking-wider"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {editing ? "SALVAR" : "CRIAR"}
            </Button>
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-2">
          <div className="text-[10px] font-display tracking-widest text-muted-foreground">
            MINHAS PERSONAS ({list.length})
          </div>
          {list.length === 0 && (
            <div className="text-xs text-muted-foreground font-mono italic">
              Nenhuma ainda. Crie a primeira aí em cima.
            </div>
          )}
          {list.map((p) => (
            <div
              key={p.id}
              className="border border-border rounded p-2 flex items-center gap-2 bg-background/40"
            >
              <div className="text-2xl">{p.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-sm truncate">{p.name}</div>
                <div className="text-[10px] text-muted-foreground truncate font-mono">
                  "{p.catchphrase}"
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => use(p)}
                className="border-primary/60 text-primary hover:bg-primary/10 h-8"
              >
                <Play className="w-3 h-3 mr-1" /> USAR
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => share(p)}
                className="border-[hsl(var(--neon-cyan)/0.6)] text-[hsl(var(--neon-cyan))] h-8"
                title="Compartilhar"
              >
                <Share2 className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => remove(p.id)}
                className="border-destructive/40 text-destructive h-8"
                title="Excluir"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
