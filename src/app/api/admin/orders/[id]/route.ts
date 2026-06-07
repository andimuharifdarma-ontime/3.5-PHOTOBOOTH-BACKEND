import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper: verify that the current user owns this order (or is ADMIN)
async function verifyOwnership(session: any, orderId: string) {
    const user = session.user as any;
    const order = await prisma.printOrder.findUnique({
        where: { id: orderId },
    });

    if (!order) return { order: null, error: 'Order not found', status: 404 };

    if (user.role !== 'ADMIN') {
        const client = await prisma.adminUser.findUnique({
            where: { email: user.email },
            select: { id: true }
        });
        if (!client || order.adminUserId !== client.id) {
            return { order: null, error: 'Forbidden: This order does not belong to you', status: 403 };
        }
    }

    return { order, error: null, status: 200 };
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { order, error, status } = await verifyOwnership(session, id);

        if (!order) {
            return NextResponse.json({ error }, { status });
        }

        return NextResponse.json(order);
    } catch (error) {
        console.error('Failed to fetch order:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { order, error, status } = await verifyOwnership(session, id);

        if (!order) {
            return NextResponse.json({ error }, { status });
        }

        const body = await request.json();

        // Security: Whitelist allowed fields to prevent mass assignment
        const allowedFields: Record<string, any> = {};
        if (body.paymentStatus !== undefined) allowedFields.paymentStatus = body.paymentStatus;
        if (body.printedAt !== undefined) allowedFields.printedAt = body.printedAt;
        if (body.imageUrl !== undefined) allowedFields.imageUrl = body.imageUrl;

        if (Object.keys(allowedFields).length === 0) {
            return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
        }

        const updatedOrder = await prisma.printOrder.update({
            where: { id },
            data: allowedFields,
        });

        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error('Failed to update order:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT handler (alias for PATCH)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { order, error, status } = await verifyOwnership(session, id);

        if (!order) {
            return NextResponse.json({ error }, { status });
        }

        const body = await request.json();

        // Security: Whitelist allowed fields to prevent mass assignment
        const allowedFields: Record<string, any> = {};
        if (body.paymentStatus !== undefined) allowedFields.paymentStatus = body.paymentStatus;
        if (body.printedAt !== undefined) allowedFields.printedAt = body.printedAt;
        if (body.imageUrl !== undefined) allowedFields.imageUrl = body.imageUrl;

        if (Object.keys(allowedFields).length === 0) {
            return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
        }

        const updatedOrder = await prisma.printOrder.update({
            where: { id },
            data: allowedFields,
        });

        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error('Failed to update order:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

