import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getApiKeyFromRequest, resolveUserByApiKey } from '@/lib/api-auth';

// GET all active themes for user-facing pages
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const whereClause: any = { isActive: true };

        if (session?.user) {
            const user = session.user as any;

            if (user.role !== 'ADMIN') {
                const userName = (user.name || user.email || '').toLowerCase();
                whereClause.userName = {
                    equals: userName,
                    mode: 'insensitive',
                };
            }
        } else {
            const adminUser = await resolveUserByApiKey(getApiKeyFromRequest(request));
            if (!adminUser) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const ownerName = (adminUser.name || adminUser.email || '').toLowerCase();
            whereClause.userName = {
                equals: ownerName,
                mode: 'insensitive',
            };
        }

        const themes = await prisma.frameTheme.findMany({
            where: whereClause,
            orderBy: { order: 'asc' },
            include: {
                frames: {
                    where: { isActive: true },
                    orderBy: { order: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        previewUrl: true,
                        imageUrl: true,
                        price: true,
                        outputWidth: true,
                        outputHeight: true,
                        slots: true,
                        framePosition: true,
                    },
                },
                _count: {
                    select: { frames: true },
                },
            },
        });
        return NextResponse.json(themes);
    } catch (error) {
        console.error('Failed to fetch themes:', error);
        return NextResponse.json({ error: 'Failed to fetch themes' }, { status: 500 });
    }
}
