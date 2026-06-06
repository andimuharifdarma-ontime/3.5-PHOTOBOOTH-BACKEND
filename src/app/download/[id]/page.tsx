import { Suspense } from 'react';
import DownloadPageClient from './DownloadPageClient';

export default function DownloadPage() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#A68B67] animate-pulse">
            Memuat halaman download...
          </p>
        </div>
      )}
    >
      <DownloadPageClient />
    </Suspense>
  );
}
