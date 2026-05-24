import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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

        // Parse orders to include session ID and assets
        const galleryItems = orders.map(order => {
            let sessionId = '';
            // Try to extract from download URL first
            const match = order.imageUrl.match(/\/download\/([^\/]+)$/);
            if (match) {
                sessionId = match[1];
            } else if (order.imageUrl.includes('stableMediaId=')) { // Fallback if query param used
                const urlObj = new URL(order.imageUrl);
                sessionId = urlObj.searchParams.get('stableMediaId') || '';
            } else {
                // If the imageUrl is just an ID (fallback)
                sessionId = order.imageUrl.split('/').pop() || order.id;
            }

            return {
                id: order.id,
                sessionId,
                userName: order.userName,
                frameName: order.frameName,
                createdAt: order.createdAt,
                shareUrl: order.imageUrl,
            };
        }).filter(item => item.sessionId); // Only include items with a valid session ID

        return NextResponse.json({ success: true, items: galleryItems });

    } catch (error) {
        console.error('Error fetching gallery:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
