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
    ChevronLeft,
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
    Image as ImageIcon,
    Rocket,
    Mail,
    FileText,
    Star
} from "lucide-react";
import AdminPageSkeleton from "@/components/ui/AdminPageSkeleton";
import { RenderThemeButton } from "@/components/admin/kiosk/RenderThemeButton";
import {
    KIOSK_THEME_PRESETS as PRESETS,
    KIOSK_FONT_OPTIONS as FONTS,
    getKioskPreviewScreens,
    type KioskPreviewScreen,
} from "@/lib/kiosk-theme-presets";
import { ALL_ARTISTIC_FILTERS } from "@/lib/filters";

export default function KioskWorkspaceCustomizerPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const userId = searchParams.get("userId");

    const [activeTab, setActiveTab] = useState<"timer" | "camera" | "business">("timer");
    const [previewScreen, setPreviewScreen] = useState<KioskPreviewScreen>("launcher");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [accountName, setAccountName] = useState("");
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingBg, setUploadingBg] = useState(false);
    const [showPresetModal, setShowPresetModal] = useState(false);
    const [newPresetName, setNewPresetName] = useState("");
    const [isGradient, setIsGradient] = useState(true);

    const [currentStep, setCurrentStep] = useState<"theme" | "customize">("theme");
    const [activeCategory, setActiveCategory] = useState<string>("Semua");
    const [themesList, setThemesList] = useState<any[]>([]);
    const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
    const [themeDetails, setThemeDetails] = useState<any>(null);
    const [loadingThemes, setLoadingThemes] = useState(false);

    useEffect(() => {
        if (selectedThemeId) {
            fetchThemeDetails(selectedThemeId);
        }
    }, [selectedThemeId]);


    const fetchThemeDetails = async (themeId: string) => {
        setLoadingThemes(true);
        try {
            const res = await fetch(`/api/admin/themes/${themeId}`);
            if (res.ok) {
                const data = await res.json();
                setThemeDetails(data);
            }
        } catch (err) {
            console.error("Failed to fetch theme details:", err);
        } finally {
            setLoadingThemes(false);
        }
    };

    // Beautiful Premium Custom Notification Dialog State
    const [alertModal, setAlertModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: "success" | "error" | "info" | "confirm";
        onConfirm?: () => void;
    }>({
        isOpen: false,
        title: "",
        message: "",
        type: "info"
    });

    const showAlert = (message: string, type: "success" | "error" | "info" = "info", title?: string) => {
        setAlertModal({
            isOpen: true,
            title: title || (type === "error" ? "Kesalahan" : type === "success" ? "Berhasil" : "Informasi"),
            message,
            type,
        });
    };

    const showConfirm = (message: string, onConfirm: () => void, title: string = "Konfirmasi Hapus") => {
        setAlertModal({
            isOpen: true,
            title,
            message,
            type: "confirm",
            onConfirm
        });
    };

    // Custom theme presets list
    const [customPresets, setCustomPresets] = useState<{
        id: string;
        name: string;
        accent: string;
        bgStart: string;
        bgEnd: string;
        font: string;
        textColor: string;
        buttonColor?: string;
        buttonTextColor?: string;
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
        kioskLogoUrl: null as string | null,
        kioskTextColor: null as string | null,
        kioskButtonColor: null as string | null,
        kioskButtonTextColor: null as string | null,
        kioskBgImageUrl: null as string | null,
        kioskBgImageOpacity: 1.0 as number,
        kioskShowBgDots: true as boolean,
        kioskShowBrandName: true as boolean,
        kioskShowBrandSubtitle: false as boolean,
        kioskBrandSubtitle: null as string | null,
        kioskShowLogo: true as boolean,
        kioskShowWelcomeMessage: true as boolean,
        kioskShowPaymentHint: true as boolean,
        enabledFilters: ALL_ARTISTIC_FILTERS.map((f) => f.id) as string[],
    });

    const SCREENS = getKioskPreviewScreens(settings.isPaymentEnabled);

    const handlePrevScreen = () => {
        const currentIndex = SCREENS.indexOf(previewScreen);
        const prevIndex = (currentIndex - 1 + SCREENS.length) % SCREENS.length;
        setPreviewScreen(SCREENS[prevIndex]);
    };

    const handleNextScreen = () => {
        const currentIndex = SCREENS.indexOf(previewScreen);
        const nextIndex = (currentIndex + 1) % SCREENS.length;
        setPreviewScreen(SCREENS[nextIndex]);
    };

    useEffect(() => {
        if (!settings.isPaymentEnabled && previewScreen === "payment") {
            setPreviewScreen("launcher");
        }
    }, [settings.isPaymentEnabled, previewScreen]);

    const handleColorChange = (field: string, value: any) => {
        setSettings(prev => {
            const next = { ...prev, [field]: value };
            if (prev.kioskThemePreset && prev.kioskThemePreset.startsWith("custom_")) {
                setCustomPresets(prevCustom => {
                    const updated = prevCustom.map(p => {
                        if (p.id === prev.kioskThemePreset) {
                            let mappedField = "";
                            if (field === "kioskAccentColor") mappedField = "accent";
                            else if (field === "kioskBgGradientStart") mappedField = "bgStart";
                            else if (field === "kioskBgGradientEnd") mappedField = "bgEnd";
                            else if (field === "kioskTextColor") mappedField = "textColor";
                            else if (field === "kioskButtonColor") mappedField = "buttonColor";
                            else if (field === "kioskButtonTextColor") mappedField = "buttonTextColor";
                            else if (field === "kioskFontFamily") mappedField = "font";
                            
                            if (mappedField) {
                                return { ...p, [mappedField]: value };
                            }
                        }
                        return p;
                    });
                    localStorage.setItem("kiosk_custom_presets", JSON.stringify(updated));
                    return updated;
                });
            }
            return next;
        });
    };

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
            let accountNameData = "";
            if (userRes.ok) {
                const usersList = await userRes.json();
                const matched = usersList.find((u: any) => u.id === userId);
                if (matched) {
                    accountNameData = matched.name || matched.email;
                    setAccountName(accountNameData);
                    
                    // Fetch client themes
                    try {
                        const themesRes = await fetch(`/api/admin/themes?userName=${encodeURIComponent(accountNameData)}`);
                        if (themesRes.ok) {
                            const themesData = await themesRes.json();
                            setThemesList(themesData);
                            if (themesData.length > 0) {
                                setSelectedThemeId(themesData[0].id);
                            }
                        }
                    } catch (themesErr) {
                        console.error("Failed to load client themes:", themesErr);
                    }
                }
            }

            const res = await fetch(`/api/admin/settings?userId=${userId}&t=${Date.now()}`);
            if (!res.ok) throw new Error("Gagal mengambil data pengaturan");
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
                kioskLogoUrl: data.kioskLogoUrl || null,
                kioskTextColor: data.kioskTextColor || null,
                kioskButtonColor: data.kioskButtonColor || null,
                kioskButtonTextColor: data.kioskButtonTextColor || null,
                kioskBgImageUrl: data.kioskBgImageUrl || null,
                kioskBgImageOpacity: data.kioskBgImageOpacity ?? 1.0,
                kioskShowBgDots: data.kioskShowBgDots ?? true,
                kioskShowBrandName: data.kioskShowBrandName ?? true,
                kioskShowBrandSubtitle: data.kioskShowBrandSubtitle ?? false,
                kioskBrandSubtitle: data.kioskBrandSubtitle || null,
                kioskShowLogo: data.kioskShowLogo ?? true,
                kioskShowWelcomeMessage: data.kioskShowWelcomeMessage ?? true,
                kioskShowPaymentHint: data.kioskShowPaymentHint ?? true,
                enabledFilters: Array.isArray(data.enabledFilters)
                    ? data.enabledFilters
                    : ALL_ARTISTIC_FILTERS.map((f) => f.id),
            });
            setIsGradient(data.kioskBgGradientStart && data.kioskBgGradientEnd ? data.kioskBgGradientStart !== data.kioskBgGradientEnd : true);
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

        setSettings(prev => ({
            ...prev,
            kioskThemePreset: presetId,
            kioskAccentColor: preset.accent,
            kioskBgGradientStart: preset.bgStart,
            kioskBgGradientEnd: preset.bgEnd,
            kioskFontFamily: preset.font,
            kioskTextColor: preset.textColor,
            kioskButtonColor: preset.buttonColor,
            kioskButtonTextColor: preset.buttonTextColor
        }));
        setIsGradient(preset.bgStart !== preset.bgEnd);
    };

    const handleSaveCustomPreset = () => {
        setNewPresetName("");
        setShowPresetModal(true);
    };

    const handleConfirmSavePreset = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        const themeName = newPresetName.trim();
        if (!themeName) {
            showAlert("Harap masukkan nama tema!", "error");
            return;
        }

        const newPreset = {
            id: `custom_${Date.now()}`,
            name: themeName,
            accent: "#A68B67",
            bgStart: "#0C0A09",
            bgEnd: "#0C0A09",
            font: "Geist",
            textColor: "#FFFFFF",
            buttonColor: "#A68B67",
            buttonTextColor: "#FFFFFF"
        };

        const updated = [...customPresets, newPreset];
        setCustomPresets(updated);
        localStorage.setItem("kiosk_custom_presets", JSON.stringify(updated));

        // Auto apply and select the newly created theme immediately
        setSettings(prev => ({
            ...prev,
            kioskThemePreset: newPreset.id,
            kioskAccentColor: newPreset.accent,
            kioskBgGradientStart: newPreset.bgStart,
            kioskBgGradientEnd: newPreset.bgEnd,
            kioskFontFamily: newPreset.font,
            kioskTextColor: newPreset.textColor,
            kioskButtonColor: newPreset.buttonColor,
            kioskButtonTextColor: newPreset.buttonTextColor
        }));
        setIsGradient(newPreset.bgStart !== newPreset.bgEnd);

        setShowPresetModal(false);
        setNewPresetName("");
    };

    const handleDeleteCustomPreset = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        showConfirm("Apakah Anda yakin ingin menghapus tema kustom ini?", () => {
            const updated = customPresets.filter(p => p.id !== id);
            setCustomPresets(updated);
            localStorage.setItem("kiosk_custom_presets", JSON.stringify(updated));
            showAlert("Tema kustom berhasil dihapus.", "success");
        });
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
            kioskLogoUrl: null,
            kioskTextColor: null,
            kioskButtonColor: null,
            kioskButtonTextColor: null,
            kioskBgImageUrl: null,
            kioskBgImageOpacity: 1.0,
            kioskShowBgDots: true,
            kioskShowBrandName: true,
            kioskShowBrandSubtitle: false,
            kioskBrandSubtitle: null,
            kioskShowLogo: true,
            kioskShowWelcomeMessage: true,
            kioskShowPaymentHint: true,
        }));
        setIsGradient(true);
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== "image/png") {
            showAlert("Harap unggah file logo dalam format PNG saja!", "error");
            return;
        }

        setUploadingLogo(true);
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        try {
            const res = await fetch(`/api/admin/upload?userId=${userId || ''}`, {
                method: 'POST',
                body: formDataUpload,
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(prev => ({ ...prev, kioskLogoUrl: data.url }));
                showAlert("Logo berhasil diunggah!", "success");
            } else {
                let errMsg = 'Gagal mengunggah logo. Silakan coba lagi.';
                const rawText = await res.text();
                try {
                    const errData = JSON.parse(rawText);
                    errMsg = errData.error || errMsg;
                } catch (_) {
                    if (rawText.includes("Payload Too Large") || res.status === 413) {
                        errMsg = "Ukuran file logo terlalu besar! Batas maksimal upload di server Vercel adalah 4.5 MB.";
                    } else {
                        errMsg = `Error ${res.status}: Terjadi masalah pada server. Detail: ${rawText.substring(0, 150)}`;
                    }
                }
                showAlert(errMsg, "error");
            }
        } catch (error: any) {
            console.error('Failed to upload logo:', error);
            showAlert('Terjadi kesalahan saat mengunggah logo: ' + (error.message || error), 'error');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleDeleteLogo = () => {
        showConfirm("Apakah Anda yakin ingin menghapus logo kustom ini?", () => {
            setSettings(prev => ({ ...prev, kioskLogoUrl: null }));
            showAlert("Logo kustom berhasil dihapus.", "success");
        });
    };

    const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showAlert("Harap unggah file gambar saja!", "error");
            return;
        }

        setUploadingBg(true);
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        try {
            const res = await fetch(`/api/admin/upload?userId=${userId || ''}`, {
                method: 'POST',
                body: formDataUpload,
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(prev => ({ ...prev, kioskBgImageUrl: data.url, kioskShowBgDots: false }));
                showAlert("Background berhasil diunggah!", "success");
            } else {
                let errMsg = 'Gagal mengunggah background. Silakan coba lagi.';
                const rawText = await res.text();
                try {
                    const errData = JSON.parse(rawText);
                    errMsg = errData.error || errMsg;
                } catch (_) {
                    if (rawText.includes("Payload Too Large") || res.status === 413) {
                        errMsg = "Ukuran file background terlalu besar! Batas maksimal upload di server Vercel adalah 4.5 MB.";
                    } else {
                        errMsg = `Error ${res.status}: Terjadi masalah pada server. Detail: ${rawText.substring(0, 150)}`;
                    }
                }
                showAlert(errMsg, "error");
            }
        } catch (error: any) {
            console.error('Failed to upload background:', error);
            showAlert('Terjadi kesalahan saat mengunggah background: ' + (error.message || error), 'error');
        } finally {
            setUploadingBg(false);
        }
    };

    const handleDeleteBg = () => {
        showConfirm("Apakah Anda yakin ingin menghapus gambar background kustom ini?", () => {
            setSettings(prev => ({ ...prev, kioskBgImageUrl: null }));
            showAlert("Background kustom berhasil dihapus.", "success");
        });
    };

    // Helper preview styling mappings for mock
    const getAccentColor = () => {
        if (settings.kioskAccentColor) return settings.kioskAccentColor;
        const matched = PRESETS.find(p => p.id === settings.kioskThemePreset);
        return matched ? matched.accent : "#C96F53";
    };
    const getBgStyle = () => {
        if (settings.kioskBgGradientStart && settings.kioskBgGradientEnd) {
            return `linear-gradient(135deg, ${settings.kioskBgGradientStart}, ${settings.kioskBgGradientEnd})`;
        }
        const matched = PRESETS.find(p => p.id === settings.kioskThemePreset);
        if (matched) return `linear-gradient(135deg, ${matched.bgStart}, ${matched.bgEnd})`;
        return "#FAF6F0";
    };
    const getFontFamily = () => {
        if (settings.kioskFontFamily) return settings.kioskFontFamily;
        const matched = PRESETS.find(p => p.id === settings.kioskThemePreset);
        if (matched && matched.font) return matched.font;
        return "Geist";
    };

    const getCardStyle = (isActive: boolean) => {
        const theme = settings.kioskThemePreset;
        const accent = getAccentColor();
        const cardBg = settings.kioskBgGradientStart || "#FAF6F0";
        const textHex = settings.kioskTextColor || "#4A3F35";
        const btnBg = settings.kioskButtonColor || accent;
        const btnText = settings.kioskButtonTextColor || "#FFFFFF";

        if (theme === "pop_art") {
            return {
                className: `p-4 flex flex-col items-center gap-3 transition-all duration-300 border-[3px] rounded-xl ${isActive ? 'scale-105 z-10' : 'opacity-60 hover:opacity-100'}`,
                fontClass: "font-black",
                style: {
                    backgroundColor: isActive ? cardBg : `${cardBg}88`,
                    borderColor: textHex,
                    color: isActive ? accent : textHex,
                    boxShadow: isActive ? `4px 4px 0px 0px ${accent}` : undefined,
                }
            };
        }
        if (theme === "pixel") {
            return {
                className: `p-4 flex flex-col items-center gap-3 transition-all duration-300 border-[2px] rounded-none ${isActive ? 'scale-105 z-10' : 'opacity-80 hover:opacity-100'}`,
                fontClass: "font-mono font-bold",
                style: {
                    backgroundColor: isActive ? cardBg : `${cardBg}88`,
                    borderColor: accent,
                    color: textHex,
                    boxShadow: isActive ? `4px 4px 0px 0px ${accent}` : undefined,
                }
            };
        }
        if (theme === "post_card") {
            return {
                className: `p-4 flex flex-col items-center gap-3 transition-all duration-300 border-[3px] rounded-none ${isActive ? 'bg-[#FDFBF7] border-solid border-[#8B5A2B] shadow-lg scale-105 z-10' : 'bg-[#FDFBF7]/50 border-dashed border-[#8B5A2B]/60 opacity-60 hover:opacity-100'}`,
                fontClass: "font-sans font-bold tracking-widest",
                style: { color: '#8B5A2B' }
            };
        }
        if (theme === "established") {
            return {
                className: `p-4 flex flex-col items-center gap-3 transition-all duration-300 rounded-none ${isActive ? 'bg-[#3E2723] text-[#D4AF37] border-2 border-[#D4AF37] outline outline-1 outline-offset-2 outline-[#3E2723] scale-105 z-10' : 'bg-[#3E2723]/40 text-[#D4AF37]/50 border-2 border-[#D4AF37]/40 opacity-60 hover:opacity-100'}`,
                fontClass: "font-sans font-bold tracking-widest",
                style: {}
            };
        }
        if (theme === "global") {
            return {
                className: `p-4 flex flex-col items-center gap-3 transition-all duration-300 border-[3px] border-white rounded-[2rem] ${isActive ? 'scale-105 z-10' : 'opacity-60 hover:opacity-100'}`,
                fontClass: "font-black italic tracking-widest",
                style: {
                    backgroundColor: isActive ? btnBg : `${btnBg}4d`,
                    color: btnText,
                    boxShadow: isActive ? '4px 4px 0px 0px rgba(0,0,0,1)' : undefined,
                }
            };
        }
        // Default
        return {
            className: `p-4 flex flex-col items-center gap-3 transition-all duration-300 rounded-2xl ${isActive ? 'shadow-lg border-2 scale-105 z-10' : 'border border-dashed opacity-60 hover:opacity-100'}`,
            fontClass: "font-black tracking-wider uppercase",
            style: isActive ? { borderColor: accent, color: accent, backgroundColor: 'rgba(255,255,255,0.9)' } : { borderColor: 'rgba(255,255,255,0.3)' }
        };
    };

    if (loading) return <AdminPageSkeleton variant="grid" />;

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
                        <h1 className="text-sm font-sans italic text-[#FDFBF7] tracking-wide mt-0.5">
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

            {/* Tab Wizard Navigation bar */}
            <div className="bg-[#FAF8F5] border-b border-[#EAE1D3] px-8 py-3 flex items-center justify-between shrink-0 shadow-sm z-20">
                <div className="flex gap-4">
                    <button
                        onClick={() => setCurrentStep("theme")}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${
                            currentStep === "theme"
                                ? "bg-[#1C1917] border-[#1C1917] text-white shadow-md shadow-[#1C1917]/10"
                                : "bg-white border-[#EAE1D3] text-[#4A3F35] hover:border-[#8C7E6A]"
                        }`}
                    >
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-xs font-bold mr-0.5">1</span>
                        Pilihan Tema
                    </button>
                    <button
                        onClick={() => setCurrentStep("customize")}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border ${
                            currentStep === "customize"
                                ? "bg-[#1C1917] border-[#1C1917] text-white shadow-md shadow-[#1C1917]/10"
                                : "bg-white border-[#EAE1D3] text-[#4A3F35] hover:border-[#8C7E6A]"
                        }`}
                    >
                        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white/20 text-xs font-bold mr-0.5">2</span>
                        Kustomisasi & Preview
                    </button>
                </div>
                
                {/* Navigation CTA button */}
                <div className="flex items-center gap-2">
                    {currentStep === "theme" && (
                        <button
                            onClick={() => setCurrentStep("customize")}
                            className="bg-[#A68B67] hover:bg-[#8C7E6A] text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                        >
                            Lanjut: Kustomisasi & Preview
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    )}
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

            {/* Main Content Workspace Stack */}
            <div className="flex-1 flex flex-col lg:overflow-hidden overflow-y-auto bg-[#FAF8F5]">
                {currentStep === "theme" && (
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden animate-fadeIn">
                        {/* LEFT COLUMN: Main Theme presets grid (occupies remaining space) */}
                        <div className="flex-1 p-8 overflow-y-auto scrollbar-hide space-y-6">
                            {/* Header Section styled after Image 2 */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EAE1D3] pb-6">
                                <div className="space-y-1">
                                    <h1 className="text-2xl font-sans italic text-[#4A3F35] tracking-wide">Pilih Template</h1>
                                    <p className="text-[11px] text-[#8C7E6A] font-medium leading-relaxed max-w-xl">
                                        Temukan layout visual terkurasi profesional yang disesuaikan untuk kebutuhan event Anda. Setiap tema kustomisasi dapat dikonfigurasi lebih lanjut.
                                    </p>
                                </div>
                                <button
                                    onClick={handleSaveCustomPreset}
                                    className="bg-[#FAF8F5] hover:bg-[#FAF8F5]/80 text-[#4A3F35] border border-[#EAE1D3] px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm shrink-0 self-start md:self-center"
                                >
                                    <Palette className="w-4 h-4 text-[#A68B67]" />
                                    + Create Custom
                                </button>
                            </div>

                            {/* Filters Bar styled after Image 2 */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex flex-wrap gap-2">
                                    {["Semua", "Bohemian", "Elegant", "Minimal", "Creative", "Modern", "Kustom"].map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setActiveCategory(cat)}
                                            className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${
                                                activeCategory === cat
                                                    ? "bg-[#1C1917] border-[#1C1917] text-white shadow-sm shadow-[#1C1917]/10"
                                                    : "bg-[#FAF8F5] border-[#EAE1D3] text-[#8C7E6A] hover:text-[#4A3F35] hover:border-[#8C7E6A]"
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                                
                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                    <span className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider">Urutkan:</span>
                                    <select
                                        className="px-3 py-2 bg-white border border-[#EAE1D3] rounded-xl text-[10px] font-black uppercase tracking-wider text-[#4A3F35] focus:outline-none"
                                        defaultValue="recommended"
                                    >
                                        <option value="recommended">Rekomendasi</option>
                                        <option value="newest">Terbaru</option>
                                    </select>
                                </div>
                            </div>

                            {(() => {
                                const filteredPresets = PRESETS.filter(p => activeCategory === "Semua" || p.category === activeCategory);
                                const showCustomPresets = activeCategory === "Semua" || activeCategory === "Kustom";

                                return (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {filteredPresets.map((preset, index) => {
                                            const isActive = settings.kioskThemePreset === preset.id;
                                            // Kartu katalog selalu tampilkan palet default preset (bukan warna tersimpan di DB)
                                            const displayBgStart = preset.bgStart;
                                            const displayBgEnd = preset.bgEnd;
                                            const displayAccent = preset.accent;
                                            const displayButtonColor = preset.buttonColor || preset.accent;
                                            const displayButtonTextColor = preset.buttonTextColor || "#FFFFFF";
                                            const displayTextColor = preset.textColor || "#FFFFFF";
                                            const displayFont = preset.font || "Geist";

                                            return (
                                                <div
                                                    key={preset.id}
                                                    className={`transition-all duration-300 rounded-[2rem] border p-5 flex flex-col gap-4 bg-white relative overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_20px_50px_rgba(74,63,53,0.06)] hover:-translate-y-1 ${
                                                        isActive
                                                            ? "border-[#A68B67] ring-4 ring-[#A68B67]/10"
                                                            : "border-[#EAE1D3] hover:border-[#8C7E6A]"
                                                    }`}
                                                >
                                                    {/* Large Mockup style container */}
                                                    <div 
                                                        className="w-full aspect-[16/10] rounded-[1.5rem] border border-black/5 flex flex-col justify-between p-4 relative overflow-hidden shadow-inner select-none pointer-events-none"
                                                        style={{ background: `linear-gradient(135deg, ${displayBgStart}, ${displayBgEnd})` }}
                                                    >
                                                        <div 
                                                            className="absolute inset-0 opacity-[0.06] pointer-events-none [background-size:16px_16px]" 
                                                            style={{ 
                                                                backgroundImage: `radial-gradient(${displayTextColor === "#FFFFFF" ? '#ffffff' : displayAccent} 1.2px, transparent 1.2px)` 
                                                            }} 
                                                        />
                                                        
                                                        {/* Mock title */}
                                                        <div className="text-[9px] uppercase tracking-widest font-black leading-none" style={{ color: displayAccent, fontFamily: displayFont }}>
                                                            {preset.name}
                                                        </div>
                                                        
                                                        {/* Mock Button */}
                                                        <div className="flex justify-center items-center w-full">
                                                            <RenderThemeButton
                                                                themeId={preset.id}
                                                                isSmall={true}
                                                                style={{
                                                                    backgroundColor: displayButtonColor,
                                                                    color: displayButtonTextColor,
                                                                    borderColor: displayAccent,
                                                                }}
                                                            />
                                                        </div>
                                                        
                                                        <div className="w-full flex justify-between items-center text-[7px] opacity-50 font-bold uppercase tracking-wider" style={{ color: displayTextColor }}>
                                                            <span>Studio Kiosk</span>
                                                            <span>● Online & Ready</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Info labels and Use Template button */}
                                                    <div className="flex-1 flex flex-col justify-between space-y-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-black uppercase text-[#4A3F35] truncate w-[75%]">
                                                                    Theme {index + 1}: {preset.name}
                                                                </span>
                                                                {isActive && (
                                                                    <span className="text-[8px] font-black uppercase bg-[#A68B67] text-white px-2 py-0.5 rounded-md shrink-0">Aktif</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[9px] text-[#8C7E6A] font-medium leading-relaxed uppercase tracking-wider">{preset.recommendation}</p>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleApplyPreset(preset.id)}
                                                            className={`w-full py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                                                                isActive
                                                                    ? "bg-[#1C1917] text-white cursor-default"
                                                                    : "bg-[#A68B67] hover:bg-[#8C7E6A] text-white"
                                                            }`}
                                                        >
                                                            {isActive ? (
                                                                <>
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FAF8F5]" />
                                                                    <span>Tema Aktif</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sparkles className="w-3.5 h-3.5" />
                                                                    <span>Gunakan Tema</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Custom presets list */}
                                        {showCustomPresets && customPresets.map((preset) => {
                                            const isActive = settings.kioskThemePreset === preset.id;
                                            const displayBgStart = isActive ? (settings.kioskBgGradientStart || preset.bgStart) : preset.bgStart;
                                            const displayBgEnd = isActive ? (settings.kioskBgGradientEnd || preset.bgEnd) : preset.bgEnd;
                                            const displayAccent = isActive ? (settings.kioskAccentColor || preset.accent) : preset.accent;
                                            const displayButtonColor = isActive ? (settings.kioskButtonColor || preset.buttonColor || preset.accent) : (preset.buttonColor || preset.accent);
                                            const displayButtonTextColor = isActive ? (settings.kioskButtonTextColor || preset.buttonTextColor || "#FFFFFF") : (preset.buttonTextColor || "#FFFFFF");
                                            const displayTextColor = isActive ? (settings.kioskTextColor || preset.textColor || "#FFFFFF") : (preset.textColor || "#FFFFFF");
                                            const displayFont = isActive ? (settings.kioskFontFamily || preset.font || "Geist") : (preset.font || "Geist");

                                            return (
                                                <div
                                                    key={preset.id}
                                                    className={`transition-all duration-300 rounded-[2rem] border p-5 flex flex-col gap-4 bg-white relative overflow-hidden group shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_20px_50px_rgba(74,63,53,0.06)] hover:-translate-y-1 ${
                                                        isActive
                                                            ? "border-[#A68B67] ring-4 ring-[#A68B67]/10"
                                                            : "border-[#EAE1D3] hover:border-[#8C7E6A]"
                                                    }`}
                                                >
                                                    {/* Delete custom theme */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
                                                        className="absolute top-3 right-3 p-1.5 bg-white border border-[#EAE1D3] hover:bg-red-50 text-red-500 rounded-xl shadow-md opacity-0 group-hover:opacity-100 transition-all z-20"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>

                                                    <div 
                                                        className="w-full aspect-[16/10] rounded-[1.5rem] border border-black/5 flex flex-col justify-between p-4 relative overflow-hidden shadow-inner select-none pointer-events-none"
                                                        style={{ background: `linear-gradient(135deg, ${displayBgStart}, ${displayBgEnd})` }}
                                                    >
                                                        <div className="text-[9px] uppercase tracking-widest font-black leading-none" style={{ color: displayAccent, fontFamily: displayFont }}>
                                                            {preset.name}
                                                        </div>
                                                        <div className="flex justify-center items-center w-full">
                                                            <div className="px-5 py-2.5 rounded-xl text-[7px] font-black uppercase tracking-widest text-center shadow-lg" style={{ backgroundColor: displayButtonColor, color: displayButtonTextColor }}>
                                                                Start Photo
                                                            </div>
                                                        </div>
                                                        <div className="w-full flex justify-between items-center text-[7px] opacity-50 font-bold uppercase tracking-wider" style={{ color: displayTextColor }}>
                                                            <span>Kustom Klien</span>
                                                            <span>● Online & Ready</span>
                                                        </div>
                                                    </div>

                                                    {/* Info labels and Use Template button */}
                                                    <div className="flex-1 flex flex-col justify-between space-y-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-black uppercase text-[#4A3F35] truncate w-[70%]">
                                                                    Tema Kustom: {preset.name}
                                                                </span>
                                                                {isActive && (
                                                                    <span className="text-[8px] font-black uppercase bg-[#A68B67] text-white px-2 py-0.5 rounded-md shrink-0">Aktif</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[9px] text-[#8C7E6A] font-medium leading-relaxed uppercase tracking-wider">Kustom Klien</p>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSettings(prev => ({
                                                                    ...prev,
                                                                    kioskThemePreset: preset.id,
                                                                    kioskAccentColor: preset.accent,
                                                                    kioskBgGradientStart: preset.bgStart,
                                                                    kioskBgGradientEnd: preset.bgEnd,
                                                                    kioskFontFamily: preset.font,
                                                                    kioskTextColor: preset.textColor || "#FFFFFF",
                                                                    kioskButtonColor: preset.buttonColor || "#A68B67",
                                                                    kioskButtonTextColor: preset.buttonTextColor || "#FFFFFF"
                                                                }));
                                                                setIsGradient(preset.bgStart !== preset.bgEnd);
                                                            }}
                                                            className={`w-full py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                                                                isActive
                                                                    ? "bg-[#1C1917] text-white cursor-default"
                                                                    : "bg-[#A68B67] hover:bg-[#8C7E6A] text-white"
                                                            }`}
                                                        >
                                                            {isActive ? (
                                                                <>
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FAF8F5]" />
                                                                    <span>Tema Aktif</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sparkles className="w-3.5 h-3.5" />
                                                                    <span>Gunakan Tema</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* RIGHT SIDEBAR PANEL */}
                        <div className="w-full lg:w-80 bg-white border-l border-[#EAE1D3] p-8 flex flex-col justify-between shrink-0 shadow-xl overflow-y-auto">
                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <span className="text-[8px] text-[#A68B67] font-black uppercase tracking-[0.25em] block">Mitra/Klien Aktif</span>
                                    <h3 className="text-xl font-sans italic text-[#4A3F35] leading-tight border-b border-[#EAE1D3] pb-3">{accountName || "Workspace Kiosk"}</h3>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#4A3F35]">Pilihan Template</h4>
                                    <p className="text-[11px] text-[#8C7E6A] font-medium leading-relaxed">
                                        Pilih preset layout visual yang telah dikurasi secara profesional untuk mencocokkan suasana event atau brand klien Anda.
                                    </p>
                                </div>

                                <div className="bg-[#FAF8F5] border border-[#EAE1D3] p-5 rounded-3xl space-y-3">
                                    <span className="text-[8px] text-[#A68B67] font-black uppercase tracking-widest block">Rekomendasi Kami</span>
                                    <p className="text-[10px] text-[#4A3F35] font-bold leading-normal">
                                        Gunakan tema <strong className="text-[#C96F53]">Bohemian Terracotta</strong> untuk pernikahan outdoor, atau <strong className="text-[#D4AF37]">Luxury Champagne</strong> untuk gala makan malam/pesta formal.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-[#FAF8F5] space-y-4">
                                <button
                                    onClick={() => setCurrentStep("customize")}
                                    className="w-full bg-[#1C1917] hover:bg-[#4A3F35] text-white py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10"
                                >
                                    <span>Lanjut ke Kustomisasi</span>
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                {currentStep === "customize" && (
                    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden animate-fadeIn">
                        {/* LEFT COLUMN: Split screen cockpit + simulator layout */}
                        <div className="flex-1 flex flex-col-reverse lg:overflow-hidden overflow-y-auto bg-[#FAF8F5]">
                            
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
                                        settings.kioskThemePreset === "retro" ||
                                        settings.kioskThemePreset === "pixel";
                        
                        const textColor = isLight ? "text-[#4A3F35]" : "text-white";
                        const subtextColor = isLight ? "text-[#8C7E6A]" : "text-white/60";
                        const borderColor = isLight ? "border-[#EAE1D3]" : "border-white/10";
                        const cardBgColor = isLight ? "bg-white/80 border-[#EAE1D3]" : "bg-white/5 border-white/10";
                                        const buttonTextColor = isLight && getAccentColor() === "#A68B67" ? "text-white" : "text-white";
                        const mockButtonBg = settings.kioskButtonColor || getAccentColor();
                        const mockButtonText = settings.kioskButtonTextColor || "#FFFFFF";

                        return (
                            <div className="flex-1 flex items-center justify-center overflow-hidden w-full relative z-10 py-10 px-12">
                                <div className="aspect-[16/10] h-full max-h-full max-w-full w-auto relative shadow-2xl">
                                    {/* Tablet Outer Bezel Shell */}
                                    <div className="absolute inset-0 -m-4 rounded-[36px] border-[12px] border-stone-800 bg-stone-900 pointer-events-none shadow-2xl z-0" />
                                    
                                    {/* Floating Chevron Navigation Buttons */}
                                    <button
                                        type="button"
                                        onClick={handlePrevScreen}
                                        className="absolute top-1/2 -left-12 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-[#EAE1D3] shadow-lg hover:bg-[#FAF8F5] transition-all flex items-center justify-center text-[#4A3F35] hover:text-[#A68B67] cursor-pointer z-50 hover:scale-105 active:scale-95 animate-fadeIn"
                                        title="Sebelumnya"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleNextScreen}
                                        className="absolute top-1/2 -right-12 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-[#EAE1D3] shadow-lg hover:bg-[#FAF8F5] transition-all flex items-center justify-center text-[#4A3F35] hover:text-[#A68B67] cursor-pointer z-50 hover:scale-105 active:scale-95 animate-fadeIn"
                                        title="Selanjutnya"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>

                                    {/* Screen Inner Frame Container */}
                                    <div id="mock-screen-container" className={`absolute inset-0 rounded-2xl overflow-hidden flex flex-col justify-between p-6 ${textColor} select-none transition-all duration-300 z-10`}
                                         style={{ 
                                             background: getBgStyle(),
                                             fontFamily: getFontFamily(),
                                             ...(settings.kioskTextColor ? { color: settings.kioskTextColor } : {})
                                         }}
                                    >
                                    {/* Live Text Color Preview Overrides */}
                                    {settings.kioskTextColor && (
                                        <style dangerouslySetInnerHTML={{
                                            __html: `
                                                #mock-screen-container .text-white:not(button), #mock-screen-container .text-\\[\\#4A3F35\\]:not(button) {
                                                    color: ${settings.kioskTextColor} !important;
                                                }
                                                #mock-screen-container .text-white\\/60:not(button), #mock-screen-container .text-\\[\\#8C7E6A\\]:not(button) {
                                                    color: ${settings.kioskTextColor}b3 !important;
                                                }
                                            `
                                        }} />
                                    )}

                                    {/* Sketch 3 Floating Info Overlays inside preview screen */}
                                    <div className="absolute top-3 left-4 flex gap-2 z-30 opacity-70 hover:opacity-100 transition-opacity">
                                        <span className="text-[7px] font-black uppercase tracking-widest bg-black/40 backdrop-blur-md text-white py-1 px-2.5 rounded-md border border-white/10">
                                            Halaman: {previewScreen.toUpperCase()}
                                        </span>
                                        <span className="text-[7px] font-black uppercase tracking-widest bg-black/40 backdrop-blur-md text-[#A68B67] py-1 px-2.5 rounded-md border border-white/10">
                                            Tema: {PRESETS.find(p => p.id === settings.kioskThemePreset)?.name || "Kustom"}
                                        </span>
                                    </div>

                                    {/* Immersive Grid Dots Pattern Background */}
                                    {/* Welcome Screen Custom Background Image */}
                                    {previewScreen === "launcher" && settings.kioskBgImageUrl && (
                                        <div 
                                            className="absolute inset-0 pointer-events-none transition-all duration-500 z-0"
                                            style={{
                                                backgroundImage: `url(${settings.kioskBgImageUrl})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                opacity: settings.kioskBgImageOpacity ?? 1.0,
                                            }}
                                        />
                                    )}

                                    {(settings.kioskShowBgDots ?? true) && (
                                        <div 
                                            className="absolute inset-0 opacity-[0.08] pointer-events-none [background-size:24px_24px] z-0" 
                                            style={{ 
                                                backgroundImage: `radial-gradient(${isLight ? '#4A3F35' : '#ffffff'} 1.5px, transparent 1.5px)` 
                                            }} 
                                        />
                                    )}

                                    {/* 1. MOCK SCREEN: LAUNCHER (WELCOME PAGE) */}
                                    {previewScreen === "launcher" && (
                                        <div className="h-full flex flex-col justify-between items-center text-center py-12 animate-fadeIn relative z-10">
                                            {/* Status Info (Wifi/Settings mock) */}
                                            <div className="absolute top-0 right-0 flex items-center gap-3 opacity-90">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                <span className="text-[7px] font-bold tracking-widest uppercase">Kiosk Online</span>
                                            </div>

                                            {/* Brand Header */}
                                            <div className="space-y-2 mt-4">
                                                {settings.kioskShowBrandName && (
                                                    <h1 className="text-2xl tracking-widest font-black uppercase" style={{ color: getAccentColor() }}>
                                                        {settings.kioskBrandName || "DOVELENS PHOTOBOOTH"}
                                                    </h1>
                                                )}
                                                {settings.kioskShowBrandSubtitle && (
                                                    <p className={`text-[8px] tracking-[0.4em] uppercase font-bold ${subtextColor}`}>
                                                        {settings.kioskBrandSubtitle || "PART OF DOVELENS.FT"}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Central Visual Callout */}
                                            {settings.kioskShowLogo ? (
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
                                                <div className="h-20 my-auto" />
                                            )}

                                            {/* Bottom Welcome & Play Button */}
                                            <div className="space-y-6 w-full max-w-sm">
                                                {settings.kioskShowWelcomeMessage && (
                                                    <p className="text-[10px] font-black tracking-widest uppercase opacity-90 animate-pulse">
                                                        {settings.kioskWelcomeMessage || "Sentuh Layar untuk Mulai!"}
                                                    </p>
                                                )}
                                                {settings.isPaymentEnabled && settings.kioskShowPaymentHint && (
                                                    <p className={`text-[7px] tracking-wider uppercase ${subtextColor}`}>
                                                        Pembayaran dilakukan setelah memilih filter
                                                    </p>
                                                )}
                                                <RenderThemeButton style={{ backgroundColor: mockButtonBg, color: mockButtonText }} themeId={settings.kioskThemePreset} text="Mulai Sesi Memotret" />
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
                                            {(() => {
                                                const activeStyle = getCardStyle(true);
                                                return (
                                                    <div className={`relative ${activeStyle.className}`} style={activeStyle.style}>
                                                        <div className="absolute top-2.5 right-2.5">
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </div>
                                                        <div className={`w-12 h-20 bg-black/40 border ${borderColor} rounded flex flex-col gap-1.5 p-1 shrink-0`}>
                                                            <div className="bg-white/20 flex-1 rounded-sm" />
                                                            <div className="bg-white/20 flex-1 rounded-sm" />
                                                            <div className="bg-white/20 flex-1 rounded-sm" />
                                                        </div>
                                                        <span className={`text-[7px] ${activeStyle.fontClass}`}>DOUBLE STRIP</span>
                                                    </div>
                                                );
                                            })()}
                                            
                                            {/* Strip 2 */}
                                            {(() => {
                                                const inactiveStyle = getCardStyle(false);
                                                return (
                                                    <div className={`${inactiveStyle.className}`} style={inactiveStyle.style}>
                                                        <div className={`w-12 h-20 bg-black/40 border ${borderColor} rounded flex flex-col gap-1 p-1 shrink-0`}>
                                                            <div className="grid grid-cols-2 gap-1 flex-1">
                                                                <div className="bg-white/20 rounded-sm" />
                                                                <div className="bg-white/20 rounded-sm" />
                                                                <div className="bg-white/20 rounded-sm" />
                                                                <div className="bg-white/20 rounded-sm" />
                                                            </div>
                                                        </div>
                                                        <span className={`text-[7px] ${inactiveStyle.fontClass}`}>GRID 2X2</span>
                                                    </div>
                                                );
                                            })()}
                                            
                                            {/* Strip 3 */}
                                            {(() => {
                                                const inactiveStyle = getCardStyle(false);
                                                return (
                                                    <div className={`${inactiveStyle.className}`} style={inactiveStyle.style}>
                                                        <div className={`w-12 h-20 bg-black/40 border ${borderColor} rounded flex flex-col gap-1.5 p-1 shrink-0`}>
                                                            <div className="bg-white/20 flex-1 rounded-sm" />
                                                            <div className="bg-white/20 flex-1 rounded-sm" />
                                                        </div>
                                                        <span className={`text-[7px] ${inactiveStyle.fontClass}`}>CLASSIC COLLAGE</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Continue Button */}
                                        <div className={`border-t ${borderColor} pt-4 flex justify-end`}>
                                            <div className="w-40">
                                                <RenderThemeButton style={{ backgroundColor: mockButtonBg, color: mockButtonText }} themeId={settings.kioskThemePreset} text="Lanjutkan / Next" isSmall={true} icon={ChevronRight} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 6. MOCK SCREEN: PAYMENT (QRIS SCREEN) — setelah filter */}
                                {previewScreen === "payment" && (
                                    <div className="h-full flex flex-col justify-between animate-fadeIn relative z-10">
                                        {/* Title and Back Button */}
                                        <div className={`flex items-center justify-between border-b ${borderColor} pb-4`}>
                                            <div>
                                                <h2 className="text-xs font-black tracking-widest uppercase" style={{ color: getAccentColor() }}>Pembayaran Sesi Foto</h2>
                                                <p className={`text-[7px] tracking-wider uppercase mt-0.5 ${subtextColor}`}>Selesaikan pembayaran setelah memilih filter untuk melanjutkan ke hasil & cetak</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[7.5px] font-black bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                                    QRIS Mandiri / BCA
                                                </span>
                                            </div>
                                        </div>

                                        {/* Central Payment Card (styled after premium glassmorphism) */}
                                        <div className="flex-1 flex items-center justify-center py-4 my-auto">
                                            <div className={`flex items-center gap-8 ${cardBgColor} p-6 rounded-[2rem] border ${borderColor} max-w-sm w-full shadow-2xl relative overflow-hidden`}>
                                                <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
                                                
                                                {/* Left side: QR Code */}
                                                <div className="w-24 h-24 bg-white rounded-2xl p-2.5 flex flex-col items-center justify-center shrink-0 shadow-lg border border-black/5 relative">
                                                    <QrCode className="w-full h-full text-stone-900" />
                                                    <div className="absolute -bottom-1.5 bg-[#FAF8F5] border border-[#EAE1D3] text-[#4A3F35] text-[5px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow">
                                                        QRIS
                                                    </div>
                                                </div>

                                                {/* Right side: Price & Status */}
                                                <div className="text-left space-y-3 flex-1 min-w-0">
                                                    <div className="space-y-1">
                                                        <span className={`text-[7px] font-black uppercase tracking-wider block ${subtextColor}`}>Total Biaya Sesi</span>
                                                        <h3 className="text-lg font-sans italic text-[#4A3F35] font-bold leading-none animate-pulse" style={{ color: getAccentColor() }}>
                                                            Rp 50.000
                                                        </h3>
                                                    </div>
                                                    
                                                    <div className="space-y-1">
                                                        <span className={`text-[7px] font-black uppercase tracking-wider block ${subtextColor}`}>Status Transaksi</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                                            <span className="text-[7.5px] font-black uppercase text-amber-500 tracking-wider">Menunggu Pembayaran...</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Action simulator */}
                                        <div className={`border-t ${borderColor} pt-4 flex justify-between items-center`}>
                                            <span className={`text-[7px] font-bold uppercase ${subtextColor}`}>Batal otomatis dalam 3 menit jika tidak dibayar</span>
                                            <div className="w-56">
                                                <RenderThemeButton style={{ backgroundColor: mockButtonBg, color: mockButtonText }} themeId={settings.kioskThemePreset} text="Simulasi Bayar Berhasil" isSmall={true} icon={CheckCircle2} />
                                            </div>
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
                                                const styleData = getCardStyle(isSelected);
                                                return (
                                                    <div key={idx} 
                                                         className={`relative transition-all ${styleData.className}`}
                                                         style={styleData.style}
                                                    >
                                                        {isSelected && (
                                                            <div className="absolute -top-2 -right-2 z-10 bg-white rounded-full">
                                                                <CheckCircle2 className="w-5 h-5" style={{ color: getAccentColor() }} />
                                                            </div>
                                                        )}
                                                        <div className="w-full aspect-[3/4] bg-black/20 rounded-sm flex items-center justify-center text-[7px] text-black/40">
                                                            <span className={styleData.fontClass}>TAKE #{idx}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Submit Button */}
                                        <div className={`border-t ${borderColor} pt-4 flex justify-between items-center`}>
                                            <span className={`text-[8px] font-bold uppercase ${subtextColor}`}>Terpilih: 3 foto</span>
                                            <div className="w-40">
                                                <RenderThemeButton style={{ backgroundColor: mockButtonBg, color: mockButtonText }} themeId={settings.kioskThemePreset} text="Lanjut ke Filter" isSmall={true} icon={ChevronRight} />
                                            </div>
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
                                                {ALL_ARTISTIC_FILTERS
                                                    .filter((f) => settings.enabledFilters.includes(f.id))
                                                    .slice(0, 6)
                                                    .map((f, i) => (
                                                    <div key={f.id}
                                                         className={`px-3 py-2 rounded-xl border text-[7px] font-black uppercase tracking-wider text-center transition-all ${
                                                             i === 1 ? "bg-white/10" : "opacity-50 border-white/5 bg-transparent"
                                                         }`}
                                                         style={{ borderColor: i === 1 ? getAccentColor() : "rgba(255,255,255,0.05)" }}
                                                    >
                                                        {f.name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <div className={`border-t ${borderColor} pt-3 flex justify-end`}>
                                            <div className="w-40">
                                                <RenderThemeButton style={{ backgroundColor: mockButtonBg, color: mockButtonText }} themeId={settings.kioskThemePreset} text={settings.isPaymentEnabled ? "Selesai & Lanjut" : "Lanjutkan Cetak"} isSmall={true} icon={Printer} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 7. MOCK SCREEN: SCAN DOWNLOAD & PRINT */}
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
                                            <RenderThemeButton style={{ backgroundColor: mockButtonBg, color: mockButtonText }} themeId={settings.kioskThemePreset} text="Cetak Foto Sekarang (Print)" isSmall={false} icon={Printer} />
                                            <span className={`text-[7px] font-bold uppercase tracking-widest block ${subtextColor}`}>
                                                Kembali ke layar utama dalam {settings.resultTimer} detik
                                            </span>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                        </div>
                        );
                    })()}

                    {/* BOTTOM PREVIEW SWITCHER NAVIGATION BUTTONS BAR */}
                    <div className="bg-white border border-[#EAE1D3] p-4 rounded-3xl shrink-0 shadow-md">
                        <p className="text-[8px] font-black text-[#A68B67] uppercase tracking-[0.25em] text-center mb-3">Tonton & Inspeksi Alur Halaman Kiosk</p>
                        <div className={`grid grid-cols-3 ${settings.isPaymentEnabled ? 'sm:grid-cols-7' : 'sm:grid-cols-6'} gap-3`}>
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
                            {settings.isPaymentEnabled && (
                                <button
                                    type="button"
                                    onClick={() => setPreviewScreen("payment")}
                                    className={`py-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 hover:scale-102 ${
                                        previewScreen === "payment"
                                            ? "bg-[#1C1917] border-[#1C1917] text-white"
                                            : "bg-[#FAF8F5] border-[#EAE1D3] text-[#4A3F35] hover:border-[#8C7E6A]"
                                    }`}
                                >
                                    <Banknote className="w-3.5 h-3.5" />
                                    <span className="text-[8px] font-black uppercase tracking-wider">6. Pembayaran</span>
                                </button>
                            )}
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
                                <span className="text-[8px] font-black uppercase tracking-wider">
                                    {settings.isPaymentEnabled ? "7. Scan & Cetak" : "6. Scan & Cetak"}
                                </span>
                            </button>
                        </div>
                    </div>

                </div>

            </div>

            {/* RIGHT SIDEBAR PANEL FOR STEP 2 (CUSTOMIZE) */}
            <div className="w-full lg:w-80 bg-white border-l border-[#EAE1D3] p-8 flex flex-col justify-between shrink-0 shadow-xl overflow-y-auto">
                <div className="space-y-6">
                    <span className="text-[8px] text-[#A68B67] font-black uppercase tracking-[0.25em] block">Status Simulator</span>
                    <h3 className="text-lg font-sans italic text-[#4A3F35] leading-tight border-b border-[#EAE1D3] pb-3">Status Kustomisasi</h3>

                    {/* ELEMENT PROPERTIES styled cards like Image 1 */}
                    <div className="space-y-2">
                        <span className="text-[8px] text-[#8C7E6A] font-black uppercase tracking-wider block mb-3">Element Properties</span>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#FAF8F5]/80 border border-[#EAE1D3] rounded-2xl p-3.5 space-y-1 hover:border-[#8C7E6A]/50 transition-all shadow-sm">
                                <span className="text-[8px] text-[#8C7E6A] font-black uppercase tracking-wider block leading-none">Halaman</span>
                                <span className="text-[10px] font-black uppercase text-[#A68B67] tracking-wider block mt-1 truncate">{previewScreen}</span>
                            </div>

                            <div className="bg-[#FAF8F5]/80 border border-[#EAE1D3] rounded-2xl p-3.5 space-y-1 hover:border-[#8C7E6A]/50 transition-all shadow-sm">
                                <span className="text-[8px] text-[#8C7E6A] font-black uppercase tracking-wider block leading-none">Mitra/Klien</span>
                                <span className="text-[10px] font-black uppercase text-[#A68B67] tracking-wider block mt-1 truncate">{accountName || "System"}</span>
                            </div>

                            <div className="bg-[#FAF8F5]/80 border border-[#EAE1D3] rounded-2xl p-3.5 space-y-1 hover:border-[#8C7E6A]/50 transition-all shadow-sm">
                                <span className="text-[8px] text-[#8C7E6A] font-black uppercase tracking-wider block leading-none">DSLR Timer</span>
                                <span className="text-[10px] font-black uppercase text-[#A68B67] tracking-wider block mt-1">{settings.captureTimer}s</span>
                            </div>

                            <div className="bg-[#FAF8F5]/80 border border-[#EAE1D3] rounded-2xl p-3.5 space-y-1 hover:border-[#8C7E6A]/50 transition-all shadow-sm">
                                <span className="text-[8px] text-[#8C7E6A] font-black uppercase tracking-wider block leading-none">Pembayaran</span>
                                <span className={`text-[9px] font-black uppercase tracking-wider block mt-1 ${settings.isPaymentEnabled ? 'text-emerald-600' : 'text-stone-400'}`}>
                                    {settings.isPaymentEnabled ? 'Kasir/QRIS' : 'Gratis'}
                                </span>
                            </div>
                        </div>

                        <div className="bg-[#FAF8F5]/80 border border-[#EAE1D3] rounded-2xl p-4 space-y-1 hover:border-[#8C7E6A]/50 transition-all shadow-sm mt-3">
                            <span className="text-[8px] text-[#8C7E6A] font-black uppercase tracking-wider block leading-none">Tema Terpilih</span>
                            <span className="text-[10px] font-black uppercase text-[#4A3F35] tracking-wider block mt-1.5 truncate">
                                {PRESETS.find(p => p.id === settings.kioskThemePreset)?.name || 
                                 customPresets.find(p => p.id === settings.kioskThemePreset)?.name || 
                                 "Kustom / Manual"}
                            </span>
                        </div>
                    </div>

                    {/* STYLE TOKENS styled badges like Image 1 */}
                    <div className="space-y-3 pt-2">
                        <span className="text-[8px] text-[#8C7E6A] font-black uppercase tracking-wider block">Style Tokens</span>
                        <div className="flex flex-wrap gap-1.5">
                            <span className="px-2.5 py-1 bg-[#FAF8F5] border border-[#EAE1D3] text-[#4A3F35] text-[7.5px] font-black uppercase tracking-wider rounded-lg">
                                {settings.kioskFontFamily || "Geist"}
                            </span>
                            <span className="px-2.5 py-1 bg-[#FAF8F5] border border-[#EAE1D3] text-[#4A3F35] text-[7.5px] font-black uppercase tracking-wider rounded-lg">
                                {isGradient ? "Gradasi BG" : "BG Solid"}
                            </span>
                            {settings.isPhotoFilterEnabled && (
                                <span className="px-2.5 py-1 bg-[#FAF8F5] border border-[#EAE1D3] text-[#4A3F35] text-[7.5px] font-black uppercase tracking-wider rounded-lg">
                                    Filter Foto
                                </span>
                            )}
                            {settings.isGoogleDriveBackupEnabled && (
                                <span className="px-2.5 py-1 bg-[#FAF8F5] border border-[#EAE1D3] text-[#4A3F35] text-[7.5px] font-black uppercase tracking-wider rounded-lg">
                                    Auto-Backup GDrive
                                </span>
                            )}
                        </div>
                    </div>

                                        {/* Kolom 1: Brand & Welcome message */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#4A3F35] border-b border-[#EAE1D3] pb-2 flex items-center gap-1.5">
                            <Tv className="w-3.5 h-3.5 text-[#A68B67]" />
                            Brand & Welcome Message
                        </h3>
                        
                        {/* Brand name toggle */}
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider">Aktifkan Nama Brand</span>
                            <button
                                type="button"
                                onClick={() => setSettings(prev => ({ ...prev, kioskShowBrandName: !prev.kioskShowBrandName }))}
                                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
                                    settings.kioskShowBrandName ? "bg-[#A68B67]" : "bg-[#EAE1D3]"
                                }`}
                            >
                                <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                        settings.kioskShowBrandName ? "translate-x-5" : "translate-x-1"
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Brand Header Name Input */}
                        {settings.kioskShowBrandName && (
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
                        )}

                        {/* Subtitle brand toggle */}
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider">Aktifkan Subtitle Brand</span>
                            <button
                                type="button"
                                onClick={() => setSettings(prev => ({ ...prev, kioskShowBrandSubtitle: !prev.kioskShowBrandSubtitle }))}
                                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
                                    settings.kioskShowBrandSubtitle ? "bg-[#A68B67]" : "bg-[#EAE1D3]"
                                }`}
                            >
                                <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                        settings.kioskShowBrandSubtitle ? "translate-x-5" : "translate-x-1"
                                    }`}
                                />
                            </button>
                        </div>
                        {settings.kioskShowBrandSubtitle && (
                            <div className="space-y-1">
                                <label className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider block">Teks Subtitle Brand</label>
                                <input
                                    type="text"
                                    value={settings.kioskBrandSubtitle || ""}
                                    onChange={e => setSettings(prev => ({ ...prev, kioskBrandSubtitle: e.target.value || null }))}
                                    placeholder="PART OF DOVELENS.FT"
                                    className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#EAE1D3] rounded-xl text-xs font-bold text-[#4A3F35] placeholder:text-[#8C7E6A]/30 focus:outline-none focus:border-[#A68B67]"
                                />
                            </div>
                        )}

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
                                Jika kosong, akan menampilkan icon default di launcher.
                            </p>
                            <div className="flex items-center justify-between pt-2.5 border-t border-[#EAE1D3]/30 mt-2">
                                <span className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider">Tampilkan Logo di Launcher</span>
                                <button
                                    type="button"
                                    onClick={() => setSettings(prev => ({ ...prev, kioskShowLogo: !prev.kioskShowLogo }))}
                                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
                                        settings.kioskShowLogo ? "bg-[#A68B67]" : "bg-[#EAE1D3]"
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                            settings.kioskShowLogo ? "translate-x-5" : "translate-x-1"
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Kiosk Custom Background Upload Input */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider block">Background Kustom Launcher (JPG/PNG)</label>
                            
                            {settings.kioskBgImageUrl ? (
                                <div className="flex items-center gap-3 p-3 bg-[#FAF8F5] border border-[#EAE1D3] rounded-2xl">
                                    <div className="w-12 h-12 bg-white rounded-xl border border-[#EAE1D3] flex items-center justify-center p-1.5 relative overflow-hidden shadow-sm">
                                        <img src={settings.kioskBgImageUrl} alt="Background" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-[#4A3F35] truncate">Background_Terunggah.jpg</p>
                                        <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-wider">Aktif & Siap</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleDeleteBg}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                                        title="Hapus Background"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative group">
                                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[#EAE1D3] hover:border-[#A68B67] rounded-2xl cursor-pointer bg-[#FAF8F5] hover:bg-[#FDFBF9] transition-all p-4 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-1">
                                            {uploadingBg ? (
                                                <div className="w-6 h-6 border-2 border-[#A68B67] border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Upload className="w-5 h-5 text-[#8C7E6A] group-hover:scale-110 transition-transform duration-300" />
                                            )}
                                            <span className="text-[10px] font-extrabold text-[#4A3F35]">
                                                {uploadingBg ? "Mengunggah..." : "Pilih Gambar Background"}
                                            </span>
                                            <span className="text-[8px] text-[#8C7E6A]/70 uppercase tracking-widest font-black">Maksimal 10MB</span>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleBgUpload}
                                            disabled={uploadingBg}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            )}
                            {/* Slider Input for Background Image Opacity */}
                            {settings.kioskBgImageUrl && (
                                <div className="space-y-1.5 pt-1.5">
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[8px] text-[#8C7E6A] font-bold uppercase tracking-wider">Transparansi Background</label>
                                            <span className="text-[9px] font-black text-[#A68B67]">{Math.round((settings.kioskBgImageOpacity ?? 1.0) * 100)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={settings.kioskBgImageOpacity ?? 1.0}
                                            onChange={e => setSettings(prev => ({ ...prev, kioskBgImageOpacity: parseFloat(e.target.value) }))}
                                            className="w-full h-1 bg-[#EAE1D3] rounded-lg appearance-none cursor-pointer accent-[#A68B67]"
                                        />
                                    </div>
                                </div>
                            )}
                            {/* Switch toggle for grid dots */}
                            <div className="flex items-center justify-between pt-2.5 border-t border-[#EAE1D3]/30 mt-2">
                                <span className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider">Tampilkan Titik-Titik Grid Background</span>
                                <input
                                    type="checkbox"
                                    checked={settings.kioskShowBgDots ?? true}
                                    onChange={e => setSettings(prev => ({ ...prev, kioskShowBgDots: e.target.checked }))}
                                    className="w-4 h-4 accent-[#A68B67] cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Welcome message toggle */}
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider">Aktifkan Pesan Sambutan</span>
                            <button
                                type="button"
                                onClick={() => setSettings(prev => ({ ...prev, kioskShowWelcomeMessage: !prev.kioskShowWelcomeMessage }))}
                                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
                                    settings.kioskShowWelcomeMessage ? "bg-[#A68B67]" : "bg-[#EAE1D3]"
                                }`}
                            >
                                <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                        settings.kioskShowWelcomeMessage ? "translate-x-5" : "translate-x-1"
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Welcome Message Input */}
                        {settings.kioskShowWelcomeMessage && (
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
                        )}

                        {/* Payment hint toggle */}
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider">Aktifkan Info Pembayaran</span>
                            <button
                                type="button"
                                onClick={() => setSettings(prev => ({ ...prev, kioskShowPaymentHint: !prev.kioskShowPaymentHint }))}
                                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
                                    settings.kioskShowPaymentHint ? "bg-[#A68B67]" : "bg-[#EAE1D3]"
                                }`}
                            >
                                <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                        settings.kioskShowPaymentHint ? "translate-x-5" : "translate-x-1"
                                    }`}
                                />
                            </button>
                        </div>
                        <p className="text-[8px] text-[#8C7E6A]/75 italic leading-tight">
                            Teks &quot;Pembayaran dilakukan setelah memilih filter&quot; hanya tampil jika pembayaran aktif.
                        </p>

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
                    
                    {/* Kolom 3: Fine-Tuning Palet Warna Custom */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#4A3F35] border-b border-[#EAE1D3] pb-2 flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5 text-[#A68B67]" />
                            Detail Warna (Fine-Tuning)
                        </h3>
                        
                        <div className="space-y-2 pb-2">
                            {/* Accent Color Picker */}
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider">Aksen Tombol & Ring</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={settings.kioskAccentColor || ""}
                                        onChange={e => handleColorChange("kioskAccentColor", e.target.value)}
                                        className="w-20 px-2 py-1 bg-[#FAF8F5] border border-[#EAE1D3] rounded-lg text-[10px] font-mono font-bold text-center text-[#4A3F35]"
                                    />
                                    <div className="relative w-8 h-8 rounded-lg cursor-pointer border border-[#EAE1D3] overflow-hidden shrink-0">
                                        <input
                                            type="color"
                                            value={settings.kioskAccentColor || getAccentColor()}
                                            onChange={e => handleColorChange("kioskAccentColor", e.target.value)}
                                            className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer border-0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Gradasi Background Toggle Switch */}
                            <div className="flex items-center justify-between gap-4 pt-1 border-t border-stone-100">
                                <span className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider">Aktifkan Gradasi BG</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const nextVal = !isGradient;
                                        setIsGradient(nextVal);
                                        if (!nextVal) {
                                            const currentStart = settings.kioskBgGradientStart || "#0C0A09";
                                            handleColorChange("kioskBgGradientEnd", currentStart);
                                        } else {
                                            const currentEnd = (settings.kioskBgGradientStart === settings.kioskBgGradientEnd) ? "#1E1B4B" : (settings.kioskBgGradientEnd || "#1E1B4B");
                                            handleColorChange("kioskBgGradientEnd", currentEnd);
                                        }
                                    }}
                                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
                                        isGradient ? "bg-[#A68B67]" : "bg-[#EAE1D3]"
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                            isGradient ? "translate-x-5" : "translate-x-1"
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Conditionally Show Bg Start/End or Single Background Color */}
                            {!isGradient ? (
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider">Warna Background</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={settings.kioskBgGradientStart || ""}
                                            onChange={e => handleColorChange("kioskBgGradientStart", e.target.value)}
                                            className="w-20 px-2 py-1 bg-[#FAF8F5] border border-[#EAE1D3] rounded-lg text-[10px] font-mono font-bold text-center text-[#4A3F35]"
                                        />
                                        <div className="relative w-8 h-8 rounded-lg cursor-pointer border border-[#EAE1D3] overflow-hidden shrink-0">
                                            <input
                                                type="color"
                                                value={settings.kioskBgGradientStart || "#0C0A09"}
                                                onChange={e => handleColorChange("kioskBgGradientStart", e.target.value)}
                                                className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer border-0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Gradien Start Color Picker */}
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider">Background Awal</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={settings.kioskBgGradientStart || ""}
                                                onChange={e => handleColorChange("kioskBgGradientStart", e.target.value)}
                                                className="w-20 px-2 py-1 bg-[#FAF8F5] border border-[#EAE1D3] rounded-lg text-[10px] font-mono font-bold text-center text-[#4A3F35]"
                                            />
                                            <div className="relative w-8 h-8 rounded-lg cursor-pointer border border-[#EAE1D3] overflow-hidden shrink-0">
                                                <input
                                                    type="color"
                                                    value={settings.kioskBgGradientStart || "#0C0A09"}
                                                    onChange={e => handleColorChange("kioskBgGradientStart", e.target.value)}
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
                                                onChange={e => handleColorChange("kioskBgGradientEnd", e.target.value)}
                                                className="w-20 px-2 py-1 bg-[#FAF8F5] border border-[#EAE1D3] rounded-lg text-[10px] font-mono font-bold text-center text-[#4A3F35]"
                                            />
                                            <div className="relative w-8 h-8 rounded-lg cursor-pointer border border-[#EAE1D3] overflow-hidden shrink-0">
                                                <input
                                                    type="color"
                                                    value={settings.kioskBgGradientEnd || "#0C0A09"}
                                                    onChange={e => handleColorChange("kioskBgGradientEnd", e.target.value)}
                                                    className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer border-0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* General Text Color Picker */}
                            <div className="flex items-center justify-between gap-4 pt-1 border-t border-stone-100">
                                <span className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider">Warna Text Kiosk</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={settings.kioskTextColor || ""}
                                        onChange={e => handleColorChange("kioskTextColor", e.target.value)}
                                        placeholder="#FFFFFF"
                                        className="w-20 px-2 py-1 bg-[#FAF8F5] border border-[#EAE1D3] rounded-lg text-[10px] font-mono font-bold text-center text-[#4A3F35]"
                                    />
                                    <div className="relative w-8 h-8 rounded-lg cursor-pointer border border-[#EAE1D3] overflow-hidden shrink-0">
                                        <input
                                            type="color"
                                            value={settings.kioskTextColor || "#FFFFFF"}
                                            onChange={e => handleColorChange("kioskTextColor", e.target.value)}
                                            className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer border-0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Button Background Color Picker */}
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider">Background Tombol</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={settings.kioskButtonColor || ""}
                                        onChange={e => handleColorChange("kioskButtonColor", e.target.value || null)}
                                        placeholder="#A68B67"
                                        className="w-20 px-2 py-1 bg-[#FAF8F5] border border-[#EAE1D3] rounded-lg text-[10px] font-mono font-bold text-center text-[#4A3F35]"
                                    />
                                    <div className="relative w-8 h-8 rounded-lg cursor-pointer border border-[#EAE1D3] overflow-hidden shrink-0">
                                        <input
                                            type="color"
                                            value={settings.kioskButtonColor || PRESETS.find(p => p.id === settings.kioskThemePreset)?.buttonColor || getAccentColor()}
                                            onChange={e => handleColorChange("kioskButtonColor", e.target.value)}
                                            className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer border-0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Button Text Color Picker */}
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-[9px] text-[#8C7E6A] font-black uppercase tracking-wider">Warna Text Tombol</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={settings.kioskButtonTextColor || ""}
                                        onChange={e => handleColorChange("kioskButtonTextColor", e.target.value || null)}
                                        placeholder="#FFFFFF"
                                        className="w-20 px-2 py-1 bg-[#FAF8F5] border border-[#EAE1D3] rounded-lg text-[10px] font-mono font-bold text-center text-[#4A3F35]"
                                    />
                                    <div className="relative w-8 h-8 rounded-lg cursor-pointer border border-[#EAE1D3] overflow-hidden shrink-0">
                                        <input
                                            type="color"
                                            value={settings.kioskButtonTextColor || "#FFFFFF"}
                                            onChange={e => handleColorChange("kioskButtonTextColor", e.target.value)}
                                            className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer border-0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Palet Ringkasan */}
                    <div className="space-y-3 pt-4 border-t border-[#EAE1D3]">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#4A3F35] border-b border-[#EAE1D3] pb-2 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#A68B67]" />
                            Pengaturan Timer
                        </h3>
                        <div className="grid grid-cols-2 gap-4 items-center">
                                
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
                                    <span className="text-[7.5px] text-[#8C7E6A] uppercase font-bold block">(Menit)</span>
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
                                    <span className="text-[7.5px] text-[#8C7E6A] uppercase font-bold block">(Menit)</span>
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
                                    <span className="text-[7.5px] text-[#8C7E6A] uppercase font-bold block">(Menit)</span>
                                </div>

                            </div>
                    </div>
                    
                    

                    <div className="bg-[#FAF8F5] border border-[#EAE1D3] p-5 rounded-3xl space-y-3">
                        <span className="text-[8px] text-[#A68B67] font-black uppercase tracking-widest block">Ringkasan Palet</span>
                        <div className="grid grid-cols-2 gap-2 text-[8px] font-black uppercase text-[#4A3F35] tracking-wider">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3.5 h-3.5 rounded border border-black/5" style={{ backgroundColor: getAccentColor() }} />
                                <span>Accent</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3.5 h-3.5 rounded border border-black/5" style={{ backgroundColor: settings.kioskTextColor || '#FFFFFF' }} />
                                <span>Text</span>
                            </div>
                            <div className="flex items-center gap-1.5 col-span-2">
                                <span className="w-3.5 h-3.5 rounded border border-black/5" style={{ background: `linear-gradient(135deg, ${settings.kioskBgGradientStart || '#0C0A09'}, ${settings.kioskBgGradientEnd || '#0C0A09'})` }} />
                                <span className="truncate">Bg Gradient</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-8 border-t border-[#FAF8F5] space-y-4">
                    <button
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className="w-full bg-[#1C1917] hover:bg-[#4A3F35] text-white py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Simpan Pengaturan Kiosk</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )}     </div>

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

            {/* Beautiful Premium Alert/Confirm Dialog Modal */}
            {alertModal.isOpen && (
                <div className="fixed inset-0 bg-[#0C0A09]/60 backdrop-blur-md z-[99999] flex items-center justify-center p-4 transition-all duration-300">
                    <div className="w-full max-w-sm bg-white border border-[#EAE1D3] rounded-[28px] shadow-2xl p-6 md:p-8 space-y-6 relative overflow-hidden transform transition-all duration-300 scale-100 text-center flex flex-col items-center">
                        <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-[#A68B67]/5 rounded-full blur-[30px] pointer-events-none -translate-y-1/2 translate-x-1/4" />
                        
                        {/* Icon based on notification type */}
                        <div className="w-16 h-16 rounded-full flex items-center justify-center relative z-10 mb-2 shadow-inner bg-[#FAF8F5]">
                            {alertModal.type === "success" && (
                                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-500 animate-bounce" />
                                </div>
                            )}
                            {alertModal.type === "error" && (
                                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
                                    <ShieldAlert className="w-6 h-6 text-rose-500 animate-pulse" />
                                </div>
                            )}
                            {alertModal.type === "info" && (
                                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-amber-500" />
                                </div>
                            )}
                            {alertModal.type === "confirm" && (
                                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                                    <ShieldAlert className="w-6 h-6 text-amber-500" />
                                </div>
                            )}
                        </div>

                        {/* Title & Message */}
                        <div className="space-y-2 relative z-10 w-full">
                            <h3 className="text-sm font-black uppercase tracking-widest text-[#4A3F35]">
                                {alertModal.title}
                            </h3>
                            <p className="text-xs font-bold text-[#8C7E6A] leading-relaxed">
                                {alertModal.message}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2 w-full relative z-10">
                            {alertModal.type === "confirm" ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                                        className="flex-1 py-3 border border-[#EAE1D3] bg-[#FAF8F5] hover:bg-[#F5F1EA] text-[#8C7E6A] text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAlertModal(prev => ({ ...prev, isOpen: false }));
                                            if (alertModal.onConfirm) alertModal.onConfirm();
                                        }}
                                        className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-rose-500/20 transition-all"
                                    >
                                        Ya, Lanjutkan
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                                    className="w-full py-3 bg-[#A68B67] hover:bg-[#8C7E6A] text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-[#A68B67]/20 transition-all"
                                >
                                    Tutup
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
