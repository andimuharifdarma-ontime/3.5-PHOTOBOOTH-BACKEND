import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { logAuditEvent } from '@/lib/audit-logger';
import { createUserSchema, formatZodErrors } from '@/lib/validations/schemas';

// GET all users (Admin only)
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const userRole = (session?.user as any)?.role;

        if (!session || (userRole !== 'ADMIN' && userRole !== 'KARYAWAN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const users = await prisma.adminUser.findMany({
            orderBy: { createdAt: 'desc' }
        });

        // Map users to remove sensitive data and ensure all fields are present
        const safeUsers = users.map((user: any) => ({
            id: user.id || '',
            email: user.email || '',
            name: user.name || '',
            role: user.role || 'KARYAWAN',
            canManageThemes: user.canManageThemes || false,
            canManageFilters: user.canManageFilters || false,
            isPaymentEnabled: user.isPaymentEnabled || false,
            canInputCapital: user.canInputCapital || false,
            initialCapital: user.initialCapital || 0,
            apiKey: user.apiKey || null,
            createdAt: user.createdAt
        }));

        return NextResponse.json(safeUsers, {
            headers: { 'Cache-Control': 'no-store, max-age=0' }
        });
    } catch (error: any) {
        console.error('Failed to fetch users:', error);
        return NextResponse.json({
            error: 'Failed to fetch users'
        }, { status: 500 });
    }
}

// POST create new user (Admin only)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // Validate input with Zod
        const parsed = createUserSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation error', details: formatZodErrors(parsed.error) },
                { status: 400 }
            );
        }

        const { name, email, password, role, canManageThemes, canManageFilters, isPaymentEnabled, canInputCapital, initialCapital } = parsed.data;

        const existingUser = await prisma.adminUser.findUnique({
            where: { email }
        });

        if (existingUser) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await prisma.adminUser.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                canManageThemes,
                canManageFilters,
                isPaymentEnabled,
                canInputCapital,
                initialCapital,
                provider: 'credentials'
            }
        });

        // Audit log
        await logAuditEvent({
            userId: (session.user as any).id || 'unknown',
            userEmail: (session.user as any).email || 'unknown',
            action: 'CREATE',
            resource: 'user',
            resourceId: user.id,
            details: `Created user "${email}" with role ${role}`,
        }, request);

        return NextResponse.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: (user as any).role,
            canManageThemes: (user as any).canManageThemes,
            canManageFilters: (user as any).canManageFilters,
            isPaymentEnabled: (user as any).isPaymentEnabled,
            canInputCapital: (user as any).canInputCapital,
            initialCapital: (user as any).initialCapital,
            apiKey: null
        }, { status: 201 });
    } catch (error) {
        console.error('Failed to create user:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }
}
