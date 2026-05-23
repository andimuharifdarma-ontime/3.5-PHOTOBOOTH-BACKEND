import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/googleDriveOAuth';

/**
 * Initiate OAuth flow
 * GET /api/auth/google
 */
export async function GET(req: NextRequest) {
  try {
    const authUrl = getAuthUrl();
    
    // Redirect ke Google OAuth consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('❌ Error initiating OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}

