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
        const sessionUserName = user.name;

        const { searchParams } = new URL(request.url);
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');
        const userNameParam = searchParams.get('userName');
        const adminUserIdParam = searchParams.get('adminUserId');

        let whereClause: any = {
            // Offline sessions don't have a paymentUrl from DOKU
            // Or we can check if they were created when isPaymentEnabled was false
            // Based on checkout/route.ts, offline orders have paymentStatus 'paid' immediately and no paymentUrl (initially)
            OR: [
                { paymentUrl: null },
                { paymentUrl: '' }
            ],
            paymentStatus: {
                in: ['paid', 'printed']
            }
        };

        // Multi-tenancy Isolation: Clients can ONLY see their own reports
        if (userRole === 'CLIENT') {
            const client = await prisma.adminUser.findUnique({
                where: { email: user.email },
                select: { id: true, name: true }
            });
            if (client) {
                // Combine existing offline filters with user isolation
                const { OR: baseOR, paymentStatus } = whereClause;
                whereClause = {
                    OR: baseOR,
                    paymentStatus,
                    AND: [
                        {
                            OR: [
                                { adminUserId: client.id },
                                { userName: client.name || '' }
                            ]
                        }
                    ]
                };
            } else {
                whereClause.adminUserId = 'none';
            }
        }
        // ADMIN/KARYAWAN can see everything, or filter by specific guest name (userNameParam)
        // or specifically by client (adminUserIdParam)
        else {
            if (adminUserIdParam) {
                whereClause.adminUserId = adminUserIdParam;
            } else if (userNameParam) {
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

        const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
        const totalSessions = orders.length;

        return NextResponse.json({
            orders,
            summary: {
                totalRevenue,
                totalSessions
            }
        });

    } catch (error) {
        console.error('Failed to fetch offline reports:', error);
        return NextResponse.json({ error: 'Failed to fetch offline reports' }, { status: 500 });
    }
}
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { ids, all } = await request.json();

        if (all) {
            // Delete ALL offline reports for a specific filter or everything
            // Note: In session-history context, it's usually safer to keep it filtered if provided
            await prisma.printOrder.deleteMany({
                where: {
                    OR: [
                        { paymentUrl: null },
                        { paymentUrl: '' }
                    ],
                    paymentStatus: {
                        in: ['paid', 'printed']
                    }
                }
            });
        } else if (ids && ids.length > 0) {
            await prisma.printOrder.deleteMany({
                where: {
                    id: { in: ids }
                }
            });
        }

        return NextResponse.json({ message: 'Success' });
    } catch (error) {
        console.error('Failed to delete offline reports:', error);
        return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
}
