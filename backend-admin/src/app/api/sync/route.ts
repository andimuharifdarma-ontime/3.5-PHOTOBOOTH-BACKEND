import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkRateLimit, RATE_LIMIT_SYNC } from '@/lib/rate-limiter';
import { offlineSyncBatchSchema, formatZodErrors } from '@/lib/validations/schemas';

/**
 * Bulk sync offline orders from desktop app queue.
 * Only allowed when payment is disabled for the tenant.
 */
export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req, 'offline-sync', RATE_LIMIT_SYNC);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak request sync. Coba lagi nanti.' },
      { status: 429, headers: rateLimit.headers },
    );
  }

  let auth;
  try {
    auth = await requireAuth(req);
  } catch (response) {
    if (response instanceof Response) return response;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (auth.user.isPaymentEnabled) {
    return NextResponse.json(
      { error: 'Payment enabled — offline sync is not allowed' },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const parsed = offlineSyncBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: formatZodErrors(parsed.error) },
        { status: 400 },
      );
    }

    const userId = auth.user.id;
    const results: { localId: string; serverId: string; success: boolean; error?: string }[] = [];

    for (const order of parsed.data.orders) {
      try {
        const created = await prisma.printOrder.create({
          data: {
            userName: order.userName,
            adminUserId: userId,
            frameId: order.frameId,
            frameName: order.frameName,
            quantity: order.quantity,
            pricePerFrame: order.pricePerFrame,
            totalPrice: order.totalPrice,
            costPrice: order.costPrice,
            imageUrl: order.imageUrl,
            paymentStatus: order.paymentStatus,
            printedAt: order.printedAt ? new Date(order.printedAt) : new Date(),
            createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
          },
        });

        results.push({
          localId: order.localId || order.userName,
          serverId: created.id,
          success: true,
        });
      } catch (err) {
        console.error(`Failed to sync order ${order.localId}:`, err);
        results.push({
          localId: order.localId || 'unknown',
          serverId: '',
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Synced ${successCount}/${parsed.data.orders.length} orders (${failedCount} failed)`,
      results,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
