import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/api-auth';
import { validatePhotoId, validateUploadBuffer } from '@/lib/upload-validation';

const BUCKET_NAME = 'photobooth-images';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _req: NextRequest,
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

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    try {
      const { head } = await import('@vercel/blob');
      const tryExts = ['png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm', 'json'];
      for (const ext of tryExts) {
        try {
          const meta = await head(`images/${id}.${ext}`, { token });
          if (meta?.url) {
            return NextResponse.redirect(meta.url, 302);
          }
        } catch { }
      }
    } catch { }
  }

  const supabase = getSupabase();
  const tryExts = ['png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm', 'json'];

  for (const ext of tryExts) {
    const storagePath = `images/${id}.${ext}`;
    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);
    if (urlData?.publicUrl) {
      try {
        const checkRes = await fetch(urlData.publicUrl, { method: 'HEAD' });
        if (checkRes.ok) {
          const isDownload = _req.nextUrl.searchParams.get('download') === '1';
          const redirectUrl = isDownload ? `${urlData.publicUrl}?download=1` : urlData.publicUrl;
          return NextResponse.redirect(redirectUrl, 307);
        }
      } catch (e) {
        console.error(`HEAD check failed for ${urlData.publicUrl}:`, e);
      }
    }
  }

  const { data: files } = await supabase.storage
    .from(BUCKET_NAME)
    .list('images', {
      limit: 100,
      search: id
    });

  if (files && files.length > 0) {
    for (const ext of tryExts) {
      const expectedName = `${id}.${ext}`;
      const foundFile = files.find(f => f.name.toLowerCase() === expectedName.toLowerCase());

      if (foundFile) {
        const storagePath = `images/${expectedName}`;
        const isDownload = _req.nextUrl.searchParams.get('download') === '1';
        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath, { download: isDownload });
        return NextResponse.redirect(urlData.publicUrl, 307);
      }
    }
  }

  return new NextResponse('Not found', { status: 404 });
}

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

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
    try {
      const { put } = await import('@vercel/blob');
      const res = await put(`images/${id}.${ext}`, new Blob([arrayBuffer], { type: mime }), {
        access: 'public',
        token: blobToken
      });
      return NextResponse.json({ ok: true, url: res.url });
    } catch (e) {
      console.error('Vercel Blob upload failed, falling back to Supabase:', e);
    }
  }

  const supabase = getSupabase();
  const storagePath = `images/${id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, arrayBuffer, {
      contentType: mime,
      upsert: true,
    });

  if (uploadError) {
    console.error('Supabase Storage upload error:', uploadError);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return NextResponse.json({ ok: true, url: urlData.publicUrl });
}
