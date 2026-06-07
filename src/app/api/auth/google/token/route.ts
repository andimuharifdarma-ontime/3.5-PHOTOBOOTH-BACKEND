import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const COOKIE_NAME = 'google_oauth_refresh_token';

/**
 * One-time retrieval of OAuth refresh token stored in httpOnly cookie.
 * Admin session required. Cookie is cleared after read.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: 'No pending refresh token' }, { status: 404 });
  }

  const response = NextResponse.json({ refresh_token: token });
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}

export { COOKIE_NAME as GOOGLE_OAUTH_COOKIE_NAME };
