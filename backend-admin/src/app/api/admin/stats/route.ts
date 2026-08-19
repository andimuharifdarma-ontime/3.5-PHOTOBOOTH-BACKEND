import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const totalUsers = await prisma.adminUser.count();
    const totalOrders = await prisma.order.count();
    const totalPhotos = await prisma.photo.count();
    
    return NextResponse.json({
      totalUsers,
      totalOrders,
      totalPhotos,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
