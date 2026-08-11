import sharp from 'sharp';

const MAX_MAIN_WIDTH = 1920;
const THUMB_WIDTH = 400;
const MAIN_QUALITY = 85;
const THUMB_QUALITY = 75;

export type OptimizedImage = {
  buffer: Buffer;
  contentType: string;
  ext: string;
};

export type OptimizedUploadResult = {
  main: OptimizedImage;
  thumb: OptimizedImage | null;
};

/** Skip re-encoding animated GIFs — sharp would flatten them. */
export function isAnimatedGif(mime: string): boolean {
  return mime === 'image/gif';
}

export async function optimizeImageUpload(
  input: Buffer,
  mime: string,
): Promise<OptimizedUploadResult> {
  if (isAnimatedGif(mime)) {
    return {
      main: { buffer: input, contentType: mime, ext: 'gif' },
      thumb: null,
    };
  }

  const pipeline = sharp(input, { failOn: 'none' }).rotate();

  const mainBuffer = await pipeline
    .clone()
    .resize({ width: MAX_MAIN_WIDTH, withoutEnlargement: true })
    .webp({ quality: MAIN_QUALITY, effort: 4 })
    .toBuffer();

  const thumbBuffer = await sharp(input, { failOn: 'none' })
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY, effort: 3 })
    .toBuffer();

  return {
    main: {
      buffer: mainBuffer,
      contentType: 'image/webp',
      ext: 'webp',
    },
    thumb: {
      buffer: thumbBuffer,
      contentType: 'image/webp',
      ext: 'webp',
    },
  };
}

export async function createThumbnailFromBuffer(
  input: Buffer,
  maxWidth = THUMB_WIDTH,
): Promise<Buffer> {
  return sharp(input, { failOn: 'none' })
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY, effort: 3 })
    .toBuffer();
}
