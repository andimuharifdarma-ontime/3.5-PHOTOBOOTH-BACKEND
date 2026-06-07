'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatCardSmallProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    subtitle?: string;
    variant?: 'light' | 'dark' | 'accent';
    delay?: number;
    onAction?: () => void;
    actionLabel?: string;
}

export default function StatCardSmall({
    title,
    value,
    icon,
    subtitle,
    variant = 'light',
    delay = 0,
    onAction,
    actionLabel
}: StatCardSmallProps) {
    const variants = {
        light: 'bg-white/60 backdrop-blur-xl border-[#EAE1D3] text-[#4A3F35] shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
        dark: 'bg-[#4A3F35]/90 backdrop-blur-xl border-white/5 text-[#FDFBF7] shadow-[0_20px_50px_rgba(0,0,0,0.2)]',
        accent: 'bg-[#F5F1EA]/80 backdrop-blur-xl border-[#EAE1D3] text-[#4A3F35] shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
    };

    const iconColors = {
        light: 'bg-gradient-to-br from-[#A68B67] to-[#8C7E6A] text-white shadow-lg shadow-[#A68B67]/20',
        dark: 'bg-white/10 text-[#A68B67] border border-white/5',
        accent: 'bg-white text-[#A68B67] border border-[#EAE1D3] shadow-sm',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.7, type: 'spring', stiffness: 100 }}
            whileHover={{ y: -5, transition: { duration: 0.3 } }}
            className={`p-10 rounded-[2.5rem] border relative overflow-hidden group transition-all duration-500 hover:border-[#A68B67]/30 ${variants[variant]}`}
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A68B67]/5 rounded-full blur-3xl translate-x-12 -translate-y-12 group-hover:bg-[#A68B67]/10 transition-colors" />
            
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-10 border transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 relative z-10 ${iconColors[variant]} ${variant === 'accent' ? '' : 'border-transparent'}`}>
                {icon}
            </div>

            <div className="space-y-3 relative z-10">
                <p className={`text-[10px] font-black uppercase tracking-[0.3em] opacity-60 ${variant === 'dark' ? 'text-[#A68B67]' : 'text-[#8C7E6A]'}`}>
                    {title}
                </p>
                <div className="flex items-baseline gap-2">
                    <h3 className={`text-4xl lg:text-5xl font-sans font-black tracking-tight ${variant === 'dark' ? 'text-white' : 'text-[#4A3F35]'}`}>
                        {value}
                    </h3>
                    {variant === 'accent' && <div className="w-2 h-2 rounded-full bg-[#A68B67] animate-pulse" />}
                </div>
            </div>

            <div className={`mt-10 pt-8 border-t flex items-center justify-between relative z-10 ${variant === 'dark' ? 'border-white/10' : 'border-[#F5F1EA]'}`}>
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] opacity-50 ${variant === 'dark' ? 'text-[#8C7E6A]' : 'text-[#A68B67]'}`}>
                    {subtitle}
                </span>
                {onAction && actionLabel && (
                    <button
                        onClick={onAction}
                        className="text-[9px] font-black text-[#A68B67] hover:text-[#4A3F35] uppercase tracking-widest transition-colors flex items-center gap-1.5 px-3 py-1 bg-[#F5F1EA] rounded-lg border border-[#EAE1D3]"
                    >
                        {actionLabel}
                    </button>
                )}
            </div>
        </motion.div>
    );
}
