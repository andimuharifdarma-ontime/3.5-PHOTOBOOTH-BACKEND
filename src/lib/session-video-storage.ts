import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  isAlreadyMobileMp4,
  transcodeBufferToMobileMp4,
} from '@/lib/server-transcode';

const BUCKET_NAME = 'photobooth-images';

export function getSupabaseAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export function isSessionVideoAssetId(id: string): boolean {
  return id.endsWith('-bonus') || id.endsWith('-live');
}

function sourceExtensionsForId(id: string): string[] {
  if (id.endsWith('-bonus')) return ['mp4', 'webm', 'gif'];
  if (id.endsWith('-live')) return ['mp4', 'webm'];
  return [];
}

export async function downloadAssetBuffer(
  supabase: SupabaseClient,
  id: string,
  ext: string,
): Promise<Buffer | null> {
  const storagePath = `images/${id}.${ext}`;
  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(storagePath);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function uploadAssetBuffer(
  supabase: SupabaseClient,
  id: string,
  ext: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const storagePath = `images/${id}.${ext}`;

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
    try {
      const { put } = await import('@vercel/blob');
      const res = await put(storagePath, new Blob([new Uint8Array(buffer)], { type: contentType }), {
        access: 'public',
        token: blobToken,
      });
      return res.url;
    } catch (e) {
      console.error('Vercel Blob upload failed, falling back to Supabase:', e);
    }
  }

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
  return data.publicUrl;
}

export type NormalizeVideoResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  url?: string;
};

export async function normalizeSessionVideoAsset(id: string): Promise<NormalizeVideoResult> {
  if (!isSessionVideoAssetId(id)) {
    return { ok: false, reason: 'invalid_id' };
  }

  const supabase = getSupabaseAdmin();
  const extensions = sourceExtensionsForId(id);

  let sourceBuffer: Buffer | null = null;
  let sourceExt = 'mp4';

  for (const ext of extensions) {
    const buffer = await downloadAssetBuffer(supabase, id, ext);
    if (buffer) {
      sourceBuffer = buffer;
      sourceExt = ext;
      break;
    }
  }

  if (!sourceBuffer) {
    return { ok: false, reason: 'not_found' };
  }

  if (sourceExt === 'mp4' && isAlreadyMobileMp4(sourceBuffer)) {
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(`images/${id}.mp4`);
    return { ok: true, skipped: true, reason: 'already_mobile', url: data.publicUrl };
  }

  const mp4Buffer = await transcodeBufferToMobileMp4(sourceBuffer, sourceExt);
  const url = await uploadAssetBuffer(supabase, id, 'mp4', mp4Buffer, 'video/mp4');

  return { ok: true, skipped: false, url };
}
