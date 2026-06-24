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

        const isAdmin = user.role === 'ADMIN';

        // Admin sees all, client sees only their own
        const whereClause = isAdmin ? {} : { adminUserId: user.id };

        const orders = await prisma.printOrder.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: 200, // Reasonable limit
            select: {
                id: true,
                userName: true,
                frameName: true,
                imageUrl: true,
                createdAt: true,
            }
        });

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

        return NextResponse.json({ success: true, items: galleryItems });

    } catch (error) {
        console.error('Error fetching gallery:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
