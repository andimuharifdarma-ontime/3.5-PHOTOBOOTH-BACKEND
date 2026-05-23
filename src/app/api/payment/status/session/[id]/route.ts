import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: sessionId } = await params;

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        // Cari order terbaru yang memiliki sessionId ini di kolom imageUrl
        const order = await prisma.printOrder.findFirst({
            where: {
                imageUrl: sessionId
            },
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                paymentStatus: true,
                id: true,
                userName: true,
                quantity: true
            }
        });

        if (!order) {
            return NextResponse.json({
                status: 'not_found',
                message: 'No order found for this session'
            });
        }

        return NextResponse.json({
            status: order.paymentStatus, // 'pending', 'paid', 'printed'
            orderId: order.id,
            userName: order.userName,
            quantity: order.quantity
        });

    } catch (error) {
        console.error('Session status API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
