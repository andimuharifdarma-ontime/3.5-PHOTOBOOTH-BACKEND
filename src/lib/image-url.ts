const SUPABASE_PUBLIC_MARKER = '/storage/v1/object/public/';
const SUPABASE_RENDER_MARKER = '/storage/v1/render/image/public/';

/** Derive admin upload thumb URL from a main upload URL. */
export function getAdminThumbUrl(url: string): string | null {
  if (!url) return null;
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;

  if (url.includes('/uploads/thumbs/')) {
    return url;
  }

  if (url.includes('/uploads/')) {
    return url
      .replace('/uploads/', '/uploads/thumbs/')
      .replace(/\.(png|jpe?g|gif|webp)$/i, '.webp');
  }

  return null;
}

/** Use Supabase image transformation when available (falls back to original on error). */
export function withSupabaseTransform(
  url: string,
  opts: { width: number; quality?: number; height?: number },
): string {
  if (!url.includes('supabase.co') || !url.includes(SUPABASE_PUBLIC_MARKER)) {
    return url;
  }

  const transformed = url.replace(SUPABASE_PUBLIC_MARKER, SUPABASE_RENDER_MARKER);
  const parsed = new URL(transformed);
  parsed.searchParams.set('width', String(opts.width));
  if (opts.height) parsed.searchParams.set('height', String(opts.height));
  parsed.searchParams.set('resize', 'contain');
  parsed.searchParams.set('quality', String(opts.quality ?? 80));
  return parsed.toString();
}

/** Best thumbnail URL for admin UI lists. */
export function getDisplayThumbUrl(url: string, explicitThumb?: string | null): string {
  if (explicitThumb) return explicitThumb;

  const adminThumb = getAdminThumbUrl(url);
  if (adminThumb) return adminThumb;

  return withSupabaseTransform(url, { width: 400, quality: 75 });
}
