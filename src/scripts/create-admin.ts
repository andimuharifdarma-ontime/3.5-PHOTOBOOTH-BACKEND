import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const prisma = new PrismaClient();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> =>
    new Promise((resolve) => rl.question(query, resolve));

async function main() {
    console.log('--- Dove Photobooth: CLI Admin Creator ---');

    try {
        const name = await question('Nama Admin: ');
        const email = await question('Email: ');
        const password = await question('Password: ');
        const role = await question('Role (ADMIN/KARYAWAN) [ADMIN]: ') || 'ADMIN';

        if (!email || !password) {
            console.error('Error: Email dan Password wajib diisi!');
            return;
        }

        const existingUser = await prisma.adminUser.findUnique({
            where: { email }
        });

        if (existingUser) {
            console.error('Error: Email sudah terdaftar!');
            return;
        }

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
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Role: ${(user as any).role}`);

    } catch (error) {
        console.error('Terjadi kesalahan:', error);
    } finally {
        await prisma.$disconnect();
        rl.close();
    }
}

main();
