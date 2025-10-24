// app/api/calendar/ics/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createEvents, EventAttributes } from 'ics'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function toUtcArray(iso: string): [number, number, number, number, number] {
  const d = new Date(iso)
  return [
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  ]
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return new NextResponse('Missing token', { status: 400 })
  }
  if (!supabaseUrl || !supabaseServiceKey) {
    return new NextResponse('Server misconfigured', { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  // 1) token -> user_id
  const { data: t, error: tokenErr } = await supabase
    .from('personal_tokens')
    .select('user_id')
    .eq('token', token)
    .maybeSingle()

  if (tokenErr || !t) return new NextResponse('Invalid token', { status: 404 })
  const userId = t.user_id as string

  // 2) events, kde je uživatel účastník (inner join na event_attendees)
  const { data: rows, error: evErr } = await supabase
    .from('events')
    .select(
      `
      id,
      title,
      description,
      location,
      starts_at,
      ends_at,
      project:projects(name),
      event_attendees!inner(user_id)
    `
    )
    .eq('event_attendees.user_id', userId)
    .order('starts_at', { ascending: true })

  if (evErr) return new NextResponse('Query error', { status: 500 })
  const events = rows ?? []

  // 3) map → ICS záznamy
  const icsEvents: EventAttributes[] = events.map((e: any) => ({
    start: toUtcArray(e.starts_at),
    end: toUtcArray(e.ends_at),
    title: e.title ?? '(bez názvu)',
    description:
      (e.description ?? '') +
      (e.project?.name ? `\nProjekt: ${e.project.name}` : ''),
    location: e.location ?? '',
    status: 'CONFIRMED',
    uid: e.id, // unikátní ID události
    productId: 'ease-app', // libovolný identifikátor aplikace
    // volitelné: organizer, url, alarms, categories…
  }))

  const { error, value } = createEvents(icsEvents)
  if (error || !value) {
    console.error(error)
    return new NextResponse('ICS generation error', { status: 500 })
  }

  return new NextResponse(value, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="calendar.ics"',
      'Cache-Control': 'max-age=0, s-maxage=300', // CDN může cachovat 5 min
    },
  })
}
