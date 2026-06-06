const ALLOWED_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
]);

const ALLOWED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/webm',
]);

const ALLOWED_JSON_MIMES = new Set(['application/json']);

export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_JSON_UPLOAD_BYTES = 1 * 1024 * 1024; // 1 MB

type UploadCategory = 'image' | 'video' | 'json';

const MAGIC: Record<UploadCategory, { mime: string; bytes: number[] }[]> = {
  image: [
    { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
    { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
    { mime: 'image/gif', bytes: [0x47, 0x49, 0x46] },
    { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
  ],
  video: [
    { mime: 'video/webm', bytes: [0x1a, 0x45, 0xdf, 0xa3] },
    { mime: 'video/mp4', bytes: [0x00, 0x00, 0x00] }, // ftyp at offset 4
  ],
  json: [],
};

export function classifyMime(mime: string): UploadCategory | null {
  const normalized = mime.split(';')[0].trim().toLowerCase();
  if (ALLOWED_IMAGE_MIMES.has(normalized)) return 'image';
  if (ALLOWED_VIDEO_MIMES.has(normalized)) return 'video';
  if (ALLOWED_JSON_MIMES.has(normalized)) return 'json';
  return null;
}

export function maxBytesForCategory(category: UploadCategory): number {
  switch (category) {
    case 'image':
      return MAX_IMAGE_UPLOAD_BYTES;
    case 'video':
      return MAX_VIDEO_UPLOAD_BYTES;
    case 'json':
      return MAX_JSON_UPLOAD_BYTES;
  }
}

export function extensionForMime(mime: string): string | null {
  const normalized = mime.split(';')[0].trim().toLowerCase();
  if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('gif')) return 'gif';
  if (normalized.includes('webp')) return 'webp';
  if (normalized.includes('mp4')) return 'mp4';
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('json')) return 'json';
  return null;
}

function matchesMagic(buffer: Uint8Array, signature: number[], offset = 0): boolean {
  if (buffer.length < offset + signature.length) return false;
  return signature.every((byte, i) => buffer[offset + i] === byte);
}

export function validateUploadBuffer(
  buffer: ArrayBuffer,
  mime: string
): { ok: true; category: UploadCategory; ext: string } | { ok: false; error: string } {
  const category = classifyMime(mime);
  if (!category) {
    return { ok: false, error: 'Unsupported content type' };
  }

  const ext = extensionForMime(mime);
  if (!ext) {
    return { ok: false, error: 'Unsupported content type' };
  }

  const maxBytes = maxBytesForCategory(category);
  if (buffer.byteLength > maxBytes) {
    return { ok: false, error: `File exceeds maximum size of ${maxBytes} bytes` };
  }

  if (buffer.byteLength === 0) {
    return { ok: false, error: 'Empty file' };
  }

  const bytes = new Uint8Array(buffer);

  if (category === 'json') {
    try {
      JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return { ok: false, error: 'Invalid JSON payload' };
    }
    return { ok: true, category, ext };
  }

  if (category === 'image') {
    const valid = MAGIC.image.some((sig) => matchesMagic(bytes, sig.bytes));
    if (!valid) return { ok: false, error: 'File content does not match declared image type' };
    return { ok: true, category, ext };
  }

  // video
  const webmOk = matchesMagic(bytes, [0x1a, 0x45, 0xdf, 0xa3]);
  const mp4Ok =
    bytes.length >= 8 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70;
  if (!webmOk && !mp4Ok) {
    return { ok: false, error: 'File content does not match declared video type' };
  }

  return { ok: true, category, ext };
}

export function validatePhotoId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{8,128}$/.test(id);
}
