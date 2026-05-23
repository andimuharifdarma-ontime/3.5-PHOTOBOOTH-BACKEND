import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateDokuSignature } from '@/lib/doku';
import * as crypto from 'crypto';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const userRole = user.role;
        const sessionUserName = user.name;

        const { searchParams } = new URL(request.url);
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');
        const userNameParam = searchParams.get('userName');

        let whereClause: any = {};

        // Security: Clients can ONLY see their own reports
        if (userRole === 'CLIENT') {
            const client = await prisma.adminUser.findUnique({
                where: { email: user.email },
                select: { id: true, name: true }
            });
            if (client) {
                whereClause.OR = [
                    { adminUserId: client.id },
                    { userName: client.name || '' }
                ];
            } else {
                whereClause.userName = sessionUserName; // Fallback
            }
        }
        // Admin/Karyawan can see all or filter by specific user
        else if ((userRole === 'ADMIN' || userRole === 'KARYAWAN') && userNameParam) {
            // Find the client with this name to include their adminUserId in search for more robust data retrieval
            // This fixes the issue where Admin sees 0 data if orders were linked via ID but have different userName
            const targetClient = await prisma.adminUser.findFirst({
                where: { name: userNameParam, role: 'CLIENT' },
                select: { id: true }
            });

            if (targetClient) {
                whereClause.OR = [
                    { adminUserId: targetClient.id },
                    { userName: userNameParam }
                ];
            } else {
                whereClause.userName = userNameParam;
            }
        }

        if (startDateStr && endDateStr) {
            whereClause.createdAt = {
                gte: new Date(new Date(startDateStr).setHours(0, 0, 0, 0)),
                lte: new Date(new Date(endDateStr).setHours(23, 59, 59, 999)),
            };
        } else if (startDateStr) {
            const date = new Date(startDateStr);
            whereClause.createdAt = {
                gte: new Date(date.setHours(0, 0, 0, 0)),
                lte: new Date(date.setHours(23, 59, 59, 999)),
            };
        }

        const orders = await prisma.printOrder.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
        });

        // 1. Transaction Detail & Financial Analysis
        // Assumptions:
        // Operational Cost per print (Paper/Ink/Electric): Rp 2,500 (can be adjusted)
        const OPERATIONAL_COST_PER_PRINT = 2500;

        let totalRevenue = 0;
        let totalEstimatedCost = 0;
        const frameStats: Record<string, { count: number; revenue: number; name: string }> = {};

        const formattedTransactions = orders.map(order => {
            const isFinished = order.paymentStatus === 'paid' || order.paymentStatus === 'printed';
            const revenue = isFinished ? order.totalPrice : 0;
            const cost = isFinished ? order.quantity * (order.costPrice || 2500) : 0;
            const profit = revenue - cost;

            if (isFinished) {
                totalRevenue += revenue;
                totalEstimatedCost += cost;

                // Analytics for most popular frame
                if (!frameStats[order.frameId]) {
                    frameStats[order.frameId] = { count: 0, revenue: 0, name: order.frameName };
                }
                frameStats[order.frameId].count += order.quantity;
                frameStats[order.frameId].revenue += order.totalPrice;
            }

            return {
                id: order.id,
                user: order.userName,
                frame: order.frameName,
                quantity: order.quantity,
                price: order.totalPrice,
                costPrice: order.costPrice || 2500,
                date: order.createdAt,
                status: order.paymentStatus,
                revenue,
                cost,
                profit
            };
        });

        // 2. Most Popular Frames Analysis
        const topFrames = Object.values(frameStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return NextResponse.json({
            transactions: formattedTransactions,
            topFrames,
            financialSummary: {
                totalRevenue,
                totalEstimatedCost,
                totalProfit: totalRevenue - totalEstimatedCost,
                margin: totalRevenue > 0 ? ((totalRevenue - totalEstimatedCost) / totalRevenue) * 100 : 0
            }
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
