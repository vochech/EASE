import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    if (!code) return Response.json({ error: 'Missing code' }, { status: 400 });

    const oAuth2 = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.GOOGLE_REDIRECT_URI!
    );

    const { tokens } = await oAuth2.getToken(code);

    // TODO: později získáme uživatele z Session; teď vlož TVÉ UUID:
    const USER_ID = 'a6851efe-c2dc-4ecc-bf0f-8734c8c29d2c';

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase
      .from('user_google_tokens')
      .upsert({
        user_id: USER_ID,
        access_token: tokens.access_token ?? null,
        refresh_token: tokens.refresh_token ?? null,
        scope: tokens.scope ?? null,
        token_type: tokens.token_type ?? null,
        expiry_date: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
      });

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return new Response(
      `<html><body>Google Calendar propojen! Můžeš zavřít okno.</body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (e: any) {
    return Response.json({ error: e?.message ?? 'OAuth error' }, { status: 500 });
  }
}
