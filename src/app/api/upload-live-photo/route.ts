import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/api-auth';
import { validateUploadBuffer } from '@/lib/upload-validation';
import { livePhotoUploadSchema, formatZodErrors } from '@/lib/validations/schemas';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);
  } catch (response) {
    if (response instanceof Response) return response;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('video') as File | null;
    const photoId = formData.get('photoId') as string | null;

    const parsed = livePhotoUploadSchema.safeParse({ photoId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: formatZodErrors(parsed.error) },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: 'Missing video file' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const mime = file.type || 'video/webm';
    const validation = validateUploadBuffer(arrayBuffer, mime);

    if (!validation.ok || validation.category !== 'video') {
      return NextResponse.json({ error: validation.ok ? 'Only video uploads allowed' : validation.error }, { status: 400 });
    }

    const supabase = getSupabase();
    const fileName = `live-photos/${parsed.data.photoId}.webm`;

    const { error } = await supabase.storage
      .from('photobooth-images')
      .upload(fileName, Buffer.from(arrayBuffer), {
        contentType: 'video/webm',
        upsert: true,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: 'Upload failed', details: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from('photobooth-images')
      .getPublicUrl(fileName);

    return NextResponse.json({ success: true, url: urlData.publicUrl });
  } catch (error) {
    console.error('Upload live photo error:', error);
    return NextResponse.json({
      error: 'Upload failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
