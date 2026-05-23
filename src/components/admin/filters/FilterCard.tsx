'use client';

import { motion } from 'framer-motion';
import { Layers, Image as ImageIcon, CheckCircle, XCircle } from 'lucide-react';

interface Filter {
    id: string;
    userName?: string | null;
    name: string;
    url: string;
    description: string | null;
    isActive: boolean;
    order?: number;
}

interface FilterCardProps {
    filter: Filter;
    index: number;
    canManageFilters: boolean;
    onEdit: (filter: Filter) => void;
    onDelete: (id: string) => void;
}

export default function FilterCard({
    filter,
    index,
    canManageFilters,
    onEdit,
    onDelete,
}: FilterCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="group bg-[#F5F1EA] rounded-sm overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-[#4A3F35]/10 border border-[#EAE1D3] transition-all duration-300 flex flex-col"
        >
            {/* Preview Image (LUT) */}
            <div className="aspect-[4/3] bg-[#EAE1D3] relative overflow-hidden flex items-center justify-center p-8">
                {filter.url ? (
                    <div className="w-full h-full relative group-hover:scale-105 transition-transform duration-500 ease-out">
                        <img
                            src={filter.url}
                            alt={filter.name}
                            className="w-full h-full object-contain filter drop-shadow-xl"
                        />
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#FDFBF7]">
                        <ImageIcon className="w-12 h-12 text-[#D1C4B2] opacity-20" />
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1917]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />

                {/* Status Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                    <div className={`px-3 py-1 rounded-sm text-[8px] font-black uppercase tracking-[0.2em] backdrop-blur-md border ${filter.isActive
                        ? 'bg-amber-500/90 border-amber-400 text-white shadow-xl shadow-amber-900/20'
                        : 'bg-white/70 border-white text-gray-400'
                        }`}>
                        {filter.isActive ? 'Aktif' : 'Nonaktif'}
                    </div>
                </div>

                {/* Premium Actions Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col gap-2 translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    {canManageFilters && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => onEdit(filter)}
                                className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 text-white py-2.5 rounded-sm hover:bg-white/20 transition-all text-[9px] font-black uppercase tracking-[0.2em]"
                            >
                                Ubah Data
                            </button>
                            <button
                                onClick={() => onDelete(filter.id)}
                                className="flex-1 bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-200 py-2.5 rounded-sm hover:bg-red-500/40 transition-all text-[9px] font-black uppercase tracking-[0.2em]"
                            >
                                Hapus
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col bg-[#F5F1EA]">
                <div className="space-y-3 flex-1">
                    <h3 className="text-xl font-serif italic text-[#4A3F35] lowercase first-letter:uppercase">{filter.name}</h3>
                    {filter.description ? (
                        <p className="text-[10px] text-[#8C7E6A] font-serif italic leading-relaxed line-clamp-2">{filter.description}</p>
                    ) : (
                        <p className="text-[9px] text-[#D1C4B2] font-black uppercase tracking-widest italic opacity-50">Filter Tanpa Deskripsi</p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
