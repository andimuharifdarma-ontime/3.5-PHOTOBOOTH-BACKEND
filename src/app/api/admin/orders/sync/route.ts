import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateDokuSignature } from '@/lib/doku';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const body = await request.json().catch(() => ({}));
        const { orderId } = body;

        // Determine client scope — non-ADMIN users only sync their own orders
        let clientId: string | null = null;
        if (user.role !== 'ADMIN') {
            const client = await prisma.adminUser.findUnique({
                where: { email: user.email },
                select: { id: true }
            });
            clientId = client?.id || null;
            if (!clientId) {
                return NextResponse.json({ error: 'Client not found' }, { status: 404 });
            }
        }

        let ordersToSync = [];

        if (orderId) {
            const order = await prisma.printOrder.findUnique({
                where: { id: orderId }
            });
            // Ensure this order belongs to the client (if not admin)
            if (order && (!clientId || order.adminUserId === clientId)) {
                ordersToSync.push(order);
            }
        } else {
            // Find all pending orders from the last 24 hours, scoped to client
            const yesterday = new Date();
            yesterday.setHours(yesterday.getHours() - 24);

            const whereClause: any = {
                paymentStatus: 'pending',
                createdAt: { gte: yesterday }
            };
            if (clientId) {
                whereClause.adminUserId = clientId;
            }

            ordersToSync = await prisma.printOrder.findMany({
                where: whereClause
            });
        }

        if (ordersToSync.length === 0) {
            return NextResponse.json({ message: 'No orders to sync' });
        }

        const dokuConfig = {
            clientId: (process.env.DOKU_CLIENT_ID || '').trim(),
            secretKey: (process.env.DOKU_SECRET_KEY || '').trim()
        };
        const isProduction = process.env.DOKU_IS_PRODUCTION === 'true';
        const baseUrl = isProduction ? 'https://api.doku.com' : 'https://api-sandbox.doku.com';

        const results = [];

        for (const order of ordersToSync) {
            const requestId = crypto.randomUUID();
            const timestamp = new Date().toISOString().split('.')[0] + 'Z';
            const targetPath = `/orders/v1/status/${order.id}`;

            const signature = generateDokuSignature(
                dokuConfig,
                requestId,
                timestamp,
                targetPath
            );

            try {
                const response = await fetch(`${baseUrl}${targetPath}`, {
                    method: 'GET',
                    headers: {
                        'Client-Id': dokuConfig.clientId,
                        'Request-Id': requestId,
                        'Request-Timestamp': timestamp,
                        'Signature': signature
                    }
                });

                const data = await response.json();

                if (response.ok && data.transaction?.status) {
                    const dokuStatus = data.transaction.status; // SUCCESS, FAILED, PENDING
                    let newStatus = order.paymentStatus;

                    if (dokuStatus === 'SUCCESS') {
                        newStatus = 'paid';
                    } else if (dokuStatus === 'FAILED') {
                        newStatus = 'failed';
                    }

                    if (newStatus !== order.paymentStatus) {
                        await prisma.printOrder.update({
                            where: { id: order.id },
                            data: { paymentStatus: newStatus }
                        });
                    }

                    results.push({
                        orderId: order.id,
                        oldStatus: order.paymentStatus,
                        newStatus: newStatus,
                        dokuStatus: dokuStatus
                    });
                } else {
                    results.push({
                        orderId: order.id,
                        error: 'Failed to fetch status from DOKU',
                        details: data
                    });
                }
            } catch (err: any) {
                results.push({
                    orderId: order.id,
                    error: err.message
                });
            }
        }

        return NextResponse.json({
            message: `Synced ${results.length} orders`,
            results
        });

    } catch (error: any) {
        console.error('Sync API error:', error);
        return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
    }
}

