import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, canUploadPhoto } from '@/lib/api-auth';
import { validatePhotoId, validateUploadBuffer } from '@/lib/upload-validation';
import {
  getExtensionsForPhotoId,
  resolveBlobPhotoUrl,
  resolveSupabasePhotoUrl,
  resolveSupabasePhotoUrlFromList,
} from '@/lib/photo-storage';
import {
  isSessionVideoAssetId,
  normalizeSessionVideoAsset,
  uploadAssetBuffer,
  getSupabaseAdmin,
} from '@/lib/session-video-storage';
import { getGlobalPhotoRetentionDays } from '@/lib/photo-retention';
import { createThumbnailFromBuffer } from '@/lib/image-optimize';

const BUCKET_NAME = 'photobooth-images';

function getSupabase() {
  return getSupabaseAdmin();
}

async function resolveImageSourceUrl(
  id: string,
  isDownload: boolean,
): Promise<string | null> {
  const exts = getExtensionsForPhotoId(id);

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    try {
      const blobUrl = await resolveBlobPhotoUrl(id, token, exts);
      if (blobUrl) return blobUrl;
    } catch { }
  }

  const supabase = getSupabase();
  const directUrl = await resolveSupabasePhotoUrl(supabase, BUCKET_NAME, id, isDownload, exts);
  if (directUrl) return directUrl;

  return resolveSupabasePhotoUrlFromList(supabase, BUCKET_NAME, id, isDownload, exts);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const rawParams = await Promise.resolve(params);
    let id = (rawParams?.id || '').replace(/\.+$/, '');

    if (!id || !validatePhotoId(id)) {
      return new NextResponse('Invalid ID', { status: 400 });
    }

    const parts = id.split('-');
    const timestampStr = parts[parts.length - 1];
    const timestamp = parseInt(timestampStr, 10);

    if (!isNaN(timestamp) && timestamp > 1000000000000 && timestamp < 2500000000000) {
      let retentionDays = 7;
      try {
        retentionDays = await getGlobalPhotoRetentionDays();
      } catch (e) {
        console.error('Error fetching retention setting:', e);
      }

      const elapsedMs = Date.now() - timestamp;
      const limitMs = retentionDays * 24 * 60 * 60 * 1000;

      if (elapsedMs > limitMs) {
        return new NextResponse('Expired', { status: 410 });
      }
    }

    const isDownload = req.nextUrl.searchParams.get('download') === '1';
    const wantsThumb = req.nextUrl.searchParams.get('thumb') === '1';

    if (wantsThumb && !id.includes('-live-') && !id.endsWith('.gif') && !id.includes('.gif')) {
      const sourceUrl = await resolveImageSourceUrl(id, false);
      if (sourceUrl) {
        try {
          const res = await fetch(sourceUrl);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const thumb = await createThumbnailFromBuffer(Buffer.from(arrayBuffer), 480);
            return new NextResponse(new Uint8Array(thumb), {
              status: 200,
              headers: {
                'Content-Type': 'image/webp',
                'Cache-Control': 'public, max-age=31536000, immutable',
              },
            });
          }
        } catch (e) {
          console.error('Thumbnail generation failed, falling back to redirect:', e);
        }
      }
    }

    const sourceUrl = await resolveImageSourceUrl(id, isDownload);
    if (sourceUrl) {
      return NextResponse.redirect(sourceUrl, 307);
    }

    return new NextResponse('Not found', { status: 404 });
  } catch (err: any) {
    console.error('GET /api/images/[id] unhandled error:', err);
    return new NextResponse(err?.message || 'Internal Error', { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let auth;
  try {
    auth = await requireAuth(req);
  } catch (response) {
    if (response instanceof Response) return response;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let { id } = await params;
  id = id.replace(/\.+$/, '');

  if (!validatePhotoId(id)) {
    return NextResponse.json({ error: 'Invalid photo ID' }, { status: 400 });
  }

  if (!(await canUploadPhoto(auth, id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const arrayBuffer = await req.arrayBuffer();
  const mime = req.headers.get('content-type') || 'image/png';
  const validation = validateUploadBuffer(arrayBuffer, mime);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const ext = validation.ext;
  const supabase = getSupabase();
  const buffer = Buffer.from(arrayBuffer);

  let publicUrl: string;
  try {
    publicUrl = await uploadAssetBuffer(supabase, id, ext, buffer, mime);
  } catch (e) {
    console.error('Storage upload error:', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  let normalizedUrl: string | undefined;
  if (
    isSessionVideoAssetId(id) &&
    (validation.category === 'video' || (validation.category === 'image' && ext === 'gif'))
  ) {
    try {
      const normalized = await normalizeSessionVideoAsset(id);
      if (normalized.ok && normalized.url) {
        normalizedUrl = normalized.url;
      }
    } catch (e) {
      console.error('Post-upload normalize failed:', e);
    }
  }

  return NextResponse.json({
    ok: true,
    url: normalizedUrl ?? publicUrl,
    normalized: Boolean(normalizedUrl),
  });
}
