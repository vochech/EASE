// app/api/projects/create/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  const supabase = createServerClient();
  const body = await req.json(); // { name, description, memberIds: uuid[] }
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', (await supabase.auth.getUser()).data.user?.id).single();

  const { data: project, error } = await supabase
    .from('projects')
    .insert({ name: body.name, description: body.description, owner_id: profile.id })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // owner jako člen
  await supabase.from('project_members').insert({ project_id: project.id, user_id: profile.id, role: 'owner' });

  // přidat další členy
  if (Array.isArray(body.memberIds)) {
    const rows = body.memberIds.map((uid: string) => ({ project_id: project.id, user_id: uid, role: 'member' }));
    await supabase.from('project_members').insert(rows);
  }

  // seed chat kanálů
  await supabase.from('chat_channels').insert([
    { project_id: project.id, name: 'general', created_by: profile.id },
    { project_id: project.id, name: 'announcements', created_by: profile.id, is_private: false },
  ]);

  // kickoff poznámka (prázdný draft)
  await supabase.from('notes').insert({
    project_id: project.id, author_id: profile.id, title: 'Project Kickoff', content: '# Cíle\n- ...\n'
  });

  // kickoff event za týden, všichni členové jako attendees
  const starts = new Date(); starts.setDate(starts.getDate()+7); const ends = new Date(starts.getTime()+60*60*1000);
  const { data: evt } = await supabase.from('events').insert({
    project_id: project.id, creator_id: profile.id, title: 'Project Kickoff', starts_at: starts.toISOString(), ends_at: ends.toISOString()
  }).select('*').single();

  const { data: members } = await supabase.from('project_members').select('user_id').eq('project_id', project.id);
  if (evt && members) {
    await supabase.from('event_attendees').insert(members.map(m => ({ event_id: evt.id, user_id: m.user_id })));
  }

  // fronta pro AI on_project_create
  await supabase.from('ai_runs').insert({
    workflow_id: (await supabase.from('ai_workflows').select('id').eq('key','on_project_create').maybeSingle()).data?.id,
    trigger: 'project_created',
    input: { project_id: project.id }
  });

  return NextResponse.json({ project });
}
