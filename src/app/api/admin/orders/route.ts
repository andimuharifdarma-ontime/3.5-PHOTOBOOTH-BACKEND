import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper: get the current client's adminUser ID from session
async function getClientId(session: any): Promise<string | null> {
    const user = session?.user as any;
    if (!user?.email) return null;
    const client = await prisma.adminUser.findUnique({
        where: { email: user.email },
        select: { id: true }
    });
    return client?.id || null;
}

// GET all orders — strictly scoped per client
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const userRole = user.role;

        let whereClause: any = {};
        if (userRole !== 'ADMIN') {
            // CLIENT / KARYAWAN: only see orders that belong to their own adminUserId
            const clientId = await getClientId(session);
            if (clientId) {
                whereClause.adminUserId = clientId;
            } else {
                // No matching client found — return empty
                whereClause.adminUserId = 'none';
            }
        }
        // ADMIN sees all orders (whereClause stays {})

        // Auto-update orders older than 1 hour and still 'paid' → mark as 'printed'
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

        await prisma.printOrder.updateMany({
            where: {
                ...whereClause,
                paymentStatus: 'paid',
                createdAt: { lte: oneHourAgo }
            },
            data: {
                paymentStatus: 'printed',
                printedAt: new Date()
            }
        });

        const orders = await prisma.printOrder.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(orders);
    } catch (error) {
        console.error('Failed to fetch orders:', error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}

// POST create new order — always attach adminUserId from session
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { userName, frameId, frameName, quantity, pricePerFrame, imageUrl } = body;

        if (!userName || !frameId || !frameName || !quantity || !pricePerFrame || !imageUrl) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const clientId = await getClientId(session);
        const totalPrice = quantity * pricePerFrame;

        const order = await prisma.printOrder.create({
            data: {
                userName,
                adminUserId: clientId, // ← always attach the owning client
                frameId,
                frameName,
                quantity,
                pricePerFrame,
                totalPrice,
                imageUrl,
                paymentStatus: 'pending',
            },
        });

        return NextResponse.json(order, { status: 201 });
    } catch (error) {
        console.error('Failed to create order:', error);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }
}

// DELETE order(s) — ADMIN only
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('id');
        const deleteAll = searchParams.get('all') === 'true';

        if (deleteAll) {
            // Delete ALL print orders
            const result = await prisma.printOrder.deleteMany({});
            return NextResponse.json({ message: `Deleted ${result.count} orders`, count: result.count });
        }

        if (orderId) {
            // Delete single order
            await prisma.printOrder.delete({ where: { id: orderId } });
            return NextResponse.json({ message: 'Order deleted' });
        }

        return NextResponse.json({ error: 'Provide ?id=xxx or ?all=true' }, { status: 400 });
    } catch (error) {
        console.error('Failed to delete order(s):', error);
        return NextResponse.json({ error: 'Failed to delete order(s)' }, { status: 500 });
    }
}

