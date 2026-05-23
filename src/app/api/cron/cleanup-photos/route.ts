import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

const BUCKET_NAME = 'photobooth-images';
const FOLDER_PREFIX = 'images';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Vercel Cron Job endpoint untuk menghapus foto expired dari Supabase Storage.
 * Konfigurasi di vercel.json:
 *   { "crons": [{ "path": "/api/cron/cleanup-photos", "schedule": "0 20 * * *" }] }
 *   (Jam 03:00 WIB = 20:00 UTC hari sebelumnya)
 * 
 * Juga bisa dipanggil manual oleh admin via API.
 */
export async function GET(req: Request) {
  try {
    // Verifikasi cron secret (dari Vercel) atau admin session
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Jika ada CRON_SECRET, validasi
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ambil retention days dari database
    // @ts-ignore
    const setting = await (prisma.systemSetting as any).findFirst({
      select: { photoRetentionDays: true },
    });

    const retentionDays = setting?.photoRetentionDays ?? 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(`🧹 Cron Cleanup: Deleting photos older than ${retentionDays} days`);

    const supabase = getSupabase();

    // List files di folder images
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(FOLDER_PREFIX, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' },
      });

    if (listError) {
      console.error('List error:', listError);
      return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ message: 'No files found', deleted: 0 });
    }

    // Filter file yang sudah expired
    const expiredFiles = files.filter((file) => {
      if (!file.created_at) return false;
      return new Date(file.created_at) < cutoffDate;
    });

    if (expiredFiles.length === 0) {
      return NextResponse.json({
        message: 'No expired files',
        deleted: 0,
        checked: files.length,
        retentionDays,
      });
    }

    // Hapus file expired
    const paths = expiredFiles.map((f) => `${FOLDER_PREFIX}/${f.name}`);
    const batchSize = 100;
    let totalDeleted = 0;

    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(batch);

      if (!deleteError) {
        totalDeleted += batch.length;
      } else {
        console.error(`Delete batch error:`, deleteError);
      }
    }

    console.log(`🧹 Cleanup complete: ${totalDeleted}/${expiredFiles.length} files deleted`);

    return NextResponse.json({
      success: true,
      deleted: totalDeleted,
      total: expiredFiles.length,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
    });
  } catch (error) {
    console.error('Cron cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
