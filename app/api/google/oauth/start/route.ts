import { OAuth2Client } from 'google-auth-library';

const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];

export async function GET() {
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );

  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
  });

  return Response.redirect(url, 302);
}
