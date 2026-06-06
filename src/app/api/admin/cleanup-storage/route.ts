import { NextResponse } from 'next/server';
import { cleanupExpiredPhotos, getPhotoRetentionDays } from '@/lib/cleanup-photos';

export async function GET() {
  try {
    const retentionDays = await getPhotoRetentionDays();
    return NextResponse.json({ photoRetentionDays: retentionDays });
  } catch (error) {
    console.error('Failed to fetch retention settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await cleanupExpiredPhotos();
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
