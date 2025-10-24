import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  const sb = createClient(url, key);

  // meetings starší než 24h a mají media_path
  const { data: m } = await sb.rpc("cleanup_candidates"); // viz níže; nebo udělej SELECT zde
  if (!m || m.length === 0) return NextResponse.json({ ok:true, removed: 0 });

  for (const row of m) {
    if (row.media_path) await sb.storage.from("media").remove([row.media_path]);
    await sb.from("transcripts").delete().eq("meeting_id", row.id);
    await sb.from("meetings").delete().eq("id", row.id);
  }
  return NextResponse.json({ ok:true, removed: m.length });
}
