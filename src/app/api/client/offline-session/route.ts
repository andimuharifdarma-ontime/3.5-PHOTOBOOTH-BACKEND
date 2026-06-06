import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/api-auth';
import { offlineSessionSchema, formatZodErrors } from '@/lib/validations/schemas';

export async function POST(request: Request) {
    try {
        const auth = await authenticateRequest(request);
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const parsed = offlineSessionSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation error', details: formatZodErrors(parsed.error) },
                { status: 400 }
            );
        }

        const { userName, frameId, frameName, quantity, imageUrl } = parsed.data;

        const isPaymentEnabled = auth.user.isPaymentEnabled;
        if (isPaymentEnabled) {
            return NextResponse.json({ error: 'Payment is enabled. Cannot use offline session route.' }, { status: 403 });
        }

        const newOrder = await prisma.printOrder.create({
            data: {
                userName,
                adminUserId: auth.user.id,
                customerEmail: null,
                customerPhone: null,
                frameId,
                frameName: frameName || 'Photo Print',
                quantity: quantity || 1,
                pricePerFrame: 0,
                totalPrice: 0,
                imageUrl: imageUrl || '',
                paymentStatus: 'paid',
            } as any
        });

        return NextResponse.json({ success: true, orderId: newOrder.id });
    } catch (error: any) {
        console.error('Offline session API error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
