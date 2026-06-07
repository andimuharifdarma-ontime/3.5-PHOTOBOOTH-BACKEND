import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'photobooth-images';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Public API endpoint untuk QR scan - Mengambil metadata foto dari Supabase Storage
 * Tidak memerlukan autentikasi karena user publik mengaksesnya via QR code
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let { id } = await params;
    id = id.replace(/\.+$/, '');

    const supabase = getSupabase();

    // Cari file utama (main photo)
    const tryExts = ['png', 'jpg', 'jpeg'];
    let mainUrl: string | null = null;
    let bonusUrl: string | null = null;
    let liveUrl: string | null = null;

    // 1) Cari foto utama
    for (const ext of tryExts) {
      const storagePath = `images/${id}.${ext}`;
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      // Verify file exists by checking list
      const { data: files } = await supabase.storage
        .from(BUCKET_NAME)
        .list('images', { limit: 1, search: `${id}.${ext}` });

      if (files && files.length > 0 && files.some(f => f.name === `${id}.${ext}`)) {
        mainUrl = urlData.publicUrl;
        break;
      }
    }

    if (!mainUrl) {
      return NextResponse.json(
        { error: 'Foto tidak ditemukan atau sudah dihapus', expired: true },
        { status: 404 }
      );
    }

    // 2) Cari bonus video (MP4/WebM)
    for (const ext of ['mp4', 'webm']) {
      const storagePath = `images/${id}-bonus.${ext}`;
      const { data: files } = await supabase.storage
        .from(BUCKET_NAME)
        .list('images', { limit: 1, search: `${id}-bonus.${ext}` });

      if (files && files.length > 0 && files.some(f => f.name === `${id}-bonus.${ext}`)) {
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);
        bonusUrl = urlData.publicUrl;
        break;
      }
    }

    // 3) Cari live photo video
    for (const ext of ['mp4', 'webm']) {
      const storagePath = `images/${id}-live.${ext}`;
      const { data: files } = await supabase.storage
        .from(BUCKET_NAME)
        .list('images', { limit: 1, search: `${id}-live.${ext}` });

      if (files && files.length > 0 && files.some(f => f.name === `${id}-live.${ext}`)) {
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);
        liveUrl = urlData.publicUrl;
        break;
      }
    }

    // Extract customer name from ID
    const customerMatch = id.match(/^cust-(.+)-(\d+)$/);
    const customerName = customerMatch
      ? customerMatch[1].replace(/-/g, ' ')
      : null;

    return NextResponse.json({
      id,
      customerName,
      mainUrl,
      bonusUrl,
      liveUrl,
      expired: false,
    });
  } catch (error) {
    console.error('Error fetching photo data:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
