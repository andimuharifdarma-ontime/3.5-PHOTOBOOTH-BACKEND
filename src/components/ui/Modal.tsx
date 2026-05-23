'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    children: ReactNode;
    maxWidth?: string;
    showCloseButton?: boolean;
    darkHeader?: boolean;
}

export default function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    maxWidth = 'max-w-xl',
    showCloseButton = true,
    darkHeader = false,
}: ModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 30 }}
                        transition={{ duration: 0.2 }}
                        className={`relative bg-[#FDFBF7] rounded-3xl w-full ${maxWidth} shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[90vh]`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {title && (
                            <div className={`${darkHeader ? 'bg-[#1C1917] text-white' : 'bg-[#FDFBF7] border-b border-[#EAE1D3]'} p-6 md:p-10 flex-shrink-0`}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className={`text-2xl md:text-3xl font-sans font-bold ${darkHeader ? 'text-[#FDFBF7]' : 'text-[#4A3F35]'}`}>
                                            {title}
                                        </h2>
                                        {subtitle && (
                                            <p className={`${darkHeader ? 'text-[#A68B67]' : 'text-[#8C7E6A]'} text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] mt-2 md:mt-4`}>
                                                {subtitle}
                                            </p>
                                        )}
                                    </div>
                                    {showCloseButton && (
                                        <button
                                            onClick={onClose}
                                            className={`w-8 h-8 md:w-10 md:h-10 rounded-full border ${darkHeader ? 'border-white/10 text-white/50 hover:text-white hover:bg-white/5' : 'border-[#EAE1D3] text-[#4A3F35]/50 hover:text-[#4A3F35] hover:bg-[#F5F1EA]'} flex items-center justify-center transition-all flex-shrink-0 ml-4`}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="p-6 md:p-10 overflow-y-auto flex-1">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
