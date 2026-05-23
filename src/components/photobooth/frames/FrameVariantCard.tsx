'use client';

import { motion } from 'framer-motion';

interface FrameVariantCardProps {
    id: string;
    name: string;
    url: string;
    isActive: boolean;
    onClick: () => void;
    index: number;
}

export default function FrameVariantCard({
    name,
    url,
    isActive,
    onClick,
    index
}: FrameVariantCardProps) {
    return (
        <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
            onClick={onClick}
            className={`relative rounded-xl overflow-hidden border-2 transition-all text-left w-full ${isActive
                ? 'border-emerald-500 shadow-emerald-500/50 shadow-lg bg-emerald-500/10 scale-[1.02]'
                : 'border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10'
                }`}
        >
            <div className="relative p-2">
                <div className="w-full aspect-[9/16] rounded-lg overflow-hidden bg-white shadow-md">
                    <img
                        src={url}
                        alt={name}
                        className="w-full h-full object-contain"
                    />
                </div>
                {isActive && (
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute top-4 right-4 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg z-10"
                    >
                        <span className="text-xs text-white font-bold">✓</span>
                    </motion.div>
                )}
            </div>
        </motion.button>
    );
}
