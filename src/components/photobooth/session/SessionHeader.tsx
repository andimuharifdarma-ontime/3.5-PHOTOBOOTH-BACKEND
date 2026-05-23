'use client';

import { motion } from 'framer-motion';

interface SessionHeaderProps {
    currentPhotos: number;
    maxPhotos: number;
    remainingMs: number;
    onBack?: () => void;
}

export default function SessionHeader({
    currentPhotos,
    maxPhotos,
    remainingMs,
    onBack
}: SessionHeaderProps) {
    const formatTime = (ms: number) => {
        if (ms < 0) return '--:--';
        const totalSec = Math.floor(ms / 1000);
        const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
        const s = (totalSec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <motion.header
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative z-20 px-6 py-4 flex items-center justify-between"
        >
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center bg-white/5">
                    <span className="text-sm font-bold">{currentPhotos}/{maxPhotos}</span>
                </div>
            </div>

            {/* Timer Pill */}
            {remainingMs !== -1 && (
                <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#1C1917] border border-[#2D2824] shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-[#A68B67] animate-pulse" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#A68B67]">Time Remaining</span>
                    <span className="text-xl font-serif italic text-[#FDFBF7] tabular-nums">
                        {formatTime(remainingMs)}
                    </span>
                </div>
            )}

            <div className="w-10" />
        </motion.header>
    );
}
