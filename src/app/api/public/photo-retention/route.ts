import { NextResponse } from 'next/server';
import { getGlobalPhotoRetentionDays } from '@/lib/photo-retention';

export const dynamic = 'force-dynamic';

/** Public read-only retention for download page countdown (no auth). */
export async function GET() {
  try {
    const photoRetentionDays = await getGlobalPhotoRetentionDays();
    return NextResponse.json({ photoRetentionDays });
  } catch (error) {
    console.error('Failed to fetch global photo retention:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
