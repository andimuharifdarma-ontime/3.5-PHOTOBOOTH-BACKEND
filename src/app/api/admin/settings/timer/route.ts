import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit-logger';

/**
 * API untuk mengatur durasi auto-delete foto sementara di Supabase Storage.
 * Hanya ADMIN yang bisa mengubah pengaturan ini.
 */

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // @ts-ignore
    const setting = await (prisma.systemSetting as any).findFirst({
      select: { photoRetentionDays: true },
    });

    return NextResponse.json({
      photoRetentionDays: setting?.photoRetentionDays ?? 7,
    });
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

    // Validate: minimum 1 day, maximum 365 days
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

    // Get current settings
    // @ts-ignore
    const currentSetting = await (prisma.systemSetting as any).findFirst();
    if (!currentSetting) {
      return NextResponse.json(
        { error: 'Settings not found. Please initialize settings first.' },
        { status: 404 }
      );
    }

    // Update
    // @ts-ignore
    const updated = await (prisma.systemSetting as any).update({
      where: { id: currentSetting.id },
      data: { photoRetentionDays },
    }) as any;

    // Audit log
    await logAuditEvent(
      {
        userId: (session.user as any).id,
        userEmail: (session.user as any).email || 'unknown',
        action: 'SETTINGS_CHANGE',
        resource: 'settings',
        resourceId: updated.id,
        details: `Updated photo retention to ${photoRetentionDays} days`,
      },
      req
    );

    return NextResponse.json({
      success: true,
      photoRetentionDays: updated.photoRetentionDays,
    });
  } catch (error) {
    console.error('Failed to update timer settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
