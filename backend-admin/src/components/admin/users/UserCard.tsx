'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, CreditCard, Wallet, Shield, Star, ShieldCheck, Key, Copy, Check, RefreshCw, Paintbrush } from 'lucide-react';
import Badge from '@/components/ui/Badge';

interface User {
    id: string;
    email: string;
    name: string | null;
    role: "ADMIN" | "KARYAWAN" | "CLIENT";
    canManageThemes: boolean;
    canManageFilters: boolean;
    isPaymentEnabled: boolean;
    canInputCapital: boolean;
    initialCapital?: number;
    apiKey: string | null;
    createdAt: string;
}

interface UserCardProps {
    user: User;
    onEdit: (user: User) => void;
    onDelete: (id: string) => void;
    onGenerateApiKey: (id: string) => Promise<void>;
    onManageTheme?: (user: User) => void;
}

function getAvatarStyles(role: string) {
    switch (role) {
        case 'ADMIN':
            return 'from-[#1C1917] to-[#4A3F35] text-[#A68B67] shadow-black/20';
        case 'KARYAWAN':
            return 'from-[#A68B67] to-[#8C7E6A] text-white shadow-[#A68B67]/20';
        case 'CLIENT':
            return 'from-[#F5F1EA] to-[#EAE1D3] text-[#4A3F35] shadow-[#4A3F35]/10';
        default:
            return 'from-[#D1C4B2] to-[#A68B67] text-white shadow-transparent';
    }
}

export default function UserCard({ user, onEdit, onDelete, onGenerateApiKey, onManageTheme }: UserCardProps) {
    const avatarStyles = getAvatarStyles(user.role);
    const [copied, setCopied] = useState(false);
    const [generating, setGenerating] = useState(false);

    const handleCopyKey = async (key: string) => {
        try {
            await navigator.clipboard.writeText(key);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy key', err);
        }
    };

    const handleGenerateKey = async () => {
        setGenerating(true);
        try {
            await onGenerateApiKey(user.id);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <motion.div
            layout
            whileHover={{ y: -8 }}
            className="bg-white/60 backdrop-blur-xl border border-[#EAE1D3] rounded-[2.5rem] overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgba(74,63,53,0.12)] hover:border-[#A68B67]/40 transition-all duration-700 relative flex flex-col h-full"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A68B67]/5 rounded-full blur-3xl translate-x-12 -translate-y-12 group-hover:bg-[#A68B67]/10 transition-colors" />
            
            <div className="p-8 space-y-8 relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-5">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarStyles} flex items-center justify-center text-2xl font-sans font-black shadow-xl group-hover:scale-110 transition-all duration-700 shrink-0 border border-white/20`}>
                            {user.name?.[0] || user.email[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xl font-sans font-extrabold text-[#4A3F35] tracking-tight truncate group-hover:text-[#A68B67] transition-colors duration-500" title={user.name || 'No Name'}>
                                {user.name || 'No Name'}
                            </h3>
                            <p className="text-[11px] text-[#8C7E6A] font-medium lowercase tracking-tight opacity-60 truncate mb-3" title={user.email}>
                                {user.email}
                            </p>
                            <Badge variant={user.role === 'ADMIN' ? 'amber' : user.role === 'CLIENT' ? 'purple' : 'blue'} className="h-6 flex items-center gap-1.5 font-black">
                                {user.role === 'ADMIN' && <ShieldCheck className="w-3 h-3" />}
                                {user.role === 'CLIENT' && <Star className="w-3 h-3" />}
                                {user.role === 'KARYAWAN' && <Shield className="w-3 h-3" />}
                                {user.role}
                            </Badge>
                        </div>
                    </div>
                </div>

                {user.role === 'CLIENT' && (
                    <div className="space-y-6">
                        <div className="flex flex-wrap gap-3">
                            <div className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-2 border transition-all duration-500 ${
                                user.isPaymentEnabled 
                                    ? 'bg-green-50/50 border-green-100 text-green-600' 
                                    : 'bg-red-50/50 border-red-100 text-red-600'
                            }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${user.isPaymentEnabled ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'} animate-pulse`} />
                                {user.isPaymentEnabled ? 'PEMBAYARAN PAYMENT' : 'SISTEM FULL SEWA'}
                            </div>
                            <div className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-2 border transition-all duration-500 ${
                                user.canInputCapital 
                                    ? 'bg-amber-50/50 border-amber-100 text-amber-600' 
                                    : 'bg-slate-50/50 border-slate-100 text-slate-400'
                            }`}>
                                <Wallet className={`w-3 h-3 ${user.canInputCapital ? 'text-amber-500' : 'text-slate-300'}`} />
                                MODAL: {user.canInputCapital ? 'AKTIF' : 'NONAKTIF'}
                            </div>
                        </div>

                        {/* Secure Kiosk API Key Container */}
                        <div className="bg-[#F5F1EA]/50 border border-[#EAE1D3] rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] text-[#A68B67] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                                    <Key className="w-3.5 h-3.5" /> Kiosk API Key
                                </span>
                                {user.apiKey && (
                                    <button
                                        onClick={() => handleCopyKey(user.apiKey!)}
                                        className="text-[9px] text-[#8C7E6A] hover:text-[#4A3F35] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                                    >
                                        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                        {copied ? 'Tersalin' : 'Salin'}
                                    </button>
                                )}
                            </div>

                            {user.apiKey ? (
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-xs font-bold text-[#4A3F35] tracking-tight bg-white border border-[#EAE1D3] px-3 py-1.5 rounded-xl flex-1 truncate">
                                        {user.apiKey.includes('••••')
                                            ? user.apiKey
                                            : `dovelens_••••••••${user.apiKey.slice(-8)}`}
                                    </span>
                                    <button
                                        onClick={handleGenerateKey}
                                        disabled={generating}
                                        className="w-9 h-9 bg-white border border-[#EAE1D3] hover:border-[#A68B67] text-[#A68B67] hover:text-[#4A3F35] rounded-xl flex items-center justify-center transition-all disabled:opacity-50"
                                        title="Regenerate API Key"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGenerateKey}
                                    disabled={generating}
                                    className="w-full bg-[#A68B67] hover:bg-[#8C7E6A] text-white py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md shadow-[#A68B67]/10 disabled:opacity-50"
                                >
                                    {generating ? (
                                        <div className="w-3 h-3 rounded-full border border-white/20 border-t-white animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-3 h-3" />
                                    )}
                                    Generate Kiosk Key
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <div className="mt-auto pt-8 border-t border-[#F5F1EA] flex items-end justify-between">
                    <div className="space-y-1.5">
                        <span className="text-[9px] text-[#A68B67] font-black uppercase tracking-[0.2em] opacity-60">Bergabung</span>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-[#4A3F35] tracking-tight">
                                {new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className="text-[10px] font-medium text-[#8C7E6A]">
                                {new Date(user.createdAt).getFullYear()}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onEdit(user)}
                            className="w-12 h-12 flex items-center justify-center text-[#A68B67] bg-[#F5F1EA] hover:bg-[#4A3F35] hover:text-white rounded-2xl transition-all duration-500 border border-[#EAE1D3] group-hover:shadow-lg group-hover:shadow-[#A68B67]/20"
                            title="Edit User"
                        >
                            <Pencil className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => onDelete(user.id)}
                            className="w-12 h-12 flex items-center justify-center text-red-400 bg-red-50 hover:bg-red-500 hover:text-white rounded-2xl transition-all duration-500 border border-red-100 group-hover:shadow-lg group-hover:shadow-red-500/20"
                            title="Delete User"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
