import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  const { meetingId, text } = await req.json();
  if (!meetingId || !text) return NextResponse.json({ error: "missing" }, { status: 400 });

  const sb = createClient(url, key);

  // jednoduchý „transkript“ jako jeden segment
  const segments = [{ start: 0, end: Math.max(1, Math.ceil(text.length / 10)), speaker: "S1", text }];

  const { data, error } = await sb.from("transcripts")
    .insert({ meeting_id: meetingId, segments })
    .select("id").single();

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ transcriptId: data.id });
}
