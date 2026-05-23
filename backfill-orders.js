const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Memulai proses sinkronisasi & backfill adminUserId untuk PrintOrder...');

    // 1. Dapatkan semua PrintOrder yang adminUserId-nya masih NULL
    const orders = await prisma.printOrder.findMany({
        where: {
            adminUserId: null
        }
    });

    console.log(`🔍 Ditemukan ${orders.length} transaksi berstatus 'adminUserId = NULL'`);

    if (orders.length === 0) {
        console.log('✅ Semua transaksi sudah memiliki adminUserId yang valid!');
        return;
    }

    let updatedCount = 0;

    for (const order of orders) {
        try {
            console.log(`-----------------------------------------------`);
            console.log(`Mengoreksi order ID: ${order.id}`);
            console.log(`Frame ID: ${order.frameId}`);

            // 2. Cari Frame dan FrameTheme terkait
            const frame = await prisma.frame.findUnique({
                where: { id: order.frameId },
                include: { theme: true }
            });

            if (!frame || !frame.theme || !frame.theme.userName) {
                console.log(`⚠️ Frame/Theme untuk Order ${order.id} tidak ditemukan atau tidak memiliki pemilik.`);
                continue;
            }

            const themeOwner = frame.theme.userName;
            console.log(`Pemilik Frame Theme: ${themeOwner}`);

            // 3. Cari AdminUser yang namanya cocok dengan theme.userName
            const ownerUser = await prisma.adminUser.findFirst({
                where: {
                    name: {
                        equals: themeOwner,
                        mode: 'insensitive'
                    }
                }
            });

            if (!ownerUser) {
                console.log(`⚠️ Tidak ditemukan AdminUser dengan nama "${themeOwner}" di database.`);
                continue;
            }

            console.log(`✓ Ditemukan AdminUser: ${ownerUser.name} (${ownerUser.email}) -> ID: ${ownerUser.id}`);

            // 4. Update order's adminUserId
            await prisma.printOrder.update({
                where: { id: order.id },
                data: {
                    adminUserId: ownerUser.id
                }
            });

            console.log(`🎉 SUKSES: Order ${order.id} berhasil ditautkan ke ${ownerUser.name}!`);
            updatedCount++;

        } catch (error) {
            console.error(`❌ Gagal memperbarui order ${order.id}:`, error.message);
        }
    }

    console.log(`===============================================`);
    console.log(`✅ SELESAI: Berhasil memperbarui ${updatedCount} dari ${orders.length} transaksi!`);
}

main()
    .catch(e => console.error('Error saat menjalankan script:', e))
    .finally(async () => {
        await prisma.$disconnect();
    });
