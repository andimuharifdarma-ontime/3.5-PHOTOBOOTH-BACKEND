'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import PhotoSlot from '@/components/photobooth/shared/PhotoSlot';

interface SessionSidebarProps {
    photos: any[];
    maxPhotos: number;
    retakeIndex: number | null;
    isComplete: boolean;
    onRemove: (id: string) => void;
    onPreview: (index: number) => void;
    onCancelRetake: () => void;
    onFinish: () => void;
    onDragStart: (index: number) => void;
    onDragOver: (index: number) => void;
    onDrop: (index: number) => void;
    onDragEnd: () => void;
    draggedIndex: number | null;
    dragOverIndex: number | null;
}

export default function SessionSidebar({
    photos,
    maxPhotos,
    retakeIndex,
    isComplete,
    onRemove,
    onPreview,
    onCancelRetake,
    onFinish,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    draggedIndex,
    dragOverIndex
}: SessionSidebarProps) {
    return (
        <div className="w-full bg-[#1C1917] border-t border-white/5 flex flex-row items-center gap-6 px-8 py-4 z-20 relative min-h-[160px]">
            <div className="flex-shrink-0 w-40">
                <h2 className="text-sm font-serif italic text-[#EAE1D3] border-b border-white/10 pb-2 mb-1">
                    Galeri Sesi
                </h2>
                <p className="text-[8px] text-[#A68B67] uppercase tracking-widest leading-tight">
                    {photos.length} Captured<br />
                    {Math.max(0, maxPhotos - photos.length)} Remaining
                </p>
            </div>

            {/* Film Strip - Horizontal */}
            <div className="flex-1 flex flex-row items-center gap-6 overflow-x-auto no-scrollbar py-2">
                {Array.from({ length: maxPhotos }).map((_, index) => (
                    <div key={index} className="relative flex-shrink-0">
                        {/* Number Indicator */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px] font-mono text-white/20 uppercase tracking-tighter">
                            FRAME 0{index + 1}
                        </div>

                        <PhotoSlot
                            photo={photos[index]}
                            index={index}
                            onRemove={onRemove}
                            onPreview={() => onPreview(index)}
                            onDragStart={onDragStart}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                            onDragEnd={onDragEnd}
                            isDragging={draggedIndex === index}
                            isDragOver={dragOverIndex === index}
                            className="w-[140px] aspect-[4/3] bg-white/5 rounded-sm border border-white/10 hover:border-[#A68B67]/50 transition-colors"
                        />
                    </div>
                ))}
            </div>

            {/* Actions - Side end */}
            <div className="flex-shrink-0 flex flex-col gap-2 min-w-[180px]">
                {retakeIndex !== null && (
                    <button
                        onClick={onCancelRetake}
                        className="w-full py-2.5 border border-white/20 text-white/50 hover:bg-white/5 hover:text-white text-[10px] uppercase tracking-widest transition-all"
                    >
                        Cancel Retake
                    </button>
                )}

                {isComplete && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={onFinish}
                        className="w-full py-3.5 bg-[#FDFBF7] hover:bg-white text-[#1C1917] font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-2 group"
                    >
                        <span>Cetak Hasil</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                )}
            </div>
        </div>
    );
}
