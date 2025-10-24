// app/api/google/calendar/query/route.ts
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const timeMin = url.searchParams.get('timeMin'); // ISO string
    const timeMax = url.searchParams.get('timeMax'); // ISO string
    const maxResults = Number(url.searchParams.get('maxResults') ?? 250);
    const tz = url.searchParams.get('tz') ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (!timeMin || !timeMax) {
      return Response.json({ error: 'Missing timeMin/timeMax' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const USER_ID = 'a6851efe-c2dc-4ecc-bf0f-8734c8c29d2c';

    const { data: tok } = await supabase
      .from('user_google_tokens')
      .select('*')
      .eq('user_id', USER_ID)
      .single();

    if (!tok?.access_token) {
      return Response.json({ error: 'Not connected to Google' }, { status: 400 });
    }

    const oAuth2 = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.GOOGLE_REDIRECT_URI!
    );
    oAuth2.setCredentials({
      access_token: tok.access_token || undefined,
      refresh_token: tok.refresh_token || undefined,
      scope: tok.scope || undefined,
      token_type: tok.token_type || undefined,
      expiry_date: tok.expiry_date ? new Date(tok.expiry_date).getTime() : undefined,
    });

    const calendar = google.calendar({ version: 'v3', auth: oAuth2 });

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
      timeZone: tz,
      // showDeleted: false,
    });

    return Response.json({ events: res.data.items ?? [], tz }, { status: 200 });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? 'Calendar error' }, { status: 500 });
  }
}
