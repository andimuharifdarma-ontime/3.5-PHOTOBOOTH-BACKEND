import type { SupabaseClient } from '@supabase/supabase-js';

const ALL_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm', 'json'] as const;

export function getExtensionsForPhotoId(id: string): string[] {
  const lower = id.toLowerCase();
  if (lower.endsWith('-meta')) return ['json'];
  if (lower.endsWith('-live') || lower.includes('-live-') || lower.includes('-live')) return ['mp4', 'webm'];
  if (lower.includes('-orig-') || lower.includes('-orig')) return ['png', 'jpg', 'jpeg'];
  if (lower.endsWith('-gif') || lower.includes('.gif')) return ['gif'];
  if (lower.endsWith('-bonus') || lower.includes('-bonus')) return ['mp4', 'webm', 'gif'];
  return ['png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm', 'json'];
}

async function headExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function resolveBlobPhotoUrl(
  id: string,
  token: string,
  exts: readonly string[] = ALL_EXTENSIONS,
): Promise<string | null> {
  const { head } = await import('@vercel/blob');
  const checks = exts.map(async (ext) => {
    try {
      const meta = await head(`images/${id}.${ext}`, { token });
      return meta?.url ?? null;
    } catch {
      return null;
    }
  });
  const results = await Promise.all(checks);
  return results.find((url): url is string => url != null) ?? null;
}

export async function resolveSupabasePhotoUrl(
  supabase: SupabaseClient,
  bucket: string,
  id: string,
  download: boolean,
  exts?: string[],
): Promise<string | null> {
  const extensions = exts ?? getExtensionsForPhotoId(id);

  const checks = extensions.map(async (ext) => {
    const storagePath = `images/${id}.${ext}`;
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    if (!data?.publicUrl) return null;
    const exists = await headExists(data.publicUrl);
    if (!exists) return null;
    return download ? `${data.publicUrl}?download=1` : data.publicUrl;
  });

  const results = await Promise.all(checks);
  return results.find((url): url is string => url != null) ?? null;
}

export async function resolveSupabasePhotoUrlFromList(
  supabase: SupabaseClient,
  bucket: string,
  id: string,
  download: boolean,
  exts?: string[],
): Promise<string | null> {
  const extensions = exts ?? getExtensionsForPhotoId(id);
  const { data: files } = await supabase.storage.from(bucket).list('images', {
    limit: 100,
    search: id,
  });

  if (!files?.length) return null;

  for (const ext of extensions) {
    const expectedName = `${id}.${ext}`;
    const foundFile = files.find((f) => f.name.toLowerCase() === expectedName.toLowerCase());
    if (!foundFile) continue;

    const storagePath = `images/${expectedName}`;
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath, { download });
    return data.publicUrl;
  }

  return null;
}
