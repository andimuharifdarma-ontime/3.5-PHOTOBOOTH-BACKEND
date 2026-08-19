import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { generateDokuSignature, isDokuTimestampFresh } from '../../../../lib/doku';
import { timingSafeEqualString } from '@/lib/api-auth';

// This endpoint handles DOKU callback/notification
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const headers = request.headers;

        const clientId = headers.get('client-id');
        const requestId = headers.get('request-id');
        const timestamp = headers.get('request-timestamp');
        const incomingSignature = headers.get('signature');

        if (!clientId || !requestId || !timestamp || !incomingSignature) {
            console.error('[DOKU Webhook] Missing required security headers');
            return NextResponse.json({ error: 'Missing security headers' }, { status: 401 });
        }

        if (!isDokuTimestampFresh(timestamp)) {
            console.error('[DOKU Webhook] Stale or invalid request timestamp');
            return NextResponse.json({ error: 'Invalid timestamp' }, { status: 401 });
        }

        const dokuConfig = {
            clientId: (process.env.DOKU_CLIENT_ID || '').trim(),
            secretKey: (process.env.DOKU_SECRET_KEY || '').trim(),
        };

        const targetPath = '/api/payment/webhook';
        const calculatedSignature = generateDokuSignature(
            dokuConfig,
            requestId,
            timestamp,
            targetPath,
            body,
        );

        if (!timingSafeEqualString(incomingSignature, calculatedSignature)) {
            console.error('[DOKU Webhook] Invalid signature detected');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const { transaction, order } = body;
        const orderId = order?.invoice_number as string | undefined;
        const dokuStatus = transaction?.status as string | undefined;

        console.log('[DOKU Webhook] Authenticated callback', {
            requestId,
            orderId,
            dokuStatus,
        });

        if (transaction && order) {
            let internalStatus = 'pending';
            if (dokuStatus === 'SUCCESS') {
                internalStatus = 'paid';
            } else if (dokuStatus === 'FAILED' || dokuStatus === 'EXPIRED') {
                internalStatus = 'failed';
            }

            if (orderId && internalStatus !== 'pending') {
                try {
                    await prisma.printOrder.update({
                        where: { id: orderId },
                        data: { paymentStatus: internalStatus },
                    });
                    console.log(`[DOKU Webhook] Order ${orderId} updated to ${internalStatus}`);
                } catch (dbError) {
                    console.error(`[DOKU Webhook] Failed to update order ${orderId}:`, dbError);
                    return NextResponse.json(
                        { error: 'Failed to update order status' },
                        { status: 500 },
                    );
                }
            }
        }

        return NextResponse.json({
            status: 'OK',
            message: 'Callback received',
        });
    } catch (error) {
        console.error('[DOKU Webhook] Processing error:', error);
        return NextResponse.json(
            { error: 'Failed to process callback' },
            { status: 500 },
        );
    }
}

// Health probe for DOKU Dashboard (requires configured probe key)
export async function GET(request: NextRequest) {
    const probeKey = process.env.DOKU_WEBHOOK_PROBE_KEY?.trim();
    if (!probeKey) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const provided = request.nextUrl.searchParams.get('key') ?? '';
    if (!timingSafeEqualString(provided, probeKey)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
        status: 'OK',
        message: 'Callback endpoint is active',
    });
}
