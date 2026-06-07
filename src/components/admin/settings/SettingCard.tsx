'use client';

import { motion } from 'framer-motion';
import { LucideIcon, MonitorPlay, Clock, Lightbulb, Timer, BookOpen } from 'lucide-react';

interface SettingCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    isEnabled: boolean;
    onToggleEnabled: () => void;
    isTimerEnabled: boolean;
    onToggleTimer: () => void;
    timerValue: number;
    onTimerChange: (val: number) => void;
    maxTimer: number;
    tips: {
        pageActive: string;
        timerActive: string;
        timerDuration: string;
    };
    idx: number;
}

export default function SettingCard({
    title,
    description,
    icon: Icon,
    isEnabled,
    onToggleEnabled,
    isTimerEnabled,
    onToggleTimer,
    timerValue,
    onTimerChange,
    maxTimer,
    tips,
    idx
}: SettingCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -2 }}
            className="bg-white rounded-2xl border border-[#EAE1D3] shadow-md hover:shadow-xl hover:shadow-[#4A3F35]/6 transition-all duration-500 overflow-hidden group"
        >
            {/* Card Header */}
            <div className="p-6 border-b border-[#F5F1EA]">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl transition-all duration-500 ${isEnabled ? 'bg-gradient-to-br from-[#F5F1EA] to-[#EAE1D3]/50 text-[#A68B67] shadow-sm' : 'bg-gray-100 text-gray-400'}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-sans font-bold text-[#4A3F35]">{title}</h3>
                            <p className="text-[10px] text-[#8C7E6A] mt-1">{description}</p>
                        </div>
                    </div>
                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full mt-2 transition-colors duration-500 ${isEnabled ? 'bg-[#A68B67] shadow-sm shadow-[#A68B67]/30' : 'bg-[#EAE1D3]'}`} />
                </div>
            </div>

            {/* Card Body */}
            <div className="p-6 space-y-5 bg-gradient-to-b from-[#FDFBF7] to-white">
                {/* Page Enable Toggle */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MonitorPlay className="w-4 h-4 text-[#8C7E6A]" />
                            <span className="text-xs font-bold text-[#4A3F35]">Halaman Aktif</span>
                        </div>
                        <button
                            onClick={onToggleEnabled}
                            className={`relative w-14 h-7 rounded-full transition-all duration-300 flex items-center px-0.5 shadow-inner ${isEnabled ? 'bg-[#A68B67]' : 'bg-[#EAE1D3]'}`}
                        >
                            <motion.div
                                animate={{ x: isEnabled ? 28 : 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className="w-6 h-6 bg-white rounded-full shadow-md"
                            />
                        </button>
                    </div>
                    <div className="flex items-start gap-2 text-[10px] text-[#8C7E6A] bg-[#F5F1EA]/80 px-3 py-2.5 rounded-xl border-l-2 border-[#A68B67]">
                        <Lightbulb className="w-3 h-3 text-[#A68B67] shrink-0 mt-0.5" />
                        <p>{tips.pageActive}</p>
                    </div>
                </div>

                <div className="border-t border-[#EAE1D3]/60"></div>

                {/* Timer Enable Toggle */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#8C7E6A]" />
                            <span className="text-xs font-bold text-[#4A3F35]">Timer Aktif</span>
                        </div>
                        <button
                            onClick={onToggleTimer}
                            className={`relative w-14 h-7 rounded-full transition-all duration-300 flex items-center px-0.5 shadow-inner ${isTimerEnabled ? 'bg-[#A68B67]' : 'bg-[#EAE1D3]'}`}
                        >
                            <motion.div
                                animate={{ x: isTimerEnabled ? 28 : 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className="w-6 h-6 bg-white rounded-full shadow-md"
                            />
                        </button>
                    </div>
                    <div className="flex items-start gap-2 text-[10px] text-[#8C7E6A] bg-[#F5F1EA]/80 px-3 py-2.5 rounded-xl border-l-2 border-[#A68B67]">
                        <Timer className="w-3 h-3 text-[#A68B67] shrink-0 mt-0.5" />
                        <p>{tips.timerActive}</p>
                    </div>
                </div>

                <div className="border-t border-[#EAE1D3]/60"></div>

                {/* Timer Duration */}
                <div className={`space-y-3 transition-all duration-500 ${isTimerEnabled ? 'opacity-100' : 'opacity-30'}`}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#4A3F35]">Durasi Timer</span>
                        <span className="text-[10px] font-bold text-[#A68B67] uppercase tracking-wider bg-[#F5F1EA] px-3 py-1 rounded-full border border-[#EAE1D3]">
                            {timerValue} Menit
                        </span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max={maxTimer}
                        value={timerValue}
                        onChange={(e) => onTimerChange(parseInt(e.target.value))}
                        disabled={!isTimerEnabled}
                        className="w-full h-2 bg-[#EAE1D3] rounded-lg appearance-none cursor-pointer accent-[#A68B67] disabled:cursor-not-allowed"
                    />
                    <div className="flex justify-between text-[9px] text-[#8C7E6A]">
                        <span>1 menit</span>
                        <span>{maxTimer} menit</span>
                    </div>
                    <div className="flex items-start gap-2 text-[10px] text-[#8C7E6A] bg-[#F5F1EA]/80 px-3 py-2.5 rounded-xl border-l-2 border-[#A68B67]">
                        <BookOpen className="w-3 h-3 text-[#A68B67] shrink-0 mt-0.5" />
                        <p>{tips.timerDuration}</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
