const fs = require('fs');

const adminFiltersPageCode = fs.readFileSync('src/app/admin/filters/page.tsx', 'utf-8');

// Extract ALL_FILTERS
const allFiltersMatch = adminFiltersPageCode.match(/const ALL_FILTERS = \[\s*([\s\S]*?)\];/);
const filtersListCode = allFiltersMatch ? `[\n${allFiltersMatch[1]}]` : '[]';

// Extract applyFilter switch cases
const switchMatch = adminFiltersPageCode.match(/switch \(filterType\) {([\s\S]*?)case 'original':/);
const casesCode = switchMatch ? switchMatch[1] : '';

const newFiltersTs = `export interface ArtisticFilter {
    id: string;
    name: string;
    description?: string;
    icon?: string;
}

export const ALL_ARTISTIC_FILTERS: ArtisticFilter[] = ${filtersListCode};

export const applyFilterToImageData = (data: Uint8ClampedArray, filterType: string, width: number = 0, height: number = 0) => {
    for (let i = 0; i < data.length; i += 4) {
        const x = width > 0 ? (i / 4) % width : 0;
        const y = width > 0 ? Math.floor((i / 4) / width) : 0;
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        switch (filterType) {
${casesCode}
            case 'original':
            default:
                break;
        }
    }
};

export const applyFilterToImage = async (imageUrl: string, filterType: string): Promise<string> => {
    if (filterType === 'original') return imageUrl;

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(imageUrl);
                return;
            }

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            applyFilterToImageData(imageData.data, filterType, canvas.width, canvas.height);

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = () => resolve(imageUrl);
        img.src = imageUrl;
    });
};
`;

fs.writeFileSync('src/lib/filters.ts', newFiltersTs);
console.log('src/lib/filters.ts updated successfully.');
