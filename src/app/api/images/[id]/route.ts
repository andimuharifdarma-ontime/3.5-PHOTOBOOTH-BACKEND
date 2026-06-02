import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'photobooth-images';

// Lazy Supabase client (only created when needed)
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

  // 0) Expiration check based on timestamp embedded in ID
  const parts = id.split('-');
  const timestampStr = parts[parts.length - 1];
  const timestamp = parseInt(timestampStr, 10);

  if (!isNaN(timestamp) && timestamp > 1000000000000 && timestamp < 2500000000000) {
    let retentionDays = 7; // default fallback
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

  // 1) Try Vercel Blob (if configured)
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    try {
      // @ts-ignore - types for @vercel/blob not needed at build time here
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

  // 2) Try Supabase Storage
  const supabase = getSupabase();
  const tryExts = ['png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm', 'json'];

  // Try direct checking via HEAD request (extremely fast and robust, avoids list pagination limits)
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

  // Fallback: Try Supabase list with increased limit
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
  let { id } = await params;
  id = id.replace(/\.+$/, '');
  // Get the pure ArrayBuffer
  const arrayBuffer = await req.arrayBuffer();
  const mime = req.headers.get('content-type') || 'image/png';

  // Determine file extension
  let ext = 'bin';
  if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
  else if (mime.includes('png')) ext = 'png';
  else if (mime.includes('gif')) ext = 'gif';
  else if (mime.includes('mp4')) ext = 'mp4';
  else if (mime.includes('webm')) ext = 'webm';
  else if (mime.includes('json')) ext = 'json';

  // 1) Try Vercel Blob (if configured)
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    try {
      // @ts-ignore
      const { put } = await import('@vercel/blob');
      const res = await put(`images/${id}.${ext}`, new Blob([arrayBuffer], { type: mime }), {
        access: 'public',
        token
      });
      return NextResponse.json({ ok: true, url: res.url });
    } catch (e) {
      console.error('Vercel Blob upload failed, falling back to Supabase:', e);
    }
  }

  // 2) Upload to Supabase Storage directly with arrayBuffer
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

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return NextResponse.json({ ok: true, url: urlData.publicUrl });
}
