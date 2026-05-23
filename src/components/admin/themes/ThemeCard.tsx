'use client';

import { motion } from 'framer-motion';
import { Layers, Image as ImageIcon, Eye, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface Theme {
    id: string;
    userName?: string | null;
    name: string;
    previewUrl: string;
    description: string | null;
    price: number;
    isActive: boolean;
    order?: number;
    _count?: { frames: number };
}

interface ThemeCardProps {
    theme: any;
    index: number;
    isPaymentEnabled: boolean;
    canManageThemes: boolean;
    onEdit: (theme: any) => void;
    onDelete: (id: string) => void;
}

export default function ThemeCard({
    theme,
    index,
    isPaymentEnabled,
    canManageThemes,
    onEdit,
    onDelete,
}: ThemeCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6 }}
            className="group bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl hover:shadow-[#4A3F35]/12 border border-[#EAE1D3] hover:border-[#A68B67]/30 transition-all duration-500 flex flex-col"
        >
            {/* Preview Image */}
            <div className="aspect-[4/5] bg-[#F5F1EA] relative overflow-hidden">
                {theme.previewUrl ? (
                    <img
                        src={theme.previewUrl}
                        alt={theme.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ease-out"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FDFBF7] to-[#F5F1EA]">
                        <ImageIcon className="w-12 h-12 text-[#D1C4B2] opacity-20" />
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/90 via-[#1C1917]/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />

                {/* Status Badges */}
                <div className="absolute top-5 left-5 flex flex-col gap-2">
                    <div className={`px-3.5 py-1.5 rounded-xl text-[8px] font-bold uppercase tracking-widest backdrop-blur-md border ${theme.isActive
                        ? 'bg-[#A68B67]/90 border-[#A68B67]/60 text-white shadow-lg shadow-[#A68B67]/20'
                        : 'bg-white/70 border-white/50 text-[#8C7E6A]'
                        }`}>
                        {theme.isActive ? '● Publik' : 'Draft'}
                    </div>
                    <div className="px-3.5 py-1.5 rounded-xl text-[8px] font-bold uppercase tracking-widest bg-white/90 backdrop-blur-md border border-white/60 text-[#4A3F35] flex items-center gap-2 shadow-sm">
                        <Layers className="w-3 h-3 text-[#A68B67]" />
                        {theme._count?.frames || 0} Frames
                    </div>
                    {isPaymentEnabled ? (
                        <div className="px-3.5 py-1.5 rounded-xl text-[8px] font-bold uppercase tracking-widest bg-[#1C1917]/80 text-white backdrop-blur-md border border-white/10 flex items-center gap-2 shadow-sm">
                            Rp {(theme.price || 0).toLocaleString('id-ID')}
                        </div>
                    ) : (
                        <div className="px-3.5 py-1.5 rounded-xl text-[8px] font-bold uppercase tracking-widest bg-emerald-500/90 text-white backdrop-blur-md border border-emerald-400/50 flex items-center gap-2 shadow-sm">
                            Gratis
                        </div>
                    )}
                    {theme.tag && (
                        <div className="px-3.5 py-1.5 rounded-xl text-[8px] font-bold uppercase tracking-widest bg-gradient-to-r from-[#A68B67] to-[#8C7E6A] text-white shadow-lg shadow-[#A68B67]/20 flex items-center gap-1.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            {theme.tag}
                        </div>
                    )}
                </div>

                {/* Premium Actions Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col gap-3 translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    <Link
                        href={`/admin/themes/${theme.id}/frames`}
                        className="w-full bg-white text-[#4A3F35] py-3.5 rounded-xl hover:bg-[#FDFBF7] transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest"
                    >
                        <Eye className="w-4 h-4" />
                        Kelola Galeri Frame
                    </Link>
                    {canManageThemes && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => onEdit(theme)}
                                className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 text-white py-3 rounded-xl hover:bg-white/20 transition-all text-[9px] font-bold uppercase tracking-widest"
                            >
                                Ubah Data
                            </button>
                            <button
                                onClick={() => onDelete(theme.id)}
                                className="flex-1 bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-200 py-3 rounded-xl hover:bg-red-500/40 transition-all text-[9px] font-bold uppercase tracking-widest"
                            >
                                Hapus Tema
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-7 flex-1 flex flex-col bg-white">
                <div className="space-y-3 flex-1">
                    <h3 className="text-xl font-sans font-bold text-[#4A3F35] lowercase first-letter:uppercase group-hover:text-[#A68B67] transition-colors duration-300">{theme.name}</h3>
                    {theme.description ? (
                        <p className="text-[11px] text-[#8C7E6A] font-medium leading-relaxed line-clamp-2">{theme.description}</p>
                    ) : (
                        <p className="text-[10px] text-[#D1C4B2] font-bold uppercase tracking-widest opacity-70">Koleksi Belum Berdeskripsi</p>
                    )}
                </div>

                <div className="pt-6 mt-6 border-t border-[#EAE1D3]/80 flex items-center justify-between">
                    <span className="text-[8px] font-bold text-[#A68B67] uppercase tracking-widest">Studio Certified</span>
                    <div className="w-7 h-7 rounded-full bg-[#F5F1EA] group-hover:bg-[#4A3F35] flex items-center justify-center transition-all duration-500">
                        <ChevronRight className="w-3.5 h-3.5 text-[#A68B67] group-hover:text-white transition-colors duration-300" />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
