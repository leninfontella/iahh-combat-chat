import { supabase } from "@/integrations/supabase/client";

export async function getSupabaseFunctionHeaders(): Promise<Record<string, string>> {
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!publishableKey) {
    throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY não configurada");
  }

  if (!session?.access_token) {
    throw new Error("Sessão expirada. Entre novamente.");
  }

  return {
    "Content-Type": "application/json",
    apikey: publishableKey,
    Authorization: `Bearer ${session.access_token}`,
  };
}
