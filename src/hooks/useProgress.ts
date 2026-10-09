import { useCallback, useEffect, useRef, useState } from "react";
import {
  BELTS,
  beltForXp,
  loadProgress,
  saveProgress,
  resetProgress as resetStored,
  type Progress,
} from "@/lib/belts";
import { toast } from "sonner";

export const useProgress = () => {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const lastBeltRef = useRef<string>(progress.beltId);

  useEffect(() => {
    saveProgress(progress);
    const newBelt = beltForXp(progress.xp);
    if (newBelt.id !== lastBeltRef.current) {
      // promotion!
      const prevIdx = BELTS.findIndex((b) => b.id === lastBeltRef.current);
      const newIdx = BELTS.findIndex((b) => b.id === newBelt.id);
      if (newIdx > prevIdx) {
        toast.success(`🥋 PROMOÇÃO! Você ganhou a ${newBelt.name} ${newBelt.emoji}`, {
          description: newBelt.motto,
          duration: 6000,
        });
      }
      lastBeltRef.current = newBelt.id;
    }
  }, [progress]);

  const addXp = useCallback(
    (amount: number, kind?: "message" | "worsen" | "reset") => {
      setProgress((p) => ({
        ...p,
        xp: p.xp + amount,
        messages: kind === "message" ? p.messages + 1 : p.messages,
        worsens: kind === "worsen" ? p.worsens + 1 : p.worsens,
        resets: kind === "reset" ? p.resets + 1 : p.resets,
        beltId: beltForXp(p.xp + amount).id,
      }));
    },
    [],
  );

  const reset = useCallback(() => {
    const fresh = resetStored();
    lastBeltRef.current = fresh.beltId;
    setProgress(fresh);
    toast("Dojo zerado. Volte do zero, gafanhoto.");
  }, []);

  return { progress, addXp, reset, belt: beltForXp(progress.xp) };
};
