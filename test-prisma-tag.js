
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Testing tag field in FrameTheme...');

    // Check if we can select tag
    const themes = await prisma.frameTheme.findMany({
        take: 1,
        select: { id: true, name: true, tag: true }
    });

    console.log('Themes found:', themes);

    if (themes.length > 0) {
        const theme = themes[0];
        console.log('Updating theme', theme.id, 'with tag="TEST_TAG"');

        try {
            const updated = await prisma.frameTheme.update({
                where: { id: theme.id },
                data: {
                    tag: "TEST_TAG"
                }
            });
            console.log('Update success:', updated);
        } catch (e) {
            console.error('Update failed:', e);
        }
    } else {
        console.log('No themes found to update.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
