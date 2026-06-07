import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'photobooth-images';

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const folder = searchParams.get('folder') || 'images'; // images or live-photos
        
        const supabase = getSupabase();
        
        // Let's fetch with a high limit, or implement pagination if needed. 
        // Supabase storage list limit is 1000 max per request usually, but let's fetch up to 1000.
        const { data: files, error } = await supabase.storage
            .from(BUCKET_NAME)
            .list(folder, {
                limit: 1000,
                offset: 0,
                sortBy: { column: 'created_at', order: 'desc' }
            });

        if (error) {
            console.error('Supabase list error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Generate public URLs for each file
        const filesWithUrl = files?.filter(f => f.name !== '.emptyFolderPlaceholder').map(file => {
            const { data: urlData } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(`${folder}/${file.name}`);
                
            return {
                name: file.name,
                url: urlData.publicUrl,
                created_at: file.created_at,
                metadata: file.metadata
            };
        }) || [];

        return NextResponse.json({ files: filesWithUrl });
    } catch (e: any) {
        console.error('Error fetching supabase files:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
