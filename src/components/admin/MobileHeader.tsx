'use client';

import { Menu } from 'lucide-react';

interface MobileHeaderProps {
    setSidebarOpen: (open: boolean) => void;
}

export default function MobileHeader({ setSidebarOpen }: MobileHeaderProps) {
    return (
        <header
            className="sticky top-0 z-40 flex items-center justify-between border-b border-[#EAE1D3] bg-[#FDFBF7]/90 p-3 backdrop-blur-md shadow-sm sm:p-4 lg:hidden
                pt-[max(0.75rem,env(safe-area-inset-top))]"
        >
            <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors hover:bg-[#F5F1EA]"
                aria-label="Buka menu navigasi"
            >
                <Menu className="h-6 w-6 text-[#4A3F35]" />
            </button>
            <div className="flex flex-col items-center">
                <span className="mb-0.5 text-[10px] font-black uppercase leading-none tracking-[0.3em] text-[#A68B67]">
                    Dovelens
                </span>
                <span className="text-[8px] font-medium uppercase tracking-widest text-[#4A3F35]/50">
                    Dashboard
                </span>
            </div>
            <div className="min-h-[44px] min-w-[44px]" aria-hidden />
        </header>
    );
}
