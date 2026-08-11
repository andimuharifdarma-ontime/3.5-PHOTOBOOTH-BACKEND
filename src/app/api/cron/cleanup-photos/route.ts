import { NextResponse } from 'next/server';
import { cleanupExpiredPhotos } from '@/lib/cleanup-photos';
import { getRequiredEnv } from '@/lib/env';

export async function GET(req: Request) {
  try {
    const cronSecret = getRequiredEnv('CRON_SECRET');
    const authHeader = req.headers.get('authorization');

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await cleanupExpiredPhotos();

    return NextResponse.json({
      success: result.success,
      deleted: result.deleted,
      total: result.total,
      checked: result.checked,
      retentionDays: result.retentionDays,
      cutoffDate: result.cutoffDate,
      message: result.message,
    });
  } catch (error) {
    console.error('Cron cleanup error:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
