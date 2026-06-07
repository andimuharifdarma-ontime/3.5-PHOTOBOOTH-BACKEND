'use client';

import { Menu } from 'lucide-react';

interface MobileHeaderProps {
    setSidebarOpen: (open: boolean) => void;
}

export default function MobileHeader({ setSidebarOpen }: MobileHeaderProps) {
    return (
        <div className="lg:hidden bg-[#FDFBF7]/80 backdrop-blur-md border-b border-[#EAE1D3] p-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
            <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-full hover:bg-[#F5F1EA] transition-colors"
            >
                <Menu className="w-5 h-5 text-[#4A3F35]" />
            </button>
            <div className="flex flex-col items-center">
                <span className="text-[10px] font-black tracking-[0.3em] text-[#A68B67] uppercase leading-none mb-1">Dovelens</span>
                <span className="text-[8px] font-medium text-[#4A3F35]/50 uppercase tracking-widest">Dashboard</span>
            </div>
            <div className="w-10" />
        </div>
    );
}
