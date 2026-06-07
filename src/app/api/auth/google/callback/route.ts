import { NextRequest, NextResponse } from 'next/server';
import { getTokensFromCode } from '@/lib/googleDriveOAuth';

/**
 * OAuth callback handler
 * GET /api/auth/google/callback?code=xxx
 */
export async function GET(req: NextRequest) {
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

