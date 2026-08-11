"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Users as UsersIcon,
    Search,
    ShieldAlert,
    Palette,
    ArrowRight,
    Star,
    ShieldCheck,
    Shield
} from "lucide-react";
import { motion } from "framer-motion";
import AdminPageSkeleton from "@/components/ui/AdminPageSkeleton";
import Badge from "@/components/ui/Badge";

interface User {
    id: string;
    email: string;
    name: string | null;
    role: "ADMIN" | "KARYAWAN" | "CLIENT";
    isPaymentEnabled: boolean;
    createdAt: string;
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

export default function KioskThemesAccountSelectorPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [error, setError] = useState("");

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setError("");
            const res = await fetch(`/api/admin/users?t=${Date.now()}`);
            const data = await res.json();

            if (!res.ok) {
                const errorMessage = data.details ? `${data.error}: ${data.details}` : (data.error || "Gagal memuat daftar akun");
                setError(errorMessage);
                return;
            }

            if (Array.isArray(data)) {
                // Filter to only display clients and employees who run actual kiosks
                setUsers(data.filter(u => u.role === "CLIENT" || u.role === "KARYAWAN"));
            } else {
                setError("Format data tidak valid");
            }
        } catch (err) {
            console.error("Failed to fetch users", err);
            setError("Terjadi kesalahan koneksi saat memuat akun");
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch = 
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === "ALL" ? true : user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    if (loading) return <AdminPageSkeleton variant="grid" />;

    return (
        <div className="p-8 lg:p-12 space-y-12 max-w-[1600px] mx-auto animate-fadeIn">
            {/* Modern Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#1C1917] p-8 md:p-12 shadow-2xl shadow-black/20">
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[linear-gradient(to_right,#A68B67_1px,transparent_1px),linear-gradient(to_bottom,#A68B67_1px,transparent_1px)] [background-size:32px_32px]" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#A68B67]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-[#4A3F35]/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A68B67] to-[#8C7E6A] flex items-center justify-center shadow-lg shadow-[#A68B67]/20">
                                <Palette className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#A68B67]/80">Workspace Kustomisasi</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-sans font-extrabold text-white tracking-tight">Kustomisasi Tampilan Kiosk</h1>
                        <p className="text-white/40 font-medium text-base">Pilih akun/klien di bawah untuk mengedit tampilan antarmuka photobooth kiosk secara visual.</p>
                    </div>
                </div>
            </div>

            {/* Search & Filter Wrapper */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl bg-white/60 backdrop-blur-xl border border-[#EAE1D3] p-4 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D1C4B2]" />
                    <input
                        type="text"
                        placeholder="Cari nama atau email akun..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-transparent border-0 py-3 pl-12 pr-4 text-xs font-bold text-[#4A3F35] placeholder:text-[#8C7E6A]/40 focus:outline-none"
                    />
                </div>
                <div className="sm:w-48 shrink-0 relative border-l border-[#EAE1D3]/80 sm:pl-4">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full bg-transparent border-0 py-3 pr-8 text-xs font-black text-[#A68B67] uppercase tracking-wider focus:outline-none appearance-none cursor-pointer"
                    >
                        <option value="ALL">Semua Peran</option>
                        <option value="CLIENT">Client / Mitra</option>
                        <option value="KARYAWAN">Karyawan</option>
                    </select>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg width="8" height="5" viewBox="0 0 8 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1L4 4L7 1" stroke="#A68B67" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-8 rounded-3xl text-sm font-bold uppercase tracking-widest text-center shadow-inner">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-4 opacity-50" />
                    <p>{error}</p>
                </div>
            )}

            {/* Kiosk Accounts Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredUsers.length === 0 && !error && (
                    <div className="col-span-full py-20 text-center bg-white border border-[#EAE1D3] rounded-[2.5rem] p-8">
                        <UsersIcon className="w-12 h-12 text-[#EAE1D3] mx-auto mb-4" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#A68B67]">Tidak ditemukan akun kiosk</p>
                    </div>
                )}

                {filteredUsers.map((user) => {
                    const avatarStyles = getAvatarStyles(user.role);
                    return (
                        <motion.div
                            key={user.id}
                            layout
                            whileHover={{ y: -8 }}
                            className="bg-white/60 backdrop-blur-xl border border-[#EAE1D3] rounded-[2.5rem] overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_60px_rgba(74,63,53,0.12)] hover:border-[#A68B67]/40 transition-all duration-700 relative flex flex-col h-full"
                        >
                            {/* Ambient background accent */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A68B67]/5 rounded-full blur-3xl translate-x-12 -translate-y-12 group-hover:bg-[#A68B67]/10 transition-colors" />
                            
                            <div className="p-8 space-y-8 relative z-10 flex flex-col h-full justify-between">
                                {/* Profile Info */}
                                <div className="space-y-6">
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

                                    {/* Settings info */}
                                    <div className="space-y-4 pt-2">
                                        <div className="flex flex-wrap gap-3">
                                            <div className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-2 border transition-all duration-500 ${
                                                user.isPaymentEnabled 
                                                    ? 'bg-green-50/50 border-green-100 text-green-600' 
                                                    : 'bg-red-50/50 border-red-100 text-red-600'
                                            }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${user.isPaymentEnabled ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'} animate-pulse`} />
                                                {user.isPaymentEnabled ? 'PEMBAYARAN PAYMENT' : 'SISTEM FULL SEWA'}
                                            </div>
                                        </div>

                                        <div className="bg-[#F5F1EA]/50 border border-[#EAE1D3] rounded-2xl p-4 space-y-1">
                                            <span className="text-[8px] text-[#A68B67] font-black uppercase tracking-[0.2em] block">
                                                Status Integrasi Kiosk
                                            </span>
                                            <span className="text-xs font-bold text-[#4A3F35] flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                Terkoneksi & Siap Dikonfigurasi
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action CTA Link */}
                                <div className="pt-6 border-t border-[#F5F1EA]">
                                    <button
                                        onClick={() => router.push(`/admin/kiosk-themes/customize?userId=${user.id}`)}
                                        className="w-full bg-[#A68B67] hover:bg-[#4A3F35] text-white py-4 px-5 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md shadow-[#A68B67]/10 group-hover:shadow-lg group-hover:shadow-[#4A3F35]/20"
                                    >
                                        <span>Kustomisasi Tampilan Kiosk</span>
                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
