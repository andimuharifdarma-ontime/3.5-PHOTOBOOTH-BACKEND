import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Dove Photobooth: Auto Admin Creator ---');

    try {
        const name = "ANDI1104-DPHO-ADMIN";
        const email = "admin@dovelens.com";
        const password = "ANDI1104@#$";
        const role = "ADMIN";

        const existingUser = await prisma.adminUser.findUnique({
            where: { email }
        });

        if (existingUser) {
            console.log('Info: User sudah ada, melakukan update password...');
            const hashedPassword = await bcrypt.hash(password, 10);
            await prisma.adminUser.update({
                where: { email },
                data: { password: hashedPassword, name }
            });
            console.log('✅ Password berhasil di-update!');
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await prisma.adminUser.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: role.toUpperCase(),
                    provider: 'credentials'
                } as any
            });
            console.log('\n✅ Sukses! Akun Admin berhasil dibuat:');
            console.log(`Email: ${user.email}`);
        }

    } catch (error) {
        console.error('Terjadi kesalahan:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
