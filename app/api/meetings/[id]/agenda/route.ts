// app/api/meetings/[id]/agenda/route.ts
import { createClient } from '@supabase/supabase-js';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const meetingId = params.id; // /meetings/:id/agenda
    const body = await req.json().catch(() => ({}));
    const { content, position } = body || {};

    if (!meetingId) {
      return Response.json({ error: 'Missing meetingId in URL' }, { status: 400 });
    }
    if (!content || typeof content !== 'string') {
      return Response.json({ error: 'Missing content' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) {
      return Response.json({ error: 'Server misconfigured (Supabase env missing)' }, { status: 500 });
    }
    const supabase = createClient(url, serviceKey);

    const { data, error } = await supabase
      .from('meeting_agenda')
      .insert([{ meeting_id: meetingId, content, position: position ?? 1 }])
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ agenda_item: data }, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
