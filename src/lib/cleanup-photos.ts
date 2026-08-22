import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getGlobalPhotoRetentionDays } from '@/lib/photo-retention';

export const CLEANUP_BUCKET_NAME = 'photobooth-images';
export const CLEANUP_FOLDERS = ['images', 'live-photos'] as const;
const LIST_PAGE_SIZE = 1000;

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

/** Parse session timestamp embedded in photo filename (same logic as /api/images/[id]). */
export function parseTimestampFromFileName(fileName: string): number | null {
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const parts = baseName.split('-');
  const timestamp = parseInt(parts[parts.length - 1], 10);
  if (isNaN(timestamp) || timestamp <= 1_000_000_000_000 || timestamp >= 2_500_000_000_000) {
    return null;
  }
  return timestamp;
}

export function isStorageFileExpired(
  fileName: string,
  createdAt: string | null | undefined,
  retentionDays: number,
  nowMs: number = Date.now(),
): boolean {
  const limitMs = retentionDays * 24 * 60 * 60 * 1000;
  const embeddedTs = parseTimestampFromFileName(fileName);

  if (embeddedTs != null) {
    return nowMs - embeddedTs > limitMs;
  }

  if (createdAt) {
    const cutoff = new Date(nowMs);
    cutoff.setDate(cutoff.getDate() - retentionDays);
    return new Date(createdAt) < cutoff;
  }

  return false;
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

async function listAllFilesInFolder(
  supabase: SupabaseClient,
  folder: string,
): Promise<Array<{ name: string; created_at?: string }>> {
  const all: Array<{ name: string; created_at?: string }> = [];
  let offset = 0;

  while (true) {
    const { data: files, error } = await supabase.storage
      .from(CLEANUP_BUCKET_NAME)
      .list(folder, {
        limit: LIST_PAGE_SIZE,
        offset,
        sortBy: { column: 'created_at', order: 'asc' },
      });

    if (error) {
      throw error;
    }

    if (!files?.length) break;

    for (const file of files) {
      if (file.name === '.emptyFolderPlaceholder') continue;
      all.push({ name: file.name, created_at: file.created_at });
    }

    if (files.length < LIST_PAGE_SIZE) break;
    offset += LIST_PAGE_SIZE;
  }

  return all;
}

export async function cleanupExpiredPhotos(options?: {
  folders?: readonly string[];
  forceAll?: boolean;
}): Promise<CleanupResult> {
  const folders = options?.folders ?? CLEANUP_FOLDERS;
  const forceAll = options?.forceAll === true;
  const retentionDays = forceAll ? 0 : await getPhotoRetentionDays();
  const nowMs = Date.now();
  const cutoffDate = new Date(nowMs);
  if (!forceAll) {
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  }

  const supabase = getCleanupSupabase();
  let totalDeleted = 0;
  let totalChecked = 0;
  let totalExpired = 0;
  const folderResults: Record<string, { checked: number; deleted: number }> = {};

  for (const folder of folders) {
    folderResults[folder] = { checked: 0, deleted: 0 };

    let files: Array<{ name: string; created_at?: string }>;
    try {
      files = await listAllFilesInFolder(supabase, folder);
    } catch (listError) {
      console.error(`List error for folder ${folder}:`, listError);
      continue;
    }

    if (files.length === 0) continue;

    totalChecked += files.length;
    folderResults[folder].checked = files.length;

    const expiredFiles = forceAll
      ? files
      : files.filter((file) =>
          isStorageFileExpired(file.name, file.created_at, retentionDays, nowMs),
        );

    totalExpired += expiredFiles.length;
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
