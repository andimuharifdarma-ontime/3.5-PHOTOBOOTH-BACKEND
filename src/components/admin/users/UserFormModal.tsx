'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Shield, CreditCard, Wallet, Check, UserPlus, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';

interface UserFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    editingUser: any;
    formData: any;
    setFormData: (data: any) => void;
    submitting: boolean;
    error: string;
}

export default function UserFormModal({
    isOpen,
    onClose,
    onSubmit,
    editingUser,
    formData,
    setFormData,
    submitting,
    error,
}: UserFormModalProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingUser ? 'Edit Anggota' : 'Anggota Baru'}
            subtitle="Konfigurasi Hak Akses Studio"
            darkHeader
        >
            <form onSubmit={onSubmit} className="space-y-8">
                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-center shadow-inner">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#8C7E6A]">Nama Lengkap</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-white border border-[#EAE1D3] p-4 text-sm rounded-2xl focus:outline-none focus:border-[#A68B67] transition-all"
                            placeholder="Nama Terang"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#8C7E6A]">Peran / Role</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                            className="w-full bg-white border border-[#EAE1D3] p-4 text-sm rounded-2xl focus:outline-none focus:border-[#A68B67] transition-all appearance-none cursor-pointer"
                        >
                            <option value="KARYAWAN">KARYAWAN (Akses Terbatas)</option>
                            <option value="CLIENT">CLIENT (Khusus Photo Booth)</option>
                            <option value="ADMIN">ADMIN (Akses Penuh)</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#8C7E6A]">Email Akses</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D1C4B2]" />
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-white border border-[#EAE1D3] py-4 pl-12 pr-4 text-sm rounded-2xl focus:outline-none focus:border-[#A68B67] transition-all"
                            placeholder="email@dovelens.studio"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#8C7E6A]">
                        {editingUser ? 'Ganti Password (Biarkan kosong jika tidak diubah)' : 'Password Awal'}
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D1C4B2]" />
                        <input
                            type={showPassword ? "text" : "password"}
                            required={!editingUser}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full bg-white border border-[#EAE1D3] py-4 pl-12 pr-12 text-sm rounded-2xl focus:outline-none focus:border-[#A68B67] transition-all"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D1C4B2] hover:text-[#A68B67] transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Izin Manajemen Tema Section */}
                <div className="bg-[#F5F1EA] p-6 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-[#4A3F35]" />
                                <span className="text-xs font-bold text-[#4A3F35]">Izin Manajemen Tema</span>
                            </div>
                            <p className="text-[9px] text-[#A68B67] leading-relaxed max-w-[280px]">
                                Izinkan akun ini untuk **Menambah, Mengubah, & Menghapus** koleksi Tema serta Frame.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, canManageThemes: !formData.canManageThemes })}
                                className={`relative w-14 h-7 rounded-full transition-all duration-300 flex items-center px-1 ${formData.canManageThemes ? 'bg-[#A68B67]' : 'bg-[#EAE1D3]'}`}
                            >
                                <motion.div
                                    animate={{ x: formData.canManageThemes ? 24 : 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    className="w-5 h-5 bg-white rounded-full shadow-sm"
                                />
                            </button>
                            <span className={`text-[8px] font-bold uppercase tracking-widest ${formData.canManageThemes ? 'text-[#A68B67]' : 'text-[#8C7E6A]'}`}>
                                {formData.canManageThemes ? 'DIIZINKAN' : 'DIKUNCI'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Izin Manajemen Filter Section */}
                <div className="bg-[#F5F1EA] p-6 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-[#4A3F35]" />
                                <span className="text-xs font-bold text-[#4A3F35]">Izin Manajemen Filter</span>
                            </div>
                            <p className="text-[9px] text-[#A68B67] leading-relaxed max-w-[280px]">
                                Izinkan akun ini untuk mengakses **Laporan Detail** serta mengelola koleksi **Filter Artistik** pada Sesi Foto.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, canManageFilters: !formData.canManageFilters })}
                                className={`relative w-14 h-7 rounded-full transition-all duration-300 flex items-center px-1 ${formData.canManageFilters ? 'bg-[#A68B67]' : 'bg-[#EAE1D3]'}`}
                            >
                                <motion.div
                                    animate={{ x: formData.canManageFilters ? 24 : 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    className="w-5 h-5 bg-white rounded-full shadow-sm"
                                />
                            </button>
                            <span className={`text-[8px] font-bold uppercase tracking-widest ${formData.canManageFilters ? 'text-[#A68B67]' : 'text-[#8C7E6A]'}`}>
                                {formData.canManageFilters ? 'DIIZINKAN' : 'DIKUNCI'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Mode Pembayaran DOKU - Only for CLIENT role */}
                {formData.role === "CLIENT" && (
                    <div className="space-y-4">
                        <div className="bg-[#FDFBF7] p-6 rounded-2xl border border-[#A68B67]/20 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-[#A68B67]" />
                                        <span className="text-xs font-bold text-[#4A3F35]">Mode Pembayaran (DOKU)</span>
                                    </div>
                                    <p className="text-[9px] text-[#A68B67] leading-relaxed max-w-[280px]">
                                        Aktifkan untuk model bisnis **Bagi Hasil**. Matikan untuk **Sewa Full Time**.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isPaymentEnabled: !formData.isPaymentEnabled })}
                                        className={`relative w-14 h-7 rounded-full transition-all duration-300 flex items-center px-1 ${formData.isPaymentEnabled ? 'bg-[#A68B67]' : 'bg-[#EAE1D3]'}`}
                                    >
                                        <motion.div
                                            animate={{ x: formData.isPaymentEnabled ? 24 : 0 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            className="w-5 h-5 bg-white rounded-full shadow-sm"
                                        />
                                    </button>
                                    <span className={`text-[8px] font-bold uppercase tracking-widest ${formData.isPaymentEnabled ? 'text-[#A68B67]' : 'text-[#8C7E6A]'}`}>
                                        {formData.isPaymentEnabled ? 'AKTIF' : 'NON-AKTIF'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Izin Input Modal */}
                        <div className="bg-[#FDFBF7] p-6 rounded-2xl border border-[#A68B67]/20 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="w-4 h-4 text-[#A68B67]" />
                                        <span className="text-xs font-bold text-[#4A3F35]">Izin Input Modal</span>
                                    </div>
                                    <p className="text-[9px] text-[#A68B67] leading-relaxed max-w-[280px]">
                                        Izinkan klien memasukkan **Harga Modal Bahan** di halaman Laporan.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, canInputCapital: !formData.canInputCapital })}
                                        className={`relative w-14 h-7 rounded-full transition-all duration-300 flex items-center px-1 ${formData.canInputCapital ? 'bg-[#A68B67]' : 'bg-[#EAE1D3]'}`}
                                    >
                                        <motion.div
                                            animate={{ x: formData.canInputCapital ? 24 : 0 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            className="w-5 h-5 bg-white rounded-full shadow-sm"
                                        />
                                    </button>
                                    <span className={`text-[8px] font-bold uppercase tracking-widest ${formData.canInputCapital ? 'text-[#A68B67]' : 'text-[#8C7E6A]'}`}>
                                        {formData.canInputCapital ? 'AKTIF' : 'NON-AKTIF'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="pt-6 border-t border-[#F5F1EA] flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-[#8C7E6A] hover:bg-[#F5F1EA] rounded-2xl transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="bg-[#4A3F35] hover:bg-[#2D2824] text-[#FDFBF7] px-8 py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl shadow-[#4A3F35]/20 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 disabled:opacity-50"
                    >
                        {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            editingUser ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />
                        )}
                        {editingUser ? "Simpan Perubahan" : "Buat Akun"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
