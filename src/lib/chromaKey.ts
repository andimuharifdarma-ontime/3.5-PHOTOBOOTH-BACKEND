export type RgbColor = { r: number; g: number; b: number };

export type ChromaKeyQuality = 'preview' | 'final';

export type ChromaKeyOptions = {
  quality?: ChromaKeyQuality;
  /** Maks lebar/tinggi untuk preview live (hemat CPU). */
  maxPreviewDimension?: number;
};

export function hexToRgb(hex: string): RgbColor | null {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0] + normalized[0], 16),
      g: parseInt(normalized[1] + normalized[1], 16),
      b: parseInt(normalized[2] + normalized[2], 16),
    };
  }
  if (normalized.length === 6) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    if ([r, g, b].some((value) => Number.isNaN(value))) return null;
    return { r, g, b };
  }
  return null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal memuat gambar frame'));
    img.src = url;
  });
}

function clampTolerance(tolerance: number): number {
  return Math.max(0, Math.min(100, tolerance));
}

/** Jarak RGB Euclidean maksimum untuk dianggap "mirip" warna pick (≈8–150). */
export function toleranceToDistance(tolerance: number): number {
  const t = clampTolerance(tolerance);
  return 10 + (t / 100) * 140;
}

function colorDistance(r: number, g: number, b: number, target: RgbColor): number {
  return Math.sqrt(
    (r - target.r) ** 2 + (g - target.g) ** 2 + (b - target.b) ** 2,
  );
}

function maxChannelDistance(r: number, g: number, b: number, target: RgbColor): number {
  return Math.max(
    Math.abs(r - target.r),
    Math.abs(g - target.g),
    Math.abs(b - target.b),
  );
}

function smoothstep(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

/**
 * Seberapa mirip pixel dengan warna yang dipick user.
 * Hanya berdasarkan warna pick — tidak ada logika khusus hijau/putih.
 */
function colorMatchScore(
  r: number,
  g: number,
  b: number,
  target: RgbColor,
): number {
  const euclidean = colorDistance(r, g, b, target);
  const maxChannel = maxChannelDistance(r, g, b, target);
  // Kombinasi jarak penuh + selisih channel terbesar (tahan kompresi JPEG).
  return euclidean * 0.72 + maxChannel * 0.55;
}

function matchThresholds(tolerance: number): { remove: number; keep: number } {
  const t = clampTolerance(tolerance);
  const base = toleranceToDistance(t);
  const remove = base * (0.5 + (t / 100) * 0.5);
  const keep = remove + 8 + (1 - t / 100) * 18;
  return { remove, keep };
}

function isKeyColorMatch(
  r: number,
  g: number,
  b: number,
  target: RgbColor,
  tolerance: number,
  slack = 1,
): boolean {
  const { remove } = matchThresholds(tolerance);
  return colorMatchScore(r, g, b, target) <= remove * slack;
}

function computeMatteAlpha(
  r: number,
  g: number,
  b: number,
  target: RgbColor,
  tolerance: number,
): number {
  const score = colorMatchScore(r, g, b, target);
  const { remove, keep } = matchThresholds(tolerance);

  if (score <= remove) return 0;
  if (score >= keep) return 255;

  const feather = smoothstep((score - remove) / Math.max(keep - remove, 1));
  return Math.round(255 * feather);
}

function buildAlphaMap(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const alphaMap = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      alphaMap[y * width + x] = data[(y * width + x) * 4 + 3];
    }
  }
  return alphaMap;
}

function isNearTransparent(
  alphaMap: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
): boolean {
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (alphaMap[ny * width + nx] === 0) return true;
    }
  }
  return false;
}

/** Bersihkan fringe warna pick di tepi area transparan. */
function erodeKeyColorFringe(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  target: RgbColor,
  tolerance: number,
  iterations: number,
): void {
  const alphaMap = buildAlphaMap(data, width, height);

  for (let pass = 0; pass < iterations; pass += 1) {
    const slack = 1 + pass * 0.06;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = y * width + x;
        const i = idx * 4;
        if (alphaMap[idx] === 0) continue;
        if (!isNearTransparent(alphaMap, width, height, x, y, 2)) continue;

        if (isKeyColorMatch(data[i], data[i + 1], data[i + 2], target, tolerance, slack)) {
          data[i + 3] = 0;
          alphaMap[idx] = 0;
        }
      }
    }
  }
}

function resolveOutputSize(
  image: HTMLImageElement,
  quality: ChromaKeyQuality,
  maxPreviewDimension: number,
): { width: number; height: number } {
  const srcW = image.naturalWidth;
  const srcH = image.naturalHeight;

  if (quality === 'final') {
    return { width: srcW, height: srcH };
  }

  const scale = Math.min(1, maxPreviewDimension / Math.max(srcW, srcH));
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  };
}

/** Hapus pixel yang mirip dengan warna pick (semua warna, bukan hanya hijau). */
export function removeBackgroundByColor(
  image: HTMLImageElement,
  target: RgbColor,
  tolerance: number,
  options: ChromaKeyOptions = {},
): HTMLCanvasElement {
  const quality = options.quality ?? 'final';
  const maxPreviewDimension = options.maxPreviewDimension ?? 720;
  const { width, height } = resolveOutputSize(image, quality, maxPreviewDimension);
  const erosionPasses = quality === 'preview' ? 2 : 3;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak tersedia');

  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] = computeMatteAlpha(data[i], data[i + 1], data[i + 2], target, tolerance);
  }

  erodeKeyColorFringe(data, width, height, target, tolerance, erosionPasses);

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0 || data[i + 3] === 255) continue;
    if (isKeyColorMatch(data[i], data[i + 1], data[i + 2], target, tolerance, 1.1)) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Gagal mengekspor PNG'))),
      'image/png',
    );
  });
}

function sampleAverageColor(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
): RgbColor {
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;

  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const x = centerX + dx;
      const y = centerY + dy;
      if (x < 0 || y < 0 || x >= ctx.canvas.width || y >= ctx.canvas.height) continue;
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      rSum += pixel[0];
      gSum += pixel[1];
      bSum += pixel[2];
      count += 1;
    }
  }

  if (count === 0) {
    const pixel = ctx.getImageData(centerX, centerY, 1, 1).data;
    return { r: pixel[0], g: pixel[1], b: pixel[2] };
  }

  return {
    r: Math.round(rSum / count),
    g: Math.round(gSum / count),
    b: Math.round(bSum / count),
  };
}

export function sampleImageColorAtPoint(
  image: HTMLImageElement,
  containerWidth: number,
  containerHeight: number,
  clickX: number,
  clickY: number,
): RgbColor | null {
  if (!containerWidth || !containerHeight) return null;

  const imageRatio = image.naturalWidth / image.naturalHeight;
  const containerRatio = containerWidth / containerHeight;

  let renderWidth = containerWidth;
  let renderHeight = containerHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (imageRatio > containerRatio) {
    renderHeight = containerWidth / imageRatio;
    offsetY = (containerHeight - renderHeight) / 2;
  } else {
    renderWidth = containerHeight * imageRatio;
    offsetX = (containerWidth - renderWidth) / 2;
  }

  const localX = clickX - offsetX;
  const localY = clickY - offsetY;

  if (localX < 0 || localY < 0 || localX > renderWidth || localY > renderHeight) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(image, 0, 0);
  const pixelX = Math.min(
    image.naturalWidth - 1,
    Math.max(0, Math.floor((localX / renderWidth) * image.naturalWidth)),
  );
  const pixelY = Math.min(
    image.naturalHeight - 1,
    Math.max(0, Math.floor((localY / renderHeight) * image.naturalHeight)),
  );

  return sampleAverageColor(ctx, pixelX, pixelY, 2);
}
