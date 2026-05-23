"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    Save,
    RotateCcw,
    Palette,
    Clock,
    Camera as CameraIcon,
    Banknote,
    ShieldAlert,
    Sparkles,
    X,
    ChevronRight,
    Monitor,
    Tv,
    LayoutGrid,
    Flame,
    CheckCircle2,
    QrCode,
    Printer,
    RefreshCw,
    Upload,
    Trash2,
    Image as ImageIcon
} from "lucide-react";
import LoadingScreen from "@/components/ui/LoadingScreen";

// Event preset theme definitions
const PRESETS = [
    {
        id: "default",
        name: "Default Gold & Dark",
        accent: "#A68B67",
        bgStart: "#0C0A09",
        bgEnd: "#0C0A09",
        font: "Geist"
    },
    {
        id: "wedding",
        name: "Romantic Wedding",
        accent: "#E8A3B9",
        bgStart: "#FFF8F9",
        bgEnd: "#FADCE2",
        font: "Great Vibes"
    },
    {
        id: "retro",
        name: "Vintage Retro",
        accent: "#D97706",
        bgStart: "#FAF6ED",
        bgEnd: "#F3E8D0",
        font: "Pacifico"
    },
    {
        id: "minimalist",
        name: "Modern Minimalist",
        accent: "#4B6B58",
        bgStart: "#F4F7F5",
        bgEnd: "#E3EAE6",
        font: "Outfit"
    },
    {
        id: "celebration",
        name: "Festival Party",
        accent: "#EC4899",
        bgStart: "#1E1B4B",
        bgEnd: "#0F0E36",
        font: "Bebas Neue"
    }
];

const FONTS = [
    { value: "Geist", label: "Geist (Original Modern Sans)" },
    { value: "Inter", label: "Inter (Clean Minimalist Sans)" },
    { value: "Outfit", label: "Outfit (Trendy Rounded Sans)" },
    { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans (Contemporary Sans)" },
    { value: "Playfair Display", label: "Playfair Display (Classic Serif)" },
    { value: "Cinzel", label: "Cinzel (Royal Luxury Serif)" },
    { value: "Cormorant Garamond", label: "Cormorant Garamond (High-End Serif)" },
    { value: "Montserrat", label: "Montserrat (Geometric Display Sans)" },
    { value: "Syne", label: "Syne (Artistic Contemporary Sans)" },
    { value: "Pacifico", label: "Pacifico (Fun Retro Handwriting)" },
    { value: "Great Vibes", label: "Great Vibes (Wedding Calligraphy Script)" },
    { value: "Dancing Script", label: "Dancing Script (Playful Script)" },
    { value: "Bebas Neue", label: "Bebas Neue (Bold Punchy Retro)" },
    { value: "DM Serif Display", label: "DM Serif Display (Elegant Editorial Serif)" },
    { value: "Cinzel Decorative", label: "Cinzel Decorative (Decorated Royal Serif)" },
    { value: "Space Grotesk", label: "Space Grotesk (Modern Artistic Grotesk)" }
];

export default function KioskWorkspaceCustomizerPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const userId = searchParams.get("userId");

    const [activeTab, setActiveTab] = useState<"aesthetic" | "timer" | "camera" | "business">("aesthetic");
    const [previewScreen, setPreviewScreen] = useState<"launcher" | "frame" | "shoot" | "select" | "filter" | "print">("launcher");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [accountName, setAccountName] = useState("");
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [showPresetModal, setShowPresetModal] = useState(false);
    const [newPresetName, setNewPresetName] = useState("");

    // Custom theme presets list
    const [customPresets, setCustomPresets] = useState<{
        id: string;
        name: string;
        accent: string;
        bgStart: string;
        bgEnd: string;
        font: string;
    }[]>([]);

    const [settings, setSettings] = useState({
        isPaymentEnabled: true,
        isFrameSelectionEnabled: true,
        isPhotoSessionEnabled: true,
        isPhotoSelectionEnabled: true,
        isPhotoFilterEnabled: true,
        isPhotoFilterTimerEnabled: true,
        isResultEnabled: true,
        frameSelectionTimer: 5,
        photoSessionTimer: 3,
        photoSelectionTimer: 3,
        photoFilterTimer: 3,
        captureTimer: 5,
        maxCapturePhotos: 8,
        resultTimer: 60,
        isFrameSelectionTimerEnabled: true,
        isPhotoSessionTimerEnabled: true,
        isPhotoSelectionTimerEnabled: true,
        isResultTimerEnabled: true,
        isGoogleDriveBackupEnabled: true,
        
        // Theme Customization Fields
        kioskThemePreset: "default",
        kioskAccentColor: null as string | null,
        kioskBgGradientStart: null as string | null,
        kioskBgGradientEnd: null as string | null,
        kioskBrandName: null as string | null,
        kioskWelcomeMessage: null as string | null,
        kioskFontFamily: null as string | null,
        kioskLogoUrl: null as string | null
    });

    useEffect(() => {
        if (!userId) {
            router.push("/admin/kiosk-themes");
            return;
        }
        fetchSettings();
        loadCustomPresets();
    }, [userId]);

    const loadCustomPresets = () => {
        const saved = localStorage.getItem("kiosk_custom_presets");
        if (saved) {
            try {
                setCustomPresets(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse custom presets", e);
            }
        }
    };

    const fetchSettings = async () => {
        try {
            setLoading(true);
            setError("");
            
            // Get user basic info to display in title
            const userRes = await fetch(`/api/admin/users?t=${Date.now()}`);
            if (userRes.ok) {
                const usersList = await userRes.json();
                const matched = usersList.find((u: any) => u.id === userId);
                if (matched) {
                    setAccountName(matched.name || matched.email);
                }
            }

            const res = await fetch(`/api/admin/settings?userId=${userId}`);
            if (!res.ok) throw new Error("Gagal mengambil pengaturan Kiosk");
            const data = await res.json();
            
            setSettings({
                isPaymentEnabled: data.isPaymentEnabled ?? true,
                isFrameSelectionEnabled: data.isFrameSelectionEnabled ?? true,
                isPhotoSessionEnabled: data.isPhotoSessionEnabled ?? true,
                isPhotoSelectionEnabled: data.isPhotoSelectionEnabled ?? true,
                isPhotoFilterEnabled: data.isPhotoFilterEnabled ?? true,
                isPhotoFilterTimerEnabled: data.isPhotoFilterTimerEnabled ?? true,
                isResultEnabled: data.isResultEnabled ?? true,
                frameSelectionTimer: data.frameSelectionTimer ?? 5,
                photoSessionTimer: data.photoSessionTimer ?? 3,
                photoSelectionTimer: data.photoSelectionTimer ?? 3,
                photoFilterTimer: data.photoFilterTimer ?? 3,
                captureTimer: data.captureTimer ?? 5,
                maxCapturePhotos: data.maxCapturePhotos ?? 8,
                resultTimer: data.resultTimer ?? 60,
                isFrameSelectionTimerEnabled: data.isFrameSelectionTimerEnabled ?? true,
                isPhotoSessionTimerEnabled: data.isPhotoSessionTimerEnabled ?? true,
                isPhotoSelectionTimerEnabled: data.isPhotoSelectionTimerEnabled ?? true,
                isResultTimerEnabled: data.isResultTimerEnabled ?? true,
                isGoogleDriveBackupEnabled: data.isGoogleDriveBackupEnabled ?? true,
                
                kioskThemePreset: data.kioskThemePreset || "default",
                kioskAccentColor: data.kioskAccentColor || null,
                kioskBgGradientStart: data.kioskBgGradientStart || null,
                kioskBgGradientEnd: data.kioskBgGradientEnd || null,
                kioskBrandName: data.kioskBrandName || null,
                kioskWelcomeMessage: data.kioskWelcomeMessage || null,
                kioskFontFamily: data.kioskFontFamily || null,
                kioskLogoUrl: data.kioskLogoUrl || null
            });
        } catch (err: any) {
            setError(err.message || "Gagal memuat pengaturan");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            setError("");
            setSuccess(false);

            const res = await fetch(`/api/admin/settings?userId=${userId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.details || data.error || "Gagal menyimpan perubahan");
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan koneksi");
        } finally {
            setSaving(false);
        }
    };

    const handleApplyPreset = (presetId: string) => {
        const preset = PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        if (presetId === "default") {
            setSettings(prev => ({
                ...prev,
                kioskThemePreset: "default",
                kioskAccentColor: null,
                kioskBgGradientStart: null,
                kioskBgGradientEnd: null,
                kioskFontFamily: null,
                kioskLogoUrl: null
            }));
        } else {
            setSettings(prev => ({
                ...prev,
                kioskThemePreset: presetId,
                kioskAccentColor: preset.accent,
                kioskBgGradientStart: preset.bgStart,
                kioskBgGradientEnd: preset.bgEnd,
                kioskFontFamily: preset.font
            }));
        }
    };

    const handleSaveCustomPreset = () => {
        setNewPresetName("");
        setShowPresetModal(true);
    };

    const handleConfirmSavePreset = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        const themeName = newPresetName.trim();
        if (!themeName) {
            alert("Harap masukkan nama tema!");
            return;
        }

        const newPreset = {
            id: `custom_${Date.now()}`,
            name: themeName,
            accent: settings.kioskAccentColor || "#A68B67",
            bgStart: settings.kioskBgGradientStart || "#0C0A09",
            bgEnd: settings.kioskBgGradientEnd || "#0C0A09",
            font: settings.kioskFontFamily || "Geist"
        };

        const updated = [...customPresets, newPreset];
        setCustomPresets(updated);
        localStorage.setItem("kiosk_custom_presets", JSON.stringify(updated));
        setShowPresetModal(false);
        setNewPresetName("");
    };

    const handleDeleteCustomPreset = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Apakah Anda yakin ingin menghapus tema kustom ini?")) return;
        
        const updated = customPresets.filter(p => p.id !== id);
        setCustomPresets(updated);
        localStorage.setItem("kiosk_custom_presets", JSON.stringify(updated));
    };

    const handleResetToDefault = () => {
        setSettings(prev => ({
            ...prev,
            kioskThemePreset: "default",
            kioskAccentColor: null,
            kioskBgGradientStart: null,
            kioskBgGradientEnd: null,
            kioskBrandName: null,
            kioskWelcomeMessage: null,
            kioskFontFamily: null,
            kioskLogoUrl: null
        }));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== "image/png") {
            alert("Harap unggah file logo dalam format PNG saja!");
            return;
        }

        setUploadingLogo(true);
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        try {
            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formDataUpload,
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(prev => ({ ...prev, kioskLogoUrl: data.url }));
            } else {
                const errData = await res.json();
                alert(errData.error || 'Gagal mengunggah logo. Silakan coba lagi.');
            }
        } catch (error) {
            console.error('Failed to upload logo:', error);
            alert('Terjadi kesalahan saat mengunggah logo.');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleDeleteLogo = () => {
        if (confirm("Apakah Anda yakin ingin menghapus logo kustom ini?")) {
            setSettings(prev => ({ ...prev, kioskLogoUrl: null }));
        }
    };

    // Helper preview styling mappings for mock
    const getAccentColor = () => settings.kioskAccentColor || "#A68B67";
    const getBgStyle = () => {
        if (settings.kioskBgGradientStart && settings.kioskBgGradientEnd) {
            return `linear-gradient(135deg, ${settings.kioskBgGradientStart}, ${settings.kioskBgGradientEnd})`;
        }
        if (settings.kioskThemePreset !== "default") {
            const matched = PRESETS.find(p => p.id === settings.kioskThemePreset);
            if (matched) return `linear-gradient(135deg, ${matched.bgStart}, ${matched.bgEnd})`;
        }
        return "#0C0A09";
    };
    const getFontFamily = () => {
        const font = settings.kioskFontFamily || "Geist";
        return font;
    };

    if (loading) return <LoadingScreen />;

    return (
        <div className="fixed inset-0 lg:left-72 bg-[#F7F5F0] flex flex-col z-30 overflow-hidden">
            {/* Header Toolbar */}
            <div className="bg-[#1C1917] text-white px-8 py-4 flex items-center justify-between border-b border-white/5 shrink-0 shadow-lg">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => router.push("/admin/kiosk-themes")}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/70 hover:text-white flex items-center gap-2 border border-white/10"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider pr-1">Daftar Akun</span>
                    </button>
                    <div className="h-6 w-px bg-white/10" />
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#A68B67]">WORKSPACE KUSTOMISASI KIOSK</h2>
                        <h1 className="text-sm font-serif italic text-[#FDFBF7] tracking-wide mt-0.5">
                            Klien Kiosk: {accountName}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleResetToDefault}
                        className="px-4 py-2.5 text-white/50 hover:text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white/5 rounded-xl border border-white/5 transition-all"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Kembali ke Default
                    </button>
                    <button
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className="bg-[#A68B67] hover:bg-[#8C7E6A] text-[#FDFBF7] px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md shadow-[#A68B67]/15 disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <Save className="w-3.5 h-3.5" />
                                Simpan Perubahan Kiosk
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error / Success Notifications banner */}
            {error && (
                <div className="bg-red-500 text-white text-[10px] font-black uppercase tracking-wider text-center py-3.5 px-8 flex items-center justify-center gap-2 shadow-inner shrink-0">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>ERROR: {error}</span>
                </div>
            )}
            {success && (
                <div className="bg-green-600 text-white text-[10px] font-black uppercase tracking-widest text-center py-3.5 px-8 flex items-center justify-center gap-2 shadow-inner shrink-0 animate-pulse">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>PENGATURAN KIOSK SELESAI DISIMPAN & DISINKRONISASI!</span>
                </div>
            )}

            {/* Main Content Workspace Stack (Top-Bottom Stack using flex-col-reverse) */}
            <div className="flex-1 flex flex-col-reverse overflow-hidden bg-[#FAF8F5]">
                
                {/* BOTTOM CONTROL COCKPIT (height: 320px) */}
                <div className="h-[320px] w-full bg-white border-t border-[#EAE1D3] flex flex-col shrink-0 overflow-hidden shadow-2xl z-20">
                    
                    {/* Tab Navigation Menu */}
                    <div className="flex border-b border-[#EAE1D3] shrink-0 bg-[#FAF8F5] z-10">
                        <button
                            onClick={() => setActiveTab("aesthetic")}
                            className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 flex items-center justify-center gap-2 ${
                                activeTab === "aesthetic"
                                    ? "border-[#A68B67] text-[#4A3F35] bg-white font-bold"
                                    : "border-transparent text-[#8C7E6A] hover:text-[#4A3F35]"
                            }`}
                        >
                            <Palette className="w-3.5 h-3.5" />
                            Estetika
                        </button>
                        <button
                            onClick={() => setActiveTab("timer")}
                            className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 flex items-center justify-center gap-2 ${
                                activeTab === "timer"
                                    ? "border-[#A68B67] text-[#4A3F35] bg-white font-bold"
                                    : "border-transparent text-[#8C7E6A] hover:text-[#4A3F35]"
                            }`}
                        >
                            <Clock className="w-3.5 h-3.5" />
                            Timer
                        </button>
                        <button
                            onClick={() => setActiveTab("camera")}
                            className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 flex items-center justify-center gap-2 ${
                                activeTab === "camera"
                                    ? "border-[#A68B67] text-[#4A3F35] bg-white font-bold"
                                    : "border-transparent text-[#8C7E6A] hover:text-[#4A3F35]"
                            }`}
                        >
                            <CameraIcon className="w-3.5 h-3.5" />
                            Kamera
                        </button>
                        <button
                            onClick={() => setActiveTab("business")}
                            className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 flex items-center justify-center gap-2 ${
                                activeTab === "business"
                                    ? "border-[#A68B67] text-[#4A3F35] bg-white font-bold"
                                    : "border-transparent text-[#8C7E6A] hover:text-[#4A3F35]"
                            }`}
                        >
                            <Banknote className="w-3.5 h-3.5" />
                            Bisnis
                        </button>
                    </div>

                    {/* Scrollable Grid-Based Content Section */}
                    <div className="flex-1 overflow-y-auto p-5 scrollbar-hide bg-white">
                        
                        {/* TAB 1: AESTHETICS & BRAND THEMING (3-column layout) */}
                        {activeTab === "aesthetic" && (
                            <div className="grid grid-cols-3 gap-6 h-full text-[#4A3F35]">
                                
                                {/* Kolom 1: Brand & Welcome message */}
                                <div className="space-y-3 pr-4 border-r border-[#EAE1D3]/50">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#4A3F35] border-b border-[#EAE1D3] pb-2 flex items-center gap-1.5">
                                        <Tv className="w-3.5 h-3.5 text-[#A68B67]" />
                                        Brand & Welcome Message
                                    </h3>
                                    
                                    {/* Brand Header Name Input */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider block">Nama Brand / Event Kiosk</label>
                                        <input
                                            type="text"
                                            value={settings.kioskBrandName || ""}
                                            onChange={e => setSettings(prev => ({ ...prev, kioskBrandName: e.target.value || null }))}
                                            placeholder="Contoh: Andi & Dove Wedding"
                                            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#EAE1D3] rounded-xl text-xs font-bold text-[#4A3F35] placeholder:text-[#8C7E6A]/30 focus:outline-none focus:border-[#A68B67]"
                                        />
                                    </div>

                                    {/* Kiosk Custom Logo Upload Input */}
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider block">Logo Kustom Client (PNG)</label>
                                        
                                        {settings.kioskLogoUrl ? (
                                            <div className="flex items-center gap-3 p-3 bg-[#FAF8F5] border border-[#EAE1D3] rounded-2xl">
                                                <div className="w-12 h-12 bg-white rounded-xl border border-[#EAE1D3] flex items-center justify-center p-1.5 relative overflow-hidden shadow-sm">
                                                    <img src={settings.kioskLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-bold text-[#4A3F35] truncate">Logo_Terunggah.png</p>
                                                    <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider">Aktif & Siap</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleDeleteLogo}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                                                    title="Hapus Logo"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative group">
                                                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[#EAE1D3] hover:border-[#A68B67] rounded-2xl cursor-pointer bg-[#FAF8F5] hover:bg-[#FDFBF9] transition-all p-4 text-center">
                                                    <div className="flex flex-col items-center justify-center space-y-1">
                                                        {uploadingLogo ? (
                                                            <div className="w-6 h-6 border-2 border-[#A68B67] border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <Upload className="w-5 h-5 text-[#8C7E6A] group-hover:scale-110 transition-transform duration-300" />
                                                        )}
                                                        <span className="text-[10px] font-extrabold text-[#4A3F35]">
                                                            {uploadingLogo ? "Mengunggah..." : "Pilih File Logo PNG"}
                                                        </span>
                                                        <span className="text-[8px] text-[#8C7E6A]/70 uppercase tracking-widest font-black">Maksimal 10MB</span>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/png"
                                                        onChange={handleLogoUpload}
                                                        disabled={uploadingLogo}
                                                        className="hidden"
                                                    />
                                                </label>
                                            </div>
                                        )}
                                        <p className="text-[8px] text-[#8C7E6A]/75 italic mt-0.5 leading-tight">
                                            Logo akan tampil jika menggunakan tema kustom. Jika kosong, akan menampilkan icon default.
                                        </p>
                                    </div>

                                    {/* Welcome Message Input */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider block">Pesan Sambutan Launcher</label>
                                        <input
                                            type="text"
                                            value={settings.kioskWelcomeMessage || ""}
                                            onChange={e => setSettings(prev => ({ ...prev, kioskWelcomeMessage: e.target.value || null }))}
                                            placeholder="Contoh: Sentuh Layar untuk Mulai!"
                                            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#EAE1D3] rounded-xl text-xs font-bold text-[#4A3F35] placeholder:text-[#8C7E6A]/30 focus:outline-none focus:border-[#A68B67]"
                                        />
                                    </div>

                                    {/* Premium Fonts Selector */}
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider block">Font Family Premium</label>
                                        <select
                                            value={settings.kioskFontFamily || "Geist"}
                                            onChange={e => setSettings(prev => ({ ...prev, kioskFontFamily: e.target.value || null }))}
                                            className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#EAE1D3] rounded-xl text-xs font-bold text-[#4A3F35] cursor-pointer"
                                        >
                                            {FONTS.map(f => (
                                                <option key={f.value} value={f.value}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Kolom 2: Presets & Custom Themes */}
                                <div className="space-y-3 px-2 border-r border-[#EAE1D3]/50 overflow-y-auto scrollbar-hide max-h-[250px]">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#4A3F35] border-b border-[#EAE1D3] pb-2 flex items-center gap-1.5">
                                        <Palette className="w-3.5 h-3.5 text-[#A68B67]" />
                                        Preset & Tema Instan
                                    </h3>
                                    
                                    {/* Instant presets grid */}
                                    <div className="space-y-1">
                                        <label className="text-[8px] text-[#8C7E6A] font-bold uppercase tracking-wider block">Preset Bawaan Kiosk</label>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {PRESETS.map(preset => (
                                                <button
                                                    key={preset.id}
                                                    type="button"
                                                    onClick={() => handleApplyPreset(preset.id)}
                                                    className={`p-1.5 rounded-lg border text-left transition-all flex items-center gap-1.5 hover:scale-102 ${
                                                        settings.kioskThemePreset === preset.id
                                                            ? "bg-white border-[#A68B67] shadow-sm"
                                                            : "bg-[#FAF8F5] border-[#EAE1D3] hover:border-[#8C7E6A]"
                                                    }`}
                                                >
                                                    <div 
                                                        className="w-3.5 h-3.5 rounded-full border border-black/10 flex items-center justify-center shrink-0 shadow-inner"
                                                        style={{ background: preset.id === "default" ? "#0C0A09" : `linear-gradient(135deg, ${preset.bgStart}, ${preset.bgEnd})` }}
                                                    >
                                                        <div className="w-1 h-1 rounded-full" style={{ backgroundColor: preset.accent }} />
                                                    </div>
                                                    <span className="text-[8px] font-black uppercase tracking-wider text-[#4A3F35] truncate max-w-full block">
                                                        {preset.name.replace("Gold & Dark", "").replace("Default", "").replace("Vintage", "").trim()}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom presets */}
                                    <div className="space-y-1 pt-2 border-t border-[#EAE1D3]/50">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[8px] text-[#8C7E6A] font-bold uppercase tracking-wider block">Tema Kustom Klien</label>
                                            <button
                                                type="button"
                                                onClick={handleSaveCustomPreset}
                                                className="px-2 py-0.5 bg-[#A68B67] hover:bg-[#8C7E6A] text-white text-[7px] font-black uppercase tracking-wider rounded-md flex items-center gap-1 shadow-sm"
                                            >
                                                + Simpan
                                            </button>
                                        </div>
                                        
                                        {customPresets.length === 0 ? (
                                            <p className="text-[7.5px] font-bold uppercase text-[#8C7E6A]/50 text-center py-2">Belum ada tema kustom</p>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {customPresets.map(preset => (
                                                    <div
                                                        key={preset.id}
                                                        onClick={() => {
                                                            setSettings(prev => ({
                                                                ...prev,
                                                                kioskThemePreset: "custom",
                                                                kioskAccentColor: preset.accent,
                                                                kioskBgGradientStart: preset.bgStart,
                                                                kioskBgGradientEnd: preset.bgEnd,
                                                                kioskFontFamily: preset.font
                                                            }));
                                                        }}
                                                        className={`p-1.5 rounded-lg border text-left transition-all flex items-center gap-1.5 cursor-pointer relative group ${
                                                            settings.kioskThemePreset === preset.id
                                                                ? "bg-white border-[#A68B67] shadow-sm"
                                                                : "bg-[#FAF8F5] border-[#EAE1D3] hover:border-[#8C7E6A]"
                                                        }`}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
                                                            className="absolute top-0.5 right-0.5 p-0.5 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white rounded-md opacity-0 group-hover:opacity-100 transition-all z-20"
                                                        >
                                                            <X className="w-2 h-2" />
                                                        </button>
                                                        <div 
                                                            className="w-3.5 h-3.5 rounded-full border border-black/10 flex items-center justify-center shrink-0 shadow-inner"
                                                            style={{ background: `linear-gradient(135deg, ${preset.bgStart}, ${preset.bgEnd})` }}
                                                        >
                                                            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: preset.accent }} />
                                                        </div>
                                                        <span className="text-[8px] font-black uppercase tracking-wider text-[#4A3F35] truncate block w-[70%]">
                                                            {preset.name}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Kolom 3: Fine-Tuning Palet Warna Custom */}
                                <div className="space-y-3 pl-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#4A3F35] border-b border-[#EAE1D3] pb-2 flex items-center gap-1.5">
                                        <Palette className="w-3.5 h-3.5 text-[#A68B67]" />
                                        Detail Warna (Fine-Tuning)
                                    </h3>
                                    
                                    <div className="space-y-2">
                                        {/* Accent Color Picker */}
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider">Aksen Tombol & Ring</span>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={settings.kioskAccentColor || ""}
                                                    onChange={e => setSettings(prev => ({ ...prev, kioskAccentColor: e.target.value }))}
                                                    className="w-20 px-2 py-1 bg-[#FAF8F5] border border-[#EAE1D3] rounded-lg text-[10px] font-mono font-bold text-center text-[#4A3F35]"
                                                />
                                                <div className="relative w-8 h-8 rounded-lg cursor-pointer border border-[#EAE1D3] overflow-hidden shrink-0">
                                                    <input
                                                        type="color"
                                                        value={settings.kioskAccentColor || "#A68B67"}
                                                        onChange={e => setSettings(prev => ({ ...prev, kioskAccentColor: e.target.value }))}
                                                        className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer border-0"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Gradien Start Color Picker */}
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider">Background Awal</span>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={settings.kioskBgGradientStart || ""}
                                                    onChange={e => setSettings(prev => ({ ...prev, kioskBgGradientStart: e.target.value }))}
                                                    className="w-20 px-2 py-1 bg-[#FAF8F5] border border-[#EAE1D3] rounded-lg text-[10px] font-mono font-bold text-center text-[#4A3F35]"
                                                />
                                                <div className="relative w-8 h-8 rounded-lg cursor-pointer border border-[#EAE1D3] overflow-hidden shrink-0">
                                                    <input
                                                        type="color"
                                                        value={settings.kioskBgGradientStart || "#0C0A09"}
                                                        onChange={e => setSettings(prev => ({ ...prev, kioskBgGradientStart: e.target.value }))}
                                                        className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer border-0"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Gradien End Color Picker */}
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider">Background Akhir</span>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={settings.kioskBgGradientEnd || ""}
                                                    onChange={e => setSettings(prev => ({ ...prev, kioskBgGradientEnd: e.target.value }))}
                                                    className="w-20 px-2 py-1 bg-[#FAF8F5] border border-[#EAE1D3] rounded-lg text-[10px] font-mono font-bold text-center text-[#4A3F35]"
                                                />
                                                <div className="relative w-8 h-8 rounded-lg cursor-pointer border border-[#EAE1D3] overflow-hidden shrink-0">
                                                    <input
                                                        type="color"
                                                        value={settings.kioskBgGradientEnd || "#0C0A09"}
                                                        onChange={e => setSettings(prev => ({ ...prev, kioskBgGradientEnd: e.target.value }))}
                                                        className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer border-0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* TAB 2: TIMER SECTIONS (4-column layout) */}
                        {activeTab === "timer" && (
                            <div className="grid grid-cols-4 gap-6 h-full items-center">
                                
                                {/* Timer 1 */}
                                <div className="space-y-2 p-4 bg-[#FAF8F5] border border-[#EAE1D3] rounded-2xl text-center shadow-sm">
                                    <Clock className="w-5 h-5 text-[#A68B67] mx-auto" />
                                    <label className="text-[9px] text-[#4A3F35] font-black uppercase tracking-wider block">Pilih Bingkai</label>
                                    <input
                                        type="number"
                                        value={settings.frameSelectionTimer}
                                        onChange={e => setSettings(prev => ({ ...prev, frameSelectionTimer: parseInt(e.target.value) || 5 }))}
                                        className="w-16 px-2 py-1 bg-white border border-[#EAE1D3] rounded-lg text-center text-xs font-bold text-[#4A3F35]"
                                    />
                                    <span className="text-[7.5px] text-[#8C7E6A] uppercase font-bold block">(Menit)</span>
                                </div>

                                {/* Timer 2 */}
                                <div className="space-y-2 p-4 bg-[#FAF8F5] border border-[#EAE1D3] rounded-2xl text-center shadow-sm">
                                    <Clock className="w-5 h-5 text-[#A68B67] mx-auto" />
                                    <label className="text-[9px] text-[#4A3F35] font-black uppercase tracking-wider block">Kamera DSLR</label>
                                    <input
                                        type="number"
                                        value={settings.captureTimer}
                                        onChange={e => setSettings(prev => ({ ...prev, captureTimer: parseInt(e.target.value) || 5 }))}
                                        className="w-16 px-2 py-1 bg-white border border-[#EAE1D3] rounded-lg text-center text-xs font-bold text-[#4A3F35]"
                                    />
                                    <span className="text-[7.5px] text-[#8C7E6A] uppercase font-bold block">(Detik)</span>
                                </div>

                                {/* Timer 3 */}
                                <div className="space-y-2 p-4 bg-[#FAF8F5] border border-[#EAE1D3] rounded-2xl text-center shadow-sm">
                                    <Clock className="w-5 h-5 text-[#A68B67] mx-auto" />
                                    <label className="text-[9px] text-[#4A3F35] font-black uppercase tracking-wider block">Pilih Foto</label>
                                    <input
                                        type="number"
                                        value={settings.photoSelectionTimer}
                                        onChange={e => setSettings(prev => ({ ...prev, photoSelectionTimer: parseInt(e.target.value) || 60 }))}
                                        className="w-16 px-2 py-1 bg-white border border-[#EAE1D3] rounded-lg text-center text-xs font-bold text-[#4A3F35]"
                                    />
                                    <span className="text-[7.5px] text-[#8C7E6A] uppercase font-bold block">(Detik)</span>
                                </div>

                                {/* Timer 4 */}
                                <div className="space-y-2 p-4 bg-[#FAF8F5] border border-[#EAE1D3] rounded-2xl text-center shadow-sm">
                                    <Clock className="w-5 h-5 text-[#A68B67] mx-auto" />
                                    <label className="text-[9px] text-[#4A3F35] font-black uppercase tracking-wider block">Unduh & Cetak</label>
                                    <input
                                        type="number"
                                        value={settings.resultTimer}
                                        onChange={e => setSettings(prev => ({ ...prev, resultTimer: parseInt(e.target.value) || 60 }))}
                                        className="w-16 px-2 py-1 bg-white border border-[#EAE1D3] rounded-lg text-center text-xs font-bold text-[#4A3F35]"
                                    />
                                    <span className="text-[7.5px] text-[#8C7E6A] uppercase font-bold block">(Detik)</span>
                                </div>

                            </div>
                        )}

                        {/* TAB 3: CAMERA OPTIONS (2-column layout) */}
                        {activeTab === "camera" && (
                            <div className="grid grid-cols-2 gap-8 h-full items-center">
                                
                                {/* Kolom 1: Jumlah Maksimal Sesi Jepretan */}
                                <div className="space-y-3 p-5 bg-[#FAF8F5] border border-[#EAE1D3] rounded-2xl shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase tracking-wider text-[#4A3F35] flex items-center gap-2">
                                        <CameraIcon className="w-4 h-4 text-[#A68B67]" />
                                        Maksimal Sesi Jepretan Foto
                                    </h4>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="number"
                                            value={settings.maxCapturePhotos}
                                            onChange={e => setSettings(prev => ({ ...prev, maxCapturePhotos: parseInt(e.target.value) || 8 }))}
                                            className="w-20 px-3 py-1.5 bg-white border border-[#EAE1D3] rounded-xl text-center text-xs font-bold text-[#4A3F35]"
                                        />
                                        <span className="text-[8px] text-[#8C7E6A] uppercase font-bold block">Batas maksimal jepretan foto dalam satu sesi pemotretan.</span>
                                    </div>
                                </div>

                                {/* Kolom 2: Switcher Filter Foto */}
                                <div className="space-y-4 p-5 bg-[#FAF8F5] border border-[#EAE1D3] rounded-2xl flex items-center justify-between shadow-sm">
                                    <div className="space-y-1">
                                        <h4 className="text-[10px] font-black uppercase tracking-wider text-[#4A3F35] flex items-center gap-2">
                                            <Palette className="w-4 h-4 text-[#A68B67]" />
                                            Aktifkan Halaman Filter Foto
                                        </h4>
                                        <span className="text-[8px] text-[#8C7E6A] uppercase font-bold block">Mengizinkan klien memilih filter B&W / Sepia sebelum cetak.</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.isPhotoFilterEnabled}
                                        onChange={e => setSettings(prev => ({ ...prev, isPhotoFilterEnabled: e.target.checked }))}
                                        className="w-5 h-5 accent-[#A68B67] cursor-pointer"
                                    />
                                </div>

                            </div>
                        )}

                        {/* TAB 4: BUSINESS SWITCHES (2-column layout) */}
                        {activeTab === "business" && (
                            <div className="grid grid-cols-2 gap-8 h-full items-center">
                                
                                {/* Kolom 1: Mode Pembayaran Kasir / QRIS */}
                                <div className="space-y-4 p-5 bg-[#FAF8F5] border border-[#EAE1D3] rounded-2xl flex items-center justify-between shadow-sm">
                                    <div className="space-y-1">
                                        <h4 className="text-[10px] font-black uppercase tracking-wider text-[#4A3F35] flex items-center gap-2">
                                            <Banknote className="w-4 h-4 text-[#A68B67]" />
                                            Mode Pembayaran Kasir / QRIS
                                        </h4>
                                        <span className="text-[8px] text-[#8C7E6A] uppercase font-bold block">Jika dinonaktifkan, kiosk berjalan dalam mode gratis/offline.</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.isPaymentEnabled}
                                        onChange={e => setSettings(prev => ({ ...prev, isPaymentEnabled: e.target.checked }))}
                                        className="w-5 h-5 accent-[#A68B67] cursor-pointer"
                                    />
                                </div>

                                {/* Kolom 2: Cloud Auto-Backup (G-Drive) */}
                                <div className="space-y-4 p-5 bg-[#FAF8F5] border border-[#EAE1D3] rounded-2xl flex items-center justify-between shadow-sm">
                                    <div className="space-y-1">
                                        <h4 className="text-[10px] font-black uppercase tracking-wider text-[#4A3F35] flex items-center gap-2">
                                            <Tv className="w-4 h-4 text-[#A68B67]" />
                                            Cloud Auto-Backup (G-Drive)
                                        </h4>
                                        <span className="text-[8px] text-[#8C7E6A] uppercase font-bold block">Mengunggah hasil sesi foto secara real-time ke Google Drive Mitra.</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={settings.isGoogleDriveBackupEnabled}
                                        onChange={e => setSettings(prev => ({ ...prev, isGoogleDriveBackupEnabled: e.target.checked }))}
                                        className="w-5 h-5 accent-[#A68B67] cursor-pointer"
                                    />
                                </div>

                            </div>
                        )}

                    </div>
                </div>

                {/* TOP SECTION: HIGH-FIDELITY LIVE KIOSK SIMULATOR (takes remaining vertical space) */}
                <div className="flex-1 bg-[#F0ECE3] p-4 flex flex-col justify-between overflow-hidden relative border-b border-[#EAE1D3]">
                    
                    {/* Screen Indicator Panel Header */}
                    <div className="flex items-center justify-between bg-white border border-[#EAE1D3] px-6 py-2.5 rounded-2xl shrink-0 shadow-sm z-30">
                        <div className="flex items-center gap-3">
                            <Tv className="w-4 h-4 text-[#A68B67]" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#4A3F35]">Visualisasi Screen Preview Kiosk</span>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-[#A68B67] bg-[#A68B67]/10 px-3 py-1 rounded-lg">
                            Halaman: {previewScreen.toUpperCase()}
                        </span>
                    </div>

                    {/* DYNAMIC SCREEN PREVIEW INNER CANVAS FRAME */}
                    {(() => {
                        const isLight = (settings.kioskBgGradientStart || "").toLowerCase().startsWith("#f") || 
                                        (settings.kioskBgGradientStart || "").toLowerCase().startsWith("#e") || 
                                        (settings.kioskBgGradientStart || "").toLowerCase() === "#ffffff" || 
                                        settings.kioskThemePreset === "wedding" || 
                                        settings.kioskThemePreset === "retro";
                        
                        const textColor = isLight ? "text-[#4A3F35]" : "text-white";
                        const subtextColor = isLight ? "text-[#8C7E6A]" : "text-white/60";
                        const borderColor = isLight ? "border-[#EAE1D3]" : "border-white/10";
                        const cardBgColor = isLight ? "bg-white/80 border-[#EAE1D3]" : "bg-white/5 border-white/10";
                        const buttonTextColor = isLight && getAccentColor() === "#A68B67" ? "text-white" : "text-white";

                        return (
                            <div className="aspect-[16/10] max-h-[calc(100%-36px)] max-w-full w-[840px] mx-auto my-auto relative shadow-2xl shrink z-10">
                                {/* Tablet Outer Bezel Shell */}
                                <div className="absolute inset-0 -m-4 rounded-[36px] border-[12px] border-stone-800 bg-stone-900 pointer-events-none shadow-2xl z-0" />
                                {/* Screen Inner Frame Container */}
                                <div className={`absolute inset-0 rounded-2xl overflow-hidden flex flex-col justify-between p-6 ${textColor} select-none transition-all duration-300 z-10`}
                                     style={{ 
                                         background: getBgStyle(),
                                         fontFamily: getFontFamily()
                                     }}
                                >
                                {/* Immersive Grid Dots Pattern Background */}
                                <div 
                                    className="absolute inset-0 opacity-[0.08] pointer-events-none [background-size:24px_24px] z-0" 
                                    style={{ 
                                        backgroundImage: `radial-gradient(${isLight ? '#4A3F35' : '#ffffff'} 1.5px, transparent 1.5px)` 
                                    }} 
                                />

                                {/* 1. MOCK SCREEN: LAUNCHER (WELCOME PAGE) */}
                                {previewScreen === "launcher" && (
                                    <div className="h-full flex flex-col justify-between items-center text-center py-12 animate-fadeIn relative z-10">
                                        {/* Status Info (Wifi/Settings mock) */}
                                        <div className="absolute top-0 right-0 flex items-center gap-3 opacity-60">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-[7px] font-bold tracking-widest uppercase">Kiosk Online</span>
                                        </div>

                                        {/* Brand Header */}
                                        <div className="space-y-2 mt-4">
                                            <h1 className="text-2xl tracking-widest font-black uppercase" style={{ color: getAccentColor() }}>
                                                {settings.kioskBrandName || "DOVELENS PHOTOBOOTH"}
                                            </h1>
                                            <p className={`text-[8px] tracking-[0.4em] uppercase font-bold ${subtextColor}`}>PART OF DOVELENS.FT</p>
                                        </div>

                                        {/* Central Visual Callout */}
                                        {settings.kioskThemePreset && settings.kioskThemePreset !== "default" ? (
                                            settings.kioskLogoUrl ? (
                                                <div className="w-28 h-28 rounded-full flex items-center justify-center bg-white/5 border border-white/10 shadow-2xl relative my-auto">
                                                    <div className="absolute inset-2 rounded-full border border-dashed border-white/20 animate-spin" style={{ animationDuration: "16s" }} />
                                                    <img src={settings.kioskLogoUrl} alt="Custom Logo" className="w-14 h-14 object-contain rounded-full" />
                                                </div>
                                            ) : (
                                                <div className="w-28 h-28 rounded-full flex items-center justify-center bg-white/5 border border-white/10 shadow-2xl relative my-auto">
                                                    <div className="absolute inset-2 rounded-full border border-dashed border-white/20 animate-spin" style={{ animationDuration: "16s" }} />
                                                    <Flame className="w-9 h-9" style={{ color: getAccentColor() }} />
                                                </div>
                                            )
                                        ) : (
                                            <div className="h-20 my-auto" /> // Completely hide central icon in default settings!
                                        )}

                                        {/* Bottom Welcome & Play Button */}
                                        <div className="space-y-6 w-full max-w-sm">
                                            <p className="text-[10px] font-black tracking-widest uppercase opacity-90 animate-pulse">
                                                {settings.kioskWelcomeMessage || "Sentuh Layar untuk Mulai!"}
                                            </p>
                                            <button
                                                type="button"
                                                className={`w-full py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-transform shadow-lg cursor-default ${buttonTextColor}`}
                                                style={{ backgroundColor: getAccentColor() }}
                                            >
                                                Mulai Sesi Foto / Touch to Start
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* 2. MOCK SCREEN: FRAME SELECTION */}
                                {previewScreen === "frame" && (
                                    <div className="h-full flex flex-col justify-between animate-fadeIn relative z-10">
                                        {/* Title and Timer */}
                                        <div className={`flex items-center justify-between border-b ${borderColor} pb-4`}>
                                            <div>
                                                <h2 className="text-xs font-black tracking-widest uppercase" style={{ color: getAccentColor() }}>Pilih Template Bingkai</h2>
                                                <p className={`text-[7px] tracking-wider uppercase mt-0.5 ${subtextColor}`}>Tentukan tata letak bingkai cetak photo strip Anda</p>
                                            </div>
                                            <div className={`px-3.5 py-2 rounded-xl bg-white/5 border ${borderColor} text-center min-w-[60px]`}>
                                                <span className={`text-[8px] font-bold block uppercase ${subtextColor}`}>Sisa Waktu</span>
                                                <span className="text-xs font-mono font-black" style={{ color: getAccentColor() }}>
                                                    {String(settings.frameSelectionTimer || 5).padStart(2, '0')}:00
                                                </span>
                                            </div>
                                        </div>

                                        {/* Mock Strip layouts grid */}
                                        <div className="grid grid-cols-3 gap-6 my-auto">
                                            {/* Strip 1 - Active Selected */}
                                            <div className={`rounded-2xl p-4 flex flex-col items-center gap-3 relative shadow-lg transition-all border-2`}
                                                 style={{ 
                                                     borderColor: getAccentColor(),
                                                     backgroundColor: isLight ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.08)'
                                                 }}
                                            >
                                                <div className="absolute top-2.5 right-2.5">
                                                    <CheckCircle2 className="w-4 h-4" style={{ color: getAccentColor() }} />
                                                </div>
                                                <div className={`w-12 h-20 bg-black/40 border ${borderColor} rounded flex flex-col gap-1.5 p-1 shrink-0`}>
                                                    <div className="bg-white/20 flex-1 rounded-sm" />
                                                    <div className="bg-white/20 flex-1 rounded-sm" />
                                                    <div className="bg-white/20 flex-1 rounded-sm" />
                                                </div>
                                                <span className="text-[8px] font-black uppercase tracking-wider">Double Strip</span>
                                            </div>
                                            
                                            {/* Strip 2 */}
                                            <div className={`rounded-2xl p-4 flex flex-col items-center gap-3 opacity-60 border border-dashed ${borderColor}`}
                                                 style={{ backgroundColor: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.02)' }}
                                            >
                                                <div className={`w-12 h-20 bg-black/40 border ${borderColor} rounded flex flex-col gap-1 p-1 shrink-0`}>
                                                    <div className="grid grid-cols-2 gap-1 flex-1">
                                                        <div className="bg-white/20 rounded-sm" />
                                                        <div className="bg-white/20 rounded-sm" />
                                                        <div className="bg-white/20 rounded-sm" />
                                                        <div className="bg-white/20 rounded-sm" />
                                                    </div>
                                                </div>
                                                <span className="text-[8px] font-black uppercase tracking-wider">Grid 2x2</span>
                                            </div>
                                            
                                            {/* Strip 3 */}
                                            <div className={`rounded-2xl p-4 flex flex-col items-center gap-3 opacity-60 border border-dashed ${borderColor}`}
                                                 style={{ backgroundColor: isLight ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.02)' }}
                                            >
                                                <div className={`w-12 h-20 bg-black/40 border ${borderColor} rounded flex flex-col gap-1.5 p-1 shrink-0`}>
                                                    <div className="bg-white/20 flex-1 rounded-sm" />
                                                    <div className="bg-white/20 flex-1 rounded-sm" />
                                                </div>
                                                <span className="text-[8px] font-black uppercase tracking-wider">Classic Collage</span>
                                            </div>
                                        </div>

                                        {/* Continue Button */}
                                        <div className={`border-t ${borderColor} pt-4 flex justify-end`}>
                                            <button
                                                type="button"
                                                className={`px-8 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest cursor-default ${buttonTextColor}`}
                                                style={{ backgroundColor: getAccentColor() }}
                                            >
                                                Lanjutkan / Next
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* 3. MOCK SCREEN: CAMERA COUNTDOWN (SHOOT SCREEN) */}
                                {previewScreen === "shoot" && (
                                    <div className="h-full flex flex-col justify-between animate-fadeIn relative z-10">
                                        {/* Title and Stats */}
                                        <div className={`flex items-center justify-between border-b ${borderColor} pb-4`}>
                                            <div>
                                                <h2 className="text-xs font-black tracking-widest uppercase" style={{ color: getAccentColor() }}>Siap-siap! Tersenyumlah</h2>
                                                <p className={`text-[7px] tracking-wider uppercase mt-0.5 ${subtextColor}`}>Sesi Jepretan Aktif</p>
                                            </div>
                                            <span className={`text-[8px] font-black uppercase tracking-wider px-3 py-1.5 bg-white/5 border ${borderColor} rounded-lg`}>
                                                Foto: 3 dari {settings.maxCapturePhotos}
                                            </span>
                                        </div>

                                        {/* Central Big Camera Canvas with Countdown overlay */}
                                        <div className="flex-1 my-6 bg-black/50 border border-white/10 rounded-3xl relative overflow-hidden flex items-center justify-center">
                                            {/* Mock camera lines */}
                                            <div className="absolute inset-6 border border-white/5 pointer-events-none" />
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-px bg-white/20" />
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-px bg-white/20" />
                                            
                                            {/* Visual Big Countdown Circle */}
                                            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl relative"
                                                 style={{ 
                                                     border: `4px solid ${getAccentColor()}`,
                                                     boxShadow: `0 0 20px ${getAccentColor()}33`
                                                 }}
                                            >
                                                <span className="text-3xl font-mono font-black text-white">{settings.captureTimer}</span>
                                            </div>
                                        </div>

                                        {/* Flash status bar */}
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden shrink-0">
                                            <div className="h-full rounded-full transition-all" style={{ width: "70%", backgroundColor: getAccentColor() }} />
                                        </div>
                                    </div>
                                )}

                                {/* 4. MOCK SCREEN: PHOTO SELECTION */}
                                {previewScreen === "select" && (
                                    <div className="h-full flex flex-col justify-between animate-fadeIn relative z-10">
                                        {/* Title */}
                                        <div className={`border-b ${borderColor} pb-4`}>
                                            <h2 className="text-xs font-black tracking-widest uppercase" style={{ color: getAccentColor() }}>Pilih Foto Terbaik Anda</h2>
                                            <p className={`text-[7px] tracking-wider uppercase mt-0.5 ${subtextColor}`}>Silakan pilih foto-foto terkeren untuk dimasukkan ke bingkai</p>
                                        </div>

                                        {/* Thumbnails Selection Grid */}
                                        <div className="grid grid-cols-4 gap-4 my-auto">
                                            {[1, 2, 3, 4].map(idx => {
                                                const isSelected = idx <= 3; // Mock select first three
                                                return (
                                                    <div key={idx} 
                                                         className={`bg-black/40 border rounded-xl p-1 relative transition-all ${
                                                             isSelected ? "scale-105" : "opacity-60 border-white/10"
                                                         }`}
                                                         style={{ borderColor: isSelected ? getAccentColor() : "rgba(255,255,255,0.1)" }}
                                                    >
                                                        {isSelected && (
                                                            <div className="absolute top-1 right-1 z-10">
                                                                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: getAccentColor() }} />
                                                            </div>
                                                        )}
                                                        <div className="w-full aspect-[3/4] bg-white/5 rounded-lg flex items-center justify-center text-[8px] font-black text-white/30">
                                                            TAKE #{idx}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Submit Button */}
                                        <div className={`border-t ${borderColor} pt-4 flex justify-between items-center`}>
                                            <span className={`text-[8px] font-bold uppercase ${subtextColor}`}>Terpilih: 3 foto</span>
                                            <button
                                                type="button"
                                                className={`px-8 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest cursor-default ${buttonTextColor}`}
                                                style={{ backgroundColor: getAccentColor() }}
                                            >
                                                Lanjut ke Filter
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* 5. MOCK SCREEN: ARTISTIC FILTERS */}
                                {previewScreen === "filter" && (
                                    <div className="h-full flex flex-col justify-between animate-fadeIn relative z-10">
                                        {/* Title */}
                                        <div className={`border-b ${borderColor} pb-4`}>
                                            <h2 className="text-xs font-black tracking-widest uppercase" style={{ color: getAccentColor() }}>Pilih Filter Artistik</h2>
                                            <p className={`text-[7px] tracking-wider uppercase mt-0.5 ${subtextColor}`}>Percantik hasil cetak photobooth Anda</p>
                                        </div>

                                        {/* Active Photo Canvas and filter preview */}
                                        <div className="flex-1 my-4 flex gap-6 items-center overflow-hidden">
                                            <div className="flex-1 aspect-[3/4] bg-black/50 border border-white/10 rounded-2xl flex items-center justify-center text-[8px] font-black text-white/30 relative shadow-inner">
                                                <span>PHOTO PREVIEW CANVAS</span>
                                            </div>
                                            
                                            {/* Filter selection sidebar */}
                                            <div className="w-32 flex flex-col gap-2 shrink-0 overflow-y-auto pr-1">
                                                {["Original", "Vintage Sepia", "Black & White", "Metallic"].map((f, i) => (
                                                    <div key={f} 
                                                         className={`px-3 py-2 rounded-xl border text-[7px] font-black uppercase tracking-wider text-center transition-all ${
                                                             i === 1 ? "bg-white/10" : "opacity-50 border-white/5 bg-transparent"
                                                         }`}
                                                         style={{ borderColor: i === 1 ? getAccentColor() : "rgba(255,255,255,0.05)" }}
                                                    >
                                                        {f}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <div className={`border-t ${borderColor} pt-3 flex justify-end`}>
                                            <button
                                                type="button"
                                                className={`px-8 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest cursor-default ${buttonTextColor}`}
                                                style={{ backgroundColor: getAccentColor() }}
                                            >
                                                Lanjutkan Cetak
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* 6. MOCK SCREEN: SCAN DOWNLOAD & PRINT */}
                                {previewScreen === "print" && (
                                    <div className="h-full flex flex-col justify-between items-center text-center py-6 animate-fadeIn relative z-10">
                                        {/* Success Header */}
                                        <div>
                                            <h2 className="text-sm font-black tracking-widest uppercase" style={{ color: getAccentColor() }}>Pemotretan Selesai!</h2>
                                            <p className={`text-[7px] tracking-[0.2em] uppercase mt-0.5 ${subtextColor}`}>Silakan scan dan unduh foto Anda di bawah</p>
                                        </div>

                                        {/* QR Card and print button */}
                                        <div className={`flex items-center gap-8 ${cardBgColor} p-5 rounded-2xl max-w-md my-auto shadow-xl`}>
                                            {/* Mock QR */}
                                            <div className="w-20 h-20 bg-white rounded-xl p-1.5 flex items-center justify-center shrink-0 shadow-lg shadow-black/10">
                                                <QrCode className="w-full h-full text-black" />
                                            </div>
                                            <div className="text-left space-y-2">
                                                <h3 className="text-[9px] font-black uppercase tracking-wider">Scan Kode QR</h3>
                                                <p className={`text-[7px] leading-relaxed font-bold uppercase ${subtextColor}`}>
                                                    Arahkan kamera smartphone Anda untuk mengunduh versi resolusi tinggi (HD) dan video boomerang Anda!
                                                </p>
                                            </div>
                                        </div>

                                        {/* Bottom Print Action Trigger */}
                                        <div className="space-y-4 w-full max-w-xs">
                                            <button
                                                type="button"
                                                className={`w-full py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-transform shadow-lg cursor-default ${buttonTextColor}`}
                                                style={{ backgroundColor: getAccentColor() }}
                                            >
                                                <Printer className="w-3.5 h-3.5" />
                                                Cetak Foto Sekarang (Print)
                                            </button>
                                            <span className={`text-[7px] font-bold uppercase tracking-widest block ${subtextColor}`}>
                                                Kembali ke layar utama dalam {settings.resultTimer} detik
                                            </span>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                        );
                    })()}

                    {/* BOTTOM PREVIEW SWITCHER NAVIGATION BUTTONS BAR */}
                    <div className="bg-white border border-[#EAE1D3] p-4 rounded-3xl shrink-0 shadow-md">
                        <p className="text-[8px] font-black text-[#A68B67] uppercase tracking-[0.25em] text-center mb-3">Tonton & Inspeksi Alur Halaman Kiosk</p>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                            <button
                                type="button"
                                onClick={() => setPreviewScreen("launcher")}
                                className={`py-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 hover:scale-102 ${
                                    previewScreen === "launcher"
                                        ? "bg-[#1C1917] border-[#1C1917] text-white"
                                        : "bg-[#FAF8F5] border-[#EAE1D3] text-[#4A3F35] hover:border-[#8C7E6A]"
                                }`}
                            >
                                <Flame className="w-3.5 h-3.5" />
                                <span className="text-[8px] font-black uppercase tracking-wider">1. Launcher</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewScreen("frame")}
                                className={`py-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 hover:scale-102 ${
                                    previewScreen === "frame"
                                        ? "bg-[#1C1917] border-[#1C1917] text-white"
                                        : "bg-[#FAF8F5] border-[#EAE1D3] text-[#4A3F35] hover:border-[#8C7E6A]"
                                }`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span className="text-[8px] font-black uppercase tracking-wider">2. Bingkai</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewScreen("shoot")}
                                className={`py-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 hover:scale-102 ${
                                    previewScreen === "shoot"
                                        ? "bg-[#1C1917] border-[#1C1917] text-white"
                                        : "bg-[#FAF8F5] border-[#EAE1D3] text-[#4A3F35] hover:border-[#8C7E6A]"
                                }`}
                            >
                                <CameraIcon className="w-3.5 h-3.5" />
                                <span className="text-[8px] font-black uppercase tracking-wider">3. Kamera</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewScreen("select")}
                                className={`py-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 hover:scale-102 ${
                                    previewScreen === "select"
                                        ? "bg-[#1C1917] border-[#1C1917] text-white"
                                        : "bg-[#FAF8F5] border-[#EAE1D3] text-[#4A3F35] hover:border-[#8C7E6A]"
                                }`}
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="text-[8px] font-black uppercase tracking-wider">4. Pilih Foto</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewScreen("filter")}
                                className={`py-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 hover:scale-102 ${
                                    previewScreen === "filter"
                                        ? "bg-[#1C1917] border-[#1C1917] text-white"
                                        : "bg-[#FAF8F5] border-[#EAE1D3] text-[#4A3F35] hover:border-[#8C7E6A]"
                                }`}
                            >
                                <Palette className="w-3.5 h-3.5" />
                                <span className="text-[8px] font-black uppercase tracking-wider">5. Filter</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewScreen("print")}
                                className={`py-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 hover:scale-102 ${
                                    previewScreen === "print"
                                        ? "bg-[#1C1917] border-[#1C1917] text-white"
                                        : "bg-[#FAF8F5] border-[#EAE1D3] text-[#4A3F35] hover:border-[#8C7E6A]"
                                }`}
                            >
                                <QrCode className="w-3.5 h-3.5" />
                                <span className="text-[8px] font-black uppercase tracking-wider">6. Scan & Cetak</span>
                            </button>
                        </div>
                    </div>

                </div>

            </div>

            {/* Custom Theme Save Preset Modal Dialog */}
            {showPresetModal && (
                <div className="fixed inset-0 bg-[#0C0A09]/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 transition-all duration-300">
                    <div className="w-full max-w-md bg-white border border-[#EAE1D3] rounded-[28px] shadow-2xl p-6 md:p-8 space-y-6 relative overflow-hidden transform transition-all duration-300 scale-100">
                        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[#A68B67]/5 rounded-full blur-[40px] pointer-events-none -translate-y-1/2 translate-x-1/4" />
                        
                        <div className="flex items-center justify-between pb-3 border-b border-[#EAE1D3]/60 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-[#A68B67]/10 flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-[#A68B67]" />
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-[#4A3F35]">
                                    Simpan Sebagai Tema Kustom
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPresetModal(false)}
                                className="p-1.5 hover:bg-[#FAF8F5] border border-transparent hover:border-[#EAE1D3] rounded-lg text-[#8C7E6A] transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmSavePreset} className="space-y-5 relative z-10">
                            <div className="space-y-1.5">
                                <label className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider block">Nama Tema Kustom</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={newPresetName}
                                    onChange={e => setNewPresetName(e.target.value)}
                                    placeholder="Contoh: Wedding Emas, Ultah Pastel"
                                    className="w-full px-4 py-3 bg-[#FAF8F5] border border-[#EAE1D3] rounded-2xl text-xs font-bold text-[#4A3F35] placeholder:text-[#8C7E6A]/30 focus:outline-none focus:border-[#A68B67] transition-all"
                                />
                                <p className="text-[8px] text-[#8C7E6A]/70 leading-relaxed italic mt-1">
                                    Nama tema kustom akan disimpan di penyimpanan lokal browser ini agar memudahkan penggunaan berikutnya.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowPresetModal(false)}
                                    className="flex-1 py-3 border border-[#EAE1D3] bg-[#FAF8F5] hover:bg-[#F5F1EA] text-[#8C7E6A] text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-[#A68B67] hover:bg-[#8C7E6A] text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-[#A68B67]/20 transition-all"
                                >
                                    Simpan Tema
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
