import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api-auth';
import { withSupabaseTransform } from '@/lib/image-url';

const BUCKET_NAME = 'photobooth-images';

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function GET(request: Request) {
    try {
        await requireAdmin(request);
    } catch (response) {
        if (response instanceof Response) return response;
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const folder = searchParams.get('folder') || 'images';
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '48', 10)));
        const offset = (page - 1) * limit;

        const supabase = getSupabase();

        const { data: files, error } = await supabase.storage
            .from(BUCKET_NAME)
            .list(folder, {
                limit,
                offset,
                sortBy: { column: 'created_at', order: 'desc' }
            });

        if (error) {
            console.error('Supabase list error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const filesWithUrl = files?.filter(f => f.name !== '.emptyFolderPlaceholder').map(file => {
            const { data: urlData } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(`${folder}/${file.name}`);

            return {
                name: file.name,
                url: urlData.publicUrl,
                thumbUrl: withSupabaseTransform(urlData.publicUrl, { width: 320, quality: 70 }),
                created_at: file.created_at,
                metadata: file.metadata
            };
        }) || [];

        return NextResponse.json({
            files: filesWithUrl,
            page,
            limit,
            hasMore: filesWithUrl.length === limit,
        });
    } catch (e: any) {
        console.error('Error fetching supabase files:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        await requireAdmin(request);
    } catch (response) {
        if (response instanceof Response) return response;
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const fileName = searchParams.get('fileName');
        const folder = searchParams.get('folder') || 'images';

        if (!fileName) {
            return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
        }

        const supabase = getSupabase();
        
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([`${folder}/${fileName}`]);

        if (error) {
            console.error('Supabase delete error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Error deleting supabase file:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
