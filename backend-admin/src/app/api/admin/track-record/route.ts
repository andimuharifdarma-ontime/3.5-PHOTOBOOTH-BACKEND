import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const userRole = user.role;
        const userEmail = user.email;

        let whereClause: any = {
            paymentStatus: {
                in: ['paid', 'printed']
            }
        };

        if (userRole === 'CLIENT') {
            const client = await prisma.adminUser.findUnique({
                where: { email: userEmail },
                select: { id: true, name: true }
            });
            if (client) {
                // Combine existing status filter with OR user filter
                const { paymentStatus } = whereClause;
                whereClause = {
                    paymentStatus,
                    OR: [
                        { adminUserId: client.id },
                        { userName: client.name || '' }
                    ]
                };
            }
        }

        // Fetch all successful orders for this specific client
        const orders = await prisma.printOrder.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
        });

        // 1. Frame Statistics
        const frameStats: Record<string, { count: number; revenue: number; name: string }> = {};

        // 2. Customer Statistics
        const customerStats: Record<string, {
            email: string | null;
            phone: string | null;
            name: string;
            sessionCount: number;
            totalSpent: number;
            lastVisit: Date;
        }> = {};

        orders.forEach(order => {
            // Frame Stats
            if (!frameStats[order.frameId]) {
                frameStats[order.frameId] = { count: 0, revenue: 0, name: order.frameName };
            }
            frameStats[order.frameId].count += order.quantity;
            frameStats[order.frameId].revenue += order.totalPrice;

            // Customer Stats
            // We use phone or email as identifier
            const identifier = order.customerPhone || order.customerEmail || `anon-${order.userName}`;

            if (!customerStats[identifier]) {
                customerStats[identifier] = {
                    email: order.customerEmail,
                    phone: order.customerPhone,
                    name: order.userName,
                    sessionCount: 0,
                    totalSpent: 0,
                    lastVisit: order.createdAt
                };
            }

            customerStats[identifier].sessionCount += 1;
            customerStats[identifier].totalSpent += order.totalPrice;
            if (new Date(order.createdAt) > new Date(customerStats[identifier].lastVisit)) {
                customerStats[identifier].lastVisit = order.createdAt;
            }
        });

        const topFrames = Object.values(frameStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const loyalCustomers = Object.values(customerStats)
            .sort((a, b) => b.sessionCount - a.sessionCount)
            .slice(0, 15);

        return NextResponse.json({
            topFrames,
            loyalCustomers,
            totalOrders: orders.length
        });

    } catch (error) {
        console.error('Failed to fetch track record:', error);
        return NextResponse.json({ error: 'Failed to fetch track record' }, { status: 500 });
    }
}
