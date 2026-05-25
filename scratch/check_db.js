const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying database for admin users (full data)...');
  const users = await prisma.adminUser.findMany();
  console.log('USERS FOUND:', JSON.stringify(users, null, 2));

  console.log('Querying system settings...');
  const settings = await prisma.systemSetting.findMany();
  console.log('SYSTEM SETTINGS:', JSON.stringify(settings, null, 2));
}

main().catch(err => {
  console.error(err);
}).finally(() => {
  prisma.$disconnect();
});
