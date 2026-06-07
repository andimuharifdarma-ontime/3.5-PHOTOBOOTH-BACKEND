import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit-logger';

// GET all themes
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const { searchParams } = new URL(request.url);
        const userNameParam = searchParams.get('userName');

        let whereClause: any = {};

        // Security: Clients can ONLY see their own themes
        if (user.role === 'CLIENT') {
            const clientName = (user.name || user.email || '').toLowerCase();
            whereClause.userName = {
                equals: clientName,
                mode: 'insensitive'
            };
        }
        // Admin/Karyawan can see all or filter by specific user
        else if ((user.role === 'ADMIN' || user.role === 'KARYAWAN')) {
            if (userNameParam) {
                whereClause.userName = {
                    equals: userNameParam.toLowerCase(),
                    mode: 'insensitive'
                };
            }
        }

        const themes = await prisma.frameTheme.findMany({
            where: whereClause,
            orderBy: { order: 'asc' },
            include: {
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

// POST create new theme
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;
        const canManage = user.role === 'ADMIN' || user.role === 'KARYAWAN' || user.canManageThemes === true;

        if (!canManage) {
            console.log(`[THEME CREATE] Forbidden for user ${user.email} (Role: ${user.role}, CanManage: ${user.canManageThemes})`);
            return NextResponse.json({ error: 'Forbidden: Management permission required' }, { status: 403 });
        }

        const body = await request.json();
        const { name, description, tag, previewUrl, price, isActive, userName: targetUserName } = body;

        if (!name || !previewUrl) {
            return NextResponse.json({ error: 'Name and previewUrl are required' }, { status: 400 });
        }

        // System logic for ownership
        let themeUserName = 'system';

        if (user.role === 'CLIENT') {
            // Clients ALWAYS own their created themes
            themeUserName = user.name || user.email;
        } else {
            // Admin/Employees can assign to specific users if provided, otherwise it's theirs/system
            themeUserName = targetUserName || user.name || 'system';
        }

        // Ensure lowercase for consistency
        themeUserName = themeUserName.toLowerCase();

        const maxOrder = await prisma.frameTheme.aggregate({
            _max: { order: true },
        });

        const theme = await prisma.frameTheme.create({
            data: {
                name,
                userName: themeUserName, // Assign ownership
                description: description || null,
                tag: tag || null,
                previewUrl,
                isActive: isActive !== undefined ? isActive : true,
                price: (price !== undefined && price !== '') ? parseInt(price.toString()) : 0,
                order: (maxOrder._max.order ?? 0) + 1,
            } as any,
        });

        // Audit log
        await logAuditEvent({
            userId: user.id || 'unknown',
            userEmail: user.email || 'unknown',
            action: 'CREATE',
            resource: 'theme',
            resourceId: theme.id,
            details: `Created theme "${name}" (owner: ${themeUserName})`,
        }, request);

        return NextResponse.json(theme, { status: 201 });
    } catch (error) {
        console.error('Failed to create theme:', error);
        return NextResponse.json({ error: 'Failed to create theme: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
    }
}
