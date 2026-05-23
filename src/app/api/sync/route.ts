import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Endpoint untuk bulk sync data dari offline queue desktop app.
 * Desktop app mengumpulkan data saat offline dan mengirimkan sekaligus saat online.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orders } = body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json(
        { error: 'No orders to sync' },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;
    const results: { localId: string; serverId: string; success: boolean; error?: string }[] = [];

    // Process each order in the queue
    for (const order of orders) {
      try {
        // Validate required fields
        if (!order.userName || !order.frameId || !order.frameName) {
          results.push({
            localId: order.localId || 'unknown',
            serverId: '',
            success: false,
            error: 'Missing required fields (userName, frameId, frameName)',
          });
          continue;
        }

        // Create order in database
        const created = await prisma.printOrder.create({
          data: {
            userName: order.userName,
            adminUserId: userId,
            frameId: order.frameId,
            frameName: order.frameName,
            quantity: order.quantity || 1,
            pricePerFrame: order.pricePerFrame || 0,
            totalPrice: order.totalPrice || 0,
            costPrice: order.costPrice || 2500,
            imageUrl: order.imageUrl || '',
            paymentStatus: order.paymentStatus || 'free',
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
      message: `Synced ${successCount}/${orders.length} orders (${failedCount} failed)`,
      results,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
