'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PhotoboothHeaderProps {
    backHref?: string;
    backLabel?: string;
    onBack?: () => void;
    title?: string;
    subtitle?: string;
    transparent?: boolean;
}

export default function PhotoboothHeader({
    backHref,
    backLabel = 'Kembali',
    onBack,
    title,
    subtitle,
    transparent = false
}: PhotoboothHeaderProps) {
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (backHref) {
            router.push(backHref);
        } else {
            router.back();
        }
    };

    return (
        <header className={`px-10 py-8 flex items-center justify-between z-20 ${transparent ? '' : 'bg-transparent'}`}>
            <button
                onClick={handleBack}
                className="group flex items-center gap-3 text-[#4A3F35] hover:text-[#A68B67] transition-colors"
            >
                <div className="p-2 border border-[#EAE1D3] rounded-full group-hover:border-[#A68B67] transition-colors">
                    <ArrowLeft size={16} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{backLabel}</span>
            </button>

            {(title || subtitle) && (
                <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
                    {title && <h1 className="text-2xl md:text-4xl font-serif italic text-[#4A3F35]">{title}</h1>}
                    {subtitle && <p className="text-[8px] font-black text-[#8C7E6A] uppercase tracking-[0.4em] mt-1">{subtitle}</p>}
                </div>
            )}

            <div className="w-20" /> {/* Spacer */}
        </header>
    );
}
