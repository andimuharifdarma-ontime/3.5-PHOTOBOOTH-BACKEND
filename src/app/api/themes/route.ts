import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET all active themes for user-facing pages
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const apiKey = searchParams.get('apiKey') || request.headers.get('x-api-key') || request.headers.get('X-API-Key');

        const session = await getServerSession(authOptions);
        const whereClause: any = { isActive: true };

        if (session?.user) {
            const user = session.user as any;

            // ADMIN sees ALL active themes (no userName filter)
            // CLIENT/KARYAWAN only sees their OWN themes
            if (user.role !== 'ADMIN') {
                const userName = (user.name || user.email || '').toLowerCase();
                whereClause.userName = {
                    equals: userName,
                    mode: 'insensitive'
                };
            }
        } else {
            // KIOSK MODE (Unauthenticated)
            // Identify the kiosk owner from API Key or fallback to system settings
            let ownerName = 'system';

            if (apiKey) {
                const adminUser = await prisma.adminUser.findFirst({
                    where: { apiKey } as any
                });
                if (adminUser) {
                    ownerName = (adminUser.name || adminUser.email || '').toLowerCase();
                }
            }

            if (ownerName === 'system') {
                const setting = await prisma.systemSetting.findFirst({
                    include: { adminUser: true }
                });

                if (setting?.adminUser) {
                    const owner = setting.adminUser;
                    ownerName = (owner.name || owner.email || '').toLowerCase();
                }
            }

            whereClause.userName = {
                equals: ownerName,
                mode: 'insensitive'
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
