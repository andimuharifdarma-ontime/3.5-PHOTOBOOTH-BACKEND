import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateDokuSignature } from '@/lib/doku';
import * as crypto from 'crypto';
import {
    buildReportsWhereClause,
    formatReportTransaction,
    parseReportsPagination,
} from '@/lib/reports-query';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as { role?: string; email?: string; name?: string };
        const { searchParams } = new URL(request.url);
        const exportAll = searchParams.get('exportAll') === '1';
        const { page, limit, skip } = parseReportsPagination(searchParams);
        const take = exportAll ? Math.min(5000, Math.max(1, parseInt(searchParams.get('limit') || '5000', 10))) : limit;
        const effectiveSkip = exportAll ? 0 : skip;

        const whereClause = await buildReportsWhereClause(
            {
                userRole: user.role ?? '',
                userEmail: user.email ?? '',
                sessionUserName: user.name,
                userNameParam: searchParams.get('userName'),
                startDateStr: searchParams.get('startDate'),
                endDateStr: searchParams.get('endDate'),
                search: searchParams.get('search') ?? undefined,
            },
            prisma,
        );

        const finishedWhere = {
            ...whereClause,
            paymentStatus: { in: ['paid', 'printed'] as string[] },
        };

        const [total, orders, revenueAgg, costRows, topFrameGroups] = await Promise.all([
            prisma.printOrder.count({ where: whereClause }),
            prisma.printOrder.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                skip: effectiveSkip,
                take,
            }),
            prisma.printOrder.aggregate({
                where: finishedWhere,
                _sum: { totalPrice: true },
            }),
            prisma.printOrder.findMany({
                where: finishedWhere,
                select: { quantity: true, costPrice: true },
            }),
            prisma.printOrder.groupBy({
                by: ['frameId', 'frameName'],
                where: finishedWhere,
                _sum: { quantity: true, totalPrice: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 5,
            }),
        ]);

        const totalRevenue = revenueAgg._sum.totalPrice ?? 0;
        const totalEstimatedCost = costRows.reduce(
            (sum, order) => sum + order.quantity * (order.costPrice || 2500),
            0,
        );

        const formattedTransactions = orders.map(formatReportTransaction);

        const topFrames = topFrameGroups.map((group) => ({
            name: group.frameName,
            count: group._sum.quantity ?? 0,
            revenue: group._sum.totalPrice ?? 0,
        }));

        return NextResponse.json({
            transactions: formattedTransactions,
            topFrames,
            financialSummary: {
                totalRevenue,
                totalEstimatedCost,
                totalProfit: totalRevenue - totalEstimatedCost,
                margin: totalRevenue > 0 ? ((totalRevenue - totalEstimatedCost) / totalRevenue) * 100 : 0,
            },
            pagination: exportAll
                ? { page: 1, limit: take, total, totalPages: 1 }
                : {
                    page,
                    limit,
                    total,
                    totalPages: Math.max(1, Math.ceil(total / limit)),
                },
        });
    } catch (error) {
        console.error('Failed to fetch reports:', error);
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        if (!session || (user?.role !== 'ADMIN' && user?.role !== 'KARYAWAN')) {
            return NextResponse.json({ error: 'Unauthorized: Admin or Karyawan role required' }, { status: 403 });
        }

        const { id, costPrice } = await request.json();

        if (!id || typeof costPrice !== 'number') {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        const updatedOrder = await prisma.printOrder.update({
            where: { id },
            data: { costPrice }
        });

        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error('Failed to update cost price:', error);
        return NextResponse.json({ error: 'Failed to update cost price' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        if (!session || (user?.role !== 'ADMIN' && user?.role !== 'KARYAWAN')) {
            return NextResponse.json({ error: 'Unauthorized: Admin or Karyawan role required' }, { status: 403 });
        }

        const { ids, all } = await request.json();

        if (all) {
            // Delete all print orders
            await prisma.printOrder.deleteMany({});
            return NextResponse.json({ message: 'All history cleared successfully' });
        }

        if (!ids || !Array.isArray(ids)) {
            return NextResponse.json({ error: 'Invalid IDs provided' }, { status: 400 });
        }

        // Delete specific print orders
        await prisma.printOrder.deleteMany({
            where: {
                id: {
                    in: ids
                }
            }
        });

        return NextResponse.json({ message: `${ids.length} records deleted successfully` });

    } catch (error) {
        console.error('Failed to delete reports:', error);
        return NextResponse.json({ error: 'Failed to delete reports' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const userRole = user.role;

        let whereClause: any = {
            paymentStatus: 'pending'
        };

        if (userRole === 'CLIENT') {
            const client = await prisma.adminUser.findUnique({
                where: { email: user.email },
                select: { id: true }
            });
            if (client) {
                whereClause.adminUserId = client.id;
            } else {
                return NextResponse.json({ error: 'Client not found' }, { status: 404 });
            }
        }

        // Fetch all pending orders
        const pendingOrders = await prisma.printOrder.findMany({
            where: whereClause,
            select: { id: true }
        });

        if (pendingOrders.length === 0) {
            return NextResponse.json({
                message: 'Tidak ada transaksi pending untuk disinkronkan.',
                updatedCount: 0
            });
        }

        const dokuConfig = {
            clientId: (process.env.DOKU_CLIENT_ID || '').trim(),
            secretKey: (process.env.DOKU_SECRET_KEY || '').trim()
        };
        const isProduction = process.env.DOKU_IS_PRODUCTION === 'true';
        const baseUrl = isProduction ? 'https://api.doku.com' : 'https://api-sandbox.doku.com';

        let updatedCount = 0;

        for (const order of pendingOrders) {
            try {
                const requestId = crypto.randomUUID();
                const timestamp = new Date().toISOString().split('.')[0] + 'Z';
                const targetPath = `/orders/v1/status/${order.id}`;

                const signature = generateDokuSignature(
                    dokuConfig,
                    requestId,
                    timestamp,
                    targetPath
                );

                const response = await fetch(`${baseUrl}${targetPath}`, {
                    method: 'GET',
                    headers: {
                        'Client-Id': dokuConfig.clientId,
                        'Request-Id': requestId,
                        'Request-Timestamp': timestamp,
                        'Signature': signature
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const dokuStatus = data.transaction?.status;

                    if (dokuStatus === 'SUCCESS') {
                        await prisma.printOrder.update({
                            where: { id: order.id },
                            data: { paymentStatus: 'paid' }
                        });
                        updatedCount++;
                    } else if (dokuStatus === 'FAILED' || dokuStatus === 'EXPIRED') {
                        await prisma.printOrder.update({
                            where: { id: order.id },
                            data: { paymentStatus: 'failed' }
                        });
                    }
                }
            } catch (dokuError) {
                console.error(`[Report Sync] Error calling DOKU status check for order ${order.id}:`, dokuError);
            }
        }

        return NextResponse.json({
            message: `Berhasil mensinkronkan data. ${updatedCount} transaksi berhasil diperbarui menjadi LUNAS.`,
            updatedCount
        });

    } catch (error) {
        console.error('Failed to sync reports:', error);
        return NextResponse.json({ error: 'Failed to sync reports' }, { status: 500 });
    }
}
