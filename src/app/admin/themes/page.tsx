'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Plus,
    ChevronLeft,
    Palette,
    CreditCard,
    Banknote,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

// Components
import LoadingScreen from '@/components/ui/LoadingScreen';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import ThemeCard from '@/components/admin/themes/ThemeCard';
import ThemeFormModal from '@/components/admin/themes/ThemeFormModal';
import UserSelectionList from '@/components/admin/themes/UserSelectionList';

interface Theme {
    id: string;
    userName: string | null;
    name: string;
    previewUrl: string;
    description: string | null;
    tag: string | null;
    price: number;
    isActive: boolean;
    order: number;
    _count?: { frames: number };
}

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isPaymentEnabled: boolean;
}

export default function ThemesPage() {
    const [themes, setThemes] = useState<Theme[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        tag: '',
        previewUrl: '',
        price: '' as number | string,
        isActive: true,
    });
    const [filter, setFilter] = useState<'ALL' | 'PAID' | 'FREE'>('ALL');
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ show: boolean; id: string | null }>({
        show: false,
        id: null
    });
    const [isPaymentEnabled, setIsPaymentEnabled] = useState<boolean>(true);
    const { data: session } = useSession();
    const [userProfile, setUserProfile] = useState<any>(null);

    const isAdmin = (session?.user as any)?.role === 'ADMIN' || userProfile?.role === 'ADMIN';
    const isKaryawan = (session?.user as any)?.role === 'KARYAWAN' || userProfile?.role === 'KARYAWAN';
    const canManageThemes = isAdmin || (isKaryawan && (userProfile?.canManageThemes === true || (session?.user as any)?.canManageThemes === true)) || (userProfile?.role === 'CLIENT' && userProfile?.canManageThemes === true);

    // Sub-page states
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        fetchProfile();
    }, [session]);

    useEffect(() => {
        if (userProfile) {
            fetchSettings();
        }
    }, [userProfile, selectedUser]);

    useEffect(() => {
        if (userProfile || session?.user) {
            const role = userProfile?.role || (session?.user as any)?.role;
            if (role === 'CLIENT') {
                setViewMode('detail');
                fetchThemes();
            } else if (role === 'ADMIN' || role === 'KARYAWAN') {
                setViewMode('list');
                fetchUsers();
            }
        }
    }, [userProfile, session]);

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/admin/profile');
            if (res.ok) {
                const data = await res.json();
                setUserProfile(data);
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        }
    };

    const fetchSettings = async () => {
        const role = userProfile?.role || (session?.user as any)?.role;
        const userIsPaymentEnabled = userProfile?.isPaymentEnabled !== undefined
            ? userProfile.isPaymentEnabled
            : (session?.user as any)?.isPaymentEnabled;

        if (role === 'CLIENT' && userIsPaymentEnabled !== undefined) {
            setIsPaymentEnabled(userIsPaymentEnabled);
            return;
        }

        try {
            const url = selectedUser ? `/api/admin/settings?userId=${selectedUser.id}` : '/api/admin/settings';
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setIsPaymentEnabled(data.isPaymentEnabled !== false);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchThemes = async (userName = '') => {
        try {
            const url = userName ? `/api/admin/themes?userName=${userName}` : '/api/admin/themes';
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setThemes(data);
            }
        } catch (error) {
            console.error('Failed to fetch themes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserSelect = (user: User) => {
        setSelectedUser(user);
        setViewMode('detail');
        setIsPaymentEnabled(user.isPaymentEnabled);
        fetchThemes(user.name);
    };

    const handleBackToList = () => {
        setSelectedUser(null);
        setViewMode('list');
        setThemes([]);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        try {
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formDataUpload,
            });
            if (res.ok) {
                const data = await res.json();
                setFormData(prev => ({ ...prev, previewUrl: data.url }));
            } else {
                alert('Gagal mengunggah gambar. Silakan coba lagi.');
            }
        } catch (error) {
            console.error('Failed to upload image:', error);
            alert('Terjadi kesalahan saat mengunggah gambar.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const url = editingTheme
                ? `/api/admin/themes/${editingTheme.id}`
                : '/api/admin/themes';
            const method = editingTheme ? 'PUT' : 'POST';

            const payload = {
                ...formData,
                userName: selectedUser ? selectedUser.name : (userProfile?.role === 'CLIENT' ? userProfile.name : 'system')
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                fetchThemes(selectedUser?.name || userProfile?.name || '');
                closeModal();
            } else {
                const errorData = await res.json();
                alert(`Gagal menyimpan: ${errorData.error || 'Terjadi kesalahan sistem'}`);
            }
        } catch (error) {
            console.error('Failed to save theme:', error);
            alert('Terjadi kesalahan saat menyimpan tema.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.id) return;
        setSaving(true);

        try {
            const res = await fetch(`/api/admin/themes/${deleteModal.id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchThemes(selectedUser?.name || userProfile?.name || '');
                setDeleteModal({ show: false, id: null });
            }
        } catch (error) {
            console.error('Failed to delete theme:', error);
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = (id: string) => {
        setDeleteModal({ show: true, id });
    };

    const openModal = (theme?: Theme) => {
        if (theme) {
            setEditingTheme(theme);
            setFormData({
                name: theme.name,
                description: theme.description || '',
                tag: theme.tag || '',
                previewUrl: theme.previewUrl,
                price: theme.price,
                isActive: theme.isActive,
            });
        } else {
            setEditingTheme(null);
            setFormData({ name: '', description: '', tag: '', previewUrl: '', price: '', isActive: true });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingTheme(null);
        setFormData({ name: '', description: '', tag: '', previewUrl: '', price: '', isActive: true });
    };

    if (loading) return <LoadingScreen message="Kurasi Galeri..." />;

    // LIST VIEW (For Admin/Karyawan)
    if (viewMode === 'list' && (isAdmin || isKaryawan)) {
        return <UserSelectionList users={users.filter(u => u.role === 'CLIENT')} onSelect={handleUserSelect} />;
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Modern Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#1C1917] p-8 md:p-12 shadow-2xl shadow-black/20">
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[linear-gradient(to_right,#A68B67_1px,transparent_1px),linear-gradient(to_bottom,#A68B67_1px,transparent_1px)] [background-size:32px_32px]" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#A68B67]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-[#4A3F35]/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center gap-3">
                            {viewMode === 'detail' && (isAdmin || isKaryawan) && userProfile?.role !== 'CLIENT' && (
                                <button
                                    onClick={handleBackToList}
                                    className="group flex items-center gap-2 hover:text-white transition-colors mr-4 bg-white/[0.06] backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white/70"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Kembali</span>
                                </button>
                            )}
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A68B67] to-[#8C7E6A] flex items-center justify-center shadow-lg shadow-[#A68B67]/20">
                                <Palette className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#A68B67]/80">Studio Collection</span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                            <h1 className="text-4xl md:text-5xl font-sans font-extrabold text-white tracking-tight leading-tight">
                                {selectedUser ? `Tema: ${selectedUser.name}` : 'Koleksi Tema'}
                            </h1>
                            {(userProfile?.role === 'CLIENT' || (selectedUser && selectedUser.role === 'CLIENT')) && (
                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-bold uppercase tracking-widest border shadow-sm self-start sm:self-center transition-all ${isPaymentEnabled
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-blue-900/10'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-emerald-900/10'
                                    }`}>
                                    {isPaymentEnabled ? <CreditCard className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                                    {isPaymentEnabled ? 'DOKU Payment Active' : 'Non Payment Mode'}
                                </div>
                            )}
                        </div>
                        <p className="text-white/40 font-medium text-lg">Kurasi suasana unik untuk setiap momen berharga</p>
                    </motion.div>

                    {canManageThemes && (
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                            {(isAdmin || isKaryawan) && (
                                <div className="flex bg-white/[0.06] backdrop-blur-md rounded-xl p-1 border border-white/10 w-full sm:w-auto">
                                    {(['ALL', 'PAID', 'FREE'] as const).map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={`flex-1 sm:flex-none px-6 py-3 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${filter === f
                                                ? 'bg-[#A68B67] text-white shadow-lg shadow-[#A68B67]/20'
                                                : 'text-white/50 hover:text-white/80'
                                                }`}
                                        >
                                            {f === 'ALL' ? 'Semua' : f === 'PAID' ? 'Berbayar' : 'Gratis'}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <motion.button
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                onClick={() => openModal()}
                                className="flex items-center justify-center gap-3 bg-[#A68B67] hover:bg-[#8C7E6A] text-white w-full sm:w-auto px-8 h-[48px] rounded-xl transition-all shadow-lg shadow-[#A68B67]/20 hover:shadow-xl text-[10px] font-bold uppercase tracking-widest group"
                            >
                                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                Tambah Tema Baru
                            </motion.button>
                        </div>
                    )}
                </div>
            </div>

            {/* Themes Grid */}
            {themes.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/50 backdrop-blur-sm rounded-3xl p-24 text-center border-2 border-dashed border-[#EAE1D3]"
                >
                    <div className="w-24 h-24 bg-[#F5F1EA] rounded-full flex items-center justify-center mx-auto mb-10 border border-[#EAE1D3]">
                        <Palette className="w-10 h-10 text-[#A68B67] opacity-40" />
                    </div>
                    <h3 className="text-2xl font-sans font-bold text-[#4A3F35] mb-4">Galeri Masih Kosong</h3>
                    <p className="text-[#8C7E6A] mb-12 max-w-md mx-auto font-medium">Mulai perjalanan estetika Anda dengan menambahkan tema visual yang memikat.</p>
                    {canManageThemes && (
                        <button
                            onClick={() => openModal()}
                            className="inline-flex items-center gap-3 bg-[#A68B67] hover:bg-[#8C7E6A] text-white px-8 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg hover:shadow-xl"
                        >
                            <Plus className="w-4 h-4" />
                            Buat Tema Pertama
                        </button>
                    )}
                    {!canManageThemes && (
                        <p className="mt-8 text-[10px] font-black uppercase tracking-widest text-red-400 font-bold">Akses Terbatas: Anda tidak memiliki izin untuk mengelola tema.</p>
                    )}
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                    {themes
                        .filter(theme => {
                            const effectivePrice = isPaymentEnabled ? theme.price : 0;
                            if (filter === 'PAID') return effectivePrice > 0;
                            if (filter === 'FREE') return effectivePrice === 0;
                            return true;
                        })
                        .map((theme, index) => (
                            <ThemeCard
                                key={theme.id}
                                theme={theme}
                                index={index}
                                isPaymentEnabled={isPaymentEnabled}
                                canManageThemes={canManageThemes}
                                onEdit={openModal}
                                onDelete={confirmDelete}
                            />
                        ))}
                </div>
            )}

            <ThemeFormModal
                isOpen={showModal}
                onClose={closeModal}
                onSubmit={handleSubmit}
                editingTheme={editingTheme}
                formData={formData}
                setFormData={setFormData}
                handleImageUpload={handleImageUpload}
                uploading={uploading}
                saving={saving}
                isPaymentEnabled={isPaymentEnabled}
            />

            <DeleteConfirmModal
                isOpen={deleteModal.show}
                onClose={() => setDeleteModal({ show: false, id: null })}
                onConfirm={handleDelete}
                saving={saving}
                description="Tindakan ini bersifat permanen. Semua frame dalam koleksi ini akan ikut terhapus dari galeri studio."
            />
        </div>
    );
}
