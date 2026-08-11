"use client";

import { useState, useEffect } from "react";
import {
    Users as UsersIcon,
    UserPlus,
    Search,
    ShieldAlert,
    Trash2,
} from "lucide-react";
import { motion } from "framer-motion";

// Components
import AdminPageSkeleton from '@/components/ui/AdminPageSkeleton';
import UserCard from "@/components/admin/users/UserCard";
import UserFormModal from "@/components/admin/users/UserFormModal";
import Modal from "@/components/ui/Modal";

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

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "KARYAWAN" as "ADMIN" | "KARYAWAN" | "CLIENT",
        canManageThemes: false,
        canManageFilters: false,
        isPaymentEnabled: false,
        canInputCapital: false,
        initialCapital: 0
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    


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
                setUsers(data);
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

    const handleOpenModal = (user: User | null = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name || "",
                email: user.email,
                password: "",
                role: user.role,
                canManageThemes: user.canManageThemes,
                canManageFilters: user.canManageFilters,
                isPaymentEnabled: user.isPaymentEnabled,
                canInputCapital: user.canInputCapital || false,
                initialCapital: user.initialCapital || 0
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: "",
                email: "",
                password: "",
                role: "KARYAWAN",
                canManageThemes: false,
                canManageFilters: false,
                isPaymentEnabled: false,
                canInputCapital: false,
                initialCapital: 0
            });
        }
        setIsModalOpen(true);
        setError("");
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            const url = editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users";
            const method = editingUser ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                const errorMessage = data.details ? `${data.error}: ${data.details}` : (data.error || "Gagal menyimpan data");
                throw new Error(errorMessage);
            }

            fetchUsers();
            handleCloseModal();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = (id: string) => {
        setUserToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);

        try {
            const res = await fetch(`/api/admin/users/${userToDelete}`, { method: "DELETE" });
            if (res.ok) {
                fetchUsers();
                setIsDeleteModalOpen(false);
                setUserToDelete(null);
            } else {
                const data = await res.json();
                setError(data.error || "Gagal menghapus akun");
                setIsDeleteModalOpen(false);
                setUserToDelete(null);
            }
        } catch (err) {
            console.error("Failed to delete user", err);
            setError("Gagal menghapus akun");
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleGenerateApiKey = async (id: string) => {
        try {
            setError("");
            const res = await fetch(`/api/admin/users/${id}`, {
                method: "PATCH"
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Gagal membuat Kiosk API Key");
            }
            // Update state with new key
            setUsers(prev => prev.map(u => u.id === id ? { ...u, apiKey: data.apiKey } : u));
        } catch (err: any) {
            console.error("Failed to generate Kiosk Key", err);
            setError(err.message || "Gagal membuat Kiosk API Key");
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === "ALL" || user.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    if (loading) return <AdminPageSkeleton variant="table" />;

    return (
        <div className="space-y-8 pb-20">
            {/* Modern Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#1C1917] p-8 md:p-12 shadow-2xl shadow-black/20">
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[linear-gradient(to_right,#A68B67_1px,transparent_1px),linear-gradient(to_bottom,#A68B67_1px,transparent_1px)] [background-size:32px_32px]" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#A68B67]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-[#4A3F35]/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A68B67] to-[#8C7E6A] flex items-center justify-center shadow-lg shadow-[#A68B67]/20">
                                <UsersIcon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#A68B67]/80">Account Management</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-sans font-extrabold text-white tracking-tight">Manajemen Akun</h1>
                        <p className="text-white/40 font-medium text-base">Kelola akses admin dan karyawan studio</p>
                    </div>

                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-[#A68B67] hover:bg-[#8C7E6A] text-white px-8 py-4 rounded-xl flex items-center gap-3 transition-all shadow-lg hover:shadow-xl shadow-[#A68B67]/20 group"
                    >
                        <UserPlus className="w-4 h-4 transition-transform group-hover:scale-110" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Tambah Anggota</span>
                    </button>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D1C4B2]" />
                    <input
                        type="text"
                        placeholder="Cari nama atau email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-[#EAE1D3] py-4 pl-12 pr-4 rounded-2xl text-sm focus:outline-none focus:border-[#4A3F35] transition-all focus:ring-2 focus:ring-[#A68B67]/20"
                    />
                </div>
                <div className="sm:w-48 shrink-0 relative">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full bg-white border border-[#EAE1D3] py-4 px-4 pr-10 rounded-2xl text-sm focus:outline-none focus:border-[#4A3F35] transition-all focus:ring-2 focus:ring-[#A68B67]/20 appearance-none cursor-pointer font-bold text-[#4A3F35]"
                    >
                        <option value="ALL">Semua Peran</option>
                        <option value="ADMIN">Admin</option>
                        <option value="KARYAWAN">Karyawan</option>
                        <option value="CLIENT">Client</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1.5L6 6.5L11 1.5" stroke="#A68B67" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && !isModalOpen && (
                <div className="bg-red-50 border border-red-100 text-red-600 p-8 rounded-2xl text-sm font-bold uppercase tracking-widest text-center shadow-inner">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-4 opacity-50" />
                    <p>{error}</p>
                    {error.includes(":") && (
                        <div className="mt-4 p-4 bg-white/50 rounded-2xl text-left font-mono text-[9px] normal-case overflow-auto max-h-40 border border-red-200">
                            {error.split(":").slice(1).join(":")}
                        </div>
                    )}
                </div>
            )}

            {/* Users List */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredUsers.length === 0 && !loading && !error && (
                    <div className="col-span-full py-20 text-center">
                        <UsersIcon className="w-12 h-12 text-[#EAE1D3] mx-auto mb-4" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#A68B67]">Belum ada data akun</p>
                    </div>
                )}
                {filteredUsers.map((user) => (
                    <UserCard
                        key={user.id}
                        user={user}
                        onEdit={handleOpenModal}
                        onDelete={handleDeleteUser}
                        onGenerateApiKey={handleGenerateApiKey}
                    />
                ))}
            </div>

            <UserFormModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleSubmit}
                editingUser={editingUser}
                formData={formData}
                setFormData={setFormData}
                submitting={submitting}
                error={error}
            />



            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Hapus Akun"
                subtitle="Tindakan ini tidak dapat dibatalkan"
                maxWidth="max-w-md"
            >
                <div className="space-y-6">
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2 shadow-inner">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <p className="text-[#4A3F35] font-medium text-sm">
                            Apakah Anda yakin ingin menghapus akun <span className="font-bold">{users.find(u => u.id === userToDelete)?.name || users.find(u => u.id === userToDelete)?.email || 'ini'}</span>?
                        </p>
                        <p className="text-xs text-[#8C7E6A] px-4 font-medium">
                            Semua data yang terkait dengan akun ini akan dihapus secara permanen dari sistem the photobooth.
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#F5F1EA]">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={isDeleting}
                            className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[#8C7E6A] hover:bg-[#F5F1EA] rounded-xl transition-colors disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-lg hover:shadow-xl shadow-red-500/20 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                        >
                            {isDeleting ? (
                                <>
                                    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                    Menghapus
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    Ya, Hapus
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
