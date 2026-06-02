import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Use service role key for server-side uploads (bypasses RLS)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET_NAME = 'photobooth-uploads';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = session.user as any;

        // Find user to check explicit canManageThemes permission if not in session
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

        // Validate file type & size
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
        }

        const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only PNG, JPG, WEBP, and GIF are allowed.' }, { status: 400 });
        }

        // Generate unique filename & sanitize extension
        const timestamp = Date.now();
        const rawExt = file.name.split('.').pop()?.toLowerCase() || '';
        const safeExtMap: Record<string, string> = {
            'png': 'png',
            'jpg': 'jpg',
            'jpeg': 'jpg',
            'webp': 'webp',
            'gif': 'gif'
        };

        const ext = safeExtMap[rawExt];
        if (!ext) {
            return NextResponse.json({ error: 'Unsupported file extension' }, { status: 400 });
        }

        const filename = `${timestamp}.${ext}`;
        const storagePath = `uploads/${filename}`;

        // Upload to Supabase Storage
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const { data, error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: true,
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(storagePath);

        const url = urlData.publicUrl;

        return NextResponse.json({
            url,
            filename,
        });
    } catch (error: any) {
        console.error('Upload failed:', error);
        return NextResponse.json({ error: `Upload failed: ${error.message || error}` }, { status: 500 });
    }
}
