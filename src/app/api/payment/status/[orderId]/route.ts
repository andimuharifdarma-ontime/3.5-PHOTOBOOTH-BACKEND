import { NextResponse } from 'next/server';
import prisma from '../../../../../lib/prisma';
import { generateDokuSignature } from '../../../../../lib/doku';
import * as crypto from 'crypto';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ orderId: string }> }
) {
    try {
        const { orderId } = await params;

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        // 1. Check local DB first
        let order = await prisma.printOrder.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // 2. If still pending or failed, try to fetch from DOKU directly
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

                console.log(`[Status Check] Fetching from DOKU for order: ${orderId}`);

                const response = await fetch(`${baseUrl}${targetPath}`, {
                    method: 'GET',
                    headers: {
                        'Client-Id': dokuConfig.clientId,
                        'Request-Id': requestId,
                        'Request-Timestamp': timestamp,
                        'Signature': signature
                    }
                });

                console.log(`[Status Check] DOKU HTTP Status: ${response.status} for ${orderId}`);

                if (response.ok) {
                    const data = await response.json();
                    const dokuStatus = data.transaction?.status;

                    console.log(`[Status Check] DOKU Response Body for ${orderId}:`, JSON.stringify(data));
                    console.log(`[Status Check] parsed dokuStatus: ${dokuStatus}`);

                    if (dokuStatus === 'SUCCESS') {
                        // Update DB
                        order = await prisma.printOrder.update({
                            where: { id: orderId },
                            data: { paymentStatus: 'paid' } as any
                        });
                        console.log(`[Status Check] ✓ Order ${orderId} updated to paid via DOKU Sync`);
                    } else if (dokuStatus === 'FAILED' || dokuStatus === 'EXPIRED') {
                        order = await prisma.printOrder.update({
                            where: { id: orderId },
                            data: { paymentStatus: 'failed' } as any
                        });
                        console.log(`[Status Check] ✗ Order ${orderId} updated to failed via DOKU Sync`);
                    }
                } else {
                    const errBody = await response.text();
                    console.error(`[Status Check] ✗ DOKU API returned non-200: ${response.status}`, errBody);
                }
            } catch (dokuError) {
                console.error('[Status Check] Error calling DOKU API:', dokuError);
                // Continue and return database status
            }
        }

        return NextResponse.json(order);

    } catch (error: any) {
        console.error('Status check API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
