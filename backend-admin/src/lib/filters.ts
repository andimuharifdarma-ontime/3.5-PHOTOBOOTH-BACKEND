import { createFilter } from 'canvas';

export interface FilterDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  cssFilter?: string;
  pixelFilter?: (imageData: ImageData) => ImageData;
}

export const ALL_ARTISTIC_FILTERS: FilterDefinition[] = [
  {
    id: 'original',
    name: 'Original',
    description: 'Foto asli tanpa filter',
    icon: '📷',
    cssFilter: 'none',
  },
  {
    id: 'vintage',
    name: 'Vintage',
    description: 'Efek foto jadul dengan warna hangat',
    icon: '📸',
    cssFilter: 'sepia(0.5) contrast(1.2) brightness(0.9)',
  },
  {
    id: 'bw',
    name: 'Black & White',
    description: 'Foto hitam putih klasik',
    icon: '⬛',
    cssFilter: 'grayscale(1) contrast(1.1)',
  },
  {
    id: 'warm',
    name: 'Warm',
    description: 'Warna hangat seperti sunset',
    icon: '🌅',
    cssFilter: 'sepia(0.3) saturate(1.5) hue-rotate(-10deg)',
  },
  {
    id: 'cool',
    name: 'Cool',
    description: 'Warna dingin seperti winter',
    icon: '❄️',
    cssFilter: 'hue-rotate(180deg) saturate(0.8)',
  },
  {
    id: 'bright',
    name: 'Bright',
    description: 'Cerah dan penuh warna',
    icon: '☀️',
    cssFilter: 'brightness(1.2) saturate(1.3)',
  },
  {
    id: 'contrast',
    name: 'High Contrast',
    description: 'Kontras tinggi untuk efek dramatis',
    icon: '🎭',
    cssFilter: 'contrast(1.5) brightness(0.9)',
  },
  {
    id: 'fade',
    name: 'Fade',
    description: 'Efek pudar seperti film lama',
    icon: '🎬',
    cssFilter: 'contrast(0.8) brightness(1.1) saturate(0.8)',
  },
  {
    id: 'vivid',
    name: 'Vivid',
    description: 'Warna hidup dan cerah',
    icon: '🌈',
    cssFilter: 'saturate(1.8) contrast(1.2)',
  },
  {
    id: 'mono',
    name: 'Monochrome',
    description: 'Monokrom dengan tint biru',
    icon: '🔷',
    cssFilter: 'grayscale(1) sepia(0.2) hue-rotate(200deg)',
  },
  {
    id: 'sepia',
    name: 'Sepia',
    description: 'Efek sepia klasik',
    icon: '🟤',
    cssFilter: 'sepia(1)',
  },
  {
    id: 'invert',
    name: 'Invert',
    description: 'Warna terbalik untuk efek unik',
    icon: '🔄',
    cssFilter: 'invert(1)',
  },
  {
    id: 'blur',
    name: 'Soft Blur',
    description: 'Blur lembut untuk efek dreamy',
    icon: '💫',
    cssFilter: 'blur(2px) brightness(1.1)',
  },
  {
    id: 'sharpen',
    name: 'Sharpen',
    description: 'Tajam dan detail',
    icon: '🔪',
    cssFilter: 'contrast(1.3) brightness(0.95)',
  },
  {
    id: 'polaroid',
    name: 'Polaroid',
    description: 'Efek foto polaroid',
    icon: '📷',
    cssFilter: 'contrast(1.1) saturate(0.8) sepia(0.2)',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Efek film sinematik',
    icon: '🎥',
    cssFilter: 'contrast(1.2) saturate(0.9) brightness(0.9)',
  },
  {
    id: 'retro',
    name: 'Retro',
    description: 'Efek retro 80an',
    icon: '📼',
    cssFilter: 'sepia(0.4) hue-rotate(-15deg) saturate(1.4)',
  },
  {
    id: 'pastel',
    name: 'Pastel',
    description: 'Warna pastel lembut',
    icon: '🎨',
    cssFilter: 'brightness(1.1) saturate(0.7) contrast(0.9)',
  },
  {
    id: 'noir',
    name: 'Film Noir',
    description: 'Hitam putih dramatis',
    icon: '🎬',
    cssFilter: 'grayscale(1) contrast(1.8) brightness(0.7)',
  },
  {
    id: 'vivid-warm',
    name: 'Vivid Warm',
    description: 'Hangat dan hidup',
    icon: '🔥',
    cssFilter: 'saturate(1.6) sepia(0.2) contrast(1.1)',
  },
  {
    id: 'cold',
    name: 'Cold',
    description: 'Dingin dan sejuk',
    icon: '🧊',
    cssFilter: 'hue-rotate(180deg) saturate(0.7) brightness(1.1)',
  },
  {
    id: 'dreamy',
    name: 'Dreamy',
    description: 'Efek mimpi lembut',
    icon: '💭',
    cssFilter: 'blur(1px) brightness(1.2) saturate(1.2)',
  },
  {
    id: 'dramatic',
    name: 'Dramatic',
    description: 'Kontras tinggi dramatis',
    icon: '⚡',
    cssFilter: 'contrast(1.8) brightness(0.8) saturate(1.3)',
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    description: 'Efek golden hour',
    icon: '🌇',
    cssFilter: 'sepia(0.4) saturate(1.4) brightness(1.1)',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'Hijau zamrud',
    icon: '💚',
    cssFilter: 'hue-rotate(120deg) saturate(1.3)',
  },
  {
    id: 'ruby',
    name: 'Ruby',
    description: 'Merah ruby',
    icon: '❤️',
    cssFilter: 'hue-rotate(-30deg) saturate(1.5)',
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    description: 'Biru safir',
    icon: '💙',
    cssFilter: 'hue-rotate(200deg) saturate(1.4)',
  },
  {
    id: 'amber',
    name: 'Amber',
    description: 'Kuning amber',
    icon: '💛',
    cssFilter: 'hue-rotate(30deg) saturate(1.3)',
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Merah muda rose',
    icon: '🌹',
    cssFilter: 'hue-rotate(-60deg) saturate(1.2)',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    description: 'Ungu lavender',
    icon: '💜',
    cssFilter: 'hue-rotate(240deg) saturate(0.8) brightness(1.1)',
  },
  {
    id: 'mint',
    name: 'Mint',
    description: 'Hijau mint segar',
    icon: '🌿',
    cssFilter: 'hue-rotate(150deg) saturate(0.9) brightness(1.1)',
  },
  {
    id: 'peach',
    name: 'Peach',
    description: 'Peach lembut',
    icon: '🍑',
    cssFilter: 'hue-rotate(-20deg) saturate(0.8) brightness(1.15)',
  },
  {
    id: 'sky',
    name: 'Sky Blue',
    description: 'Biru langit cerah',
    icon: '☁️',
    cssFilter: 'hue-rotate(190deg) saturate(1.1) brightness(1.1)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warna sunset',
    icon: '🌅',
    cssFilter: 'sepia(0.3) hue-rotate(-30deg) saturate(1.5)',
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Hijau hutan',
    icon: '🌲',
    cssFilter: 'hue-rotate(120deg) saturate(0.9) brightness(0.9)',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Biru laut dalam',
    icon: '🌊',
    cssFilter: 'hue-rotate(210deg) saturate(1.2) brightness(0.9)',
  },
  {
    id: 'desert',
    name: 'Desert',
    description: 'Warna gurun pasir',
    icon: '🏜️',
    cssFilter: 'sepia(0.5) hue-rotate(20deg) brightness(1.1)',
  },
  {
    id: 'candy',
    name: 'Candy',
    description: 'Warna permen manis',
    icon: '🍬',
    cssFilter: 'saturate(2) brightness(1.2) hue-rotate(-10deg)',
  },
  {
    id: 'metal',
    name: 'Metallic',
    description: 'Efek metalik',
    icon: '⚙️',
    cssFilter: 'contrast(1.4) saturate(0.6) brightness(1.1)',
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Efek neon terang',
    icon: '💡',
    cssFilter: 'saturate(2) contrast(1.3) brightness(1.2)',
  },
  {
    id: 'oil',
    name: 'Oil Paint',
    description: 'Efek cat minyak',
    icon: '🖼️',
    cssFilter: 'contrast(1.3) saturate(1.4) brightness(0.9)',
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    description: 'Efek cat air',
    icon: '🎨',
    cssFilter: 'saturate(0.8) brightness(1.15) contrast(0.9)',
  },
  {
    id: 'sketch',
    name: 'Sketch',
    description: 'Efek sketsa pensil',
    icon: '✏️',
    cssFilter: 'grayscale(1) contrast(1.5) brightness(1.1)',
  },
  {
    id: 'pop',
    name: 'Pop Art',
    description: 'Efek pop art',
    icon: '🎪',
    cssFilter: 'saturate(2) contrast(1.4) brightness(1.1)',
  },
  {
    id: 'grunge',
    name: 'Grunge',
    description: 'Efek grunge kasar',
    icon: '🎸',
    cssFilter: 'contrast(1.3) brightness(0.8) sepia(0.3)',
  },
  {
    id: 'clean',
    name: 'Clean',
    description: 'Bersih dan minimal',
    icon: '✨',
    cssFilter: 'brightness(1.1) contrast(1.1) saturate(0.9)',
  },
  {
    id: 'studio',
    name: 'Studio',
    description: 'Efek studio profesional',
    icon: '📸',
    cssFilter: 'contrast(1.2) brightness(1.05) saturate(1.1)',
  },
  {
    id: 'portrait',
    name: 'Portrait',
    description: 'Efek portrait lembut',
    icon: '👤',
    cssFilter: 'brightness(1.1) saturate(1.1) contrast(0.95)',
  },
  {
    id: 'landscape',
    name: 'Landscape',
    description: 'Efek landscape tajam',
    icon: '🏞️',
    cssFilter: 'contrast(1.2) saturate(1.3) brightness(0.95)',
  },
  {
    id: 'night',
    name: 'Night',
    description: 'Efek malam hari',
    icon: '🌙',
    cssFilter: 'brightness(0.7) contrast(1.3) saturate(1.2)',
  },
  {
    id: 'day',
    name: 'Daylight',
    description: 'Cahaya siang hari',
    icon: '☀️',
    cssFilter: 'brightness(1.2) contrast(1.1) saturate(1.1)',
  },
];

export async function applyFilterToImage(imageUrl: string, filterId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      const filter = ALL_ARTISTIC_FILTERS.find(f => f.id === filterId);
      
      if (filter?.cssFilter) {
        ctx.filter = filter.cssFilter;
      }
      
      ctx.drawImage(img, 0, 0);
      
      if (filter?.pixelFilter) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const filteredData = filter.pixelFilter(imageData);
        ctx.putImageData(filteredData, 0, 0);
      }

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}