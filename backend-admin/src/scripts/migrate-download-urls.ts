import { PrismaClient } from '@prisma/client';
import {
  buildDownloadShareUrl,
  extractSessionIdFromImageUrl,
  getPublicBaseUrl,
} from '../lib/share-url';

const prisma = new PrismaClient();

async function main() {
  const baseUrl = getPublicBaseUrl();
  console.log(`--- Migrate PrintOrder download URLs → ${baseUrl} ---`);

  const orders = await prisma.printOrder.findMany({
    select: { id: true, imageUrl: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const order of orders) {
    const sessionId = extractSessionIdFromImageUrl(order.imageUrl, order.id);
    if (!sessionId) {
      skipped += 1;
      continue;
    }

    const nextUrl = buildDownloadShareUrl(sessionId);
    if (order.imageUrl === nextUrl) {
      skipped += 1;
      continue;
    }

    await prisma.printOrder.update({
      where: { id: order.id },
      data: { imageUrl: nextUrl },
    });
    updated += 1;
    console.log(`✓ ${order.id}: ${order.imageUrl} → ${nextUrl}`);
  }

  console.log(`Done. Updated: ${updated}, skipped: ${skipped}, total: ${orders.length}`);
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
