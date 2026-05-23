import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
    try {
        console.log('📤 Live Photo Upload - Request received');

        const formData = await req.formData();
        const file = formData.get('video') as File;
        const photoId = formData.get('photoId') as string;

        if (!file) {
            console.error('❌ Missing video file');
            return NextResponse.json({ error: 'Missing video file' }, { status: 400 });
        }

        if (!photoId) {
            console.error('❌ Missing photoId');
            return NextResponse.json({ error: 'Missing photoId' }, { status: 400 });
        }

        console.log('📦 Uploading live photo to Supabase:', { photoId, size: file.size, type: file.type });

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload ke Supabase Storage
        const fileName = `live-photos/${photoId}.webm`;
        const { data, error } = await supabase.storage
            .from('photobooth-images')
            .upload(fileName, buffer, {
                contentType: 'video/webm',
                upsert: true, // Overwrite if exists
            });

        if (error) {
            console.error('❌ Supabase upload error:', error);
            return NextResponse.json({
                error: 'Upload failed',
                details: error.message
            }, { status: 500 });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('photobooth-images')
            .getPublicUrl(fileName);

        console.log('✅ Live photo uploaded:', urlData.publicUrl);

        return NextResponse.json({
            success: true,
            url: urlData.publicUrl
        });
    } catch (error) {
        console.error('❌ Upload live photo error:', error);
        return NextResponse.json({
            error: 'Upload failed',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
