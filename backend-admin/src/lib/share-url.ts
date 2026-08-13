const DEFAULT_PUBLIC_BASE_URL = 'https://photobox.dovelensft.com';

export function getPublicBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE_URL).replace(/\/$/, '');
}

export function extractSessionIdFromImageUrl(imageUrl: string, fallbackId?: string): string {
  if (!imageUrl) return fallbackId || '';

  const downloadMatch = imageUrl.match(/\/download\/([^/?#]+)/);
  if (downloadMatch) return downloadMatch[1];

  if (imageUrl.includes('stableMediaId=')) {
    try {
      const urlObj = new URL(imageUrl);
      return urlObj.searchParams.get('stableMediaId') || '';
    } catch {
      // ignore malformed URLs
    }
  }

  const lastSegment = imageUrl.split('/').pop() || '';
  return lastSegment.split('?')[0] || fallbackId || '';
}

function normalizePhotoIdFromUrlSegment(segment: string): string {
  return segment.replace(/\.[a-z0-9]+$/i, '');
}

/** True only when imageUrl is our download/share URL or a storage object for this photo ID. */
export function imageUrlBelongsToPhotoId(imageUrl: string, photoId: string): boolean {
  if (!imageUrl || !photoId) return false;

  try {
    const url = new URL(imageUrl, getPublicBaseUrl());
    const downloadMatch = url.pathname.match(/\/download\/([^/]+)$/);
    if (downloadMatch) {
      return normalizePhotoIdFromUrlSegment(downloadMatch[1]) === photoId;
    }

    const stableId = url.searchParams.get('stableMediaId');
    if (stableId && normalizePhotoIdFromUrlSegment(stableId) === photoId) {
      return true;
    }

    const lastSegment = url.pathname.split('/').pop() || '';
    const fileId = normalizePhotoIdFromUrlSegment(lastSegment.split('?')[0]);
    const isStorageObject =
      url.pathname.includes('/photobooth-images/') ||
      url.pathname.includes('/images/') ||
      url.pathname.includes('/live-photos/');
    return isStorageObject && fileId === photoId;
  } catch {
    return false;
  }
}

export function buildDownloadShareUrl(sessionId: string): string {
  return `${getPublicBaseUrl()}/download/${sessionId}`;
}
