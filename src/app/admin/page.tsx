import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDashboardStats, type DashboardStats } from '@/lib/admin-stats';
import PageClient from './PageClient';

export default async function Page() {
  const session = await getServerSession(authOptions);
  let initialStats: DashboardStats | null = null;

  if (session?.user) {
    const user = session.user as { role?: string; email?: string };
    try {
      initialStats = await getDashboardStats({
        userRole: user.role ?? '',
        userEmail: user.email ?? '',
      });
    } catch (error) {
      console.error('Failed to prefetch dashboard stats:', error);
    }
  }

  return (
    <Suspense fallback={null}>
      <PageClient initialStats={initialStats} />
    </Suspense>
  );
}
