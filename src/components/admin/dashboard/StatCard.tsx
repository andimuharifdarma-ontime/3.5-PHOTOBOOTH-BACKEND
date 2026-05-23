'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import LineChart from './LineChart';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend: string;
    trendData: number[];
    color: string;
    bg?: string;
    border?: string;
    idx: number;
}

export default function StatCard({
    title,
    value,
    icon: Icon,
    trend,
    trendData,
    color,
    bg = "bg-white",
    border = "border-[#EAE1D3]",
    idx
}: StatCardProps) {
    const isPositive = trend.startsWith('+') || trend === 'Active' || trend === 'Stabil';

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4 }}
            className={`p-5 md:p-6 lg:p-8 rounded-2xl border ${border} ${bg} shadow-md hover:shadow-xl hover:shadow-[#4A3F35]/8 transition-all duration-500 group flex flex-col relative overflow-hidden`}
        >
            {/* Subtle background glow on hover */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A68B67]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -translate-y-1/2 translate-x-1/2" />

            <div className="flex justify-between items-start mb-6 md:mb-8 lg:mb-10 relative z-10">
                <div className="p-3 md:p-4 bg-gradient-to-br from-[#F5F1EA] to-[#EAE1D3]/50 rounded-xl text-[#A68B67] border border-[#EAE1D3] group-hover:scale-110 group-hover:shadow-md transition-all duration-500">
                    <Icon className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className={`text-[7px] md:text-[8px] font-bold px-2.5 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 ${
                    isPositive 
                        ? 'bg-[#A68B67]/10 text-[#A68B67] border border-[#A68B67]/20' 
                        : 'bg-[#F5F1EA] text-[#8C7E6A] border border-[#EAE1D3]'
                }`}>
                    {isPositive && <div className="w-1 h-1 rounded-full bg-[#A68B67] animate-pulse" />}
                    {trend}
                </div>
            </div>
            <div className="space-y-1 md:space-y-2 flex-1 relative z-10">
                <p className="text-[8px] md:text-[9px] lg:text-[10px] font-bold text-[#A68B67] uppercase tracking-widest md:tracking-[0.2em]">{title}</p>
                <h3 className="text-2xl md:text-2xl lg:text-3xl font-sans font-bold text-[#4A3F35] tracking-tight">{value}</h3>
            </div>
            <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-[#EAE1D3]/50 relative z-10">
                <LineChart data={trendData} color={color} />
            </div>
        </motion.div>
    );
}
