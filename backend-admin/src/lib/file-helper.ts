import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function deleteFile(fileUrl: string): Promise<boolean> {
  try {
    const bucketName = 'photobooth-uploads';
    const bucketPathMarker = `${bucketName}/`;
    
    if (!fileUrl.includes(bucketPathMarker)) {
      return false;
    }

    const relativePath = fileUrl.split(bucketPathMarker)[1];
    if (!relativePath) {
      return false;
    }

    const decodedPath = decodeURIComponent(relativePath);
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([decodedPath]);

    if (error) {
      console.error('Failed to delete file from Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteFile:', error);
    return false;
  }
}