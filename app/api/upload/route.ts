import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const path = `${crypto.randomUUID()}/recording.webm`
  const sb = supabaseAdmin()
  const { error } = await sb.storage.from('meetings').upload(path, file, {
    contentType: file.type || 'video/webm',
    upsert: true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ path })
}
