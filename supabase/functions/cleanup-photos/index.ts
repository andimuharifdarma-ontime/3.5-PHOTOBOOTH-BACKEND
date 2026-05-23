// Supabase Edge Function: cleanup-photos
// Menghapus foto sementara dari bucket 'photobooth-images' yang sudah melewati batas waktu retensi.
//
// Deploy ke Supabase Edge Functions:
//   supabase functions deploy cleanup-photos
//
// Atau jalankan via Vercel Cron Job yang memanggil endpoint /api/cron/cleanup-photos
//
// Scheduled: Setiap hari jam 03:00 WIB (sesuaikan di Supabase Dashboard)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BUCKET_NAME = 'photobooth-images';
const FOLDER_PREFIX = 'images/';

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ambil retention days dari database
    const { data: settings, error: settingsError } = await supabase
      .from('SystemSetting')
      .select('photoRetentionDays')
      .limit(1)
      .single();

    if (settingsError) {
      console.error('Failed to fetch settings:', settingsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch settings' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const retentionDays = settings?.photoRetentionDays ?? 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(`🧹 Cleanup started: Deleting photos older than ${retentionDays} days (before ${cutoffDate.toISOString()})`);

    // List semua file dalam bucket
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(FOLDER_PREFIX.replace(/\/$/, ''), {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' },
      });

    if (listError) {
      console.error('Failed to list files:', listError);
      return new Response(JSON.stringify({ error: 'Failed to list files' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ message: 'No files found', deleted: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Filter file yang sudah melewati batas waktu
    // JANGAN hapus file frame (biasanya di folder 'frames/')
    const expiredFiles = files.filter((file) => {
      if (!file.created_at) return false;
      const fileDate = new Date(file.created_at);
      return fileDate < cutoffDate;
    });

    if (expiredFiles.length === 0) {
      console.log('✅ No expired files found');
      return new Response(
        JSON.stringify({ message: 'No expired files', deleted: 0, checked: files.length }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hapus file dalam batch (max 100 per batch)
    const batchSize = 100;
    let totalDeleted = 0;
    const errors: string[] = [];

    for (let i = 0; i < expiredFiles.length; i += batchSize) {
      const batch = expiredFiles.slice(i, i + batchSize);
      const paths = batch.map((f) => `${FOLDER_PREFIX}${f.name}`);

      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(paths);

      if (deleteError) {
        console.error(`Failed to delete batch ${i}:`, deleteError);
        errors.push(deleteError.message);
      } else {
        totalDeleted += batch.length;
      }
    }

    console.log(`🧹 Cleanup complete: ${totalDeleted}/${expiredFiles.length} files deleted`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup complete`,
        deleted: totalDeleted,
        total: expiredFiles.length,
        retentionDays,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
