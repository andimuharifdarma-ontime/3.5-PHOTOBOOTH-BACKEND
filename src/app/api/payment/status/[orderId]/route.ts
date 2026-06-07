import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { generateDokuSignature } from '../../../../../lib/doku';
import { authenticateRequest, canAccessOrder } from '@/lib/api-auth';
import * as crypto from 'crypto';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const auth = await authenticateRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { orderId } = await params;

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        let order = await prisma.printOrder.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (!(await canAccessOrder(auth, order))) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (order.paymentStatus === 'pending' || order.paymentStatus === 'failed') {
            try {
                const dokuConfig = {
                    clientId: (process.env.DOKU_CLIENT_ID || '').trim(),
                    secretKey: (process.env.DOKU_SECRET_KEY || '').trim()
                };

                const requestId = crypto.randomUUID();
                const timestamp = new Date().toISOString().split('.')[0] + 'Z';
                const targetPath = `/orders/v1/status/${orderId}`;

                const signature = generateDokuSignature(
                    dokuConfig,
                    requestId,
                    timestamp,
                    targetPath
                );

                const isProduction = process.env.DOKU_IS_PRODUCTION === 'true';
                const baseUrl = isProduction ? 'https://api.doku.com' : 'https://api-sandbox.doku.com';

                const response = await fetch(`${baseUrl}${targetPath}`, {
                    method: 'GET',
                    headers: {
                        'Client-Id': dokuConfig.clientId,
                        'Request-Id': requestId,
                        'Request-Timestamp': timestamp,
                        'Signature': signature
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const dokuStatus = data.transaction?.status;

                    if (dokuStatus === 'SUCCESS') {
                        order = await prisma.printOrder.update({
                            where: { id: orderId },
                            data: { paymentStatus: 'paid' } as any
                        });
                    } else if (dokuStatus === 'FAILED' || dokuStatus === 'EXPIRED') {
                        order = await prisma.printOrder.update({
                            where: { id: orderId },
                            data: { paymentStatus: 'failed' } as any
                        });
                    }
                }
            } catch (dokuError) {
                console.error('[Status Check] Error calling DOKU API:', dokuError);
            }
        }

        return NextResponse.json({
            id: order.id,
            paymentStatus: order.paymentStatus,
            userName: order.userName,
            quantity: order.quantity,
            totalPrice: order.totalPrice,
            frameName: order.frameName,
        });

    } catch (error: any) {
        console.error('Status check API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
