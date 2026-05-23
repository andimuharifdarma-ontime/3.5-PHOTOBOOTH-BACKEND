'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface ActionPanelProps {
    step: string;
    title: string;
    description: string;
    buttonLabel: string;
    buttonIcon: LucideIcon;
    onButtonClick: () => void;
}

export default function ActionPanel({
    step,
    title,
    description,
    buttonLabel,
    buttonIcon: Icon,
    onButtonClick
}: ActionPanelProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 md:px-6 pb-6 pt-4 bg-gradient-to-t from-[rgb(44,24,16)] via-[rgb(44,24,16)]/95 to-transparent">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-7xl mx-auto w-full"
            >
                <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-primary-500">
                            {step}
                        </p>
                        <h2 className="text-xl font-semibold text-primary-900">
                            {title}
                        </h2>
                        <p className="text-primary-600 text-sm">
                            {description}
                        </p>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onButtonClick}
                        className="inline-flex items-center gap-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-4 rounded-2xl shadow-lg text-lg"
                    >
                        <Icon size={20} />
                        {buttonLabel}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
}
