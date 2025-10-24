// app/api/meetings/[id]/agenda/[itemId]/route.ts
import { createClient } from '@supabase/supabase-js';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string, itemId: string } }
) {
  try {
    const { id: meetingId, itemId } = params;
    const body = await req.json().catch(() => ({}));
    const { content, position } = body || {};

    if (!meetingId || !itemId) {
      return Response.json({ error: 'Missing meetingId or itemId' }, { status: 400 });
    }
    if (content == null && position == null) {
      return Response.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) {
      return Response.json({ error: 'Server misconfigured (Supabase env missing)' }, { status: 500 });
    }
    const supabase = createClient(url, serviceKey);

    const update: any = {};
    if (content != null) update.content = content;
    if (position != null) update.position = position;

    const { data, error } = await supabase
      .from('meeting_agenda')
      .update(update)
      .eq('id', itemId)
      .eq('meeting_id', meetingId)
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ agenda_item: data }, { status: 200 });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
