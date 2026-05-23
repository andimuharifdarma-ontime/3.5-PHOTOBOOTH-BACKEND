import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userName, frameId, frameName, quantity, imageUrl } = body;

        if (!userName || !frameId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check verification that payment is indeed off
        let isPaymentEnabled = true;
        let adminUserId: string | null = null;
        const session = await getServerSession(authOptions);
        if (session?.user?.email) {
            const user = await prisma.adminUser.findUnique({
                where: { email: session.user.email },
                select: { id: true, isPaymentEnabled: true }
            });
            if (user) {
                adminUserId = user.id;
                isPaymentEnabled = user.isPaymentEnabled;
            }
        } else {
            const settings = await prisma.systemSetting.findFirst({
                select: { isPaymentEnabled: true }
            });
            isPaymentEnabled = settings?.isPaymentEnabled !== false;
        }

        if (isPaymentEnabled) {
            return NextResponse.json({ error: 'Payment is enabled. Cannot use offline session route.' }, { status: 403 });
        }

        // If payment is disabled, price should be 0 to avoid confusing the user with default values
        const pricePerFrame = 0;
        const finalFrameName = frameName || 'Photo Print'; // frameName is sent from frontend
        const finalQuantity = quantity || 1;
        const totalPrice = 0;

        // Create the record
        const newOrder = await prisma.printOrder.create({
            data: {
                userName,
                adminUserId, // Store the client ID who owns this booth!
                customerEmail: null,
                customerPhone: null,
                frameId,
                frameName: finalFrameName,
                quantity: finalQuantity,
                pricePerFrame,
                totalPrice,
                imageUrl: imageUrl || '',
                paymentStatus: 'paid', // Mark as paid for offline reports
            } as any
        });

        return NextResponse.json({ success: true, orderId: newOrder.id });

    } catch (error: any) {
        console.error('Offline session API error:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}
