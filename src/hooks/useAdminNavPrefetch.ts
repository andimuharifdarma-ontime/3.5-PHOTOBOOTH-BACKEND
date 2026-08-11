'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { navItems } from '@/components/admin/Sidebar';

const PREFETCHED = new Set<string>();

export function useAdminNavPrefetch() {
  const router = useRouter();

  const prefetchRoute = useCallback(
    (href: string) => {
      if (PREFETCHED.has(href)) return;
      PREFETCHED.add(href);
      router.prefetch(href);
    },
    [router],
  );

  const prefetchAllRoutes = useCallback(() => {
    navItems.forEach((item) => prefetchRoute(item.href));
  }, [prefetchRoute]);

  return { prefetchRoute, prefetchAllRoutes };
}
