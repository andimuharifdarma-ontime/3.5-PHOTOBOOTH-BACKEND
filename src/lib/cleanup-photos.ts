import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getGlobalPhotoRetentionDays } from '@/lib/photo-retention';

export const CLEANUP_BUCKET_NAME = 'photobooth-images';
export const CLEANUP_FOLDERS = ['images', 'live-photos'] as const;

export function getCleanupSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** @deprecated Prefer getGlobalPhotoRetentionDays — alias for backward compatibility. */
export async function getPhotoRetentionDays(): Promise<number> {
  return getGlobalPhotoRetentionDays();
}

export type CleanupResult = {
  success: boolean;
  deleted: number;
  total: number;
  checked: number;
  retentionDays: number;
  cutoffDate: string;
  folderResults?: Record<string, { checked: number; deleted: number }>;
  message?: string;
};

export async function cleanupExpiredPhotos(options?: {
  folders?: readonly string[];
}): Promise<CleanupResult> {
  const folders = options?.folders ?? CLEANUP_FOLDERS;
  const retentionDays = await getPhotoRetentionDays();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const supabase = getCleanupSupabase();
  let totalDeleted = 0;
  let totalChecked = 0;
  let totalExpired = 0;
  const folderResults: Record<string, { checked: number; deleted: number }> = {};

  for (const folder of folders) {
    const { data: files, error: listError } = await supabase.storage
      .from(CLEANUP_BUCKET_NAME)
      .list(folder, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' },
      });

    if (listError) {
      console.error(`List error for folder ${folder}:`, listError);
      continue;
    }

    if (!files || files.length === 0) {
      folderResults[folder] = { checked: 0, deleted: 0 };
      continue;
    }

    totalChecked += files.length;

    const expiredFiles = files.filter((file) => {
      if (!file.created_at) return false;
      return new Date(file.created_at) < cutoffDate;
    });

    totalExpired += expiredFiles.length;
    folderResults[folder] = { checked: files.length, deleted: 0 };

    if (expiredFiles.length === 0) continue;

    const paths = expiredFiles.map((f) => `${folder}/${f.name}`);
    const batchSize = 100;

    for (let i = 0; i < paths.length; i += batchSize) {
      const batch = paths.slice(i, i + batchSize);
      const { error: deleteError } = await supabase.storage
        .from(CLEANUP_BUCKET_NAME)
        .remove(batch);

      if (!deleteError) {
        totalDeleted += batch.length;
        folderResults[folder].deleted += batch.length;
      } else {
        console.error(`Delete batch error in ${folder}:`, deleteError);
      }
    }
  }

  return {
    success: true,
    deleted: totalDeleted,
    total: totalExpired,
    checked: totalChecked,
    retentionDays,
    cutoffDate: cutoffDate.toISOString(),
    folderResults,
    message: totalExpired === 0 ? 'No expired files' : undefined,
  };
}
