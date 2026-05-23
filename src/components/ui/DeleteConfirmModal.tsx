'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    saving?: boolean;
}

export default function DeleteConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Hapus Koleksi?',
    description = 'Tindakan ini bersifat permanen. Data yang dihapus tidak dapat dikembalikan.',
    saving = false,
}: DeleteConfirmModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="relative bg-[#FDFBF7] rounded-sm p-10 w-full max-w-md shadow-2xl border border-[#EAE1D3] text-center"
                    >
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-100">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>
                        <h3 className="text-3xl font-serif italic text-[#4A3F35] mb-4">{title}</h3>
                        <p className="text-[#8C7E6A] font-serif italic text-sm mb-10 opacity-80 leading-relaxed">
                            {description}
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={onClose}
                                className="flex-1 px-8 py-4 border border-[#EAE1D3] text-[#4A3F35] rounded-sm hover:bg-[#F5F1EA] transition-all text-[10px] font-black uppercase tracking-[0.3em]"
                                disabled={saving}
                            >
                                Batal
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={saving}
                                className="flex-1 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-sm transition-all shadow-xl shadow-red-900/10 text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    'Hapus Selamanya'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
