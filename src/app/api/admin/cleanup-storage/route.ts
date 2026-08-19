import { NextResponse } from 'next/server';
import { cleanupExpiredPhotos, getPhotoRetentionDays } from '@/lib/cleanup-photos';
import { requireAdmin, requireAuth } from '@/lib/api-auth';

export async function GET(req: Request) {
  try {
    await requireAuth(req);
  } catch (response) {
    if (response instanceof Response) return response;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const retentionDays = await getPhotoRetentionDays();
    return NextResponse.json({ photoRetentionDays: retentionDays });
  } catch (error) {
    console.error('Failed to fetch retention settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);
  } catch (response) {
    if (response instanceof Response) return response;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let forceAll = false;
    try {
      const body = await req.json();
      if (body.forceAll === true) forceAll = true;
    } catch (e) {
      // ignore
    }

    const result = await cleanupExpiredPhotos({ forceAll });
    return NextResponse.json({
      success: result.success,
      deleted: result.deleted,
      checked: result.checked,
      retentionDays: result.retentionDays,
      cutoffDate: result.cutoffDate,
      folders: result.folderResults,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
