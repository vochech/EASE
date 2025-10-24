import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // 1) Načtení a kontrola vstupu
    const body = await req.json().catch(() => ({}));
    const { project_id, media_type, title } = body || {};

    if (!project_id) {
      return Response.json({ error: 'Missing project_id' }, { status: 400 });
    }
    if (!media_type) {
      return Response.json({ error: 'Missing media_type' }, { status: 400 });
    }

    // 2) Klient do DB – serverová identita (Service Role)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) {
      return Response.json({ error: 'Server misconfigured (Supabase env missing)' }, { status: 500 });
    }

    const supabase = createClient(url, serviceKey);

    // 3) Vložení meetingu
    const { data, error } = await supabase
      .from('meetings')
      .insert([{ project_id, media_type, title: title ?? null }])
      .select()
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // 4) Hotovo
    return Response.json({ meeting: data }, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
