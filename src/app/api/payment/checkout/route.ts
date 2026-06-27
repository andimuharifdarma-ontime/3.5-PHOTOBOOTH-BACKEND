import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import { generateDokuSignature, generateDigest } from '../../../../lib/doku';
import * as crypto from 'crypto';
import { authenticateRequest } from '@/lib/api-auth';
import { checkRateLimit, RATE_LIMIT_CHECKOUT } from '@/lib/rate-limiter';
import { checkoutSchema, formatZodErrors } from '@/lib/validations/schemas';

export async function POST(request: Request) {
    const rateLimit = checkRateLimit(request, 'checkout', RATE_LIMIT_CHECKOUT);
    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: 'Terlalu banyak request. Coba lagi nanti.' },
            { status: 429, headers: rateLimit.headers }
        );
    }

    const auth = await authenticateRequest(request);
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();

        // Validate input with Zod
        const parsed = checkoutSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation error', details: formatZodErrors(parsed.error) },
                { status: 400 }
            );
        }

        const {
            userName,
            frameId,
            frameName: bodyFrameName,
            quantity,
            customerEmail,
            customerPhone
        } = { ...body, ...parsed.data };

        // Fetch frame and its theme to get the correct price
        const frame = await prisma.frame.findUnique({
            where: { id: frameId },
            include: { theme: true }
        });

        if (!frame) {
            return NextResponse.json({ error: 'Frame not found' }, { status: 404 });
        }

        const pricePerFrame = (frame.theme as any).price || 5000;
        const frameName = frame.name || bodyFrameName || 'Photo Print';

        const totalPrice = quantity * pricePerFrame;

        const isPaymentEnabled = auth.user.isPaymentEnabled;
        let resolvedAdminUserId = auth.user.id;

        // Attach frame theme owner when different from authenticated kiosk account
        if (frame?.theme?.userName) {
            const ownerUser = await prisma.adminUser.findFirst({
                where: {
                    name: {
                        equals: frame.theme.userName,
                        mode: 'insensitive',
                    },
                },
                select: { id: true },
            });
            if (ownerUser) {
                resolvedAdminUserId = ownerUser.id;
            }
        }

        // 1. Create order in DB (pending if payment enabled, paid if disabled)
        const newOrder = await prisma.printOrder.create({
            data: {
                userName,
                customerEmail,
                customerPhone,
                frameId,
                frameName: frameName || 'Photo Print',
                quantity,
                pricePerFrame,
                totalPrice,
                imageUrl: '',
                paymentStatus: isPaymentEnabled ? 'pending' : 'paid',
                adminUserId: resolvedAdminUserId, // ATTACH RESOLVED ADMIN USER ID
            } as any
        });

        // 2. If Payment is DISABLED (Sewa Full), return success immediately
        if (!isPaymentEnabled) {
            return NextResponse.json({
                url: `/payment-success?orderId=${newOrder.id}&qty=${quantity}&mode=free`,
                orderId: newOrder.id,
                isFree: true
            });
        }

        // Use order ID as invoice number (DOKU requires alphanumeric, usually max 32 chars)
        // MongoDB ID is 24 chars alphanumeric
        const invoiceNumber = newOrder.id;

        // 2. Prepare DOKU Request
        // Dynamically resolve the Kiosk's port/domain (e.g. port 3000) based on the incoming request's Origin or Referer.
        // This ensures the callback URLs are correctly built for Kiosk port 3000 rather than backend-admin port 3001.
        const requestOrigin = request.headers.get('origin') || request.headers.get('referer');
        let kioskBaseUrl = 'http://localhost:3000'; // Default fallback
        if (requestOrigin) {
            try {
                const parsedUrl = new URL(requestOrigin);
                kioskBaseUrl = parsedUrl.origin;
            } catch (e) {
                // Ignore parsing errors
            }
        }

        const dokuBody = {
            order: {
                amount: totalPrice,
                invoice_number: invoiceNumber,
                currency: 'IDR',
                callback_url: `${kioskBaseUrl}/payment-success?orderId=${newOrder.id}&qty=${quantity}`,
                failed_url: `${kioskBaseUrl}/checkout?orderId=${newOrder.id}&qty=${quantity}&status=failed`,
                return_url: `${kioskBaseUrl}/checkout?orderId=${newOrder.id}&qty=${quantity}&status=back`, // Back to Merchant
                line_items: [
                    {
                        name: frameName || 'Photo Print',
                        price: pricePerFrame,
                        quantity: quantity
                    }
                ]
            },
            payment: {
                payment_due_date: 60, // 60 minutes
                payment_method_types: ['QRIS'] // Force QRIS only - langsung ke halaman QRIS
            },
            customer: {
                id: userName.replace(/\s+/g, '-').toLowerCase(),
                name: userName,
                email: customerEmail,
                phone: customerPhone
            }
        };

        const requestId = crypto.randomUUID();
        const timestamp = new Date().toISOString().split('.')[0] + 'Z';
        const targetPath = '/checkout/v1/payment';

        const dokuConfig = {
            clientId: (process.env.DOKU_CLIENT_ID || '').trim(),
            secretKey: (process.env.DOKU_SECRET_KEY || '').trim()
        };

        const signature = generateDokuSignature(
            dokuConfig,
            requestId,
            timestamp,
            targetPath,
            dokuBody
        );

        const digest = generateDigest(dokuBody);

        const isProduction = process.env.DOKU_IS_PRODUCTION === 'true';
        const baseUrl = isProduction ? 'https://api.doku.com' : 'https://api-sandbox.doku.com';

        // DOKU debug logging removed for production security

        const response = await fetch(`${baseUrl}${targetPath}`, {
            method: 'POST',
            headers: {
                'Client-Id': dokuConfig.clientId,
                'Request-Id': requestId,
                'Request-Timestamp': timestamp,
                'Signature': signature,
                'Digest': `SHA-256=${digest}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dokuBody)
        });

        const data = await response.json();
        const paymentUrl = data.response?.payment?.url;

        if (response.ok && paymentUrl) {
            // Update order with payment URL so we can redirect back to it later
            await prisma.printOrder.update({
                where: { id: newOrder.id },
                data: { paymentUrl: paymentUrl as string } as any
            });

            return NextResponse.json({
                url: paymentUrl,
                orderId: newOrder.id
            });
        } else {
            console.error('DOKU API Error:', data);
            return NextResponse.json({
                error: 'Failed to create DOKU session',
            }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Checkout API error:', error);
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 });
    }
}
