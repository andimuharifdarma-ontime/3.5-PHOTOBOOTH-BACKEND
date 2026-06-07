import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface Params {
    params: Promise<{ frameId: string }>;
}

// GET single frame by ID for user-facing pages
export async function GET(request: Request, { params }: Params) {
    const { frameId } = await params;
    try {
        const frame = await prisma.frame.findUnique({
            where: { id: frameId },
            select: {
                id: true,
                name: true,
                imageUrl: true,
                previewUrl: true,
                price: true,
                outputWidth: true,
                outputHeight: true,
                slots: true,
                maxSlots: true,
                framePosition: true,
                theme: {
                    select: { id: true, name: true, price: true },
                },
            },
        });

        if (!frame) {
            return NextResponse.json({ error: 'Frame not found' }, { status: 404 });
        }

        return NextResponse.json(frame);
    } catch (error) {
        console.error('Failed to fetch frame:', error);
        return NextResponse.json({ error: 'Failed to fetch frame' }, { status: 500 });
    }
}
