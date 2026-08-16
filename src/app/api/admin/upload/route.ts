import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { isAnimatedGif, optimizeImageUpload } from '@/lib/image-optimize';

function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error("Supabase credentials (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY) are missing in Vercel environment variables.");
    }
    return createClient(url, key);
}

const BUCKET_NAME = 'photobooth-uploads';

export async function POST(request: Request) {
    try {
        const supabase = getSupabaseClient();
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;

        const dbUser = await prisma.adminUser.findUnique({
            where: { email: user.email }
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const canManage = dbUser.role === 'ADMIN' || dbUser.role === 'KARYAWAN' || dbUser.canManageThemes === true;

        if (!canManage) {
            return NextResponse.json({ error: 'Forbidden: Management permission required' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const MAX_SIZE = 15 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large (max 15MB)' }, { status: 400 });
        }

        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
        let mimeType = file.type?.toLowerCase();

        if (!mimeType || !allowedTypes.includes(mimeType)) {
            const ext = file.name?.split('.').pop()?.toLowerCase();
            if (ext === 'png') mimeType = 'image/png';
            else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
            else if (ext === 'webp') mimeType = 'image/webp';
            else if (ext === 'gif') mimeType = 'image/gif';
        }

        if (!mimeType || !allowedTypes.includes(mimeType)) {
            return NextResponse.json({ error: 'Invalid file type. Only PNG, JPG, WEBP, and GIF are allowed.' }, { status: 400 });
        }

        const timestamp = Date.now();
        const bytes = await file.arrayBuffer();
        const inputBuffer = Buffer.from(bytes);

        const optimized = await optimizeImageUpload(inputBuffer, mimeType);
        const baseName = `${timestamp}`;

        const mainPath = `uploads/${baseName}.${optimized.main.ext}`;
        const thumbPath = optimized.thumb ? `uploads/thumbs/${baseName}.${optimized.thumb.ext}` : null;

        // Convert Buffer to Blob to prevent Next.js fetch from corrupting binary data with UTF-8 replacement characters
        const mainBlob = new Blob([optimized.main.buffer], { type: optimized.main.contentType });

        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(mainPath, mainBlob, {
                contentType: optimized.main.contentType,
                upsert: true,
                cacheControl: '31536000',
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
        }

        let thumbUrl: string | null = null;
        if (optimized.thumb && thumbPath) {
            const thumbBlob = new Blob([optimized.thumb.buffer], { type: optimized.thumb.contentType });
            const { error: thumbError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(thumbPath, thumbBlob, {
                    contentType: optimized.thumb.contentType,
                    upsert: true,
                    cacheControl: '31536000',
                });

            if (!thumbError) {
                const { data: thumbData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(thumbPath);
                thumbUrl = thumbData.publicUrl;
            } else {
                console.warn('Thumb upload failed, main image still saved:', thumbError.message);
            }
        }

        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(mainPath);
        const url = urlData.publicUrl;

        return NextResponse.json({
            url,
            thumbUrl,
            filename: `${baseName}.${optimized.main.ext}`,
            optimized: !isAnimatedGif(file.type),
            originalSize: file.size,
            uploadedSize: optimized.main.buffer.length,
        });
    } catch (error: any) {
        console.error('Upload failed:', error);
        return NextResponse.json({ error: `Upload failed: ${error.message || error}` }, { status: 500 });
    }
}
