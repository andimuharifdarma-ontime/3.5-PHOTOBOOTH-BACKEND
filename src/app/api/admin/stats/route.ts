import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDashboardStats } from '@/lib/admin-stats';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const user = session.user as { role?: string; email?: string };

    const stats = await getDashboardStats({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      userRole: user.role ?? '',
      userEmail: user.email ?? '',
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
