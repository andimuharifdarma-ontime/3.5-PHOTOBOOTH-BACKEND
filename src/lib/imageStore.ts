// Simple in-memory image store for development/local usage
// Stores generated JPEGs so we can share them via a stable URL (QR code)

export interface StoredImage {
  data: Uint8Array;
  mime: string;
  createdAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __imageStore: Map<string, StoredImage> | undefined;
}

export const imageStore: Map<string, StoredImage> =
  globalThis.__imageStore || (globalThis.__imageStore = new Map());

export function saveImage(id: string, image: StoredImage) {
  imageStore.set(id, image);
}

export function getImage(id: string): StoredImage | undefined {
  return imageStore.get(id);
}



