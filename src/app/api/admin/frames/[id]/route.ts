import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteFile } from '@/lib/file-helper';
import { logAuditEvent } from '@/lib/audit-logger';

interface Params {
    params: Promise<{ id: string }>;
}

function isMissingOriginalImageUrlColumn(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('originalImageUrl') || message.includes('column') && message.includes('Frame');
}

function buildFrameUpdateData(
    body: Record<string, unknown>,
    includeOriginalImageUrl: boolean,
): Prisma.FrameUpdateInput {
    const {
        name,
        imageUrl,
        originalImageUrl,
        previewUrl,
        price,
        outputWidth,
        outputHeight,
        slots,
        maxSlots,
        framePosition,
        isActive,
        order,
    } = body;

    const data: Prisma.FrameUpdateInput = {};

    if (name !== undefined) data.name = String(name);
    if (imageUrl !== undefined) data.imageUrl = imageUrl as string;
    if (includeOriginalImageUrl && originalImageUrl !== undefined) {
        data.originalImageUrl =
            originalImageUrl === null ? null : String(originalImageUrl);
    }
    if (previewUrl !== undefined) data.previewUrl = previewUrl as string;
    if (price !== undefined) data.price = Number(price);
    if (outputWidth !== undefined) data.outputWidth = Number(outputWidth);
    if (outputHeight !== undefined) data.outputHeight = Number(outputHeight);
    if (slots !== undefined) data.slots = slots as Prisma.InputJsonValue;
    if (maxSlots !== undefined) data.maxSlots = Number(maxSlots);
    if (framePosition !== undefined) data.framePosition = String(framePosition);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (order !== undefined) data.order = Number(order);

    return data;
}

// GET single frame
export async function GET(request: Request, { params }: Params) {
    const { id } = await params;
    try {
        const frame = await prisma.frame.findUnique({
            where: { id },
            include: {
                theme: {
                    select: { id: true, name: true },
                },
            },
        });

        if (!frame) {
            return NextResponse.json({ error: 'Frame not found' }, { status: 404 });
        }

        return NextResponse.json(frame);
    } catch (error) {
        console.error('Failed to fetch frame:', error);
        return NextResponse.json({ error: 'Failed to fetch frame' }, { status: 500 });
    }
}

// PUT update frame
export async function PUT(request: Request, { params }: Params) {
    const { id } = await params;
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

        let frame;
        let originalImageUrlSkipped = false;

        try {
            frame = await prisma.frame.update({
                where: { id },
                data: buildFrameUpdateData(body, true),
            });
        } catch (updateError) {
            if (body.originalImageUrl !== undefined && isMissingOriginalImageUrlColumn(updateError)) {
                originalImageUrlSkipped = true;
                frame = await prisma.frame.update({
                    where: { id },
                    data: buildFrameUpdateData(body, false),
                });
            } else {
                throw updateError;
            }
        }

        // Audit log (non-blocking)
        try {
            await logAuditEvent({
                userId: user.id || 'unknown',
                userEmail: user.email || 'unknown',
                action: 'UPDATE',
                resource: 'frame',
                resourceId: id,
                details: originalImageUrlSkipped
                    ? `Updated frame "${frame.name}" (originalImageUrl skipped — run DB migration)`
                    : `Updated frame "${frame.name}"`,
            }, request);
        } catch (auditError) {
            console.warn('Audit log failed (frame still updated):', auditError);
        }

        return NextResponse.json({
            ...frame,
            ...(originalImageUrlSkipped && {
                warning:
                    'Kolom originalImageUrl belum ada di database. Frame tersimpan, tapi fitur Reset membutuhkan migration. Jalankan: npx prisma migrate deploy',
            }),
        });
    } catch (error) {
        console.error('Failed to update frame:', error);
        const detail = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            {
                error: 'Gagal menyimpan frame ke database',
                details: detail,
            },
            { status: 500 },
        );
    }
}

// DELETE frame
export async function DELETE(request: Request, { params }: Params) {
    const { id } = await params;
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

        const frame = await prisma.frame.findUnique({ where: { id } });
        if (frame) {
            // Delete physical files
            if (frame.imageUrl) await deleteFile(frame.imageUrl);
            if (frame.originalImageUrl && frame.originalImageUrl !== frame.imageUrl) {
                await deleteFile(frame.originalImageUrl);
            }
            if (frame.previewUrl) await deleteFile(frame.previewUrl);
        }

        await prisma.frame.delete({ where: { id } });

        // Audit log
        await logAuditEvent({
            userId: user.id || 'unknown',
            userEmail: user.email || 'unknown',
            action: 'DELETE',
            resource: 'frame',
            resourceId: id,
            details: `Deleted frame "${frame?.name || id}"`,
        }, request);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete frame:', error);
        return NextResponse.json({ error: 'Failed to delete frame' }, { status: 500 });
    }
}
