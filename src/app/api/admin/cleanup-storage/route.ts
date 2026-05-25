import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

const BUCKET_NAME = 'photobooth-images';
const FOLDERS = ['images', 'live-photos'];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    // @ts-ignore
    const setting = await (prisma.systemSetting as any).findFirst({
      select: { photoRetentionDays: true },
    });

    return NextResponse.json({
      photoRetentionDays: setting?.photoRetentionDays ?? 7,
    });
  } catch (error) {
    console.error('Failed to fetch retention settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    // @ts-ignore
    const setting = await (prisma.systemSetting as any).findFirst({
      select: { photoRetentionDays: true },
    });

    const retentionDays = setting?.photoRetentionDays ?? 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(`🧹 Manual Cleanup: Deleting photos older than ${retentionDays} days (cutoff: ${cutoffDate.toISOString()})`);

    const supabase = getSupabase();
    let totalDeleted = 0;
    let totalChecked = 0;
    const folderResults: Record<string, { checked: number; deleted: number }> = {};

    for (const folder of FOLDERS) {
      console.log(`🧹 Cleaning folder: ${folder}`);

      const { data: files, error: listError } = await supabase.storage
        .from(BUCKET_NAME)
        .list(folder, {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'asc' },
        });

      if (listError) {
        console.error(`List error in ${folder}:`, listError);
        folderResults[folder] = { checked: 0, deleted: 0 };
        continue;
      }

      if (!files || files.length === 0) {
        folderResults[folder] = { checked: 0, deleted: 0 };
        continue;
      }

      const expiredFiles = files.filter((file) => {
        if (!file.created_at) return false;
        return new Date(file.created_at) < cutoffDate;
      });

      totalChecked += files.length;
      folderResults[folder] = { checked: files.length, deleted: 0 };

      if (expiredFiles.length === 0) continue;

      const paths = expiredFiles.map((f) => `${folder}/${f.name}`);
      const batchSize = 100;
      let folderDeleted = 0;

      for (let i = 0; i < paths.length; i += batchSize) {
        const batch = paths.slice(i, i + batchSize);
        const { error: deleteError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove(batch);

        if (!deleteError) {
          folderDeleted += batch.length;
        } else {
          console.error(`Delete batch error in ${folder}:`, deleteError);
        }
      }

      folderResults[folder].deleted = folderDeleted;
      totalDeleted += folderDeleted;
    }

    console.log(`🧹 Cleanup complete: ${totalDeleted} files deleted from ${totalChecked} checked`);

    return NextResponse.json({
      success: true,
      deleted: totalDeleted,
      checked: totalChecked,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      folders: folderResults,
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}
