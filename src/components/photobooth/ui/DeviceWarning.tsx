'use client';

import { motion } from 'framer-motion';
import { Monitor, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface DeviceWarningProps {
    onClose?: () => void;
}

export default function DeviceWarning({ onClose }: DeviceWarningProps) {
    return (
        <div className="fixed inset-0 z-[100] bg-[#1C1917] flex items-center justify-center p-6 text-center">
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#A68B67_1px,transparent_1px)] [background-size:24px_24px]"></div>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="max-w-md w-full space-y-8 relative"
            >
                <div className="relative">
                    <div className="w-24 h-24 bg-[#A68B67]/10 rounded-full flex items-center justify-center mx-auto border border-[#A68B67]/20 relative">
                        <Monitor className="w-10 h-10 text-[#A68B67]" />
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute -top-1 -right-1"
                        >
                            <AlertTriangle className="w-6 h-6 text-amber-500 fill-amber-500/20" />
                        </motion.div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-3xl font-serif italic text-[#FDFBF7] tracking-tight">Optimalkan Pengalaman</h2>
                    <div className="h-0.5 w-12 bg-[#A68B67]/30 mx-auto rounded-full"></div>
                    <p className="text-[#8C7E6A] font-serif italic text-lg leading-relaxed">
                        Halaman Photobooth ini dirancang khusus untuk kenyamanan layar lebar.
                        Demi hasil terbaik, silakan akses melalui <span className="text-[#FDFBF7] font-sans not-italic font-black text-xs uppercase tracking-widest">Laptop</span> atau <span className="text-[#FDFBF7] font-sans not-italic font-black text-xs uppercase tracking-widest">Tablet Layar Lebar</span>.
                    </p>
                </div>

                <div className="pt-10 flex flex-col gap-4">
                    <Link
                        href="/admin"
                        className="inline-flex items-center justify-center gap-3 bg-[#A68B67] hover:bg-[#8C7E6A] text-[#FDFBF7] px-8 py-4 rounded-sm text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-2xl shadow-black/40"
                    >
                        Kembali ke Dashboard
                    </Link>
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">
                        Resolusi Anda: {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '...'}px
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
