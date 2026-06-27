import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as crypto from 'crypto';
import { generateDokuSignature } from '@/lib/doku';
import { authenticateRequest, canAccessOrder } from '@/lib/api-auth';

/** Sync payment status from DOKU API for an order the caller owns. */
export async function POST(request: Request) {
    try {
        const auth = await authenticateRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { orderId } = await request.json();

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        const order = await prisma.printOrder.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (!(await canAccessOrder(auth, order))) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (order.paymentStatus === 'paid' || order.paymentStatus === 'printed') {
            return NextResponse.json({
                success: true,
                message: 'Order already paid',
                status: order.paymentStatus,
            });
        }

        const dokuConfig = {
            clientId: (process.env.DOKU_CLIENT_ID || '').trim(),
            secretKey: (process.env.DOKU_SECRET_KEY || '').trim(),
        };

        const requestId = crypto.randomUUID();
        const timestamp = new Date().toISOString().split('.')[0] + 'Z';
        const targetPath = `/orders/v1/status/${orderId}`;

        const signature = generateDokuSignature(
            dokuConfig,
            requestId,
            timestamp,
            targetPath,
        );

        const isProduction = process.env.DOKU_IS_PRODUCTION === 'true';
        const baseUrl = isProduction
            ? 'https://api.doku.com'
            : 'https://api-sandbox.doku.com';

        const response = await fetch(`${baseUrl}${targetPath}`, {
            method: 'GET',
            headers: {
                'Client-Id': dokuConfig.clientId,
                'Request-Id': requestId,
                'Request-Timestamp': timestamp,
                Signature: signature,
            },
        });

        if (!response.ok) {
            console.error(`[DOKU Sync] DOKU API error: ${response.status}`);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Cannot verify payment status from DOKU',
                    status: 'pending',
                    source: 'doku_unavailable',
                },
                { status: 503 },
            );
        }

        const data = await response.json();
        let newStatus = 'pending';

        if (data.transaction?.status === 'SUCCESS' || data.order?.status === 'PAID') {
            newStatus = 'paid';
        } else if (data.transaction?.status === 'FAILED' || data.order?.status === 'FAILED') {
            newStatus = 'failed';
        }

        await prisma.printOrder.update({
            where: { id: orderId },
            data: { paymentStatus: newStatus },
        });

        return NextResponse.json({
            success: true,
            message: 'Status synced from DOKU API',
            status: newStatus,
            source: 'doku_api',
        });
    } catch (error) {
        console.error('[DOKU Sync] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
