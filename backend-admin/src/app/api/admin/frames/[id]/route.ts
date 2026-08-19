import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const frame = await prisma.frame.findUnique({
      where: { id },
    });
    return NextResponse.json(frame);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch frame' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const frame = await prisma.frame.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(frame);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update frame' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.frame.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete frame' }, { status: 500 });
  }
}
