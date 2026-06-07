'use client';

import { motion } from 'framer-motion';
import { Users, ChevronRight, ArrowRight, Mail, Crown } from 'lucide-react';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isPaymentEnabled: boolean;
}

interface UserSelectionListProps {
    users: User[];
    onSelect: (user: User) => void;
}

function getAvatarGradient(name: string) {
    const gradients = [
        'from-[#A68B67] to-[#8C7E6A]',
        'from-[#4A3F35] to-[#2D2824]',
        'from-[#A68B67] to-[#4A3F35]',
        'from-[#8C7E6A] to-[#4A3F35]',
        'from-[#D1C4B2] to-[#A68B67]',
        'from-[#4A3F35] to-[#A68B67]',
    ];
    const index = name.charCodeAt(0) % gradients.length;
    return gradients[index];
}

export default function UserSelectionList({ users, onSelect }: UserSelectionListProps) {
    return (
        <div className="space-y-8 pb-20">
            {/* Modern Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#1C1917] p-8 md:p-12 shadow-2xl shadow-black/20">
                {/* Background patterns */}
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[linear-gradient(to_right,#A68B67_1px,transparent_1px),linear-gradient(to_bottom,#A68B67_1px,transparent_1px)] [background-size:32px_32px]" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#A68B67]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#4A3F35]/20 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center gap-3">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A68B67] to-[#8C7E6A] flex items-center justify-center shadow-lg shadow-[#A68B67]/20"
                            >
                                <Users className="w-5 h-5 text-white" />
                            </motion.div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#A68B67]/80">Client Collection Manager</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-sans font-extrabold text-white tracking-tight leading-tight">
                            Koleksi Client
                        </h1>
                        <p className="text-white/40 font-medium text-base md:text-lg max-w-lg">
                            Pilih klien untuk mengelola tema galeri mereka
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="flex items-center gap-4"
                    >
                        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#A68B67] animate-pulse shadow-lg shadow-[#A68B67]/30" />
                            <span className="text-[11px] font-bold text-white/70 tracking-wide">{users.length} Client Aktif</span>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Client Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {users.map((user, idx) => {
                    const gradient = getAvatarGradient(user.name);

                    return (
                        <motion.button
                            key={user.id}
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                                delay: idx * 0.07,
                                duration: 0.5,
                                ease: [0.22, 1, 0.36, 1]
                            }}
                            whileHover={{ y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelect(user)}
                            className="relative bg-white rounded-2xl border border-[#EAE1D3] shadow-sm hover:shadow-xl hover:shadow-[#4A3F35]/8 hover:border-[#A68B67]/40 transition-all duration-500 text-left flex flex-col group h-full overflow-hidden"
                        >
                            {/* Top accent bar */}
                            <div className={`h-1 w-full bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                            <div className="p-6 flex flex-col flex-1">
                                {/* Avatar + Badge Row */}
                                <div className="flex justify-between items-start mb-5">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-500`}>
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>

                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F1EA] border border-[#EAE1D3]">
                                        <Crown className="w-3 h-3 text-[#A68B67]" />
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#A68B67]">Client</span>
                                    </div>
                                </div>

                                {/* User Info */}
                                <div className="flex-1 space-y-2 mb-6">
                                    <h3 className="text-lg font-bold text-[#4A3F35] group-hover:text-[#A68B67] transition-colors duration-300 capitalize">
                                        {user.name}
                                    </h3>
                                    <div className="flex items-center gap-2 text-[#8C7E6A]/70">
                                        <Mail className="w-3.5 h-3.5" />
                                        <p className="text-[11px] font-medium truncate">{user.email}</p>
                                    </div>
                                </div>

                                {/* Payment Status */}
                                <div className="flex items-center gap-2 mb-5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${user.isPaymentEnabled ? 'bg-[#A68B67]' : 'bg-[#8C7E6A]'} animate-pulse`} />
                                    <span className="text-[10px] font-semibold text-[#8C7E6A]/60 tracking-wide">
                                        {user.isPaymentEnabled ? 'Payment Mode' : 'Non-Payment Mode'}
                                    </span>
                                </div>

                                {/* Action Footer */}
                                <div className="pt-4 border-t border-[#EAE1D3]/60 flex items-center justify-between w-full">
                                    <span className="text-[11px] font-bold text-[#A68B67] uppercase tracking-wider group-hover:text-[#4A3F35] transition-colors duration-300">
                                        Kelola Tema
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-[#F5F1EA] group-hover:bg-[#4A3F35] flex items-center justify-center transition-all duration-500">
                                        <ArrowRight className="w-4 h-4 text-[#A68B67] group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300" />
                                    </div>
                                </div>
                            </div>
                        </motion.button>
                    );
                })}

                {users.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="col-span-full py-20 text-center rounded-3xl border-2 border-dashed border-[#EAE1D3] bg-gradient-to-br from-[#FDFBF7] to-[#F5F1EA]"
                    >
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="w-20 h-20 rounded-3xl bg-[#F5F1EA] flex items-center justify-center mx-auto mb-6 border border-[#EAE1D3]"
                        >
                            <Users className="w-8 h-8 text-[#A68B67]/60" />
                        </motion.div>
                        <h3 className="text-xl font-bold text-[#4A3F35] mb-2">Belum Ada Klien</h3>
                        <p className="text-[#8C7E6A]/70 font-medium text-sm max-w-sm mx-auto">
                            Belum ada klien yang terdaftar di sistem. Tambahkan klien baru untuk memulai.
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
