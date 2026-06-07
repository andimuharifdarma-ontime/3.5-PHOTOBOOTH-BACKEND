export interface ArtisticFilter {
    id: string;
    name: string;
    description?: string;
    icon?: string;
}

export const ALL_ARTISTIC_FILTERS: ArtisticFilter[] = [
{ id: 'original', name: 'Original', description: 'Tampilan asli kamera tanpa modifikasi warna.', icon: '📸' },
    { id: 'bw', name: 'Hitam & Putih', description: 'Klasik monokrom dengan kontras yang seimbang.', icon: '⚫️' },
    { id: 'sepia', name: 'Sepia / Vintage', description: 'Sentuhan nostalgia dengan nuansa kecokelatan.', icon: '🎞️' },
    { id: 'cool', name: 'Cool Tone', description: 'Nuansa dingin kebiruan yang modern dan bersih.', icon: '❄️' },
    { id: 'warm', name: 'Warm Tone', description: 'Nuansa hangat yang nyaman dan mengundang.', icon: '☀️' },
    { id: 'vivid', name: 'Vivid', description: 'Warna yang lebih tajam dan mencolok (High Saturation).', icon: '🌈' },
    { id: 'vintage-warm', name: 'Vintage Warm', description: 'Kombinasi klasik retro dengan kehangatan warna.', icon: '🕯️' },
    { id: 'cinematic', name: 'Cinematic', description: 'Gaya teal & orange layaknya film layar lebar.', icon: '🎬' },
    { id: 'pastel', name: 'Soft Pastel', description: 'Warna lembut dan cerah untuk kesan estetik.', icon: '🍭' },
    { id: 'dramatic', name: 'Dramatic', description: 'Bayangan yang dalam dengan kontras tinggi.', icon: '🎭' },
    { id: 'noir-contrast', name: 'Noir Contrast', description: 'Hitam putih dramatis dengan bayangan pekat.', icon: '🔦' },
    { id: 'golden-hour', name: 'Golden Hour', description: 'Cahaya matahari sore yang keemasan.', icon: '🌅' },
    { id: 'matte', name: 'Matte Finish', description: 'Kontras rendah dengan blacks yang terangkat.', icon: '🎨' },
    { id: 'clean-pop', name: 'Clean Pop', description: 'Warna bersih yang menonjol dan cerah.', icon: '✨' },
    { id: 'emerald', name: 'Emerald Moody', description: 'Nuansa hijau gelap yang misterius dan elegan.', icon: '🌲' },
    { id: 'rosy', name: 'Rosy Pink', description: 'Sentuhan merah muda yang lembut dan romantis.', icon: '🌸' },
    { id: 'ocean', name: 'Ocean Blue', description: 'Segarnya nuansa biru laut yang dalam dan tenang.', icon: '🌊' },
    { id: 'late-night', name: 'Late Night', description: 'Kontras tinggi dengan sentuhan ungu malam.', icon: '🎆' },
    { id: 'autumn', name: 'Autumn Leaf', description: 'Nuansa hangat daun musim gugur yang ikonik.', icon: '🍂' },
    { id: 'soft-glow', name: 'Soft Glow', description: 'Efek cahaya lembut yang memberikan kesan mimpi.', icon: '☁️' },
    { id: 'cyberpunk', name: 'Cyberpunk', description: 'Kontras neon pink dan biru yang futuristik.', icon: '🌆' },
    { id: 'royal-gold', name: 'Royal Gold', description: 'Warna emas mewah dengan kontras yang kaya.', icon: '👑' },
    { id: 'kodak-portra', name: 'Kodak Portra 400', description: 'Warna kulit yang hangat dengan grain film halus.', icon: '📼' },
    { id: 'fuji-pro', name: 'Fuji Pro 400H', description: 'Shadows kebiruan dan grain bersih khas roll film.', icon: '🎞️' },
    { id: 'agfa-vista', name: 'Agfa Vista 200', description: 'Warna vibran dan nostalgic grain yang kental.', icon: '📸' },
    { id: 'ilford-hp5', name: 'Ilford HP5 Plus', description: 'Hitam putih kontras tinggi dengan grain kasar.', icon: '🌑' },
    { id: 'ektachrome', name: 'Ektachrome E100', description: 'Film slide dengan warna biru tajam dan putih bersih.', icon: '🎥' },
    { id: 'fuji-velvia', name: 'Fuji Velvia 50', description: 'Saturation maksimal untuk lanskap yang dramatis.', icon: '⛰️' },
    { id: 'lomochrome', name: 'LomoChrome Purple', description: 'Dunia surealis dengan sentuhan ungu dan grain.', icon: '💜' },
    { id: 'cinestill', name: 'Cinestill 800T', description: 'Tungsten balance dengan halasi merah pada highlights.', icon: '🏮' },
    { id: 'kodak-gold', name: 'Kodak Gold 200', description: 'Warna emas klasik dengan kontras hangat yang nostalgik.', icon: '💫' },
    { id: 'fuji-superia', name: 'Fuji Superia 400', description: 'Shadows kehijauan dengan grain yang kaya.', icon: '🥗' },
    { id: 'polaroid-600', name: 'Polaroid 600', description: 'Fading blacks dengan kontras instan khas Polaroid.', icon: '🖼️' },
    { id: 'kodachrome', name: 'Kodachrome 64', description: 'Warna merah yang kaya dan detail film legendaris.', icon: '📽️' },
    { id: 'film-leak', name: 'Extreme Film Leak', description: 'Kebocoran cahaya oranye dramatis khas roll film terbakar.', icon: '🌋' },
    { id: 'aerochrome', name: 'Aerochrome EIR', description: 'False-color infrared dengan nuansa daun merah dan langit cyan.', icon: '🍁' },
    { id: 'negative-burn', name: 'Burnt Negative', description: 'Simulasi film negatif dengan sisa-sisa hangus di area highlights.', icon: '🔥' },
];

export const applyFilterToImageData = (data: Uint8ClampedArray, filterType: string, width: number = 0, height: number = 0) => {
    for (let i = 0; i < data.length; i += 4) {
        const x = width > 0 ? (i / 4) % width : 0;
        const y = width > 0 ? Math.floor((i / 4) / width) : 0;
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        switch (filterType) {

                    case 'bw':
                        const gray = r * 0.299 + g * 0.587 + b * 0.114;
                        data[i] = data[i + 1] = data[i + 2] = gray;
                        break;
                    case 'sepia':
                        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                        data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                        data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                        break;
                    case 'cool':
                        data[i] = Math.min(255, r * 0.9);
                        data[i + 1] = Math.min(255, g * 0.95);
                        data[i + 2] = Math.min(255, b * 1.1);
                        break;
                    case 'warm':
                        data[i] = Math.min(255, r * 1.1);
                        data[i + 1] = Math.min(255, g * 1.05);
                        data[i + 2] = Math.min(255, b * 0.9);
                        break;
                    case 'vivid':
                        const factor = 1.3;
                        data[i] = Math.min(255, Math.max(0, (r - 128) * factor + 128));
                        data[i + 1] = Math.min(255, Math.max(0, (g - 128) * factor + 128));
                        data[i + 2] = Math.min(255, Math.max(0, (b - 128) * factor + 128));
                        break;
                    case 'vintage-warm':
                        const trV = (r * 0.393) + (g * 0.769) + (b * 0.189);
                        const tgV = (r * 0.349) + (g * 0.686) + (b * 0.168);
                        const tbV = (r * 0.272) + (g * 0.534) + (b * 0.131);
                        data[i] = Math.min(255, (r * 0.8) + (trV * 0.2) + 20);
                        data[i + 1] = Math.min(255, (g * 0.8) + (tgV * 0.2) + 10);
                        data[i + 2] = Math.min(255, (b * 0.8) + (tbV * 0.2));
                        break;
                    case 'cinematic':
                        data[i] = Math.min(255, r * 1.1);
                        data[i + 1] = Math.min(255, g * 1.0);
                        data[i + 2] = Math.min(255, b * 0.9 + 20);
                        break;
                    case 'pastel':
                        data[i] = Math.min(255, r * 1.1 + 10);
                        data[i + 1] = Math.min(255, g * 1.1 + 10);
                        data[i + 2] = Math.min(255, b * 1.1 + 10);
                        break;
                    case 'dramatic':
                        const factorD = 1.2;
                        data[i] = Math.min(255, Math.max(0, (r - 128) * factorD + 128 - 20));
                        data[i + 1] = Math.min(255, Math.max(0, (g - 128) * factorD + 128 - 20));
                        data[i + 2] = Math.min(255, Math.max(0, (b - 128) * factorD + 128 - 20));
                        break;
                    case 'noir-contrast':
                        const grayC = Math.min(255, Math.max(0, ((r * 0.299 + g * 0.587 + b * 0.114) - 128) * 1.4 + 128));
                        data[i] = data[i + 1] = data[i + 2] = grayC;
                        break;
                    case 'golden-hour':
                        data[i] = Math.min(255, r * 1.15);
                        data[i + 1] = Math.min(255, g * 1.1);
                        data[i + 2] = Math.min(255, b * 0.9);
                        break;
                    case 'matte':
                        data[i] = Math.min(255, r * 0.9 + 25);
                        data[i + 1] = Math.min(255, g * 0.9 + 25);
                        data[i + 2] = Math.min(255, b * 0.9 + 25);
                        break;
                    case 'clean-pop':
                        const avgPop = (r + g + b) / 3;
                        data[i] = Math.min(255, avgPop + (r - avgPop) * 1.2 + 10);
                        data[i + 1] = Math.min(255, avgPop + (g - avgPop) * 1.2 + 10);
                        data[i + 2] = Math.min(255, avgPop + (b - avgPop) * 1.2 + 10);
                        break;
                    case 'emerald':
                        data[i] = Math.min(255, r * 0.9);
                        data[i + 1] = Math.min(255, g * 1.1 + 10);
                        data[i + 2] = Math.min(255, b * 0.9);
                        break;
                    case 'rosy':
                        data[i] = Math.min(255, r * 1.2 + 10);
                        data[i + 1] = Math.min(255, g * 0.9);
                        data[i + 2] = Math.min(255, b * 1.0 + 5);
                        break;
                    case 'ocean':
                        data[i] = Math.min(255, r * 0.8);
                        data[i + 1] = Math.min(255, g * 1.0);
                        data[i + 2] = Math.min(255, b * 1.3);
                        break;
                    case 'late-night':
                        data[i] = Math.min(255, r * 0.7 + 10);
                        data[i + 1] = Math.min(255, g * 0.7);
                        data[i + 2] = Math.min(255, b * 0.9 + 25);
                        break;
                    case 'autumn':
                        data[i] = Math.min(255, r * 1.3);
                        data[i + 1] = Math.min(255, g * 0.9);
                        data[i + 2] = Math.min(255, b * 0.7);
                        break;
                    case 'soft-glow':
                        data[i] = Math.min(255, r * 0.9 + 40);
                        data[i + 1] = Math.min(255, g * 0.9 + 40);
                        data[i + 2] = Math.min(255, b * 0.9 + 40);
                        break;
                    case 'cyberpunk':
                        data[i] = Math.min(255, r * 1.3 + 20);
                        data[i + 1] = Math.min(255, g * 0.8);
                        data[i + 2] = Math.min(255, b * 1.4 + 20);
                        break;
                    case 'royal-gold':
                        data[i] = Math.min(255, r * 1.4);
                        data[i + 1] = Math.min(255, g * 1.2);
                        data[i + 2] = Math.min(255, b * 0.6);
                        break;
                    case 'kodak-portra':
                        // Warm highlights, soft shadows
                        r = r * 1.1 + 10;
                        g = g * 1.05 + 5;
                        b = b * 0.95;
                        const grainK = (Math.random() - 0.5) * 20;
                        data[i] = Math.min(255, Math.max(0, r + grainK));
                        data[i + 1] = Math.min(255, Math.max(0, g + grainK));
                        data[i + 2] = Math.min(255, Math.max(0, b + grainK));
                        break;
                    case 'fuji-pro':
                        // Magenta-green shift, cool shadows
                        r = r * 0.95;
                        g = g * 1.05;
                        b = b * 1.1 + 5;
                        const grainF = (Math.random() - 0.5) * 15;
                        data[i] = Math.min(255, Math.max(0, r + grainF));
                        data[i + 1] = Math.min(255, Math.max(0, g + grainF));
                        data[i + 2] = Math.min(255, Math.max(0, b + grainF));
                        break;
                    case 'agfa-vista':
                        // Vibrant reds, nostalgic warm glow
                        r = r * 1.25;
                        g = g * 1.1;
                        b = b * 0.9;
                        const grainA = (Math.random() - 0.5) * 25;
                        data[i] = Math.min(255, Math.max(0, r + grainA));
                        data[i + 1] = Math.min(255, Math.max(0, g + grainA));
                        data[i + 2] = Math.min(255, Math.max(0, b + grainA));
                        break;
                    case 'ilford-hp5':
                        // Moody B&W with heavy grain
                        const grayH = (r * 0.299 + g * 0.587 + b * 0.114) * 1.1;
                        const grainH = (Math.random() - 0.5) * 40;
                        data[i] = data[i + 1] = data[i + 2] = Math.min(255, Math.max(0, grayH + grainH));
                        break;
                    case 'ektachrome':
                        // Strong blues, clean whites
                        r = r * 0.9 + 5;
                        g = g * 1.0;
                        b = b * 1.2 + 10;
                        const grainE = (Math.random() - 0.5) * 12;
                        data[i] = Math.min(255, Math.max(0, r + grainE));
                        data[i + 1] = Math.min(255, Math.max(0, g + grainE));
                        data[i + 2] = Math.min(255, Math.max(0, b + grainE));
                        break;
                    case 'fuji-velvia':
                        // Max saturation, high contrast
                        const factorV = 1.4;
                        r = Math.min(255, Math.max(0, (r - 128) * factorV + 128)) * 1.1;
                        g = Math.min(255, Math.max(0, (g - 128) * factorV + 128)) * 1.2;
                        b = Math.min(255, Math.max(0, (b - 128) * factorV + 128)) * 1.0;
                        const grainV = (Math.random() - 0.5) * 8;
                        data[i] = Math.min(255, Math.max(0, r + grainV));
                        data[i + 1] = Math.min(255, Math.max(0, g + grainV));
                        data[i + 2] = Math.min(255, Math.max(0, b + grainV));
                        break;
                    case 'lomochrome':
                        // Surreal purple/pink shift
                        r = b * 1.2;
                        g = g * 0.8;
                        b = r * 1.1;
                        const grainL = (Math.random() - 0.5) * 30;
                        data[i] = Math.min(255, Math.max(0, r + grainL));
                        data[i + 1] = Math.min(255, Math.max(0, g + grainL));
                        data[i + 2] = Math.min(255, Math.max(0, b + grainL));
                        break;
                    case 'cinestill':
                        // Tungsten balance (blue-ish) + Halation (red in highlights)
                        r = r * 0.9;
                        g = g * 0.95;
                        b = b * 1.2;
                        if (r > 200) r = Math.min(255, r * 1.15); // Halation effect
                        const grainCine = (Math.random() - 0.5) * 18;
                        data[i] = Math.min(255, Math.max(0, r + grainCine));
                        data[i + 1] = Math.min(255, Math.max(0, g + grainCine));
                        data[i + 2] = Math.min(255, Math.max(0, b + grainCine));
                        break;
                    case 'kodak-gold':
                        // Warm, golden, contrasty
                        r = r * 1.2;
                        g = g * 1.1;
                        b = b * 0.85;
                        const grainGold = (Math.random() - 0.5) * 22;
                        data[i] = Math.min(255, Math.max(0, r + grainGold));
                        data[i + 1] = Math.min(255, Math.max(0, g + grainGold));
                        data[i + 2] = Math.min(255, Math.max(0, b + grainGold));
                        break;
                    case 'fuji-superia':
                        // Greenish shadows, high saturation
                        r = r * 0.9;
                        g = g * 1.2;
                        b = b * 1.1;
                        if (r < 50) g = Math.min(255, g * 1.2); // Green in shadows
                        const grainSup = (Math.random() - 0.5) * 25;
                        data[i] = Math.min(255, Math.max(0, r + grainSup));
                        data[i + 1] = Math.min(255, Math.max(0, g + grainSup));
                        data[i + 2] = Math.min(255, Math.max(0, b + grainSup));
                        break;
                    case 'polaroid-600':
                        // Fading blacks (lift blacks), high contrast
                        r = r * 0.9 + 40;
                        g = g * 0.9 + 40;
                        b = b * 0.9 + 40;
                        const contrastP = 1.3;
                        r = Math.min(255, Math.max(0, (r - 128) * contrastP + 128));
                        g = Math.min(255, Math.max(0, (g - 128) * contrastP + 128));
                        b = Math.min(255, Math.max(0, (b - 128) * contrastP + 128));
                        const grainPol = (Math.random() - 0.5) * 35;
                        data[i] = Math.min(255, Math.max(0, r + grainPol));
                        data[i + 1] = Math.min(255, Math.max(0, g + grainPol));
                        data[i + 2] = Math.min(255, Math.max(0, b + grainPol));
                        break;
                    case 'kodachrome':
                        // Deep reds, high detail, moderate contrast
                        r = r * 1.4;
                        g = g * 0.9;
                        b = b * 0.9;
                        const contrastK = 1.1;
                        r = Math.min(255, Math.max(0, (r - 128) * contrastK + 128));
                        g = Math.min(255, Math.max(0, (g - 128) * contrastK + 128));
                        b = Math.min(255, Math.max(0, (b - 128) * contrastK + 128));
                        const grainKod = (Math.random() - 0.5) * 10;
                        data[i] = Math.min(255, Math.max(0, r + grainKod));
                        data[i + 1] = Math.min(255, Math.max(0, g + grainKod));
                        data[i + 2] = Math.min(255, Math.max(0, b + grainKod));
                        break;
                    case 'film-leak': {
                        // Dramatic orange leaks near right edge
                        const distToEdge = (width - x) / width;
                        const leakIntensity = Math.max(0, 1 - distToEdge * 2);
                        const leakR = 255 * leakIntensity * (0.8 + Math.random() * 0.2);
                        const leakG = 120 * leakIntensity * (0.8 + Math.random() * 0.2);
                        r = Math.min(255, r * 1.1 + leakR);
                        g = Math.min(255, g * 1.05 + leakG);
                        b = b * 0.9;
                        const gF = (Math.random() - 0.5) * 15;
                        data[i] = Math.min(255, Math.max(0, r + gF));
                        data[i + 1] = Math.min(255, Math.max(0, g + gF));
                        data[i + 2] = Math.min(255, Math.max(0, b + gF));
                        break;
                    }
                    case 'aerochrome': {
                        // False-color infrared: Greens become red
                        const shiftR = g * 1.4;
                        const shiftG = b * 1.1;
                        const shiftB = r * 0.8;
                        const gAero = (Math.random() - 0.5) * 15;
                        data[i] = Math.min(255, Math.max(0, shiftR + gAero));
                        data[i + 1] = Math.min(255, Math.max(0, shiftG + gAero));
                        data[i + 2] = Math.min(255, Math.max(0, shiftB + gAero));
                        break;
                    }
                    case 'negative-burn': {
                        // Inverted highlights feel with strong warmth
                        r = Math.min(255, (255 - b) * 0.8 + 100);
                        g = g * 1.2;
                        b = b * 0.5;
                        // Burn spots
                        const burnH = Math.sin(y * 0.01) * Math.cos(x * 0.01);
                        if (burnH > 0.8) { r = 255; g = 150; }
                        const gN = (Math.random() - 0.5) * 20;
                        data[i] = Math.min(255, Math.max(0, r + gN));
                        data[i + 1] = Math.min(255, Math.max(0, g + gN));
                        data[i + 2] = Math.min(255, Math.max(0, b + gN));
                        break;
                    }
                    
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
