import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, canUploadPhoto } from '@/lib/api-auth';
import { validatePhotoId, validateUploadBuffer } from '@/lib/upload-validation';
import {
  getExtensionsForPhotoId,
  resolveBlobPhotoUrl,
  resolveSupabasePhotoUrl,
  resolveSupabasePhotoUrlFromList,
} from '@/lib/photo-storage';

const BUCKET_NAME = 'photobooth-images';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
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

    const isDownload = req.nextUrl.searchParams.get('download') === '1';
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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  let auth;
  try {
    auth = await requireAuth(req);
  } catch (response) {
    if (response instanceof Response) return response;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawParams = await Promise.resolve(params);
  let id = (rawParams?.id || '').replace(/\.+$/, '');

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
  const storagePath = `images/${id}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(storagePath, buffer, {
    contentType: mime,
    upsert: true,
  });

  if (error) {
    console.error('Storage upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

  return NextResponse.json({
    ok: true,
    url: data.publicUrl,
  });
}
