import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logAuditEvent } from '@/lib/audit-logger';
import {
  generateRawApiKey,
  hashApiKey,
  apiKeyHintFromRaw,
} from '@/lib/api-key';
import { deleteFile } from '@/lib/file-helper';
import { updateUserSchema, formatZodErrors } from '@/lib/validations/schemas';

interface Params {
    params: Promise<{ id: string }>;
}

// PUT update user (Admin only)
export async function PUT(request: NextRequest, { params }: Params) {
    const { id } = await params;
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Validate input with Zod
        const parsed = updateUserSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation error', details: formatZodErrors(parsed.error) },
                { status: 400 }
            );
        }

        const { name, email, password, role, canManageThemes, canManageFilters, isPaymentEnabled, canInputCapital, initialCapital } = parsed.data;

        const updateData: any = {};
        if (typeof name === 'string') updateData.name = name;
        if (typeof email === 'string') updateData.email = email;
        if (typeof role === 'string') updateData.role = role;
        if (typeof canManageThemes === 'boolean') updateData.canManageThemes = canManageThemes;
        if (typeof canManageFilters === 'boolean') updateData.canManageFilters = canManageFilters;
        if (typeof isPaymentEnabled === 'boolean') updateData.isPaymentEnabled = isPaymentEnabled;
        if (typeof canInputCapital === 'boolean') updateData.canInputCapital = canInputCapital;

        if (initialCapital !== undefined) {
            updateData.initialCapital = initialCapital;
        }

        if (password && typeof password === 'string' && password.trim() !== '') {
            updateData.password = await bcrypt.hash(password, 12);
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
        }

        const updatedUser = await prisma.adminUser.update({
            where: { id: String(id) },
            data: updateData
        });

        // Audit log
        await logAuditEvent({
            userId: (session.user as any).id || 'unknown',
            userEmail: (session.user as any).email || 'unknown',
            action: 'UPDATE',
            resource: 'user',
            resourceId: String(id),
            details: `Updated user ${email || id} — fields: ${Object.keys(updateData).join(', ')}`,
        }, request);

        return NextResponse.json({
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            role: updatedUser.role,
            canManageThemes: updatedUser.canManageThemes,
            canManageFilters: updatedUser.canManageFilters,
            isPaymentEnabled: updatedUser.isPaymentEnabled,
            canInputCapital: updatedUser.canInputCapital,
            initialCapital: updatedUser.initialCapital
        });
    } catch (error: any) {
        console.error('PUT User API Error:', error);
        return NextResponse.json({
            error: 'Database Update Failed'
        }, { status: 500 });
    }
}

// DELETE user (Admin only) — Cascade deletes all related data + files
export async function DELETE(request: NextRequest, { params }: Params) {
    const { id } = await params;
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Prevent self-deletion
        if ((session.user as any).id === id) {
            return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
        }

        // 1. Find the user to get their name (used as FrameTheme.userName)
        const userToDelete = await prisma.adminUser.findUnique({
            where: { id },
            select: { id: true, name: true, email: true }
        });

        if (!userToDelete) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userName = (userToDelete.name || '').toLowerCase();
        let deletedThemeCount = 0;
        let deletedFrameCount = 0;
        let deletedFileCount = 0;
        let deletedOrderCount = 0;

        // 2. Find all FrameThemes owned by this user (matched by userName)
        if (userName) {
            const userThemes = await prisma.frameTheme.findMany({
                where: { userName: { equals: userName, mode: 'insensitive' } },
                include: { frames: true }
            });

            // 3. Delete all uploaded files for themes and frames
            for (const theme of userThemes) {
                // Delete theme preview file
                if (theme.previewUrl) {
                    const deleted = await deleteFile(theme.previewUrl);
                    if (deleted) deletedFileCount++;
                }

                // Delete all frame files (imageUrl + previewUrl)
                for (const frame of theme.frames) {
                    if (frame.imageUrl) {
                        const deleted = await deleteFile(frame.imageUrl);
                        if (deleted) deletedFileCount++;
                    }
                    if (frame.previewUrl) {
                        const deleted = await deleteFile(frame.previewUrl);
                        if (deleted) deletedFileCount++;
                    }
                    deletedFrameCount++;
                }

                deletedThemeCount++;
            }

            // 4. Delete all FrameThemes (Frames cascade-delete via Prisma schema)
            await prisma.frameTheme.deleteMany({
                where: { userName: { equals: userName, mode: 'insensitive' } }
            });
        }

        // 5. Delete all PrintOrders belonging to this user
        const deletedOrders = await prisma.printOrder.deleteMany({
            where: { adminUserId: id }
        });
        deletedOrderCount = deletedOrders.count;

        // 6. Delete the AdminUser (cascades to SystemSetting + AuditLog via schema)
        await prisma.adminUser.delete({ where: { id } });

        // Audit log
        const details = `Deleted user "${userToDelete.name || userToDelete.email}" — ` +
            `${deletedThemeCount} themes, ${deletedFrameCount} frames, ` +
            `${deletedFileCount} files, ${deletedOrderCount} orders removed`;

        await logAuditEvent({
            userId: (session.user as any).id || 'unknown',
            userEmail: (session.user as any).email || 'unknown',
            action: 'DELETE',
            resource: 'user',
            resourceId: id,
            details,
        }, request);

        return NextResponse.json({
            success: true,
            deleted: {
                themes: deletedThemeCount,
                frames: deletedFrameCount,
                files: deletedFileCount,
                orders: deletedOrderCount,
            }
        });
    } catch (error) {
        console.error('Failed to delete user:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}

// PATCH generate/rotate API Key (Admin only)
export async function PATCH(request: NextRequest, { params }: Params) {
    const { id } = await params;
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rawApiKey = generateRawApiKey();

        const updatedUser = await prisma.adminUser.update({
            where: { id: String(id) },
            data: {
                apiKey: hashApiKey(rawApiKey),
                apiKeyHint: apiKeyHintFromRaw(rawApiKey),
            } as any,
        });

        // Audit log
        await logAuditEvent({
            userId: (session.user as any).id || 'unknown',
            userEmail: (session.user as any).email || 'unknown',
            action: 'UPDATE',
            resource: 'user',
            resourceId: String(id),
            details: `Generated new API key for user ${updatedUser.email}`,
        }, request);

        return NextResponse.json({ apiKey: rawApiKey });
    } catch (error: any) {
        console.error('PATCH API Key Error:', error);
        return NextResponse.json({
            error: 'Failed to generate API Key'
        }, { status: 500 });
    }
}
