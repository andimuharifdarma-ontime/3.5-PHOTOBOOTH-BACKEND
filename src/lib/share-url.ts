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

export function buildDownloadShareUrl(sessionId: string): string {
  return `${getPublicBaseUrl()}/download/${sessionId}`;
}
