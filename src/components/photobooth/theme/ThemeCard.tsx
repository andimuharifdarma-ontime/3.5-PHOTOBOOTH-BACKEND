'use client';

import { motion } from 'framer-motion';

interface ThemeCardProps {
    id: string;
    name: string;
    previewUrl: string;
    frameCount: number;
    price: number;
    isPaymentEnabled: boolean;
    tag?: string | null;
    onClick: () => void;
    index: number;
}

export default function ThemeCard({
    name,
    previewUrl,
    frameCount,
    price,
    isPaymentEnabled,
    tag,
    onClick,
    index
}: ThemeCardProps) {
    const formattedPrice = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(price);

    return (
        <motion.button
            onClick={onClick}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative w-[300px] md:w-[320px] aspect-[3/4.5] flex-shrink-0 bg-white p-2 rounded-sm shadow-xl hover:shadow-[0_20px_50px_rgba(74,63,53,0.2)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-4 border border-[#EAE1D3]/50"
        >
            {/* Index Number Background */}
            <div className="absolute -top-6 -left-4 text-8xl font-serif italic text-[#F5F1EA] group-hover:text-[#EAE1D3] transition-colors duration-700 -z-0 select-none">
                0{index + 1}
            </div>

            {/* Premium Tag / Seal */}
            {tag && (
                <div className="absolute -top-4 -right-4 z-40 w-20 h-20 flex items-center justify-center pointer-events-none">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-md">
                        <path
                            d="M50 0 L58 15 L75 10 L75 27 L90 35 L82 50 L90 65 L75 73 L75 90 L58 85 L50 100 L42 85 L25 90 L25 73 L10 65 L18 50 L10 35 L25 27 L25 10 L42 15 Z"
                            fill="url(#redGradient)"
                            stroke="url(#goldStroke)"
                            strokeWidth="2"
                        />
                        <circle cx="50" cy="50" r="32" fill="url(#redGradientInner)" stroke="url(#goldStroke)" strokeWidth="1.5" />
                        <defs>
                            <linearGradient id="goldStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#FDE68A" />
                                <stop offset="50%" stopColor="#D97706" />
                                <stop offset="100%" stopColor="#F59E0B" />
                            </linearGradient>
                            <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#DC2626" />
                                <stop offset="50%" stopColor="#991B1B" />
                                <stop offset="100%" stopColor="#7F1D1D" />
                            </linearGradient>
                            <linearGradient id="redGradientInner" x1="100%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#EF4444" />
                                <stop offset="100%" stopColor="#B91C1C" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="relative z-10 text-center transform rotate-12">
                        <span className="block text-[7px] font-black text-[#FEF3C7] uppercase tracking-widest leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] px-1">
                            {tag}
                        </span>
                    </div>
                </div>
            )}

            <div className="relative w-full h-full bg-white overflow-hidden rounded-[1px] z-10">
                <img
                    src={previewUrl}
                    alt={name}
                    className="w-full h-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-110"
                />

                {/* Glassmorphism Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917] via-transparent to-[#1C1917]/20 opacity-60 group-hover:opacity-40 transition-opacity duration-700" />

                {/* Frame Count Badge */}
                <div className="absolute top-4 left-4 px-3 py-1 bg-black/40 border border-white/20 rounded-full">
                    <span className="text-[8px] font-black text-white uppercase tracking-[0.2em]">
                        {frameCount} Frames Available
                    </span>
                </div>

                {/* Text Content */}
                <div className="absolute bottom-0 left-0 right-0 p-8 text-left translate-y-2 group-hover:translate-y-0 transition-transform duration-700">
                    <div className="flex items-center gap-2 mb-2 opacity-60">
                        <div className="w-8 h-[1px] bg-white" />
                        <span className="text-[9px] font-black text-white uppercase tracking-[0.4em]">Signature Theme</span>
                    </div>

                    <h3 className="text-3xl font-serif italic text-white mb-3 tracking-wide">{name}</h3>

                    {/* Price Tag */}
                    {isPaymentEnabled && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#A68B67] text-white rounded-sm shadow-lg transform -skew-x-12 group-hover:skew-x-0 transition-transform duration-500">
                            <span className="text-xs font-black uppercase tracking-widest skew-x-12 group-hover:skew-x-0 transition-transform">
                                {formattedPrice}
                            </span>
                        </div>
                    )}

                    {!isPaymentEnabled && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#16A34A] text-white rounded-sm shadow-lg transform -skew-x-12 group-hover:skew-x-0 transition-transform duration-500">
                            <span className="text-xs font-black uppercase tracking-widest skew-x-12 group-hover:skew-x-0 transition-transform">
                                Free Access
                            </span>
                        </div>
                    )}
                </div>

                {/* Decorative Borders */}
                <div className="absolute inset-4 border border-white/10 pointer-events-none group-hover:inset-2 transition-all duration-700" />
            </div>
        </motion.button>
    );
}
