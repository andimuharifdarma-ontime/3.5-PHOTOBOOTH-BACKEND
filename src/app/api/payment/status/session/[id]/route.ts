import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest, canAccessOrder } from '@/lib/api-auth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await authenticateRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: sessionId } = await params;

        if (!sessionId) {
            return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
        }

        const order = await prisma.printOrder.findFirst({
            where: {
                imageUrl: sessionId,
                adminUserId: auth.user.role === 'ADMIN' ? undefined : auth.user.id,
            },
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                paymentStatus: true,
                id: true,
                userName: true,
                quantity: true,
                adminUserId: true,
            }
        });

        if (!order) {
            return NextResponse.json({
                status: 'not_found',
                message: 'No order found for this session'
            });
        }

        if (!(await canAccessOrder(auth, order))) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json({
            status: order.paymentStatus,
            orderId: order.id,
            userName: order.userName,
            quantity: order.quantity
        });

    } catch (error) {
        console.error('Session status API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
