import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getApiKeyFromRequest, resolveUserByApiKey } from '@/lib/api-auth';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            const owner = await resolveUserByApiKey(getApiKeyFromRequest(request));
            if (!owner) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            return NextResponse.json({
                id: owner.id,
                name: owner.name,
                email: owner.email,
                role: owner.role,
                isPaymentEnabled: owner.isPaymentEnabled,
                canManageThemes: owner.canManageThemes,
                canManageFilters: owner.canManageFilters,
                canInputCapital: owner.canInputCapital,
                initialCapital: owner.initialCapital,
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

        const currentUser = await prisma.adminUser.findUnique({
            where: { email }
        });

        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

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
