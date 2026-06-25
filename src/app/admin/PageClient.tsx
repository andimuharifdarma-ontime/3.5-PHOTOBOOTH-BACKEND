'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
    Palette,
    ShoppingCart,
    ArrowUpRight,
    Clock,
    Activity,
    ChevronRight,
    Wallet,
    Printer,
    TrendingUp,
    Monitor,
    ShieldCheck,
    Rocket,
    Power,
    Lock,
    Unlock,
    RefreshCw
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useAdminProfile } from '@/contexts/AdminProfileContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

// Components
import LoadingScreen from '@/components/ui/LoadingScreen';
import StatCard from '@/components/admin/dashboard/StatCard';
import CircularProgress from '@/components/admin/dashboard/CircularProgress';
import type { DashboardStats } from '@/lib/admin-stats';

const EMPTY_STATS: DashboardStats = {
    totalThemes: 0,
    totalFrames: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalPrints: 0,
    pendingOrders: 0,
    monthlyRevenue: [],
};

interface AdminDashboardProps {
    initialStats?: DashboardStats | null;
}

export default function AdminDashboard({ initialStats = null }: AdminDashboardProps) {
    const { data: session, status } = useSession();
    const { userProfile } = useAdminProfile();
    const isAdmin = (session?.user as any)?.role === 'ADMIN';
    const statsKey = status === 'authenticated' ? '/api/admin/stats?startDate=&endDate=' : null;
    const usersKey = status === 'authenticated' && isAdmin ? '/api/admin/users' : null;

    const { data: stats = initialStats ?? EMPTY_STATS, isLoading: statsLoading } = useSWR<DashboardStats>(
        statsKey,
        { fallbackData: initialStats ?? undefined },
    );
    const { data: users = [] } = useSWR<any[]>(usersKey);
    
    // Activation Modal State
    const searchParams = useSearchParams();
    const router = useRouter();
    const [showActivationModal, setShowActivationModal] = useState(false);
    const [isActivating, setIsActivating] = useState(false);
    const [isKioskLocked, setIsKioskLocked] = useState(true);

    const isNonPaymentClient = (session?.user as any)?.role === 'CLIENT' && userProfile?.isPaymentEnabled === false;

    useEffect(() => {
        const mode = searchParams.get('mode');
        if (mode === 'activation') {
            setShowActivationModal(true);
            fetch('/api/admin/settings')
                .then(res => res.json())
                .then(data => setIsKioskLocked(data.isKioskLocked))
                .catch(() => {});
        }
    }, [searchParams]);

    const loading = status === 'loading' || (statsLoading && !initialStats);

    const handleActivate = async () => {
        setIsActivating(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isKioskLocked: false })
            });
            
            if (res.ok) {
                toast.success('Kiosk Berhasil Diaktifkan!');
                setIsKioskLocked(false);
                // Beri waktu user melihat sukses sebelum tutup modal
                setTimeout(() => {
                    setShowActivationModal(false);
                    // Hapus query param agar tidak muncul lagi saat refresh
                    router.replace('/admin');
                }, 2000);
            } else {
                throw new Error();
            }
        } catch (err) {
            toast.error('Gagal mengaktifkan kiosk');
        } finally {
            setIsActivating(false);
        }
    };

    if (loading) return <LoadingScreen message="Menyiapkan Dashboard Studio..." />;

    const weeklyData = [15, 25, 20, 35, 30, 45, 40];

    return (
        <div className="space-y-6 md:space-y-10 pb-12 md:pb-20">
            {/* Modern Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#1C1917] p-8 md:p-12 shadow-2xl shadow-black/20 mb-8 md:mb-12">
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[linear-gradient(to_right,#A68B67_1px,transparent_1px),linear-gradient(to_bottom,#A68B67_1px,transparent_1px)] [background-size:32px_32px]" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#A68B67]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#4A3F35]/20 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-3 md:space-y-4"
                    >
                        <div className="flex items-center gap-2 md:gap-3">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A68B67] to-[#8C7E6A] flex items-center justify-center shadow-lg shadow-[#A68B67]/20"
                            >
                                <Activity className="w-5 h-5 text-white" />
                            </motion.div>
                            <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest md:tracking-[0.3em] text-[#A68B67]/80">Studio Control Center</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-sans font-extrabold text-white tracking-tight">Panel Utama</h1>
                        <p className="text-white/40 font-medium text-base md:text-lg">Selamat datang kembali. Arsitektur bisnis Anda hari ini.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10"
                    >
                        <div className="w-2.5 h-2.5 rounded-full bg-[#A68B67] animate-pulse shadow-lg shadow-[#A68B67]/30" />
                        <span className="text-[11px] font-bold text-white/70 tracking-wide">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </motion.div>
                </div>
            </div>

            {/* Client Status Section for ADMIN only - PREMIUM UPDATE */}
            {(session?.user as any)?.role === 'ADMIN' && users?.filter(u => u.role === 'CLIENT').length > 0 && (
                <div className="mb-16 space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                            <div className="w-1.5 h-6 bg-[#A68B67] rounded-full shadow-[0_0_12px_rgba(166,139,103,0.5)]" />
                            <h3 className="text-[10px] font-bold text-[#4A3F35] uppercase tracking-[0.3em]">Client Ecosystem Monitor</h3>
                        </div>
                        <Link href="/admin/users" className="text-[9px] font-bold text-[#A68B67] uppercase tracking-widest hover:text-[#4A3F35] transition-colors">
                            Manage All Clients
                        </Link>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8">
                        {users.filter(u => u.role === 'CLIENT').map((client: any, i: number) => (
                            <Link 
                                key={client.id} 
                                href={client.isPaymentEnabled ? `/admin/reports` : `/admin/offline-reports`}
                                className="group"
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.1 * i, type: 'spring', stiffness: 100 }}
                                    className="bg-white/[0.6] backdrop-blur-xl p-6 rounded-[2rem] border border-[#EAE1D3] shadow-[0_4px_24px_-4px_rgba(74,63,53,0.06)] hover:shadow-[0_20px_48px_-12px_rgba(74,63,53,0.12)] hover:border-[#A68B67]/40 hover:-translate-y-2 transition-all duration-500 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#A68B67]/5 rounded-full blur-2xl translate-x-8 -translate-y-8 group-hover:bg-[#A68B67]/10 transition-colors" />
                                    
                                    <div className="relative z-10 flex flex-col gap-6">
                                        <div className="flex items-center justify-between">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F5F1EA] to-[#EAE1D3] flex items-center justify-center font-sans font-bold text-[#4A3F35] text-xl border border-[#EAE1D3] group-hover:from-[#A68B67] group-hover:to-[#8C7E6A] group-hover:text-white group-hover:border-transparent transition-all duration-500 group-hover:shadow-lg group-hover:shadow-[#A68B67]/20">
                                                {client.name?.[0] || 'C'}
                                            </div>
                                            <div className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-2 border ${
                                                client.isPaymentEnabled 
                                                    ? 'bg-green-50/50 border-green-100 text-green-600' 
                                                    : 'bg-red-50/50 border-red-100 text-red-600'
                                            }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${client.isPaymentEnabled ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                                                {client.isPaymentEnabled ? 'PAYMENT' : 'FULL SEWA'}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <h4 className="text-base font-sans font-bold text-[#4A3F35] tracking-tight group-hover:text-[#A68B67] transition-colors">{client.name}</h4>
                                            <p className="text-[10px] text-[#8C7E6A] font-medium lowercase tracking-tight opacity-60 truncate">{client.email}</p>
                                        </div>

                                        <div className="pt-4 border-t border-[#F5F1EA] flex items-center justify-between">
                                            <span className="text-[8px] font-black text-[#A68B67] uppercase tracking-widest">{client.isPaymentEnabled ? 'View Revenue' : 'View Sessions'}</span>
                                            <div className="w-8 h-8 rounded-full bg-[#F5F1EA] group-hover:bg-[#4A3F35] flex items-center justify-center transition-all duration-500 border border-[#EAE1D3] group-hover:border-transparent">
                                                <ArrowUpRight className="w-4 h-4 text-[#A68B67] group-hover:text-white transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 mb-8 md:mb-16">
                <StatCard
                    idx={0}
                    title={isNonPaymentClient ? 'Total Cetak' : 'Pendapatan Bersih'}
                    value={isNonPaymentClient ? `${stats.totalPrints} Lembar` : `Rp ${stats.totalRevenue.toLocaleString('id-ID')}`}
                    icon={isNonPaymentClient ? Printer : Wallet}
                    trend={isNonPaymentClient ? (stats.totalPrints > 0 ? 'Active' : '0%') : (stats.totalRevenue > 0 ? '+12.5%' : '0%')}
                    trendData={weeklyData.map(v => v * 1.0)}
                    color="#A68B67"
                />
                <StatCard
                    idx={1}
                    title={isNonPaymentClient ? 'Total Sesi' : 'Volume Pesanan'}
                    value={stats.totalOrders.toLocaleString()}
                    icon={ShoppingCart}
                    trend={stats.totalOrders > 0 ? '+8.2%' : '0%'}
                    trendData={weeklyData.map(v => v * 1.1)}
                    color="#4A3F35"
                    bg="bg-[#F5F1EA]"
                />
                <StatCard
                    idx={2}
                    title="Kurasi Tema"
                    value={stats.totalThemes.toLocaleString()}
                    icon={Palette}
                    trend={stats.totalThemes > 0 ? 'Stabil' : '0%'}
                    trendData={weeklyData.map(v => v * 1.2)}
                    color="#A68B67"
                />
                <StatCard
                    idx={3}
                    title="Antrian Cetak"
                    value={stats.pendingOrders.toLocaleString()}
                    icon={Clock}
                    trend={stats.pendingOrders > 0 ? '+2.1%' : '0%'}
                    trendData={weeklyData.map(v => v * 1.3)}
                    color="#4A3F35"
                    bg="bg-[#F5F1EA]"
                />
            </div>

            {/* Heavy Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-12 mb-8 md:mb-16">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="lg:col-span-2 bg-[#1C1917] rounded-3xl p-6 md:p-8 lg:p-12 text-[#FDFBF7] relative overflow-hidden shadow-2xl shadow-black/20"
                >
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#A68B67_1px,transparent_1px),linear-gradient(to_bottom,#A68B67_1px,transparent_1px)] [background-size:40px_40px]"></div>
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#A68B67]/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2" />

                    <div className="relative z-10 h-full flex flex-col">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 lg:gap-8 mb-8 md:mb-12 lg:mb-16 pb-6 md:pb-8 lg:pb-12 border-b border-white/5">
                            <div>
                                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#A68B67] animate-pulse"></div>
                                    <h3 className="text-[7px] md:text-[8px] lg:text-[9px] font-bold text-[#A68B67] uppercase tracking-widest md:tracking-[0.3em]">Revenue Architecture</h3>
                                </div>
                                <h2 className="text-3xl md:text-4xl lg:text-5xl font-sans font-bold tracking-tight leading-none text-white">Studio Performance Ledger</h2>
                            </div>
                            <div className="flex flex-col items-start md:items-end gap-1 md:gap-2">
                                <div className="text-[7px] md:text-[8px] font-bold text-[#A68B67] uppercase tracking-wider">Current Month</div>
                                <div className="text-lg md:text-xl lg:text-2xl font-sans font-semibold text-white">{new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1px bg-white/10 border border-white/10 rounded-2xl overflow-hidden mb-8 md:mb-12 lg:mb-16">
                            {[
                                isNonPaymentClient
                                    ? { label: 'Total Cetak', value: stats.totalPrints, trend: 'ACTIVE', isCurrency: false, suffix: ' Lembar' }
                                    : { label: 'Gross Revenue', value: stats.totalRevenue, trend: '+12%', isCurrency: true },
                                { label: isNonPaymentClient ? 'Total Sesi' : 'Annual Orders', value: stats.totalOrders, trend: '+5%', isCurrency: false },
                                isNonPaymentClient
                                    ? { label: 'Total Tema', value: stats.totalThemes, trend: 'STABLE', isCurrency: false }
                                    : { label: 'Average Ticket', value: stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders) : 0, trend: 'STABLE', isCurrency: true },
                            ].map(item => (
                                <div key={item.label} className="bg-[#1C1917] p-6 md:p-8 lg:p-10 group hover:bg-white/[0.02] transition-all">
                                    <div className="flex justify-between items-center mb-4 md:mb-5 lg:mb-6">
                                        <p className="text-[7px] md:text-[8px] font-bold text-[#A68B67] uppercase tracking-wider">{item.label}</p>
                                        <span className="text-[6px] md:text-[7px] text-white/40 font-semibold tracking-wider">{item.trend}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1.5 md:gap-2 group-hover:translate-x-1 transition-transform duration-500">
                                        {item.isCurrency && (
                                            <span className="text-base md:text-lg lg:text-xl font-sans font-semibold text-white/60">Rp</span>
                                        )}
                                        <p className="text-2xl md:text-2xl lg:text-3xl font-sans font-bold text-white leading-tight">
                                            {item.value.toLocaleString('id-ID')}{(item as any).suffix || ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Architectural Charts Placeholders */}
                        <div className="flex-1 min-h-[220px] flex items-end gap-1 px-4 relative">
                            {/* Decorative bars */}
                            {[55, 65, 45, 90, 60, 100, 80, 65, 85, 60, 75, 50].map((h, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-6 group relative">
                                    <div className="w-full relative px-1">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${h}%` }}
                                            transition={{ delay: 1 + i * 0.05, duration: 2, ease: [0.22, 1, 0.36, 1] }}
                                            className="w-full bg-[#A68B67]/20 group-hover:bg-[#A68B67] rounded-t-full transition-all duration-700 relative"
                                        />
                                    </div>
                                    <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest group-hover:text-[#A68B67] transition-colors">{['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][i]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="bg-[#FDFBF7] rounded-3xl p-6 md:p-8 lg:p-12 border border-[#EAE1D3] shadow-xl shadow-black/5 flex flex-col relative overflow-hidden group"
                >
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#A68B67_1.5px,transparent_1.5px)] [background-size:32px_32px]"></div>
                    <div className="relative z-10 flex flex-col h-full">
                        <div className="mb-8 md:mb-12 lg:mb-16">
                            <h3 className="text-[7px] md:text-[8px] lg:text-[9px] font-bold text-[#A68B67] uppercase tracking-widest md:tracking-[0.3em] mb-3 md:mb-4">Operations Hub</h3>
                            <p className="text-2xl md:text-2xl lg:text-3xl font-sans font-bold text-[#4A3F35] leading-tight">Status Pesanan</p>
                        </div>

                        <div className="space-y-4 md:space-y-5 lg:space-y-6 flex-1">
                            <div className="group/item flex items-center gap-4 md:gap-6 lg:gap-10 p-4 md:p-6 lg:p-8 rounded-2xl border border-transparent hover:border-[#EAE1D3] hover:bg-white transition-all duration-700">
                                <CircularProgress value={stats.totalOrders - stats.pendingOrders} max={stats.totalOrders || 1} color="#A68B67" size={56} strokeWidth={4} />
                                <div className="flex-1">
                                    <h4 className="text-[10px] md:text-[11px] lg:text-[12px] font-bold text-[#4A3F35] uppercase tracking-wider mb-1.5">Tercetak</h4>
                                    <p className="text-[8px] text-[#A68B67] font-semibold uppercase tracking-widest opacity-80">Siklus Berhasil</p>
                                </div>
                            </div>
                            <div className="group/item flex items-center gap-4 md:gap-6 lg:gap-10 p-4 md:p-6 lg:p-8 rounded-2xl border border-transparent hover:border-[#EAE1D3] hover:bg-white transition-all duration-700">
                                <CircularProgress value={stats.pendingOrders} max={stats.totalOrders || 1} color="#4A3F35" size={56} strokeWidth={4} />
                                <div className="flex-1">
                                    <h4 className="text-[10px] md:text-[11px] lg:text-[12px] font-bold text-[#4A3F35] uppercase tracking-wider mb-1.5">Menunggu</h4>
                                    <p className="text-[8px] text-[#A68B67] font-semibold uppercase tracking-widest opacity-80">Tindakan Studio</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 md:mt-12 lg:mt-16">
                            <Link href="/admin/orders">
                                <button className="w-full bg-[#1C1917] hover:bg-[#A68B67] hover:shadow-xl hover:shadow-[#A68B67]/20 text-white py-4 md:py-5 lg:py-6 rounded-2xl flex items-center justify-center gap-4 transition-all duration-500 shadow-lg text-[8px] md:text-[10px] font-bold uppercase tracking-widest">
                                    <span>Buka Log Pesanan</span>
                                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Premium Shortcuts Grid */}
            <div className="space-y-6 md:space-y-8 lg:space-y-12">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-px bg-[#A68B67]/30" />
                    <h3 className="text-[10px] font-bold text-[#A68B67] uppercase tracking-widest">Studio Quick Access</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        { label: 'Studio Themes', desc: 'Kurasi Frame Fotografi', icon: Palette, href: '/admin/themes', color: "text-[#A68B67]", bg: "bg-white" },
                        { label: 'Order Archives', desc: 'Log Transaksi & Hasil Karya', icon: ShoppingCart, href: '/admin/orders', color: "text-[#4A3F35]", bg: "bg-white" },
                        { label: 'Reports & Stats', desc: 'Analitik Pertumbuhan Studio', icon: TrendingUp, href: '/admin/reports', color: "text-[#A68B67]", bg: "bg-white" },
                    ].map((item, i) => (
                        <Link key={item.label} href={item.href}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -4 }}
                                transition={{ delay: 0.8 + i * 0.1 }}
                                className={`p-8 rounded-2xl border border-[#EAE1D3] shadow-md hover:shadow-xl hover:shadow-[#4A3F35]/8 hover:border-[#A68B67]/30 ${item.bg} transition-all duration-500 group flex items-center gap-6`}
                            >
                                <div className={`p-5 bg-gradient-to-br from-[#F5F1EA] to-[#EAE1D3]/50 rounded-2xl ${item.color} border border-[#EAE1D3] group-hover:scale-110 group-hover:shadow-md transition-all duration-500`}>
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-lg font-sans font-bold text-[#4A3F35] group-hover:text-[#A68B67] transition-colors duration-300">{item.label}</h4>
                                    <p className="text-[9px] font-semibold text-[#8C7E6A] uppercase tracking-widest mt-2">{item.desc}</p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-[#F5F1EA] group-hover:bg-[#4A3F35] flex items-center justify-center transition-all duration-500">
                                    <ChevronRight className="w-4 h-4 text-[#A68B67] group-hover:text-white transition-colors duration-300" />
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Activation Modal */}
            <AnimatePresence>
                {showActivationModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isActivating && setShowActivationModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-[#EAE1D3]"
                        >
                            <div className="p-10 space-y-8 text-center">
                                <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center shadow-lg ${
                                    isKioskLocked ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                                }`}>
                                    {isKioskLocked ? <Monitor size={40} /> : <Rocket size={40} className="animate-bounce" />}
                                </div>

                                <div className="space-y-3">
                                    <h2 className="text-3xl font-black text-[#1C1917] uppercase tracking-tight">
                                        {isKioskLocked ? 'Aktivasi Mesin' : 'Mesin Siap!'}
                                    </h2>
                                    <p className="text-sm text-[#8C7E6A] font-medium leading-relaxed">
                                        {isKioskLocked 
                                            ? 'Anda terdeteksi masuk dari perangkat Kiosk. Konfirmasi di bawah untuk membuka akses photobooth.' 
                                            : 'Kiosk telah berhasil dibuka. Layar di mesin photobooth akan otomatis masuk ke menu utama.'}
                                    </p>
                                </div>

                                <div className="flex flex-col gap-4">
                                    {isKioskLocked ? (
                                        <button
                                            disabled={isActivating}
                                            onClick={handleActivate}
                                            className="w-full py-5 bg-[#1C1917] text-white rounded-2xl font-bold uppercase tracking-[0.2em] text-xs hover:bg-[#A68B67] transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-3"
                                        >
                                            {isActivating ? <RefreshCw className="animate-spin" /> : <Power size={18} />}
                                            {isActivating ? 'Memproses...' : 'Buka Kiosk Sekarang'}
                                        </button>
                                    ) : (
                                        <div className="py-5 bg-green-50 text-green-700 rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 border border-green-100">
                                            <ShieldCheck size={16} /> Berhasil Diaktifkan
                                        </div>
                                    )}
                                    
                                    <button
                                        disabled={isActivating}
                                        onClick={() => {
                                            setShowActivationModal(false);
                                            router.replace('/admin');
                                        }}
                                        className="w-full py-4 text-[#8C7E6A] font-bold uppercase tracking-widest text-[10px] hover:text-[#4A3F35] transition-colors"
                                    >
                                        Nanti Saja
                                    </button>
                                </div>
                            </div>
                            
                            {/* Decorative Bottom Bar */}
                            <div className="h-2 w-full bg-gradient-to-r from-[#A68B67] via-[#4A3F35] to-[#A68B67]" />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
