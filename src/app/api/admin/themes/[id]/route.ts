import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteFile } from '@/lib/file-helper';
import { logAuditEvent } from '@/lib/audit-logger';

interface Params {
    params: Promise<{ id: string }>;
}

// GET single theme
export async function GET(request: Request, { params }: Params) {
    const { id } = await params;
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const theme = await prisma.frameTheme.findUnique({
            where: { id },
            include: {
                frames: {
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!theme) {
            return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
        }

        // Ownership check: Clients can only see their own themes
        const clientName = (user.name || user.email || '').toLowerCase();
        const themeOwner = (theme.userName || '').toLowerCase();

        if (user.role === 'CLIENT' && themeOwner !== clientName) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json(theme);
    } catch (error) {
        console.error('Failed to fetch theme:', error);
        return NextResponse.json({ error: 'Failed to fetch theme' }, { status: 500 });
    }
}

// PUT update theme
export async function PUT(request: Request, { params }: Params) {
    const { id } = await params;
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const theme = await prisma.frameTheme.findUnique({ where: { id } });

        if (!theme) {
            return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
        }

        const isAdminOrKaryawan = user.role === 'ADMIN' || user.role === 'KARYAWAN';
        const clientName = (user.name || user.email || '').toLowerCase();
        const themeOwner = (theme.userName || '').toLowerCase();
        const isOwner = user.role === 'CLIENT' && themeOwner === clientName;
        const canManage = isAdminOrKaryawan || (isOwner && user.canManageThemes === true);

        // Additionally check if Karyawan has explicit manage permission if required by logic
        // But for now, let's stick to the prompt's karyawan check if needed.

        if (!canManage) {
            return NextResponse.json({ error: 'Forbidden: Management permission required' }, { status: 403 });
        }

        const body = await request.json();
        const { name, description, tag, previewUrl, isActive, order, price } = body;

        const updatedTheme = await prisma.frameTheme.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(tag !== undefined && { tag }),
                ...(previewUrl !== undefined && { previewUrl }),
                ...(isActive !== undefined && { isActive }),
                ...(order !== undefined && { order }),
                ...(price !== undefined && { price: parseInt(price.toString()) }),
            } as any,
        });

        // Audit log
        await logAuditEvent({
            userId: user.id || 'unknown',
            userEmail: user.email || 'unknown',
            action: 'UPDATE',
            resource: 'theme',
            resourceId: id,
            details: `Updated theme "${updatedTheme.name}"`,
        }, request);

        return NextResponse.json(updatedTheme);
    } catch (error) {
        console.error('Failed to update theme:', error);
        return NextResponse.json({ error: 'Failed to update theme' }, { status: 500 });
    }
}

// DELETE theme
export async function DELETE(request: Request, { params }: Params) {
    const { id } = await params;
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const theme = await prisma.frameTheme.findUnique({ where: { id } });

        if (!theme) {
            return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
        }

        const isAdminOrKaryawan = user.role === 'ADMIN' || user.role === 'KARYAWAN';
        const clientName = (user.name || user.email || '').toLowerCase();
        const themeOwner = (theme.userName || '').toLowerCase();
        const isOwner = user.role === 'CLIENT' && themeOwner === clientName;
        const canManage = isAdminOrKaryawan || (isOwner && user.canManageThemes === true);

        if (!canManage) {
            return NextResponse.json({ error: 'Forbidden: Management permission required' }, { status: 403 });
        }

        // Find all frames associated with this theme to delete their files
        const themeWithFrames = await prisma.frameTheme.findUnique({
            where: { id },
            include: { frames: true }
        });

        if (themeWithFrames) {
            // 1. Delete theme preview file
            if (themeWithFrames.previewUrl) {
                await deleteFile(themeWithFrames.previewUrl);
            }

            // 2. Delete all frames' files
            for (const frame of themeWithFrames.frames) {
                if (frame.imageUrl) await deleteFile(frame.imageUrl);
                if (frame.previewUrl) await deleteFile(frame.previewUrl);
            }
        }

        await prisma.frameTheme.delete({ where: { id } });

        // Audit log
        await logAuditEvent({
            userId: user.id || 'unknown',
            userEmail: user.email || 'unknown',
            action: 'DELETE',
            resource: 'theme',
            resourceId: id,
            details: `Deleted theme "${theme.name}" and ${themeWithFrames?.frames.length || 0} frames`,
        }, request);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete theme:', error);
        return NextResponse.json({ error: 'Failed to delete theme' }, { status: 500 });
    }
}
