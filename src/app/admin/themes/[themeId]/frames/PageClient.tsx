'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Edit, Trash2, Move, Image as ImageIcon, Upload, X, CreditCard, Banknote, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useAdminProfile } from '@/contexts/AdminProfileContext';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import AdminThumbImage from '@/components/ui/AdminThumbImage';
import { FRAME_FORMAT_PRESETS } from '@/lib/frameFormats';
import AdminPageSkeleton from '@/components/ui/AdminPageSkeleton';


interface Slot {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Frame {
    id: string;
    name: string;
    imageUrl: string;
    previewUrl: string;
    price: number;
    outputWidth: number;
    outputHeight: number;
    slots: Slot[];
    isActive: boolean;
    order: number;
}

interface Theme {
    id: string;
    userName: string | null;
    name: string;
    price: number;
    frames: Frame[];
}

export default function ThemeFramesPage() {
    const params = useParams();
    const router = useRouter();
    const themeId = params.themeId as string;
    const { data: session } = useSession();
    const { userProfile } = useAdminProfile();
    const [loading, setLoading] = useState(true);
    const [isPaymentEnabled, setIsPaymentEnabled] = useState<boolean>(true);
    const [showModal, setShowModal] = useState(false);
    const [editingFrame, setEditingFrame] = useState<Frame | null>(null);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        imageUrl: '',
        previewUrl: '',
        outputWidth: 1080,
        outputHeight: 1920,
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const previewInputRef = useRef<HTMLInputElement>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [frameToDelete, setFrameToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);


    const [theme, setTheme] = useState<Theme | null>(null);
    const isAdmin = (session?.user as any)?.role === 'ADMIN' || userProfile?.role === 'ADMIN';
    const canManageThemes = isAdmin || (session?.user as any)?.canManageThemes === true || userProfile?.canManageThemes === true;

    useEffect(() => {
        void fetchTheme();

        const interval = setInterval(() => {
            if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
            if (theme?.userName) {
                void fetchSettings(theme.userName);
            } else {
                void fetchSettings();
            }
        }, 60000);

        return () => clearInterval(interval);
    }, [themeId, theme?.userName]);

    const fetchSettings = async (themeOwnerName?: string) => {
        const role = userProfile?.role || (session?.user as any)?.role;
        const userIsPaymentEnabled = userProfile?.isPaymentEnabled !== undefined
            ? userProfile.isPaymentEnabled
            : (session?.user as any)?.isPaymentEnabled;

        if (role === 'CLIENT' && userIsPaymentEnabled !== undefined) {
            setIsPaymentEnabled(userIsPaymentEnabled);
            return;
        }

        try {
            const url = themeOwnerName
                ? `/api/admin/settings?userName=${encodeURIComponent(themeOwnerName)}`
                : '/api/admin/settings';
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setIsPaymentEnabled(data.isPaymentEnabled !== false);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    };

    const fetchTheme = async () => {
        try {
            const res = await fetch(`/api/admin/themes/${themeId}`);
            if (res.ok) {
                const data = await res.json();
                setTheme(data);
                if (data.userName) {
                    fetchSettings(data.userName);
                }
            } else {
                router.push('/admin/themes');
            }
        } catch (error) {
            console.error('Failed to fetch theme:', error);
        } finally {
            setLoading(false);
        }
    };

    const uploadFile = async (file: File): Promise<string> => {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        const res = await fetch('/api/admin/upload', {
            method: 'POST',
            body: formDataUpload,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        return data.url;
    };

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const objectUrl = URL.createObjectURL(file);
            setFormData((prev) => ({
                ...prev,
                imageUrl: objectUrl,
                previewUrl: prev.previewUrl || objectUrl,
            }));
        }
    };

    const handlePreviewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPreviewFile(file);
            const objectUrl = URL.createObjectURL(file);
            setFormData({ ...formData, previewUrl: objectUrl });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        try {
            let imageUrl = formData.imageUrl;
            let previewUrl = formData.previewUrl;

            if (imageFile) imageUrl = await uploadFile(imageFile);
            if (previewFile) {
                previewUrl = await uploadFile(previewFile);
            } else if (imageFile || !previewUrl || previewUrl.startsWith('blob:')) {
                previewUrl = imageUrl;
            }

            const url = editingFrame ? `/api/admin/frames/${editingFrame.id}` : '/api/admin/frames';
            const method = editingFrame ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    imageUrl,
                    originalImageUrl: imageUrl,
                    previewUrl,
                    themeId,
                    slots: editingFrame?.slots || [],
                }),
            });

            if (res.ok) {
                const frame = await res.json();
                if (!editingFrame) {
                    router.push(`/admin/themes/${themeId}/frames/${frame.id}/editor`);
                } else {
                    fetchTheme();
                    setShowModal(false);
                    resetForm();
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                alert(errData.error || 'Gagal menyimpan frame');
            }
        } catch (error: any) {
            console.error('Failed to save frame:', error);
            alert(`Gagal mengunggah frame: ${error.message || error}`);
        } finally {
            setUploading(false);
        }
    };


    const handleDelete = (id: string) => {
        setFrameToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!frameToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/frames/${frameToDelete}`, { method: 'DELETE' });
            if (res.ok) fetchTheme();
            setShowDeleteModal(false);
            setFrameToDelete(null);
        } catch (error) {
            console.error('Failed to delete frame:', error);
        } finally {
            setIsDeleting(false);
        }
    };


    const openEditModal = (frame: Frame) => {
        setEditingFrame(frame);
        setFormData({
            name: frame.name,
            imageUrl: frame.imageUrl,
            previewUrl: frame.previewUrl,
            outputWidth: frame.outputWidth,
            outputHeight: frame.outputHeight,
        });
        setImageFile(null);
        setPreviewFile(null);
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingFrame(null);
        setFormData({
            name: '',
            imageUrl: '',
            previewUrl: '',
            outputWidth: 1080,
            outputHeight: 1920,
        });
        setImageFile(null);
        setPreviewFile(null);
    };

    if (loading) {
        return <AdminPageSkeleton variant="grid" />;
    }

    if (!theme) return <div>Tema tidak ditemukan</div>;

    return (
        <div className="space-y-8">
            {/* Modern Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#1C1917] p-8 md:p-12 shadow-2xl shadow-black/20">
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[linear-gradient(to_right,#A68B67_1px,transparent_1px),linear-gradient(to_bottom,#A68B67_1px,transparent_1px)] [background-size:32px_32px]" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#A68B67]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-[#4A3F35]/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <Link
                            href="/admin/themes"
                            className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors group bg-white/[0.06] backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10"
                        >
                            <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
                            Kembali ke Koleksi
                        </Link>
                        <div className="flex items-center gap-5">
                            <h1 className="text-4xl md:text-5xl font-sans font-extrabold text-white tracking-tight">{theme.name}</h1>
                            {(session?.user as any)?.role === 'CLIENT' && (
                                <div className={`px-3 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest border flex items-center gap-2 ${isPaymentEnabled
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    }`}>
                                    {isPaymentEnabled ? <CreditCard className="w-2.5 h-2.5" /> : <Banknote className="w-2.5 h-2.5" />}
                                    {isPaymentEnabled ? 'Payment Mode' : 'Non Payment Mode'}
                                </div>
                            )}
                        </div>
                        <p className="text-white/40 text-sm font-medium">Kelola koleksi frame eksklusif dalam tema ini</p>
                    </div>
                    {canManageThemes && (
                        <button
                            onClick={() => { resetForm(); setShowModal(true); }}
                            className="flex items-center gap-3 bg-[#A68B67] hover:bg-[#8C7E6A] text-white px-8 py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl shadow-[#A68B67]/20 text-[10px] font-bold uppercase tracking-widest"
                        >
                            <Plus className="w-4 h-4" />
                            Tambah Frame Baru
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                {theme.frames.map((frame) => (
                    <div
                        key={frame.id}
                        className="group bg-[#F5F1EA] rounded-3xl overflow-hidden border border-[#EAE1D3] shadow-md hover:shadow-xl hover:shadow-black/5 transition-all duration-500"
                    >
                        <div className="aspect-[3/4.5] bg-[#FDFBF7] relative overflow-hidden">
                            {frame.previewUrl ? (
                                <AdminThumbImage
                                    src={frame.previewUrl}
                                    alt={frame.name}
                                    className="object-contain sepia-[0.2] group-hover:sepia-0 transition-all duration-700"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#D1C4B2]">
                                    <ImageIcon className="w-10 h-10 opacity-20" />
                                </div>
                            )}

                            <div className="absolute top-4 left-4 flex flex-col gap-2">
                                <div className={`px-3 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest backdrop-blur-md border ${frame.isActive
                                    ? 'bg-green-50/80 border-green-200 text-green-700'
                                    : 'bg-gray-50/80 border-gray-200 text-gray-400'
                                    }`}>
                                    {frame.isActive ? 'Aktif' : 'Nonaktif'}
                                </div>
                                <div className="px-3 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest bg-white/80 backdrop-blur-md border border-[#EAE1D3] text-[#A68B67]">
                                    {frame.slots.length} Slot
                                </div>
                                {!isPaymentEnabled && (
                                    <div className="px-3 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest backdrop-blur-md border bg-emerald-500/80 border-emerald-400/30 text-white">
                                        Gratis
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-[#4A3F35] uppercase tracking-wider mb-1">{frame.name}</h3>
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-bold text-[#A68B67] uppercase tracking-widest bg-[#F5F1EA] px-2 py-0.5 rounded-lg border border-[#EAE1D3]">SIZE</span>
                                    <p className="text-[13px] font-bold text-[#4A3F35] tracking-tight">
                                        {frame.outputWidth} <span className="text-[#D1C4B2] font-normal mx-1">×</span> {frame.outputHeight}
                                        <span className="ml-1.5 text-[8px] font-bold text-[#A68B67] uppercase tracking-widest opacity-60">px</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-[#EAE1D3]/50">
                                {canManageThemes ? (
                                    <>
                                        <Link
                                            href={`/admin/themes/${themeId}/frames/${frame.id}/editor`}
                                            className="flex-1 flex items-center justify-center gap-2 bg-[#4A3F35] hover:bg-[#2D2824] text-[#FDFBF7] py-2.5 rounded-xl transition-all text-[9px] font-bold uppercase tracking-widest"
                                        >
                                            <Move className="w-3.5 h-3.5" />
                                            Edit Slot
                                        </Link>
                                        <button
                                            onClick={() => openEditModal(frame)}
                                            className="p-2.5 bg-white border border-[#EAE1D3] hover:border-[#A68B67] rounded-xl transition-all group/btn"
                                        >
                                            <Edit className="w-3.5 h-3.5 text-[#8C7E6A] group-hover/btn:text-[#A68B67]" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(frame.id)}
                                            className="p-2.5 bg-white border border-[#EAE1D3] hover:border-red-200 hover:bg-red-50 rounded-xl transition-all group/btn"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-[#8C7E6A] group-hover/btn:text-red-400" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex-1 text-center py-2 text-[8px] font-bold uppercase tracking-widest text-[#A68B67] opacity-60">
                                        Read-only mode
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {theme.frames.length === 0 && (
                    <div className="col-span-full text-center py-32 border-2 border-dashed border-[#EAE1D3] rounded-3xl">
                        <ImageIcon className="w-12 h-12 text-[#D1C4B2] mx-auto mb-6 opacity-20" />
                        <p className="text-[#8C7E6A] font-medium text-lg">Belum ada karya frame yang ditambahkan.</p>
                        <p className="text-[10px] text-[#A68B67] font-bold uppercase tracking-widest mt-2 cursor-pointer hover:text-[#4A3F35] transition-colors" onClick={() => setShowModal(true)}>
                            Klik untuk mulai menambahkan
                        </p>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-[#1C1917]/90 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-[#FDFBF7] rounded-3xl p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
                    >
                        <div className="flex items-start justify-between mb-10">
                            <div>
                                <h2 className="text-3xl font-sans font-bold text-[#4A3F35]">
                                    {editingFrame ? 'Edit Karya' : 'Frame Baru'}
                                </h2>
                                <p className="text-[10px] text-[#A68B67] font-bold uppercase tracking-widest mt-2">Data Konfigurasi Studio</p>
                            </div>
                            <button
                                onClick={() => { setShowModal(false); resetForm(); }}
                                className="w-10 h-10 rounded-full border border-[#EAE1D3] flex items-center justify-center text-[#4A3F35] hover:bg-[#F5F1EA] transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="space-y-8">
                                <div>
                                    <label className="block text-[10px] font-bold text-[#8C7E6A] uppercase tracking-widest mb-3">
                                        Identitas Frame
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Classic Portrait 1x1"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-[#F5F1EA] px-6 py-4 border border-[#EAE1D3] rounded-xl focus:outline-none focus:border-[#A68B67] text-[#4A3F35] font-sans font-bold text-lg"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[10px] font-bold text-[#8C7E6A] uppercase tracking-widest mb-3">
                                            Digital Asset (PNG)
                                        </label>
                                        <div
                                            onClick={() => imageInputRef.current?.click()}
                                            className="relative bg-[#F5F1EA] rounded-xl border-2 border-dashed border-[#EAE1D3] hover:border-[#A68B67] hover:bg-[#FDFBF7] transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center group"
                                            style={{ aspectRatio: `${formData.outputWidth} / ${formData.outputHeight}` }}
                                        >
                                            {formData.imageUrl ? (
                                                <>
                                                    <img src={formData.imageUrl} alt="Frame" className="w-full h-full object-contain p-4" />
                                                    <div className="absolute inset-0 bg-[#4A3F35]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <span className="text-[9px] font-bold text-[#FDFBF7] uppercase tracking-widest">Ganti Asset</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center p-6">
                                                    <Upload className="w-6 h-6 text-[#A68B67] mx-auto mb-3 opacity-40" />
                                                    <span className="text-[9px] font-bold text-[#A68B67] uppercase tracking-widest block">Upload PNG</span>
                                                </div>
                                            )}
                                        </div>
                                        <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-[#8C7E6A] uppercase tracking-widest mb-3">
                                            Gallery Preview
                                        </label>
                                        <div
                                            onClick={() => previewInputRef.current?.click()}
                                            className="relative bg-[#F5F1EA] rounded-xl border-2 border-dashed border-[#EAE1D3] hover:border-[#A68B67] hover:bg-[#FDFBF7] transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center group"
                                            style={{ aspectRatio: `${formData.outputWidth} / ${formData.outputHeight}` }}
                                        >
                                            {formData.previewUrl ? (
                                                <>
                                                    <img src={formData.previewUrl} alt="Preview" className="w-full h-full object-contain p-4" />
                                                    <div className="absolute inset-0 bg-[#4A3F35]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <span className="text-[9px] font-bold text-[#FDFBF7] uppercase tracking-widest">Ganti Preview</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center p-6">
                                                    <Upload className="w-6 h-6 text-[#A68B67] mx-auto mb-3 opacity-40" />
                                                    <span className="text-[9px] font-bold text-[#A68B67] uppercase tracking-widest block">Upload JPG</span>
                                                </div>
                                            )}
                                        </div>
                                        <input ref={previewInputRef} type="file" accept="image/*" onChange={handlePreviewFileChange} className="hidden" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-[#8C7E6A] uppercase tracking-widest mb-3">
                                        Pilih Format Kertas
                                    </label>
                                    <div className="relative">
                                        <select
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === 'custom') return;
                                                const [w, h] = val.split('x').map(Number);
                                                setFormData({ ...formData, outputWidth: w, outputHeight: h });
                                            }}
                                            className="w-full bg-[#F5F1EA] px-6 py-4 border border-[#EAE1D3] rounded-xl focus:outline-none focus:border-[#A68B67] text-[#4A3F35] font-bold appearance-none cursor-pointer pr-12"
                                        >
                                            <option value="custom">-- Pilih Format (Auto-Fill) --</option>
                                            {FRAME_FORMAT_PRESETS.map((group) => (
                                                <optgroup key={group.group} label={group.group}>
                                                    {group.options.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <ChevronDown className="w-4 h-4 text-[#A68B67]" />
                                        </div>
                                    </div>
                                    <p className="text-[8px] text-[#A68B67] font-bold uppercase tracking-widest mt-2 px-1">
                                        * Format otomatis mencakup margin aman 3% untuk mencegah pemotongan (cropping) saat cetak.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-bold text-[#8C7E6A] uppercase tracking-widest mb-3">
                                            Lebar (px)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.outputWidth}
                                            onChange={(e) => setFormData({ ...formData, outputWidth: parseInt(e.target.value) || 1080 })}
                                            className="w-full bg-[#F5F1EA] px-4 py-3 border border-[#EAE1D3] rounded-xl focus:outline-none focus:border-[#A68B67] text-[#4A3F35] font-bold"
                                            min={100}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-[10px] font-bold text-[#8C7E6A] uppercase tracking-widest mb-3">
                                            Tinggi (px)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.outputHeight}
                                            onChange={(e) => setFormData({ ...formData, outputHeight: parseInt(e.target.value) || 1920 })}
                                            className="w-full bg-[#F5F1EA] px-4 py-3 border border-[#EAE1D3] rounded-xl focus:outline-none focus:border-[#A68B67] text-[#4A3F35] font-bold"
                                            min={100}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-8">
                                    <button
                                        type="button"
                                        onClick={() => { setShowModal(false); resetForm(); }}
                                        className="flex-1 px-8 py-4 border border-[#EAE1D3] text-[#4A3F35] rounded-xl hover:bg-[#F5F1EA] transition-all text-[10px] font-bold uppercase tracking-widest"
                                        disabled={uploading}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={uploading || !formData.name || !formData.imageUrl}
                                        className="flex-[2] px-8 py-4 bg-[#4A3F35] text-[#FDFBF7] rounded-xl hover:bg-[#2D2824] transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-[#4A3F35]/10"
                                    >
                                        {uploading ? 'Memproses Studio...' : editingFrame ? 'Simpan Perubahan' : 'Lanjut ke Editor Slot'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onClose={() => { setShowDeleteModal(false); setFrameToDelete(null); }}
                onConfirm={confirmDelete}
                title="Hapus Frame Studio?"
                description="Karya ini akan dihapus dari koleksi tema secara permanen."
                saving={isDeleting}
            />

        </div>
    );
}
