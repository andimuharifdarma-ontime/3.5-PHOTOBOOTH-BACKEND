'use client';

import { ReactNode } from 'react';

interface BadgeProps {
    children: ReactNode;
    variant?: 'default' | 'outline' | 'amber' | 'blue' | 'purple' | 'green' | 'red' | 'warning' | 'info' | 'success' | 'error';
    className?: string;
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
    const variants = {
        default: 'bg-[#F5F1EA] text-[#4A3F35] border-[#EAE1D3]',
        outline: 'bg-transparent border-[#EAE1D3] text-[#8C7E6A]',
        amber: 'bg-amber-50 border-amber-200 text-amber-600',
        warning: 'bg-amber-50 border-amber-200 text-amber-600',
        blue: 'bg-blue-50 border-blue-200 text-blue-600',
        info: 'bg-blue-50 border-blue-200 text-blue-600',
        purple: 'bg-purple-50 border-purple-200 text-purple-600',
        green: 'bg-green-50 border-green-200 text-green-600',
        success: 'bg-green-50 border-green-200 text-green-600',
        red: 'bg-red-50 border-red-200 text-red-600',
        error: 'bg-red-50 border-red-200 text-red-600',
    };

    return (
        <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
}
