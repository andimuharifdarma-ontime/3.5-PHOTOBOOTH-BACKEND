import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'photobooth-uploads';

/**
 * Deletes a file from Supabase Storage based on its URL.
 * Supports both Supabase public URLs and legacy local paths.
 * @param url The URL of the file (Supabase URL or legacy '/uploads/xxx.png')
 */
export async function deleteFile(url: string | null | undefined): Promise<boolean> {
    if (!url) return false;

    try {
        // Handle Supabase Storage URLs
        if (url.includes('supabase.co/storage')) {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // Extract path from Supabase URL
            // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file.png
            const bucketPath = url.split(`/storage/v1/object/public/${BUCKET_NAME}/`)[1];
            if (!bucketPath) {
                console.warn(`Could not extract path from Supabase URL: ${url}`);
                return false;
            }

            const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([bucketPath]);

            if (error) {
                console.error(`Failed to delete from Supabase: ${error.message}`);
                return false;
            }

            console.log(`Successfully deleted from Supabase: ${bucketPath}`);
            return true;
        }

        // Legacy local path — skip on Netlify (read-only filesystem)
        if (url.startsWith('/uploads/')) {
            console.warn(`Skipping local file deletion (not supported on Netlify): ${url}`);
            return false;
        }

        return false;
    } catch (error) {
        console.error(`Failed to delete file for URL ${url}:`, error);
        return false;
    }
}
