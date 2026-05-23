import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            const { searchParams } = new URL(request.url);
            const apiKey = searchParams.get('apiKey') || request.headers.get('x-api-key') || request.headers.get('X-API-Key');

            let owner: any = null;

            if (apiKey) {
                owner = await prisma.adminUser.findFirst({
                    where: { apiKey } as any
                });
            }

            if (!owner) {
                // Fallback KIOSK MODE: Return the profile of the linked admin owner
                const setting = await prisma.systemSetting.findFirst({
                    include: { adminUser: true }
                });
                owner = setting?.adminUser || null;
            }

            if (owner) {
                return NextResponse.json({
                    id: owner.id,
                    name: owner.name,
                    email: owner.email,
                    role: owner.role,
                    isPaymentEnabled: owner.isPaymentEnabled, // Sync with actual admin setting
                    canManageThemes: owner.canManageThemes,
                    canManageFilters: owner.canManageFilters,
                    canInputCapital: owner.canInputCapital,
                    initialCapital: owner.initialCapital
                });
            }

            // Fallback default
            return NextResponse.json({
                id: 'kiosk-user',
                name: 'Kiosk Mode',
                email: 'kiosk@dovelens.ft',
                role: 'ADMIN',
                isPaymentEnabled: true,
                canManageThemes: false,
                canManageFilters: false,
                canInputCapital: false,
                initialCapital: 0
            });
        }

        const email = session.user?.email || '';

        const user = await prisma.adminUser.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                canManageThemes: true,
                canManageFilters: true,
                isPaymentEnabled: true,
                canInputCapital: true,
                initialCapital: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Profile API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { initialCapital } = body;

        if (typeof initialCapital !== 'number') {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        const email = session.user?.email || '';

        // Find user to check canInputCapital or ADMIN role
        const currentUser = await prisma.adminUser.findUnique({
            where: { email }
        });

        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Only allow if ADMIN or has canInputCapital permission
        if (currentUser.role !== 'ADMIN' && !currentUser.canInputCapital) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updatedUser = await prisma.adminUser.update({
            where: { email },
            data: { initialCapital: parseInt(String(initialCapital), 10) }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Profile Update Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
