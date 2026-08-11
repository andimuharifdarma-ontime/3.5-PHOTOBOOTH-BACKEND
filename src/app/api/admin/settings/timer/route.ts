import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit-logger';
import {
  getGlobalPhotoRetentionDays,
  setGlobalPhotoRetentionDays,
} from '@/lib/photo-retention';
import { cleanupExpiredPhotos } from '@/lib/cleanup-photos';

/**
 * Legacy API untuk durasi auto-delete foto — sekarang memakai retention global.
 * Hanya ADMIN yang bisa mengubah pengaturan ini.
 */

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const photoRetentionDays = await getGlobalPhotoRetentionDays();
    return NextResponse.json({ photoRetentionDays });
  } catch (error) {
    console.error('Failed to fetch timer settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only ADMIN can change retention settings' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { photoRetentionDays } = body;

    if (
      typeof photoRetentionDays !== 'number' ||
      photoRetentionDays < 1 ||
      photoRetentionDays > 365
    ) {
      return NextResponse.json(
        { error: 'photoRetentionDays harus antara 1-365 hari' },
        { status: 400 }
      );
    }

    const applied = await setGlobalPhotoRetentionDays(photoRetentionDays);
    void cleanupExpiredPhotos().catch((err) =>
      console.error('Post-retention cleanup failed:', err),
    );

    await logAuditEvent(
      {
        userId: (session.user as any).id,
        userEmail: (session.user as any).email || 'unknown',
        action: 'SETTINGS_CHANGE',
        resource: 'settings',
        resourceId: 'global-photo-retention',
        details: `Updated photo retention to ${applied} days`,
      },
      req
    );

    return NextResponse.json({
      success: true,
      photoRetentionDays: applied,
    });
  } catch (error) {
    console.error('Failed to update timer settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
