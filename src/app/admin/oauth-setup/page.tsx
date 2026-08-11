import { Suspense } from 'react';
import OAuthSetupClient from './OAuthSetupClient';
import AdminPageSkeleton from '@/components/ui/AdminPageSkeleton';

export default function OAuthSetupPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] py-20 px-4 relative">
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#A68B67_1px,transparent_1px)] [background-size:24px_24px]"></div>
      <div className="max-w-4xl mx-auto relative z-10">
        <Suspense fallback={<AdminPageSkeleton />}>
          <OAuthSetupClient />
        </Suspense>

        <div className="mt-12 text-center">
          <p className="text-[10px] font-black text-[#8C7E6A] uppercase tracking-[0.3em]">
            ASISTENSI TEKNIS? BACA{' '}
            <a href="/GOOGLE_DRIVE_SETUP.md" className="text-[#4A3F35] underline decoration-[#A68B67] underline-offset-4 hover:text-[#A68B67] transition-colors">
              DOKUMENTASI LENGKAP
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

