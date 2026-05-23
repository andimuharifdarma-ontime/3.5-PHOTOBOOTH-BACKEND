'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Settings,
    ShieldCheck,
    Save,
    Loader2,
    Zap,
    History,
    AlertCircle,
    Timer,
    Image,
    Camera,
    Grid3X3,
    CheckCircle2,
    CreditCard,
    Check,
    Cloud,
    Clock,
    ShieldOff
} from 'lucide-react';

// Next-Auth
import { useSession } from 'next-auth/react';

// Components
import LoadingScreen from '@/components/ui/LoadingScreen';
import SettingCard from '@/components/admin/settings/SettingCard';

interface SystemSettings {
    id: string;
    isPaymentEnabled: boolean;
    isFrameSelectionEnabled: boolean;
    isPhotoSessionEnabled: boolean;
    isPhotoSelectionEnabled: boolean;
    isResultEnabled: boolean;
    frameSelectionTimer: number;
    photoSessionTimer: number;
    photoSelectionTimer: number;
    captureTimer: number;
    maxCapturePhotos: number;
    resultTimer: number;
    isFrameSelectionTimerEnabled: boolean;
    isPhotoSessionTimerEnabled: boolean;
    isPhotoSelectionTimerEnabled: boolean;
    isPhotoFilterEnabled: boolean;
    isPhotoFilterTimerEnabled: boolean;
    isResultTimerEnabled: boolean;
    photoFilterTimer: number;
    isGoogleDriveBackupEnabled: boolean;
    photoRetentionDays: number;
    isKioskLocked: boolean;
}

export default function SettingsPage() {
    const { data: session } = useSession();
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Check if user is Admin
    const isAdmin = (session?.user as any)?.role === 'ADMIN';

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Konfigurasi berhasil diperbarui!' });
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

    const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
        if (settings) {
            setSettings({ ...settings, [key]: value });
        }
    };

    if (loading) return <LoadingScreen message="Sinkronisasi Sistem..." />;

    if (!settings) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">Gagal memuat pengaturan</p>
        </div>
    );

    const pageConfigs = [
        {
            key: 'frameSelection',
            title: 'Pemilihan Frame',
            description: 'Halaman dimana user memilih tema dan frame foto',
            icon: Grid3X3,
            enabledKey: 'isFrameSelectionEnabled' as keyof SystemSettings,
            timerKey: 'frameSelectionTimer' as keyof SystemSettings,
            timerEnabledKey: 'isFrameSelectionTimerEnabled' as keyof SystemSettings,
            maxTimer: 30,
            tips: {
                pageActive: 'ON = User bisa memilih frame. OFF = Langsung ke sesi foto dengan frame default.',
                timerActive: 'ON = Ada batas waktu pemilihan. OFF = Tidak ada batas waktu.',
                timerDuration: 'Lama waktu yang diberikan untuk memilih frame sebelum otomatis lanjut.'
            }
        },
        {
            key: 'photoSession',
            title: 'Sesi Foto',
            description: 'Halaman capture foto dengan kamera',
            icon: Camera,
            enabledKey: 'isPhotoSessionEnabled' as keyof SystemSettings,
            timerKey: 'photoSessionTimer' as keyof SystemSettings,
            timerEnabledKey: 'isPhotoSessionTimerEnabled' as keyof SystemSettings,
            maxTimer: 30,
            tips: {
                pageActive: 'Halaman ini wajib aktif untuk mengambil foto.',
                timerActive: 'ON = Sesi foto terbatas waktunya. OFF = User bebas ambil foto tanpa batas.',
                timerDuration: 'Lama sesi foto. Jika habis, sesi berakhir dan kembali ke awal.'
            }
        },
        {
            key: 'photoSelection',
            title: 'Pemilihan Foto',
            description: 'Halaman dimana user memilih foto untuk dimasukkan ke frame',
            icon: Image,
            enabledKey: 'isPhotoSelectionEnabled' as keyof SystemSettings,
            timerKey: 'photoSelectionTimer' as keyof SystemSettings,
            timerEnabledKey: 'isPhotoSelectionTimerEnabled' as keyof SystemSettings,
            maxTimer: 30,
            tips: {
                pageActive: 'ON = User memilih 4 foto terbaik. OFF = Semua foto langsung dipakai tanpa pilihan.',
                timerActive: 'ON = Ada batas waktu memilih. OFF = Tidak ada batas waktu.',
                timerDuration: 'Lama waktu untuk memilih foto sebelum otomatis lanjut ke hasil.'
            }
        },
        {
            key: 'photoFilter',
            title: 'Filter Foto',
            description: 'Halaman dimana user memberikan filter artistik pada foto',
            icon: Zap,
            enabledKey: 'isPhotoFilterEnabled' as keyof SystemSettings,
            timerKey: 'photoFilterTimer' as keyof SystemSettings,
            timerEnabledKey: 'isPhotoFilterTimerEnabled' as keyof SystemSettings,
            maxTimer: 30,
            tips: {
                pageActive: 'ON = User bisa memilih filter foto. OFF = Foto langsung dicetak tanpa filter.',
                timerActive: 'ON = Ada batas waktu memilih filter. OFF = Tidak ada batas waktu.',
                timerDuration: 'Lama waktu diberikan untuk memilih filter sebelum otomatis lanjut ke hasil.'
            }
        },
        {
            key: 'result',
            title: 'Hasil Foto',
            description: 'Halaman hasil akhir dengan QR code download',
            icon: CheckCircle2,
            enabledKey: 'isResultEnabled' as keyof SystemSettings,
            timerKey: 'resultTimer' as keyof SystemSettings,
            timerEnabledKey: 'isResultTimerEnabled' as keyof SystemSettings,
            maxTimer: 120,
            tips: {
                pageActive: 'Halaman hasil foto wajib aktif agar user bisa melihat hasilnya.',
                timerActive: 'ON = Halaman otomatis reset setelah waktu habis. OFF = Halaman tetap terbuka.',
                timerDuration: 'Lama halaman hasil ditampilkan sebelum reset untuk pelanggan berikutnya.'
            }
        },
    ];

    return (
        <div className="max-w-5xl space-y-12 pb-20">
            {/* Modern Hero Header */}
            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#1C1917] p-8 md:p-12 shadow-2xl shadow-black/20">
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[linear-gradient(to_right,#A68B67_1px,transparent_1px),linear-gradient(to_bottom,#A68B67_1px,transparent_1px)] [background-size:32px_32px]" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#A68B67]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-[#4A3F35]/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A68B67] to-[#8C7E6A] flex items-center justify-center shadow-lg shadow-[#A68B67]/20">
                            <Settings className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#A68B67]/80">Core Configuration</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-sans font-extrabold text-white tracking-tight">Pengaturan Sistem</h1>
                    <p className="text-white/40 font-medium text-lg max-w-lg">Kendali operasional studio dan mode bisnis dalam satu genggaman.</p>
                </div>
            </header>

            {/* Business Mode & Payment (ADMIN ONLY) */}
            {isAdmin && (
                <section className="space-y-6">
                    <div className="flex items-center gap-3 text-[#A68B67]">
                        <CreditCard className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Business Mode & Payment</span>
                    </div>

                    <div className="bg-white rounded-2xl border border-[#EAE1D3] shadow-md overflow-hidden">
                        <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-sans font-bold text-2xl text-[#4A3F35]">Fitur Pembayaran (QRIS/VA)</h3>
                                    {settings?.isPaymentEnabled ? (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1">
                                            <Check className="w-2 h-2" /> Paid Mode
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[8px] font-bold uppercase tracking-widest rounded-full">Free Mode</span>
                                    )}
                                </div>
                                <p className="text-xs text-[#8C7E6A] leading-relaxed max-w-xl">
                                    Aktifkan mode berbayar untuk mewajibkan pelanggan membayar via QRIS/VA sebelum mencetak foto. Jika dinonaktifkan, photobooth akan berjalan dalam mode gratis.
                                </p>
                            </div>

                            <button
                                onClick={() => updateSetting('isPaymentEnabled', !settings?.isPaymentEnabled)}
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ring-offset-2 ring-[#A68B67]/20 focus:ring-2 ${settings?.isPaymentEnabled ? 'bg-[#A68B67]' : 'bg-[#EAE1D3]'}`}
                            >
                                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${settings?.isPaymentEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-[#EAE1D3] shadow-md overflow-hidden">
                        <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-sans font-bold text-2xl text-[#4A3F35]">Backup ke Google Drive</h3>
                                    {settings?.isGoogleDriveBackupEnabled ? (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1">
                                            <Cloud className="w-2 h-2" /> Backup Aktif
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[8px] font-bold uppercase tracking-widest rounded-full">Backup Nonaktif</span>
                                    )}
                                </div>
                                <p className="text-xs text-[#8C7E6A] leading-relaxed max-w-xl">
                                    Cadangkan setiap karya pelanggan ke folder Google Drive Anda secara otomatis. Jika dinonaktifkan, file hanya tersimpan di server lokal (Supabase).
                                </p>
                            </div>

                            <button
                                onClick={() => updateSetting('isGoogleDriveBackupEnabled', !settings?.isGoogleDriveBackupEnabled)}
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ring-offset-2 ring-[#A68B67]/20 focus:ring-2 ${settings?.isGoogleDriveBackupEnabled ? 'bg-[#A68B67]' : 'bg-[#EAE1D3]'}`}
                            >
                                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${settings?.isGoogleDriveBackupEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-[#EAE1D3] shadow-md overflow-hidden">
                        <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-sans font-bold text-2xl text-[#4A3F35]">Masa Simpan Foto (Retention)</h3>
                                    <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {settings.photoRetentionDays} Hari
                                    </span>
                                </div>
                                <p className="text-xs text-[#8C7E6A] leading-relaxed max-w-xl">
                                    Tentukan berapa lama soft-file foto disimpan di Supabase (untuk akses QR Code) sebelum dihapus otomatis. Backup permanen di Google Drive tetap aman dan tidak akan terhapus.
                                </p>
                            </div>

                            <div className="flex flex-col gap-4 min-w-[240px]">
                                <input
                                    type="range"
                                    min="1"
                                    max="30"
                                    value={settings.photoRetentionDays}
                                    onChange={(e) => updateSetting('photoRetentionDays', parseInt(e.target.value))}
                                    className="w-full h-2 bg-[#EAE1D3] rounded-lg appearance-none cursor-pointer accent-[#A68B67]"
                                />
                                <div className="flex justify-between text-[10px] text-[#A68B67] font-bold uppercase tracking-widest">
                                    <span>1 Hari</span>
                                    <span>30 Hari</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-[#EAE1D3] shadow-md overflow-hidden">
                        <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-sans font-bold text-2xl text-[#4A3F35]">Kunci Mesin Jarak Jauh (Remote Lock)</h3>
                                    {settings?.isKioskLocked ? (
                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[8px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1">
                                            <ShieldOff className="w-2 h-2" /> TERKUNCI
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-bold uppercase tracking-widest rounded-full">AKTIF</span>
                                    )}
                                </div>
                                <p className="text-xs text-[#8C7E6A] leading-relaxed max-w-xl">
                                    Matikan akses photobooth dari jarak jauh. Jika dikunci, aplikasi desktop akan tertahan di layar Launcher dan tidak bisa memulai sesi foto.
                                </p>
                            </div>

                            <button
                                onClick={() => updateSetting('isKioskLocked', !settings?.isKioskLocked)}
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ring-offset-2 ring-[#A68B67]/20 focus:ring-2 ${settings?.isKioskLocked ? 'bg-red-500' : 'bg-[#EAE1D3]'}`}
                            >
                                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${settings?.isKioskLocked ? 'translate-x-7' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {/* Timer & Page Control Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 text-[#A68B67]">
                    <Timer className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Timer & Page Control</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {pageConfigs.map((config, index) => (
                        <SettingCard
                            key={config.key}
                            idx={index}
                            title={config.title}
                            description={config.description}
                            icon={config.icon}
                            isEnabled={settings[config.enabledKey] as boolean}
                            onToggleEnabled={() => updateSetting(config.enabledKey, !settings[config.enabledKey])}
                            isTimerEnabled={settings[config.timerEnabledKey] as boolean}
                            onToggleTimer={() => updateSetting(config.timerEnabledKey, !settings[config.timerEnabledKey])}
                            timerValue={settings[config.timerKey] as number}
                            onTimerChange={(val) => updateSetting(config.timerKey, val)}
                            maxTimer={config.maxTimer}
                            tips={config.tips}
                        />
                    ))}
                </div>
            </section>

            {/* Capture Configuration Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 text-[#A68B67]">
                    <Camera className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Capture Configuration</span>
                </div>

                <div className="bg-white rounded-3xl border border-[#EAE1D3] shadow-md overflow-hidden p-8">
                    <div className="max-w-xl space-y-8">
                        <div className="space-y-2">
                            <h3 className="font-sans font-bold text-2xl text-[#4A3F35]">Jeda Waktu Jepret (Capture Timer)</h3>
                            <p className="text-xs text-[#8C7E6A] leading-relaxed">
                                Atur berapa lama waktu hitung mundur yang diberikan kepada pelanggan sebelum kamera mengambil foto secara otomatis.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-[#4A3F35]">Durasi Hitung Mundur</span>
                                <span className="px-3 py-1 bg-[#F5F1EA] rounded-full text-xs font-bold text-[#A68B67] tracking-wider transition-all">
                                    {settings.captureTimer} Detik
                                </span>
                            </div>

                            <input
                                type="range"
                                min="5"
                                max="10"
                                value={settings.captureTimer}
                                onChange={(e) => updateSetting('captureTimer', parseInt(e.target.value))}
                                className="w-full h-2 bg-[#EAE1D3] rounded-lg appearance-none cursor-pointer accent-[#A68B67]"
                            />

                            <div className="flex justify-between text-[10px] text-[#A68B67] font-bold uppercase tracking-widest">
                                <span>5 Detik (Minimal)</span>
                                <span>10 Detik (Maksimal)</span>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-[#EAE1D3]">
                            <div className="space-y-2">
                                <h3 className="font-sans font-bold text-2xl text-[#4A3F35]">Jumlah Total Jepretan</h3>
                                <p className="text-xs text-[#8C7E6A] leading-relaxed">
                                    Tentukan berapa banyak foto yang akan diambil dalam satu sesi. Pelanggan dapat memilih foto terbaik sesuai jumlah slot pada frame yang dipilih.
                                </p>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-[#4A3F35]">Total Foto Diambil</span>
                                <span className="px-3 py-1 bg-[#F5F1EA] rounded-full text-xs font-bold text-[#A68B67] tracking-wider transition-all">
                                    {settings.maxCapturePhotos} Foto
                                </span>
                            </div>

                            <input
                                type="range"
                                min="4"
                                max="12"
                                value={settings.maxCapturePhotos}
                                onChange={(e) => updateSetting('maxCapturePhotos', parseInt(e.target.value))}
                                className="w-full h-2 bg-[#EAE1D3] rounded-lg appearance-none cursor-pointer accent-[#A68B67]"
                            />

                            <div className="flex justify-between text-[10px] text-[#A68B67] font-bold uppercase tracking-widest">
                                <span>4 Foto</span>
                                <span>12 Foto (Maksimal)</span>
                            </div>
                        </div>

                        <div className="bg-red-50 border-l-4 border-red-400 p-4 space-y-2">
                            <div className="flex items-center gap-2 text-red-800">
                                <AlertCircle className="w-3 h-3" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Peringatan Sistem</span>
                            </div>
                            <p className="text-[10px] text-red-700 leading-relaxed">
                                Timer minimal diatur **5 detik**. Hal ini diperlukan agar kamera memiliki waktu yang cukup untuk sinkronisasi **Live Photo** sebelum jepretan diambil.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Info Section */}
            <section className="bg-[#F5F1EA] border border-[#EAE1D3] rounded-3xl p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex gap-4">
                    <div className="p-3 h-fit bg-white border border-[#EAE1D3] rounded-xl text-[#A68B67]">
                        <Zap className="w-4 h-4" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#4A3F35]">Live Response</h4>
                        <p className="text-xs text-[#8C7E6A] leading-relaxed">Perubahan status akan langsung dirasakan oleh mesin fotobooth.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="p-3 h-fit bg-white border border-[#EAE1D3] rounded-xl text-[#A68B67]">
                        <History className="w-4 h-4" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#4A3F35]">Flow Baru</h4>
                        <p className="text-xs text-[#8C7E6A] leading-relaxed">Aktifkan "Pemilihan Foto" agar user bisa memilih foto terbaik.</p>
                    </div>
                </div>
            </section>

            {/* Save Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-[#EAE1D3]">
                <div>
                    {message && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </motion.div>
                    )}
                </div>

                <button onClick={handleSave} disabled={saving} className="bg-[#1C1917] hover:bg-[#A68B67] text-white py-5 px-10 rounded-xl flex items-center justify-center gap-4 transition-all disabled:opacity-50 group">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin text-[#A68B67]" /> : <Save className="w-4 h-4" />}
                    <span className="text-[10px] font-bold uppercase tracking-widest">{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
            </div>
        </div>
    );
}
