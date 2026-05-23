"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Monitor, 
  ShieldCheck, 
  ShieldAlert, 
  Settings, 
  RefreshCw,
  Power,
  Lock,
  Unlock,
  Search,
  Users,
  Printer,
  CreditCard,
  User,
  Activity,
  Key,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function KioskControlPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || 'CLIENT';

  // Client/Karyawan Role States
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Admin Role States
  const [kiosks, setKiosks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminLoading, setIsAdminLoading] = useState(true);
  const [updatingClientId, setUpdatingClientId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      if (userRole === 'ADMIN') {
        fetchAdminKiosks();
      } else {
        fetchSettings();
      }
    }
  }, [session, userRole]);

  // ==========================
  // CLIENT ROLE ACTIONS
  // ==========================
  async function fetchSettings() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      toast.error('Gagal memuat status kiosk');
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleLock() {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isKioskLocked: !settings.isKioskLocked })
      });
      
      if (!res.ok) throw new Error();
      
      const updated = await res.json();
      setSettings(updated);
      toast.success(updated.isKioskLocked ? 'Kiosk Berhasil Dikunci' : 'Kiosk Berhasil Dibuka');
    } catch (err) {
      toast.error('Gagal memperbarui status');
    } finally {
      setIsUpdating(false);
    }
  }

  // ==========================
  // ADMIN ROLE ACTIONS
  // ==========================
  async function fetchAdminKiosks() {
    setIsAdminLoading(true);
    try {
      const res = await fetch('/api/admin/kiosks');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setKiosks(data);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat daftar kiosk client');
    } finally {
      setIsAdminLoading(false);
    }
  }

  const handleCopyKey = async (id: string, key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success('API Key berhasil disalin!');
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  async function handleAdminToggle(clientId: string, field: 'isKioskLocked' | 'isPaymentEnabled', currentValue: boolean) {
    setUpdatingClientId(clientId);
    try {
      const res = await fetch('/api/admin/kiosks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          [field]: !currentValue
        })
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      
      // Update local state instantly
      setKiosks(prev => prev.map(kiosk => {
        if (kiosk.id === clientId) {
          return {
            ...kiosk,
            isKioskLocked: data.isKioskLocked,
            isPaymentEnabled: data.isPaymentEnabled
          };
        }
        return kiosk;
      }));

      toast.success(`Berhasil memperbarui konfigurasi kiosk`);
    } catch (err) {
      toast.error('Gagal memproses konfigurasi remote');
    } finally {
      setUpdatingClientId(null);
    }
  }

  // Filter kiosks by search query
  const filteredKiosks = kiosks.filter(kiosk => 
    (kiosk.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (kiosk.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats Aggregation for Admin
  const totalClients = kiosks.length;
  const totalLocked = kiosks.filter(k => k.isKioskLocked).length;
  const totalActive = kiosks.filter(k => !k.isKioskLocked).length;
  const totalPrints = kiosks.reduce((sum, k) => sum + (k.totalOrders || 0), 0);

  // Check connection status dynamically
  const getConnectionStatus = (lastActivityStr: string) => {
    if (!lastActivityStr) return { label: 'OFFLINE', color: 'bg-neutral-400 text-neutral-600' };
    const lastActive = new Date(lastActivityStr);
    const diffMinutes = (new Date().getTime() - lastActive.getTime()) / (1000 * 60);
    
    if (diffMinutes < 15) {
      return { label: 'ONLINE', color: 'bg-green-500 text-green-100 font-semibold' };
    } else if (diffMinutes < 120) {
      return { label: 'STANDBY', color: 'bg-amber-500 text-amber-100 font-semibold' };
    }
    return { label: 'IDLE', color: 'bg-stone-300 text-stone-600' };
  };

  // ==========================
  // RENDER DUAL-ROLE LAYOUTS
  // ==========================
  if (userRole === 'ADMIN') {
    return (
      <div className="p-4 md:p-8 space-y-8 bg-[#FDFBF7] min-h-screen">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Dashboard Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#EAE1D3] pb-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-[#1C1917] tracking-tight flex items-center gap-3">
                <Monitor className="w-8 h-8 text-[#A68B67]" />
                KIOSKS COMMAND CENTER
              </h1>
              <p className="text-sm text-[#8C7E6A]">
                Pantau status koneksi, kunci akses kiosk, dan toggle DOKU Snap pembayaran seluruh Client Anda secara terpusat.
              </p>
            </div>
            <button
              onClick={fetchAdminKiosks}
              disabled={isAdminLoading}
              className="self-start px-5 py-3 bg-white border border-[#EAE1D3] text-[#4A3F35] rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-stone-50 transition-all shadow-sm"
            >
              <RefreshCw size={14} className={isAdminLoading ? 'animate-spin' : ''} />
              Segarkan Data
            </button>
          </div>

          {/* Stats Summary Panel */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Client */}
            <div className="bg-white border border-[#EAE1D3] rounded-3xl p-6 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-stone-100 text-stone-700 rounded-2xl flex items-center justify-center shadow-inner">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-[#8C7E6A] font-bold uppercase tracking-wider">Total Client</p>
                <h3 className="text-2xl font-black text-[#1C1917]">{totalClients} Akun</h3>
              </div>
            </div>

            {/* Active Kiosk */}
            <div className="bg-white border border-[#EAE1D3] rounded-3xl p-6 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 text-green-700 rounded-2xl flex items-center justify-center shadow-inner relative">
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-[#8C7E6A] font-bold uppercase tracking-wider">Kiosk Aktif</p>
                <h3 className="text-2xl font-black text-green-600">{totalActive} Kiosk</h3>
              </div>
            </div>

            {/* Locked Kiosk */}
            <div className="bg-white border border-[#EAE1D3] rounded-3xl p-6 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-red-50 text-red-700 rounded-2xl flex items-center justify-center shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-[#8C7E6A] font-bold uppercase tracking-wider">Kiosk Terkunci</p>
                <h3 className="text-2xl font-black text-red-600">{totalLocked} Mesin</h3>
              </div>
            </div>

            {/* Printed Photos */}
            <div className="bg-white border border-[#EAE1D3] rounded-3xl p-6 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center shadow-inner">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-[#8C7E6A] font-bold uppercase tracking-wider">Total Cetak</p>
                <h3 className="text-2xl font-black text-[#A68B67]">{totalPrints} Sesi</h3>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="Cari email client atau nama toko..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-[#EAE1D3] rounded-2xl focus:border-[#A68B67] focus:ring-2 focus:ring-[#A68B67]/15 outline-none transition-all text-[#1C1917] placeholder-stone-400 text-sm shadow-sm"
            />
          </div>

          {/* Kiosks Grid list */}
          {isAdminLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="w-10 h-10 text-[#A68B67] animate-spin" />
              <p className="text-[#8C7E6A] text-sm font-medium font-serif italic">Mengambil data status kiosk terpusat...</p>
            </div>
          ) : filteredKiosks.length === 0 ? (
            <div className="bg-white border border-[#EAE1D3] rounded-3xl py-16 text-center space-y-2">
              <p className="text-stone-400 font-bold">Tidak Ada Data Kiosk Ditemukan</p>
              <p className="text-xs text-[#8C7E6A]">Pastikan Anda telah mendaftarkan Client ber-role CLIENT di database.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredKiosks.map((kiosk) => {
                const conn = getConnectionStatus(kiosk.lastActivity);
                return (
                  <motion.div
                    key={kiosk.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-[#EAE1D3] rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group"
                  >
                    {/* Header: User Avatar & Meta */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#A68B67] to-[#8C7E6A] text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow">
                          {(kiosk.name || kiosk.email)[0].toUpperCase()}
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-[#1C1917] tracking-tight line-clamp-1">
                            {kiosk.name || 'Client Photobooth'}
                          </h4>
                          <p className="text-xs text-[#8C7E6A] line-clamp-1">{kiosk.email}</p>
                        </div>
                      </div>

                      {/* Connection Badge */}
                      <span className={`px-2.5 py-1 text-[10px] rounded-lg tracking-wider font-bold flex items-center gap-1.5 shadow-sm ${conn.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${conn.label === 'ONLINE' ? 'bg-white animate-pulse' : 'bg-transparent'}`} />
                        {conn.label}
                      </span>
                    </div>

                    {/* Stats overview inside card */}
                    <div className="my-5 py-3 px-4 bg-[#FDFBF7] border border-[#EAE1D3]/50 rounded-2xl flex items-center justify-between text-xs">
                      <span className="text-[#8C7E6A] flex items-center gap-1.5">
                        <Printer className="w-4 h-4 text-[#A68B67]" /> Total Transaksi Cetak
                      </span>
                      <span className="font-black text-[#1C1917] bg-white border border-[#EAE1D3] px-2.5 py-1 rounded-lg">
                        {kiosk.totalOrders || 0} Sesi
                      </span>
                    </div>

                    {/* Secure Kiosk API Key Container */}
                    <div className="mb-5 p-3.5 bg-[#FDFBF7] border border-[#EAE1D3]/50 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-[#A68B67] font-black uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5" /> Kiosk API Key
                        </span>
                        {kiosk.apiKey ? (
                          <button
                            onClick={() => handleCopyKey(kiosk.id, kiosk.apiKey)}
                            className="text-[#8C7E6A] hover:text-[#4A3F35] font-black tracking-widest flex items-center gap-1 transition-colors uppercase cursor-pointer"
                          >
                            {copiedId === kiosk.id ? <Check className="w-3.5 h-3.5 text-green-600 animate-bounce" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedId === kiosk.id ? 'Tersalin' : 'Salin'}
                          </button>
                        ) : (
                          <span className="text-red-400 font-semibold uppercase">Belum Dibuat</span>
                        )}
                      </div>
                      
                      {kiosk.apiKey ? (
                        <div className="font-mono text-[11px] font-bold text-[#4A3F35] tracking-tight bg-white border border-[#EAE1D3] px-3 py-1.5 rounded-xl truncate select-all">
                          dovelens_••••••••{kiosk.apiKey.slice(-8)}
                        </div>
                      ) : (
                        <div className="text-[10px] text-stone-400 italic">
                          Generate API Key baru melalui menu <span className="font-bold">Kelola User</span> terlebih dahulu.
                        </div>
                      )}
                    </div>

                    {/* Toggles and Remote Controls */}
                    <div className="space-y-3 pt-4 border-t border-[#EAE1D3]/70">
                      
                      {/* Control 1: Lock Kiosk */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-[#4A3F35] font-semibold">
                          <Lock className="w-4 h-4 text-stone-500" />
                          <span>Kunci Mesin Kiosk</span>
                        </div>
                        <button
                          disabled={updatingClientId === kiosk.id}
                          onClick={() => handleAdminToggle(kiosk.id, 'isKioskLocked', kiosk.isKioskLocked)}
                          className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${
                            kiosk.isKioskLocked ? 'bg-red-500' : 'bg-stone-200'
                          }`}
                        >
                          <div className={`bg-white w-6 h-6 rounded-full shadow-md transition-all duration-300 transform flex items-center justify-center ${
                            kiosk.isKioskLocked ? 'translate-x-6' : 'translate-x-0'
                          }`}>
                            {kiosk.isKioskLocked ? (
                              <Lock className="w-3 h-3 text-red-500" />
                            ) : (
                              <Unlock className="w-3 h-3 text-stone-400" />
                            )}
                          </div>
                        </button>
                      </div>

                      {/* Control 2: Toggle DOKU Payment Mode */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-[#4A3F35] font-semibold">
                          <CreditCard className="w-4 h-4 text-stone-500" />
                          <span>DOKU Snap Pembayaran</span>
                        </div>
                        <button
                          disabled={updatingClientId === kiosk.id}
                          onClick={() => handleAdminToggle(kiosk.id, 'isPaymentEnabled', kiosk.isPaymentEnabled)}
                          className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${
                            kiosk.isPaymentEnabled ? 'bg-green-500' : 'bg-stone-200'
                          }`}
                        >
                          <div className={`bg-white w-6 h-6 rounded-full shadow-md transition-all duration-300 transform flex items-center justify-center ${
                            kiosk.isPaymentEnabled ? 'translate-x-6' : 'translate-x-0'
                          }`}>
                            {kiosk.isPaymentEnabled ? (
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-stone-300" />
                            )}
                          </div>
                        </button>
                      </div>

                    </div>

                    {/* Bottom Status text */}
                    <div className="mt-4 pt-2 text-[10px] text-stone-400 text-right italic">
                      Terakhir Aktif: {kiosk.lastActivity ? new Date(kiosk.lastActivity).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </div>

                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    );
  }

  // ==========================
  // CLIENT & KARYAWAN VIEW (Original single-kiosk lock control card)
  // ==========================
  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Status Card */}
        <div className={`p-10 rounded-[2.5rem] border transition-all duration-500 ${
          settings?.isKioskLocked 
            ? 'bg-red-50 border-red-200' 
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center shadow-xl ${
              settings?.isKioskLocked ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
            }`}>
              {settings?.isKioskLocked ? <Lock size={48} /> : <Unlock size={48} />}
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-4">
              <h2 className="text-3xl font-black text-[#1C1917] uppercase tracking-tight">
                Status Mesin: {settings?.isKioskLocked ? 'Terkunci' : 'Aktif'}
              </h2>
              <p className="text-sm text-[#4A3F35] leading-relaxed max-w-lg">
                {settings?.isKioskLocked 
                  ? 'Aplikasi desktop di lokasi saat ini tertahan di layar Launcher. Pengguna tidak bisa memulai sesi foto sampai Anda membukanya.'
                  : 'Aplikasi desktop siap digunakan. Anda bisa mengunci mesin ini kapan saja untuk keperluan maintenance atau penutupan toko.'}
              </p>
              
              <div className="pt-4 flex flex-wrap gap-4 justify-center md:justify-start">
                <button
                  disabled={isUpdating || isLoading}
                  onClick={toggleLock}
                  className={`px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${
                    settings?.isKioskLocked 
                      ? 'bg-green-600 text-white hover:bg-green-700 hover:scale-105' 
                      : 'bg-red-600 text-white hover:bg-red-700 hover:scale-105'
                  }`}
                >
                  {isUpdating ? <RefreshCw className="animate-spin" /> : <Power size={16} />}
                  {settings?.isKioskLocked ? 'Buka Mesin Sekarang' : 'Kunci Mesin Sekarang'}
                </button>
                
                <button
                  onClick={fetchSettings}
                  className="px-8 py-4 bg-white border border-[#EAE1D3] text-[#4A3F35] rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-stone-50 transition-all"
                >
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                  Cek Koneksi
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-8 bg-white border border-[#EAE1D3] rounded-3xl space-y-4">
            <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <h3 className="font-bold text-[#1C1917]">Keamanan Terjamin</h3>
            <p className="text-xs text-[#8C7E6A] leading-relaxed">
              Setiap kali mesin dinyalakan di lokasi, sistem akan meminta verifikasi ke server Vercel ini sebelum mengizinkan sesi foto dimulai.
            </p>
          </div>
          
          <div className="p-8 bg-white border border-[#EAE1D3] rounded-3xl space-y-4">
            <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center">
              <Monitor size={20} />
            </div>
            <h3 className="font-bold text-[#1C1917]">Monitoring Real-time</h3>
            <p className="text-xs text-[#8C7E6A] leading-relaxed">
              Anda bisa mematikan akses kiosk dalam hitungan detik jika terjadi kendala teknis di lokasi atau untuk jadwal maintenance rutin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
