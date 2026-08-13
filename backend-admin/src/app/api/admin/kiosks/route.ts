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

        if (typeof isKioskLocked !== 'boolean' && typeof isPaymentEnabled !== 'boolean') {
            return NextResponse.json({ error: 'No settings to update' }, { status: 400 });
        }

        const clientUser = await prisma.adminUser.findUnique({
            where: { id: clientId },
            select: {
                id: true,
                email: true,
                isPaymentEnabled: true,
                settings: { select: { isKioskLocked: true } },
            },
        });

        if (!clientUser) {
            return NextResponse.json({ error: 'Client user not found' }, { status: 404 });
        }

        const jobs: Promise<unknown>[] = [];

        if (typeof isPaymentEnabled === 'boolean') {
            jobs.push(
                prisma.adminUser.update({
                    where: { id: clientId },
                    data: { isPaymentEnabled },
                    select: { id: true },
                }),
            );
        }

        if (typeof isKioskLocked === 'boolean') {
            jobs.push(
                prisma.systemSetting.upsert({
                    where: { adminUserId: clientId },
                    update: { isKioskLocked },
                    create: { adminUserId: clientId, isKioskLocked },
                    select: { id: true },
                }),
            );
        }

        await Promise.all(jobs);

        void logAuditEvent({
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
            isKioskLocked: typeof isKioskLocked === 'boolean'
                ? isKioskLocked
                : (clientUser.settings?.isKioskLocked ?? false),
            isPaymentEnabled: typeof isPaymentEnabled === 'boolean'
                ? isPaymentEnabled
                : clientUser.isPaymentEnabled,
        });
    } catch (error: any) {
        console.error('Failed to update kiosk setting by admin:', error);
        return NextResponse.json({ error: 'Failed to update kiosk setting' }, { status: 500 });
    }
}
