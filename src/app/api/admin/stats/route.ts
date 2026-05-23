import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');

        let whereClause: any = {};
        if (startDateStr && endDateStr && startDateStr.trim() !== '' && endDateStr.trim() !== '') {
            whereClause = {
                createdAt: {
                    gte: new Date(new Date(startDateStr).setHours(0, 0, 0, 0)),
                    lte: new Date(new Date(endDateStr).setHours(23, 59, 59, 999)),
                },
            };
        } else if (startDateStr && startDateStr.trim() !== '') {
            const date = new Date(startDateStr);
            whereClause = {
                createdAt: {
                    gte: new Date(date.setHours(0, 0, 0, 0)),
                    lte: new Date(date.setHours(23, 59, 59, 999)),
                },
            };
        }

        const user = session.user as any;
        const userRole = user.role;
        const userEmail = user.email;

        // Apply role-based filtering for orders
        let orderWhereClause: any = { ...whereClause };
        let themeWhereClause: any = {};

        if (userRole === 'CLIENT') {
            const client = await prisma.adminUser.findUnique({
                where: { email: userEmail },
                select: { id: true, name: true }
            });
            if (client) {
                // Use OR to catch both tagged orders and legacy name-based orders
                orderWhereClause = {
                    ...orderWhereClause,
                    OR: [
                        { adminUserId: client.id },
                        { userName: client.name || '' }
                    ]
                };
                
                themeWhereClause.userName = {
                    equals: (client.name || '').toLowerCase(),
                    mode: 'insensitive'
                };
            }
        }

        const [totalThemes, totalFrames, totalOrders, orders] = await Promise.all([
            prisma.frameTheme.count({ where: themeWhereClause }),
            prisma.frame.count({ where: { theme: themeWhereClause } }),
            prisma.printOrder.count({ where: orderWhereClause }),
            prisma.printOrder.findMany({
                where: orderWhereClause,
                select: { totalPrice: true, paymentStatus: true, quantity: true },
            }),
        ]);

        const paidOrders = orders.filter(o => o.paymentStatus === 'paid' || o.paymentStatus === 'printed');
        const pendingOrders = orders.filter(o => o.paymentStatus === 'pending').length;
        const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalPrice, 0);
        const totalPrints = paidOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);

        // Get monthly revenue for the last 12 months with ONE query
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

        const annualStats = await prisma.printOrder.findMany({
            where: {
                ...orderWhereClause,
                createdAt: {
                    gte: twelveMonthsAgo,
                },
                paymentStatus: {
                    in: ['paid', 'printed']
                }
            },
            select: { totalPrice: true, createdAt: true },
        });

        const monthlyRevenue = [];
        for (let i = 11; i >= 0; i--) {
            const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mStart = new Date(m.getFullYear(), m.getMonth(), 1);
            const mEnd = new Date(m.getFullYear(), m.getMonth() + 1, 0, 23, 59, 59, 999);

            const monthRevenue = annualStats
                .filter(o => o.createdAt >= mStart && o.createdAt <= mEnd)
                .reduce((sum, o) => sum + o.totalPrice, 0);

            monthlyRevenue.push({
                month: mStart.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
                revenue: monthRevenue
            });
        }

        return NextResponse.json({
            totalThemes,
            totalFrames,
            totalOrders,
            totalRevenue,
            totalPrints,
            pendingOrders,
            monthlyRevenue,
        });
    } catch (error) {
        console.error('Failed to fetch stats:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
