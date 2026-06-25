import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
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

const BUCKET_NAME = 'photobooth-images';

function getSupabase() {
  return getSupabaseAdmin();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let { id } = await params;
  id = id.replace(/\.+$/, '');

  if (!validatePhotoId(id)) {
    return new NextResponse('Invalid ID', { status: 400 });
  }

  const parts = id.split('-');
  const timestampStr = parts[parts.length - 1];
  const timestamp = parseInt(timestampStr, 10);

  if (!isNaN(timestamp) && timestamp > 1000000000000 && timestamp < 2500000000000) {
    let retentionDays = 7;
    try {
      const prismaModule = await import('@/lib/prisma');
      const prisma = prismaModule.default;
      const setting = await prisma.systemSetting.findFirst({
        select: { photoRetentionDays: true }
      });
      if (setting) {
        retentionDays = setting.photoRetentionDays;
      }
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
  const exts = getExtensionsForPhotoId(id);

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    try {
      const blobUrl = await resolveBlobPhotoUrl(id, token, exts);
      if (blobUrl) {
        return NextResponse.redirect(blobUrl, 302);
      }
    } catch { }
  }

  const supabase = getSupabase();
  const directUrl = await resolveSupabasePhotoUrl(supabase, BUCKET_NAME, id, isDownload, exts);
  if (directUrl) {
    return NextResponse.redirect(directUrl, 307);
  }

  const listedUrl = await resolveSupabasePhotoUrlFromList(supabase, BUCKET_NAME, id, isDownload, exts);
  if (listedUrl) {
    return NextResponse.redirect(listedUrl, 307);
  }

  return new NextResponse('Not found', { status: 404 });
}

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(req);
  } catch (response) {
    if (response instanceof Response) return response;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let { id } = await params;
  id = id.replace(/\.+$/, '');

  if (!validatePhotoId(id)) {
    return NextResponse.json({ error: 'Invalid photo ID' }, { status: 400 });
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
