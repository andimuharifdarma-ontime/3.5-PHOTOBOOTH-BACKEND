import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Auto-webhook simulator for DOKU sandbox testing
// This endpoint is ONLY for development/sandbox - should be disabled in production
export async function POST(request: Request) {
    try {
        // Security: Require ADMIN authentication
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
        }

        // Security: Only allow in development or sandbox mode
        const isDev = process.env.NODE_ENV === 'development';
        const isSandbox = process.env.DOKU_IS_PRODUCTION !== 'true';

        if (!isDev && !isSandbox) {
            return NextResponse.json({
                error: 'Auto-webhook simulator is disabled in production'
            }, { status: 403 });
        }

        const { orderId } = await request.json();

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        console.log(`[Auto-Webhook Simulator] Checking order ${orderId} for auto-simulation`);

        // Check if order exists and is still pending
        const order = await prisma.printOrder.findUnique({
            where: { id: orderId }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (order.paymentStatus !== 'pending') {
            console.log(`[Auto-Webhook Simulator] Order ${orderId} already has status: ${order.paymentStatus}`);
            return NextResponse.json({
                message: 'Order already processed',
                status: order.paymentStatus
            });
        }

        // Auto-simulate successful payment webhook
        console.log(`[Auto-Webhook Simulator] Auto-simulating SUCCESS webhook for order ${orderId}`);

        await prisma.printOrder.update({
            where: { id: orderId },
            data: { paymentStatus: 'paid' }
        });

        console.log(`[Auto-Webhook Simulator] ✓ Order ${orderId} auto-updated to PAID`);

        return NextResponse.json({
            success: true,
            message: 'Auto-webhook simulated successfully',
            orderId: orderId,
            newStatus: 'paid'
        });

    } catch (error) {
        console.error('[Auto-Webhook Simulator] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
