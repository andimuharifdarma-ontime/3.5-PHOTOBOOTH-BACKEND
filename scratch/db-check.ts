import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DATABASE SYNC CHECK ---');
    
    const settings = await prisma.systemSetting.findFirst({
        include: { adminUser: true }
    });
    
    console.log('Current Kiosk Owner (from SystemSetting):');
    if (settings?.adminUser) {
        console.log(`- Name: ${settings.adminUser.name}`);
        console.log(`- Email: ${settings.adminUser.email}`);
        console.log(`- ID: ${settings.adminUser.id}`);
    } else {
        console.log('- NO OWNER LINKED YET');
    }
    
    const themes = await prisma.frameTheme.findMany({
        take: 10
    });
    
    console.log('\nAvailable Themes in DB:');
    if (themes.length === 0) {
        console.log('- NO THEMES FOUND AT ALL');
    } else {
        themes.forEach(t => {
            console.log(`- Theme: "${t.name}" | Owner (userName): "${t.userName}" | Active: ${t.isActive}`);
        });
    }

    const allAdmins = await prisma.adminUser.findMany({
        select: { id: true, name: true, email: true }
    });
    console.log('\nAll Available Admin Users:');
    allAdmins.forEach(a => {
        console.log(`- ${a.name} (${a.email}) [ID: ${a.id}]`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
