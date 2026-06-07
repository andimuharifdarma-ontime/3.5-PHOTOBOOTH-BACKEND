import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { generateDokuSignature } from '../../../../lib/doku';

// This endpoint handles DOKU callback/notification
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const headers = request.headers;

        // 1. Extract Headers for Verification
        const clientId = headers.get('client-id');
        const requestId = headers.get('request-id');
        const timestamp = headers.get('request-timestamp');
        const incomingSignature = headers.get('signature');

        // 2. Verify Presence of Required Headers
        if (!clientId || !requestId || !timestamp || !incomingSignature) {
            console.error('[DOKU Webhook] ✗ Missing required security headers');
            return NextResponse.json({ error: 'Missing security headers' }, { status: 401 });
        }

        // 3. Re-calculate Signature to Verify Authenticity
        const dokuConfig = {
            clientId: (process.env.DOKU_CLIENT_ID || '').trim(),
            secretKey: (process.env.DOKU_SECRET_KEY || '').trim()
        };

        // Note: The Request-Target for webhook verification should be the path of THIS endpoint
        const targetPath = '/api/payment/webhook';

        const calculatedSignature = generateDokuSignature(
            dokuConfig,
            requestId,
            timestamp,
            targetPath,
            body
        );

        if (incomingSignature !== calculatedSignature) {
            console.error('[DOKU Webhook] ✗ Invalid Signature Detected!');
            console.error(`  Expected: ${calculatedSignature}`);
            console.error(`  Received: ${incomingSignature}`);
            // Always reject invalid signatures — never bypass, even in non-production
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // Log the callback for debugging
        console.log('[DOKU Webhook] Received authenticated request:', JSON.stringify(body, null, 2));

        // Extract relevant information
        const { transaction, order } = body;

        if (transaction && order) {
            const orderId = order.invoice_number;
            const dokuStatus = transaction.status;

            console.log(`[DOKU Webhook] OrderID: ${orderId}, Status: ${dokuStatus}`);

            // Map DOKU status to our internal database status
            let internalStatus = 'pending';
            if (dokuStatus === 'SUCCESS') {
                internalStatus = 'paid';
            } else if (dokuStatus === 'FAILED' || dokuStatus === 'EXPIRED') {
                internalStatus = 'failed';
            }

            // Update the payment status in our database
            if (orderId && internalStatus !== 'pending') {
                try {
                    await prisma.printOrder.update({
                        where: { id: orderId },
                        data: {
                            paymentStatus: internalStatus
                        }
                    });
                    console.log(`[DOKU Webhook] ✓ Order ${orderId} updated to ${internalStatus}`);
                } catch (dbError) {
                    console.error(`[DOKU Webhook] ✗ Failed to update order ${orderId}:`, dbError);
                }
            }
        }

        // DOKU expects a success response to stop retrying
        return NextResponse.json({
            status: 'OK',
            message: 'Callback received'
        });
    } catch (error) {
        console.error('[DOKU Webhook] Processing error:', error);
        return NextResponse.json(
            { error: 'Failed to process callback' },
            { status: 500 }
        );
    }
}

// Also handle GET for verification from DOKU Dashboard
export async function GET() {
    return NextResponse.json({
        status: 'OK',
        message: 'Callback endpoint is active'
    });
}
