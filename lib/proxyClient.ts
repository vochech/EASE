import { supa } from "@/lib/supabaseClient";

/**
 * Volání proxy API route (/api/supabase-proxy) tak,
 * aby RLS vidělo auth.uid() aktuálního uživatele.
 * Vrací .data z proxy (při chybě vyhodí Error).
 */
export async function proxyFetch<T = unknown>(body: any): Promise<T> {
  // Vytáhneme access token ze session (FE je přihlášený přes Supabase)
  const { data: { session } } = await supa.auth.getSession();

  const res = await fetch("/api/supabase-proxy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Public proxy secret – slabší token pro FE → API (NE service role!)
      "x-proxy-secret": process.env.NEXT_PUBLIC_PROXY_SECRET as string,
      // Předáme uživatelské JWT, aby RLS (auth.uid()) fungovalo
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || "Proxy error");
  }
  return json.data as T;
}
