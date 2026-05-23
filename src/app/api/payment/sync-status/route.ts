import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Sync payment status from DOKU API
// This endpoint queries DOKU's payment status API and updates our database
export async function POST(request: Request) {
    try {
        // Security: Require authentication
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { orderId } = await request.json();

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        console.log(`[DOKU Sync] Syncing payment status for order: ${orderId}`);

        // Get order from database
        const order = await prisma.printOrder.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // If already paid, no need to sync
        if (order.paymentStatus === 'paid' || order.paymentStatus === 'printed') {
            console.log(`[DOKU Sync] Order ${orderId} already paid, skipping sync`);
            return NextResponse.json({
                success: true,
                message: 'Order already paid',
                status: order.paymentStatus
            });
        }

        // Prepare DOKU API request
        const dokuClientId = process.env.DOKU_CLIENT_ID!;
        const dokuSecretKey = process.env.DOKU_SECRET_KEY!;
        const isProduction = process.env.DOKU_IS_PRODUCTION === 'true';
        const baseUrl = isProduction
            ? 'https://api.doku.com'
            : 'https://api-sandbox.doku.com';

        const timestamp = new Date().toISOString();
        const requestId = `REQ-${Date.now()}`;

        // Generate signature for status check
        const signatureComponents = `Client-Id:${dokuClientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}`;
        const signature = crypto
            .createHmac('sha256', dokuSecretKey)
            .update(signatureComponents)
            .digest('base64');

        // Call DOKU status check API
        const dokuUrl = `${baseUrl}/orders/v1/status/${orderId}`;
        console.log(`[DOKU Sync] Calling DOKU API: ${dokuUrl}`);

        const response = await fetch(dokuUrl, {
            method: 'GET',
            headers: {
                'Client-Id': dokuClientId,
                'Request-Id': requestId,
                'Request-Timestamp': timestamp,
                'Signature': signature,
            }
        });

        console.log(`[DOKU Sync] DOKU API response status: ${response.status}`);

        if (!response.ok) {
            // DOKU API failed — DO NOT auto-mark as paid!
            console.error(`[DOKU Sync] DOKU API error: ${response.status} ${response.statusText}`);

            return NextResponse.json({
                success: false,
                error: 'Cannot verify payment status from DOKU',
                status: 'pending',
                source: 'doku_unavailable'
            }, { status: 503 });
        }

        const data = await response.json();
        console.log(`[DOKU Sync] DOKU API response:`, data);

        // Parse DOKU response and update database
        let newStatus = 'pending';

        if (data.transaction?.status === 'SUCCESS' || data.order?.status === 'PAID') {
            newStatus = 'paid';
        } else if (data.transaction?.status === 'FAILED' || data.order?.status === 'FAILED') {
            newStatus = 'failed';
        }

        console.log(`[DOKU Sync] Updating order ${orderId} to status: ${newStatus}`);

        await prisma.printOrder.update({
            where: { id: orderId },
            data: { paymentStatus: newStatus }
        });

        return NextResponse.json({
            success: true,
            message: 'Status synced from DOKU API',
            status: newStatus,
            source: 'doku_api'
        });

    } catch (error: any) {
        console.error('[DOKU Sync] Error:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}
