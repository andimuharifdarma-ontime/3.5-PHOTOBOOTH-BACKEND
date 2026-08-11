import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
    buildDownloadShareUrl,
    extractSessionIdFromImageUrl,
} from '@/lib/share-url';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.adminUser.findUnique({
            where: { email: session.user.email }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '24', 10)));
        const search = (searchParams.get('search') || '').trim();
        const skip = (page - 1) * limit;

        const isAdmin = user.role === 'ADMIN';
        const whereClause: any = isAdmin ? {} : { adminUserId: user.id };

        if (search) {
            whereClause.OR = [
                { userName: { contains: search, mode: 'insensitive' } },
                { frameName: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [total, orders] = await Promise.all([
            prisma.printOrder.count({ where: whereClause }),
            prisma.printOrder.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    userName: true,
                    frameName: true,
                    imageUrl: true,
                    createdAt: true,
                }
            }),
        ]);

        const galleryItems = orders.map(order => {
            const sessionId = extractSessionIdFromImageUrl(order.imageUrl, order.id);

            return {
                id: order.id,
                sessionId,
                userName: order.userName,
                frameName: order.frameName,
                createdAt: order.createdAt,
                shareUrl: buildDownloadShareUrl(sessionId),
            };
        }).filter(item => item.sessionId);

        return NextResponse.json({
            success: true,
            items: galleryItems,
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        }, {
            headers: {
                'Cache-Control': 'private, max-age=15, stale-while-revalidate=30',
            },
        });

    } catch (error) {
        console.error('Error fetching gallery:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
