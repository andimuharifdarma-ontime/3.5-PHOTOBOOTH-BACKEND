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

function isMissingOptionalFrameColumn(error: unknown, column: string): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes(column) || (message.includes('column') && message.includes('Frame'));
}

function buildFrameUpdateData(
    body: Record<string, unknown>,
    options: {
        includeOriginalImageUrl?: boolean;
        includeChromaKeySettings?: boolean;
    } = {},
): Prisma.FrameUpdateInput {
    const {
        includeOriginalImageUrl = true,
        includeChromaKeySettings = true,
    } = options;

    const {
        name,
        imageUrl,
        originalImageUrl,
        chromaKeyColor,
        chromaKeyTolerance,
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
    if (includeChromaKeySettings && chromaKeyColor !== undefined) {
        data.chromaKeyColor =
            chromaKeyColor === null ? null : String(chromaKeyColor);
    }
    if (includeChromaKeySettings && chromaKeyTolerance !== undefined) {
        data.chromaKeyTolerance =
            chromaKeyTolerance === null ? null : Number(chromaKeyTolerance);
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

        const sessionUser = session.user as any;
        let canManage = sessionUser?.role === 'ADMIN' || sessionUser?.role === 'KARYAWAN' || sessionUser?.canManageThemes === true;

        if (!canManage && sessionUser?.email) {
            const dbUser = await prisma.adminUser.findUnique({
                where: { email: sessionUser.email }
            });
            if (dbUser) {
                canManage = dbUser.role === 'ADMIN' || dbUser.role === 'KARYAWAN' || dbUser.canManageThemes === true;
            }
        }

        if (!canManage) {
            return NextResponse.json({ error: 'Forbidden: Management permission required' }, { status: 403 });
        }

        const body = await request.json();

        let frame;
        let skippedColumns: string[] = [];

        const updateOptions = {
            includeOriginalImageUrl: true,
            includeChromaKeySettings: true,
        };

        try {
            frame = await prisma.frame.update({
                where: { id },
                data: buildFrameUpdateData(body, updateOptions),
            });
        } catch (updateError) {
            if (body.originalImageUrl !== undefined && isMissingOptionalFrameColumn(updateError, 'originalImageUrl')) {
                updateOptions.includeOriginalImageUrl = false;
                skippedColumns.push('originalImageUrl');
            }
            if (
                (body.chromaKeyColor !== undefined || body.chromaKeyTolerance !== undefined) &&
                (isMissingOptionalFrameColumn(updateError, 'chromaKeyColor') ||
                    isMissingOptionalFrameColumn(updateError, 'chromaKeyTolerance'))
            ) {
                updateOptions.includeChromaKeySettings = false;
                skippedColumns.push('chromaKeyColor/chromaKeyTolerance');
            }

            if (skippedColumns.length > 0) {
                frame = await prisma.frame.update({
                    where: { id },
                    data: buildFrameUpdateData(body, updateOptions),
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
                details: skippedColumns.length > 0
                    ? `Updated frame "${frame.name}" (${skippedColumns.join(', ')} skipped — run DB migration)`
                    : `Updated frame "${frame.name}"`,
            }, request);
        } catch (auditError) {
            console.warn('Audit log failed (frame still updated):', auditError);
        }

        return NextResponse.json({
            ...frame,
            ...(skippedColumns.length > 0 && {
                warning:
                    'Beberapa kolom frame belum ada di database (originalImageUrl / chroma key). Jalankan: npx prisma migrate deploy',
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
