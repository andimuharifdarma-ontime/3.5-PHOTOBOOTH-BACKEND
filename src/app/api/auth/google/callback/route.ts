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

    // Success - redirect dengan refresh token
    return NextResponse.redirect(
      new URL(
        `/admin/oauth-setup?success=true&refresh_token=${encodeURIComponent(result.refresh_token)}`,
        req.url
      )
    );
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/admin/oauth-setup?error=callback_failed', req.url)
    );
  }
}

