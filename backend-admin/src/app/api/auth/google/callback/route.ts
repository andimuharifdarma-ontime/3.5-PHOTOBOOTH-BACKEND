import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getTokensFromCode } from '@/lib/googleDriveOAuth';

/**
 * OAuth callback handler
 * GET /api/auth/google/callback?code=xxx
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.redirect(
      new URL('/login?from=/admin/oauth-setup', req.url)
    );
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Check for errors from Google
    if (error) {
      return NextResponse.redirect(
        new URL(`/admin/oauth-setup?error=${encodeURIComponent(error)}`, req.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/admin/oauth-setup?error=no_code', req.url)
      );
    }

    // Exchange code for tokens
    const result = await getTokensFromCode(code);

    if (!result.success || !result.refresh_token) {
      return NextResponse.redirect(
        new URL('/admin/oauth-setup?error=no_refresh_token', req.url)
      );
    }

    const response = NextResponse.redirect(
      new URL('/admin/oauth-setup?success=true', req.url)
    );
    response.cookies.set('google_oauth_refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/admin/oauth-setup?error=callback_failed', req.url)
    );
  }
}

