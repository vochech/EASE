import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { transcriptId } = await req.json()
  const sb = supabaseAdmin()
  const { data: t, error } = await sb
    .from('transcripts')
    .select('meeting_id, text')
    .eq('id', transcriptId)
    .single()

  if (error || !t) return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 })

  return NextResponse.json({
    meetingId: t.meeting_id,
    summary: 'Shodli jsme se: redesign HP, krátké video v hero, nasadit CTA tracking.',
    tasks: [
      { title: 'Content: outline pro landing', department: 'Content', seniority: 'Mid',  estHours: 3 },
      { title: 'Design: Figma hero + video slot', department: 'Design', seniority: 'Mid', estHours: 5 },
      { title: 'Engineering: implementovat CTA tracking', department: 'Engineering', seniority: 'Junior', estHours: 2 },
    ],
  })
}
