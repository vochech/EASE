import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { meetingId, tasks, autoDelete } = await req.json()
  const sb = supabaseAdmin()

  if (Array.isArray(tasks) && tasks.length) {
    const rows = tasks.map((t: any) => ({
      meeting_id: meetingId,
      title: t.title,
      department: t.department ?? null,
      seniority: t.seniority ?? null,
      est_hours: t.estHours ?? null,
    }))
    const { error } = await sb.from('tasks').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (autoDelete) {
    const { data: trans, error } = await sb
      .from('transcripts')
      .select('media_path')
      .eq('meeting_id', meetingId)

    if (!error && trans?.length) {
      await sb.storage.from('meetings').remove(
        trans.map((x) => x.media_path).filter(Boolean)
      )
    }
  }

  return NextResponse.json({ ok: true })
}
