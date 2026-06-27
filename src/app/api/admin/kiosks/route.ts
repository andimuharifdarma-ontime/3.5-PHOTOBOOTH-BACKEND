import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit-logger';
import { maskApiKeyHint } from '@/lib/api-key';

export const dynamic = 'force-dynamic';

// GET: Fetch all CLIENT users and their kiosk system settings
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
        }

        const userRole = (session.user as any)?.role;
        if (userRole !== 'ADMIN') {
            return NextResponse.json({ error: 'Access Forbidden' }, { status: 403 });
        }

        // Fetch all users with CLIENT role
        const clients = await prisma.adminUser.findMany({
            where: { role: 'CLIENT' },
            select: {
                id: true,
                name: true,
                email: true,
                apiKey: true,
                apiKeyHint: true,
                isPaymentEnabled: true,
                createdAt: true,
                settings: {
                    select: {
                        id: true,
                        isKioskLocked: true,
                        updatedAt: true
                    }
                },
                _count: {
                    select: { printOrders: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Map and ensure each client has a default settings structure even if not created yet
        const mappedClients = clients.map((client) => ({
            id: client.id,
            name: client.name || 'Unnamed Client',
            email: client.email,
            apiKey: maskApiKeyHint(client.apiKeyHint),
            isPaymentEnabled: client.isPaymentEnabled,
            totalOrders: client._count.printOrders,
            isKioskLocked: client.settings?.isKioskLocked ?? false,
            lastActivity: client.settings?.updatedAt || client.createdAt
        }));

        return NextResponse.json(mappedClients);
    } catch (error: any) {
        console.error('Failed to fetch kiosks for admin:', error);
        return NextResponse.json({ error: 'Failed to fetch kiosks list' }, { status: 500 });
    }
}

// POST: Lock/Unlock a specific Client's kiosk or update their payment setting
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
        }

        const adminId = (session.user as any).id;
        const userRole = (session.user as any)?.role;
        if (userRole !== 'ADMIN') {
            return NextResponse.json({ error: 'Access Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { clientId, isKioskLocked, isPaymentEnabled } = body;

        if (!clientId) {
            return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
        }

        // Verify the client user exists
        const clientUser = await prisma.adminUser.findUnique({
            where: { id: clientId },
            include: { settings: true }
        });

        if (!clientUser) {
            return NextResponse.json({ error: 'Client user not found' }, { status: 404 });
        }

        // 1. Update AdminUser-level payment setting if provided
        if (isPaymentEnabled !== undefined) {
            await prisma.adminUser.update({
                where: { id: clientId },
                data: { isPaymentEnabled }
            });
        }

        // 2. Update SystemSetting-level kiosk lock status
        let updatedSetting = null;
        if (isKioskLocked !== undefined) {
            if (clientUser.settings) {
                // Update existing setting
                updatedSetting = await prisma.systemSetting.update({
                    where: { id: clientUser.settings.id },
                    data: { isKioskLocked }
                });
            } else {
                // Create new default setting for the client and lock/unlock it
                updatedSetting = await prisma.systemSetting.create({
                    data: {
                        adminUserId: clientId,
                        isKioskLocked,
                        // default parameters
                        isPaymentEnabled: isPaymentEnabled !== undefined ? isPaymentEnabled : clientUser.isPaymentEnabled,
                        isFrameSelectionEnabled: true,
                        isPhotoSessionEnabled: true,
                        isPhotoSelectionEnabled: true,
                        isPhotoFilterEnabled: true,
                        isResultEnabled: true
                    }
                });
            }
        }

        // Audit Log this administrative action
        await logAuditEvent({
            userId: adminId,
            userEmail: (session.user as any).email || 'admin',
            action: 'SETTINGS_CHANGE',
            resource: 'client_kiosk',
            resourceId: clientId,
            details: `Admin changed settings for client ${clientUser.email}: isKioskLocked=${isKioskLocked}, isPaymentEnabled=${isPaymentEnabled}`,
        }, request);

        return NextResponse.json({
            success: true,
            clientId,
            isKioskLocked: isKioskLocked !== undefined ? isKioskLocked : (clientUser.settings?.isKioskLocked ?? false),
            isPaymentEnabled: isPaymentEnabled !== undefined ? isPaymentEnabled : clientUser.isPaymentEnabled
        });
    } catch (error: any) {
        console.error('Failed to update kiosk setting by admin:', error);
        return NextResponse.json({ error: 'Failed to update kiosk setting' }, { status: 500 });
    }
}
