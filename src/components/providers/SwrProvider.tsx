'use client';

import { SWRConfig } from 'swr';
import { jsonFetcher } from '@/lib/fetcher';

export function SwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: jsonFetcher,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        dedupingInterval: 30_000,
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  );
}
