import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { meetingId, mediaPath } = await req.json()
  const sb = supabaseAdmin()

  const mockText = `Decisions: redesign HP, krátké video v hero, nasadit měření CTA.`

  const { data, error } = await sb
    .from('transcripts')
    .insert({ meeting_id: meetingId, media_path: mediaPath, text: mockText })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transcriptId: data.id })
}
