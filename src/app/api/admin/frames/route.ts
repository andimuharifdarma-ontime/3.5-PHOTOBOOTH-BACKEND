import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit-logger';

// GET all frames (optional filter by themeId)
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const themeId = searchParams.get('themeId');

        const frames = await prisma.frame.findMany({
            where: themeId ? { themeId } : undefined,
            orderBy: { order: 'asc' },
            include: {
                theme: {
                    select: { id: true, name: true },
                },
            },
        });
        return NextResponse.json(frames);
    } catch (error) {
        console.error('Failed to fetch frames:', error);
        return NextResponse.json({ error: 'Failed to fetch frames' }, { status: 500 });
    }
}

// POST create new frame
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const canManage = user.role === 'ADMIN' || user.canManageThemes === true;

        if (!canManage) {
            return NextResponse.json({ error: 'Forbidden: Management permission required' }, { status: 403 });
        }

        const body = await request.json();
        const {
            themeId,
            name,
            imageUrl,
            originalImageUrl,
            previewUrl,
            price,
            outputWidth,
            outputHeight,
            slots
        } = body;

        const finalPreviewUrl = previewUrl || imageUrl;

        if (!themeId || !name || !imageUrl || !finalPreviewUrl) {
            return NextResponse.json({
                error: 'themeId, name, and imageUrl are required'
            }, { status: 400 });
        }

        // Verify theme exists
        const theme = await prisma.frameTheme.findUnique({ where: { id: themeId } });
        if (!theme) {
            return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
        }

        const maxOrder = await prisma.frame.aggregate({
            where: { themeId },
            _max: { order: true },
        });

        const frame = await prisma.frame.create({
            data: {
                themeId,
                name,
                imageUrl,
                originalImageUrl: originalImageUrl || imageUrl,
                previewUrl: finalPreviewUrl,
                price: price || 5000,
                outputWidth: outputWidth || 1080,
                outputHeight: outputHeight || 1920,
                slots: slots || [],
                order: (maxOrder._max.order ?? 0) + 1,
            },
        });


        // Audit log
        await logAuditEvent({
            userId: user.id || 'unknown',
            userEmail: user.email || 'unknown',
            action: 'CREATE',
            resource: 'frame',
            resourceId: frame.id,
            details: `Created frame "${name}" in theme ${themeId}`,
        }, request);

        return NextResponse.json(frame, { status: 201 });
    } catch (error) {
        console.error('Failed to create frame:', error);
        return NextResponse.json({ error: 'Failed to create frame' }, { status: 500 });
    }
}
