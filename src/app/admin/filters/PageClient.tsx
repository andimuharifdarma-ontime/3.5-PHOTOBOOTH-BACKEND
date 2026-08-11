'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Filter,
    Save,
    Loader2,
    ShieldCheck,
    Zap,
    Check,
    Info,
    Sparkles,
    Eye,
    Palette,
    X,
    Maximize2,
    CheckCircle2
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import LoadingScreen from '@/components/ui/LoadingScreen';
import AdminPageSkeleton from '@/components/ui/AdminPageSkeleton';
import { ALL_ARTISTIC_FILTERS as ALL_FILTERS, applyFilterToImage as applyFilter } from '@/lib/filters';
import { useAdminSettings } from '@/hooks/useAdminSettings';

interface SystemSettings {
    enabledFilters: string[];
}



export default function FiltersManagementPage() {
    const { data: session } = useSession();
    const { data: swrSettings, isLoading, mutate } = useAdminSettings();
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [previewFilter, setPreviewFilter] = useState<string | null>(null);
    const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [sliderPos, setSliderPos] = useState(50);
    const [isDragging, setIsDragging] = useState(false);

    // Lock body scroll when preview is active
    useEffect(() => {
        if (previewFilter) {
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = 'var(--removed-body-scroll-bar-width)';
        } else {
            document.body.style.overflow = 'unset';
            document.body.style.paddingRight = '0px';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.paddingRight = '0px';
        };
    }, [previewFilter]);

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pos = (x / rect.width) * 100;
        setSliderPos(Math.max(0, Math.min(100, pos)));
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setIsDragging(true);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
    };

    // Menggunakan foto dummy dari folder backround lokal sesuai permintaan
    const dummyImageUrl = '/backround/image.png';

    const handlePreview = async (filterId: string) => {
        setSliderPos(50); // Reset slider position on new preview
        setPreviewFilter(filterId);
        setIsPreviewLoading(true);
        setPreviewDataUrl(null);

        try {
            // Karena ini file lokal, kita bisa langsung memprosesnya tanpa kendala CORS
            const resultUrl = await applyFilter(dummyImageUrl, filterId);
            setPreviewDataUrl(resultUrl);
        } catch (error) {
            console.error('Gagal memproses preview filter:', error);
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const isAdminOrKaryawan = (session?.user as any)?.role === 'ADMIN' || (session?.user as any)?.role === 'KARYAWAN';

    useEffect(() => {
        if (swrSettings) {
            setSettings({
                enabledFilters: (swrSettings.enabledFilters as string[]) || ALL_FILTERS.map(f => f.id),
            });
        }
    }, [swrSettings]);

    const handleToggleFilter = (filterId: string) => {
        if (!settings) return;

        // Original filter cannot be disabled
        if (filterId === 'original') return;

        const isEnabled = settings.enabledFilters.includes(filterId);
        const newFilters = isEnabled
            ? settings.enabledFilters.filter(id => id !== filterId)
            : [...settings.enabledFilters, filterId];

        setSettings({ ...settings, enabledFilters: newFilters });
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabledFilters: settings.enabledFilters })
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Konfigurasi filter berhasil disimpan!' });
                void mutate();
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: 'Gagal menyimpan perubahan.' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Terjadi kesalahan koneksi.' });
        } finally {
            setSaving(false);
        }
    };

    if (isLoading && !settings) return <AdminPageSkeleton variant="grid" />;

    return (
        <div className="max-w-6xl space-y-12 pb-20">
            {/* Modern Hero Header */}
            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#1C1917] p-8 md:p-12 shadow-2xl shadow-black/20">
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[linear-gradient(to_right,#A68B67_1px,transparent_1px),linear-gradient(to_bottom,#A68B67_1px,transparent_1px)] [background-size:32px_32px]" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#A68B67]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-[#4A3F35]/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                    <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A68B67] to-[#8C7E6A] flex items-center justify-center shadow-lg shadow-[#A68B67]/20">
                                <Palette className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#A68B67]/80">Artistic Mastery</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-sans font-extrabold text-white tracking-tight">
                            Manajemen <span className="text-[#A68B67]">Filter</span>
                        </h1>
                        <p className="text-white/40 font-medium text-lg max-w-xl">
                            Kurasi palet warna artistik untuk menghidupkan setiap momen pelanggan di layar photobooth Anda.
                        </p>
                    </div>

                    <div className="flex flex-col items-start lg:items-end gap-5 min-w-[320px]">
                        <AnimatePresence mode="wait">
                            {message && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className={`px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 ${message.type === 'success'
                                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                        }`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full ${message.type === 'success' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                                    {message.text}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="group relative flex items-center gap-5 bg-[#A68B67] hover:bg-[#8C7E6A] text-white py-4 px-10 rounded-xl transition-all duration-500 disabled:opacity-50 overflow-hidden shadow-lg shadow-[#A68B67]/20 hover:shadow-xl"
                        >
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5 transition-transform duration-500 group-hover:scale-110" />
                            )}
                            <span className="text-[11px] font-bold uppercase tracking-widest">
                                {saving ? 'Saving...' : 'Publish Perubahan'}
                            </span>
                        </button>

                        <p className="text-[10px] text-white/30 italic flex items-center gap-2">
                            <Sparkles className="w-3 h-3" />
                            Perubahan akan langsung sinkron ke sistem utama
                        </p>
                    </div>
                </div>
            </header>

            {/* Aesthetic Tips & Guidance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#FDFBF7] border border-[#A68B67]/20 p-8 rounded-2xl space-y-4">
                    <div className="w-10 h-10 bg-[#A68B67]/10 rounded-full flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-[#A68B67]" />
                    </div>
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#4A3F35]">Kustomisasi Unik</h4>
                    <p className="text-[11px] text-[#8C7E6A] leading-relaxed italic opacity-80">
                        Aktifkan filter yang sesuai dengan tema acara Anda untuk pengalaman yang lebih personil.
                    </p>
                </div>
                <div className="bg-[#FDFBF7] border border-[#A68B67]/20 p-8 rounded-2xl space-y-4">
                    <div className="w-10 h-10 bg-[#1C1917]/5 rounded-full flex items-center justify-center">
                        <Zap className="w-4 h-4 text-[#4A3F35]" />
                    </div>
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#4A3F35]">Instan & Real-time</h4>
                    <p className="text-[11px] text-[#8C7E6A] leading-relaxed italic opacity-80">
                        Setiap perubahan yang Anda simpan akan langsung terintegrasi secara instan ke sistem utama.
                    </p>
                </div>
                <div className="bg-[#FDFBF7] border border-[#A68B67]/20 p-8 rounded-2xl space-y-4">
                    <div className="w-10 h-10 bg-[#A68B67]/10 rounded-full flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-[#A68B67]" />
                    </div>
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#4A3F35]">Simulasi Presisi</h4>
                    <p className="text-[11px] text-[#8C7E6A] leading-relaxed italic opacity-80">
                        Gunakan fitur 'Test' untuk melihat simulasi akurat dari filter sebelum dipublikasikan.
                    </p>
                </div>
            </div>

            {/* Filters Interactive Collection */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {ALL_FILTERS.map((filter, idx) => {
                    const isEnabled = settings?.enabledFilters.includes(filter.id);
                    const isOriginal = filter.id === 'original';

                    return (
                        <motion.div
                            key={filter.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04, ease: "easeOut" }}
                            className={`group relative p-8 rounded-3xl border transition-all duration-500 flex flex-col justify-between h-full bg-white overflow-hidden ${isEnabled
                                ? 'border-[#A68B67] shadow-[0_20px_50px_-20px_rgba(166,139,103,0.15)]'
                                : 'border-[#EAE1D3] opacity-60 grayscale-[0.8] hover:grayscale-0 hover:opacity-100 hover:border-[#A68B67]/50'
                                }`}
                        >
                            {/* Card Background Pattern */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#A68B67]/5 rounded-bl-full transform translate-x-12 -translate-y-12 transition-transform duration-500 group-hover:translate-x-8 group-hover:-translate-y-8" />

                            <div className="space-y-6 relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className="w-14 h-14 bg-[#FDFBF7] border border-[#EAE1D3] rounded-xl flex items-center justify-center text-3xl shadow-sm transition-transform duration-500 group-hover:scale-110">
                                        {filter.icon}
                                    </div>

                                    {isOriginal ? (
                                        <div className="px-3 py-1 bg-[#1C1917] text-white text-[8px] font-bold uppercase tracking-widest rounded-md flex items-center gap-2">
                                            <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                                            Default
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleToggleFilter(filter.id)}
                                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all duration-300 ${isEnabled ? 'bg-[#A68B67]' : 'bg-[#EAE1D3]'
                                                }`}
                                        >
                                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-md transition-transform duration-300 ${isEnabled ? 'translate-x-6' : 'translate-x-1'
                                                }`} />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <h3 className="font-sans font-bold text-2xl text-[#4A3F35] tracking-tight">{filter.name}</h3>
                                    <p className="text-[11px] text-[#8C7E6A] font-medium leading-relaxed opacity-80">{filter.description}</p>
                                </div>
                            </div>

                            <div className="mt-10 pt-6 border-t border-[#F5F1EA] flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full shadow-sm ${isEnabled ? 'bg-[#16A34A]' : 'bg-[#D1C4B2]'}`} />
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#A68B67]">
                                        {isEnabled ? 'Live on Booth' : 'Offline'}
                                    </span>
                                </div>

                                <button
                                    onClick={() => handlePreview(filter.id)}
                                    className="flex items-center gap-3 px-5 py-2.5 bg-[#1C1917] hover:bg-[#4A3F35] text-white rounded-xl transition-all duration-300 shadow-lg shadow-black/10 group/btn"
                                >
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Preview</span>
                                    <Eye className="w-3.5 h-3.5 transition-transform duration-300 group-hover/btn:scale-125" />
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Immersive Filter Preview Modal */}
            <AnimatePresence>
                {previewFilter && (
                    <div className="fixed inset-0 z-[100] overflow-hidden bg-[#1C1917]">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPreviewFilter(null)}
                            className="absolute inset-0 bg-[#1C1917]/95 backdrop-blur-xl"
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="fixed inset-0 bg-white z-10 w-screen h-screen overflow-hidden flex flex-col lg:flex-row"
                        >
                            {/* Informational Panel */}
                            <div className="w-full lg:w-[500px] h-full bg-[#1C1917] p-10 lg:p-24 flex flex-col justify-center text-white relative order-2 lg:order-1 overflow-y-auto border-r border-white/5">
                                <div className="space-y-12 relative z-10 my-auto py-10">
                                    <div className="space-y-6">
                                        <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-[#A68B67]/20 text-[#A68B67] rounded-full border border-[#A68B67]/30">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Masterpiece Simulation</span>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="font-sans font-bold text-5xl lg:text-7xl text-[#EAE1D3] leading-[0.9]">
                                                {ALL_FILTERS.find(f => f.id === previewFilter)?.name}
                                            </h3>
                                            <p className="text-[#8C7E6A] text-sm font-medium opacity-80 leading-relaxed max-w-xs">
                                                {ALL_FILTERS.find(f => f.id === previewFilter)?.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-10 border-t border-white/10 space-y-8">
                                        <div className="flex items-start gap-5">
                                            <div className="w-12 h-12 rounded-xl bg-[#A68B67] flex items-center justify-center shrink-0 shadow-lg shadow-[#A68B67]/20">
                                                <CheckCircle2 className="w-6 h-6 text-white" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[11px] font-bold uppercase tracking-widest text-[#A68B67]">Studio Quality</p>
                                                <p className="text-[12px] text-[#8C7E6A] opacity-80 leading-relaxed">
                                                    Simulasi ini menggunakan algoritma warna yang sama dengan mesin cetak utama.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setPreviewFilter(null)}
                                        className="w-full py-5 px-8 bg-[#A68B67] hover:bg-[#8C7E6A] text-white text-[11px] font-bold uppercase tracking-widest transition-all rounded-xl shadow-2xl shadow-[#A68B67]/30 group/close"
                                    >
                                        Konfirmasi & Tutup
                                    </button>
                                </div>

                                {/* Background Aesthetic Text */}
                                <div className="absolute bottom-10 -left-10 text-[100px] font-sans font-bold text-white/5 whitespace-nowrap select-none pointer-events-none transform -rotate-90 origin-bottom-left">
                                    PREMIUM PALETTE
                                </div>
                            </div>

                            {/* Interactive Comparison Stage - Cinematic Split Slider */}
                            <div className="flex-1 bg-[#0F0E0D] relative overflow-hidden order-1 lg:order-2 h-full select-none flex items-center justify-center">
                                {isPreviewLoading ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F0E0D] z-50">
                                        <div className="relative">
                                            <Loader2 className="w-16 h-16 animate-spin text-[#A68B67]" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-8 h-8 bg-[#A68B67]/10 rounded-full animate-ping" />
                                            </div>
                                        </div>
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#A68B67] mt-8 animate-pulse">Producing Excellence...</p>
                                    </div>
                                ) : (
                                    <div className="relative w-full h-full flex items-center justify-center p-8">
                                        {/* Background blurred context for premium feel */}
                                        <div className="absolute inset-0 opacity-10 blur-3xl scale-125 pointer-events-none">
                                            <img src="/backround/image.png" alt="" className="w-full h-full object-cover" />
                                        </div>

                                        <div
                                            className="relative h-full aspect-[2/3] shadow-[0_100px_100px_-50px_rgba(0,0,0,0.9)] select-none cursor-ew-resize overflow-hidden rounded-2xl bg-[#1C1816] touch-none"
                                            onPointerMove={handlePointerMove}
                                            onPointerDown={handlePointerDown}
                                            onPointerUp={handlePointerUp}
                                            onPointerCancel={handlePointerUp}
                                        >
                                            {/* Original (Base) */}
                                            <div className="absolute inset-0 w-full h-full overflow-hidden rounded-2xl bg-[#1C1816]">
                                                <img
                                                    src={dummyImageUrl}
                                                    alt="Original"
                                                    draggable="false"
                                                    className="w-full h-full object-contain pointer-events-none"
                                                />
                                            </div>

                                            {/* Processed (Overlay) */}
                                            {previewDataUrl && (
                                                <div
                                                    className="absolute inset-0 w-full h-full overflow-hidden z-10 rounded-2xl"
                                                    style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                                                >
                                                    <img
                                                        src={previewDataUrl}
                                                        alt="Filtered"
                                                        draggable="false"
                                                        className="w-full h-full object-contain bg-[#1C1816] pointer-events-none"
                                                    />
                                                </div>
                                            )}

                                            {/* Slider Handle */}
                                            <div
                                                className="absolute top-0 bottom-0 z-30 w-[2px] bg-white/40 backdrop-blur-md pointer-events-none"
                                                style={{ left: `${sliderPos}%` }}
                                            >
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white rounded-full shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center border-[6px] border-[#0F0E0D]">
                                                    <div className="flex gap-1.5">
                                                        <div className="w-1 h-4 bg-[#A68B67] rounded-full" />
                                                        <div className="w-1 h-4 bg-[#A68B67] rounded-full" />
                                                    </div>
                                                </div>

                                                {/* Visual Hint */}
                                                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 whitespace-nowrap opacity-80 text-[9px] font-bold text-white tracking-widest uppercase">
                                                    Geser untuk Membandingkan
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>


        </div>
    );
}
