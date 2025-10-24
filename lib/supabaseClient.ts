import { createClient } from "@supabase/supabase-js";

// Client pro FRONTEND (anon key). Na serveru můžeš použít service role,
// ale do FE *nikdy* neposílej SERVICE_ROLE_KEY.
export const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true, // FE si drží session v localStorage
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
