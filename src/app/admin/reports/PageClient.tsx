'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp,
    ShoppingCart,
    ChevronRight,
    Download,
    Wallet,
    X,
    Trash2,
    ChevronLeft,
    Edit3,
    Check,
    AlertTriangle,
    Filter,
    RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import { useAdminProfile } from '@/contexts/AdminProfileContext';
import { toast } from 'react-hot-toast';

// Components
import LoadingScreen from '@/components/ui/LoadingScreen';
import AdminPageSkeleton from '@/components/ui/AdminPageSkeleton';
import StatCardSmall from '@/components/ui/StatCardSmall';
import FinancialBlueprint from '@/components/admin/reports/FinancialBlueprint';
import FilterSection from '@/components/admin/reports/FilterSection';
import Modal from '@/components/ui/Modal';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import PaginationBar from '@/components/ui/PaginationBar';
import { useAdminReports, useAdminUsers, buildReportsKey } from '@/hooks/useAdminSettings';
import { jsonFetcher } from '@/lib/fetcher';

interface Transaction {
    id: string;
    user: string;
    frame: string;
    quantity: number;
    price: number;
    costPrice: number;
    date: string;
    status: string;
    revenue: number;
    cost: number;
    profit: number;
}

interface FinancialSummary {
    totalRevenue: number;
    totalEstimatedCost: number;
    totalProfit: number;
    margin: number;
}

interface TopFrame {
    name: string;
    count: number;
    revenue: number;
}

interface ReportData {
    transactions: Transaction[];
    topFrames: TopFrame[];
    financialSummary: FinancialSummary;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isPaymentEnabled?: boolean;
    canInputCapital?: boolean;
    initialCapital?: number;
}

export default function ReportsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingCostId, setEditingCostId] = useState<string | null>(null);
    const [tempCost, setTempCost] = useState<string>('');
    const [initialCapitalInput, setInitialCapitalInput] = useState<string>('');
    const [appliedCapital, setAppliedCapital] = useState<number>(0);
    const [confirmModal, setConfirmModal] = useState<{ show: boolean; ids: string[]; isAll: boolean }>({
        show: false,
        ids: [],
        isAll: false
    });
    const [isSyncing, setIsSyncing] = useState(false);

    const { data: session } = useSession();
    const { userProfile, profileLoaded } = useAdminProfile();
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const isAdminOrKaryawan = (session?.user as any)?.role === 'ADMIN' || (session?.user as any)?.role === 'KARYAWAN' || userProfile?.role === 'ADMIN' || userProfile?.role === 'KARYAWAN';
    const isClient = (session?.user as any)?.role === 'CLIENT' || userProfile?.role === 'CLIENT';
    const isAdmin = (session?.user as any)?.role === 'ADMIN' || userProfile?.role === 'ADMIN';
    const isKaryawan = (session?.user as any)?.role === 'KARYAWAN' || userProfile?.role === 'KARYAWAN';

    const itemsPerPage = 25;
    const reportsEnabled = profileLoaded && (viewMode === 'detail' || isClient);
    const reportUserName = isClient ? userProfile?.name : selectedUser?.name;

    const { data: users = [], isLoading: usersLoading } = useAdminUsers(
        profileLoaded && isAdminOrKaryawan && viewMode === 'list',
    );

    const { data, isLoading: reportsLoading, mutate: mutateReports } = useAdminReports(
        {
            startDate,
            endDate,
            userName: reportUserName,
            search: debouncedSearch,
            page: currentPage,
            limit: itemsPerPage,
        },
        reportsEnabled,
    );

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => window.clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate, debouncedSearch, reportUserName]);

    useEffect(() => {
        if (!profileLoaded || !userProfile) return;

        if (userProfile.role === 'CLIENT') {
            if (!userProfile.isPaymentEnabled) {
                window.location.href = '/admin';
                return;
            }

            setAppliedCapital(userProfile.initialCapital || 0);
            setInitialCapitalInput((userProfile.initialCapital || 0).toString());
            setSelectedUser({
                id: userProfile.id,
                name: userProfile.name,
                email: userProfile.email,
                role: userProfile.role,
                isPaymentEnabled: userProfile.isPaymentEnabled,
                canInputCapital: userProfile.canInputCapital,
                initialCapital: userProfile.initialCapital,
            });
        }
    }, [userProfile, profileLoaded]);

    useEffect(() => {
        if (!profileLoaded && !session?.user) return;

        const role = userProfile?.role || (session?.user as any)?.role;
        if (role === 'CLIENT') {
            setViewMode('detail');
        } else if (role === 'ADMIN' || role === 'KARYAWAN') {
            setViewMode('list');
        }
    }, [userProfile, session, profileLoaded]);

    const handleSyncPayments = async () => {
        setIsSyncing(true);
        const myToast = toast.loading('Mensinkronkan transaksi tertunda dengan DOKU...');
        try {
            const res = await fetch('/api/admin/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                const result = await res.json();
                toast.success(result.message || 'Sinkronisasi berhasil!', { id: myToast });
                void mutateReports();
            } else {
                throw new Error();
            }
        } catch (error) {
            toast.error('Gagal mensinkronkan transaksi dengan DOKU.', { id: myToast });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleUserSelect = (user: User) => {
        setSelectedUser(user);
        setAppliedCapital(user.initialCapital || 0);
        setInitialCapitalInput((user.initialCapital || 0).toString());
        setViewMode('detail');
        setCurrentPage(1);
    };

    const handleBackToList = () => {
        setSelectedUser(null);
        setViewMode('list');
        setCurrentPage(1);
    };

    const handleApplyCapital = async () => {
        const value = Number(initialCapitalInput);
        setAppliedCapital(value);

        try {
            if (isAdmin && selectedUser) {
                await fetch(`/api/admin/users/${selectedUser.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ initialCapital: value })
                });
            } else if (isClient || isAdmin) {
                await fetch('/api/admin/profile', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ initialCapital: value })
                });
            }
        } catch (error: any) {
            console.error('Failed to save capital:', error);
        }
    };

    const handleUpdateCost = async (id: string, costValue: number) => {
        try {
            const res = await fetch('/api/admin/reports', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, costPrice: costValue })
            });
            if (res.ok) {
                await mutateReports();
                setEditingCostId(null);
            }
        } catch (error) {
            console.error('Failed to update cost:', error);
        }
    };

    const handleExportExcel = async () => {
        if (!data) return;

        try {
            const exportKey = buildReportsKey({
                startDate,
                endDate,
                userName: reportUserName,
                search: debouncedSearch,
                exportAll: true,
            });
            const exportData = await jsonFetcher<ReportData>(exportKey);
            if (!exportData.transactions.length) return;

            const mainData = exportData.transactions.map(t => ({
            'ID PESANAN': t.id,
            'NAMA PELANGGAN': t.user,
            'NAMA FRAME': t.frame,
            'JUMLAH (QTY)': t.quantity,
            'HARGA SATUAN (Rp)': t.price / t.quantity,
            'TOTAL PENDAPATAN (Rp)': t.revenue,
            'TANGGAL': new Date(t.date).toLocaleString('id-ID'),
            'STATUS': t.status.toUpperCase()
        }));

        const wb = XLSX.utils.book_new();
        const wsMain = XLSX.utils.json_to_sheet(mainData);
        const totalRevenue = exportData.transactions.reduce((sum, t) => sum + t.revenue, 0);

        XLSX.utils.sheet_add_aoa(wsMain, [
            [],
            ['', '', '', '', 'TOTAL PENDAPATAN', totalRevenue],
            ['', '', '', '', 'MODAL INVESTASI', appliedCapital],
            ['', '', '', '', 'KEUNTUNGAN BERSIH', totalRevenue - appliedCapital]
        ], { origin: -1 });

        XLSX.utils.book_append_sheet(wb, wsMain, "Transaksi Terinci");
        XLSX.writeFile(wb, `DOVELENS-REPORT-${new Date().getTime()}.xlsx`);
        } catch (error) {
            console.error('Failed to export reports:', error);
            toast.error('Gagal mengekspor laporan.');
        }
    };

    const handleDelete = async (ids: string[], isAll = false) => {
        setIsDeleting(true);
        try {
            const res = await fetch('/api/admin/reports', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, all: isAll })
            });

            if (res.ok) {
                await mutateReports();
                setSelectedIds([]);
                if (isAll) setCurrentPage(1);
                setConfirmModal({ show: false, ids: [], isAll: false });
            }
        } catch (error) {
            console.error('Failed to delete:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(price);
    };

    const loading = (viewMode === 'list' && usersLoading) || (reportsEnabled && reportsLoading && !data);

    if (loading) return <AdminPageSkeleton />;

    if (viewMode === 'list' && isAdminOrKaryawan) {
        return (
            <div className="space-y-8 pb-20">
                {/* Modern Hero Header */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#1C1917] p-8 md:p-12 shadow-2xl shadow-black/20">
                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[linear-gradient(to_right,#A68B67_1px,transparent_1px),linear-gradient(to_bottom,#A68B67_1px,transparent_1px)] [background-size:32px_32px]" />
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#A68B67]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-[#4A3F35]/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A68B67] to-[#8C7E6A] flex items-center justify-center shadow-lg shadow-[#A68B67]/20">
                                <TrendingUp className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#A68B67]/80">Client Database</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-sans font-extrabold text-white tracking-tight">Akun Terdaftar</h1>
                        <p className="text-white/40 font-medium text-lg">Pilih klien untuk melihat laporan keuangan detail</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {users.filter(u => u.role === 'CLIENT' && u.isPaymentEnabled).map((user, idx) => (
                        <motion.button
                            key={user.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05, type: 'spring', stiffness: 100 }}
                            onClick={() => handleUserSelect(user)}
                            className="bg-white/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-[#EAE1D3] shadow-[0_8px_32px_-8px_rgba(74,63,53,0.08)] hover:shadow-[0_24px_56px_-12px_rgba(74,63,53,0.15)] hover:border-[#A68B67]/40 hover:-translate-y-2 transition-all duration-500 text-left flex flex-col group h-full relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A68B67]/5 rounded-full blur-3xl translate-x-12 -translate-y-12 group-hover:bg-[#A68B67]/10 transition-colors" />
                            
                            <div className="relative z-10 flex flex-col h-full w-full">
                                <div className="flex justify-between items-start mb-8 w-full">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F5F1EA] to-[#EAE1D3] flex items-center justify-center text-[#4A3F35] font-sans font-bold text-2xl border border-[#EAE1D3] group-hover:from-[#A68B67] group-hover:to-[#8C7E6A] group-hover:text-white group-hover:border-transparent transition-all duration-500 group-hover:shadow-lg group-hover:shadow-[#A68B67]/20">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div className="px-4 py-2 bg-green-50/50 text-green-600 text-[8px] font-black uppercase tracking-widest rounded-xl border border-green-100 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        Payment ON
                                    </div>
                                </div>

                                <div className="space-y-2 mb-10">
                                    <h3 className="text-2xl font-sans font-bold text-[#4A3F35] tracking-tight group-hover:text-[#A68B67] transition-colors">{user.name}</h3>
                                    <p className="text-[11px] font-medium text-[#8C7E6A] uppercase tracking-wider opacity-60 truncate">{user.email}</p>
                                </div>

                                <div className="mt-auto pt-8 border-t border-[#F5F1EA] flex items-center justify-between w-full">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[8px] font-black text-[#A68B67] uppercase tracking-widest">Financial Records</span>
                                        <span className="text-[10px] font-bold text-[#4A3F35] opacity-40">Klik Untuk Meninjau</span>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-[#F5F1EA] group-hover:bg-[#4A3F35] flex items-center justify-center transition-all duration-500 border border-[#EAE1D3] group-hover:border-transparent">
                                        <ChevronRight className="w-5 h-5 text-[#A68B67] group-hover:text-white transition-colors" />
                                    </div>
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>
        );
    }

    const transactions = (data?.transactions as Transaction[] | undefined) ?? [];
    const pagination = data?.pagination;
    const paginatedTransactions = transactions;

    return (
        <div className="space-y-8 pb-20">
            {/* Modern Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#1C1917] p-8 md:p-12 shadow-2xl shadow-black/20">
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[linear-gradient(to_right,#A68B67_1px,transparent_1px),linear-gradient(to_bottom,#A68B67_1px,transparent_1px)] [background-size:32px_32px]" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#A68B67]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-[#4A3F35]/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

                <div className="relative z-10 space-y-8">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                            <div className="flex items-center gap-3">
                                {viewMode === 'detail' && isAdminOrKaryawan && !isClient && (
                                    <button onClick={handleBackToList} className="group flex items-center gap-2 hover:text-white transition-colors mr-4 bg-white/[0.06] backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white/70">
                                        <ChevronLeft className="w-4 h-4" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">Kembali</span>
                                    </button>
                                )}
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A68B67] to-[#8C7E6A] flex items-center justify-center shadow-lg shadow-[#A68B67]/20">
                                    <TrendingUp className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#A68B67]/80">Business Insight Hub</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-sans font-extrabold text-white tracking-tight">
                                {isClient ? `Laporan: ${userProfile?.name}` : (selectedUser ? `Laporan: ${selectedUser.name}` : 'Laporan & Analitik')}
                            </h1>
                        </motion.div>

                        <div className="flex flex-col md:flex-row items-end gap-4">
                            {(!isClient || userProfile?.canInputCapital) && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-[9px] font-bold text-[#A68B67]/80 uppercase tracking-widest ml-1">Input Modal Bahan</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            value={initialCapitalInput}
                                            onChange={(e) => setInitialCapitalInput(e.target.value)}
                                            className="pl-6 pr-6 py-3.5 bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-xl text-[11px] font-bold text-white/80 focus:outline-none focus:border-[#A68B67]/40 min-w-[200px] placeholder:text-white/30 transition-colors"
                                        />
                                        <button onClick={handleApplyCapital} className="bg-[#A68B67] text-white px-6 py-3.5 rounded-xl text-[9px] font-bold tracking-widest hover:bg-[#8C7E6A] transition-colors shadow-lg shadow-[#A68B67]/20">
                                            Update Modal
                                        </button>
                                    </div>
                                </div>
                            )}
                             <button
                                onClick={handleSyncPayments}
                                disabled={isSyncing}
                                className="bg-white/[0.06] backdrop-blur-md text-white/70 hover:text-white border border-white/10 px-8 py-3.5 rounded-xl shadow-sm hover:bg-white/10 transition-all flex items-center gap-3 disabled:opacity-50 hover:shadow-md"
                            >
                                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                                <span className="text-[11px] font-bold uppercase tracking-wider">Singkronkan Transaksi</span>
                            </button>
                            <button onClick={handleExportExcel} disabled={!data || (pagination?.total ?? 0) === 0} className="bg-white/[0.06] backdrop-blur-md text-white/70 hover:text-white border border-white/10 px-8 py-3.5 rounded-xl shadow-sm hover:bg-white/10 transition-all flex items-center gap-3 disabled:opacity-50 hover:shadow-md">
                                <Download className="w-5 h-5" />
                                <span className="text-[11px] font-bold uppercase tracking-wider">Ekspor Excel</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                <StatCardSmall
                    title="Total Modal Investasi"
                    value={formatPrice(appliedCapital)}
                    icon={<Filter className="w-5 h-5" />}
                    subtitle="Operational Budget"
                    variant="accent"
                />
                <StatCardSmall
                    title="Keuntungan Bersih"
                    value={formatPrice((data?.financialSummary.totalRevenue || 0) - appliedCapital)}
                    icon={<Wallet className="w-5 h-5" />}
                    subtitle="Profit setelah Investasi"
                />
                <StatCardSmall
                    title="Volume Transaksi"
                    value={pagination?.total ?? 0}
                    icon={<ShoppingCart className="w-5 h-5" />}
                    subtitle="Aktivitas Reservasi"
                    variant="dark"
                />
            </div>

            <FinancialBlueprint
                totalRevenue={data?.financialSummary.totalRevenue || 0}
                appliedCapital={appliedCapital}
            />

            {/* Toolbar Section */}
            {(isAdmin || isKaryawan || userProfile?.canManageFilters === true) && (
                <div className="bg-white border border-[#EAE1D3] rounded-3xl p-6 md:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 shadow-md">
                    <div className="flex-1">
                        <FilterSection
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            startDate={startDate}
                            setStartDate={setStartDate}
                            endDate={endDate}
                            setEndDate={setEndDate}
                        />
                    </div>

                    {isAdminOrKaryawan && viewMode === 'detail' && (
                        <div className="flex items-center gap-3 pt-6 xl:pt-0 border-t xl:border-t-0 xl:border-l border-[#EAE1D3] xl:pl-6">
                            <AnimatePresence mode="wait">
                                {selectedIds.length > 0 && (
                                    <motion.button
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        onClick={() => setConfirmModal({ show: true, ids: selectedIds, isAll: false })}
                                        className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 px-5 h-12 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all whitespace-nowrap"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Hapus Terpilih ({selectedIds.length})
                                    </motion.button>
                                )}
                            </AnimatePresence>

                            <button
                                onClick={() => setConfirmModal({ show: true, ids: [], isAll: true })}
                                className="flex items-center gap-2 bg-[#FDFBF7] text-[#4A3F35] border border-[#EAE1D3] px-5 h-12 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-[#4A3F35] hover:text-white transition-all group whitespace-nowrap"
                            >
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 group-hover:text-white transition-colors" />
                                Bersihkan Riwayat
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Table Section */}
            <div className="bg-white border border-[#EAE1D3] rounded-3xl overflow-hidden shadow-md">
                <table className="w-full text-left">
                    <thead className="bg-[#F5F1EA] border-b border-[#EAE1D3]">
                        <tr>
                            {isAdminOrKaryawan && (
                                <th className="pl-8 py-6 w-10">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 accent-[#A68B67] rounded-md"
                                        checked={selectedIds.length === paginatedTransactions.length && paginatedTransactions.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedIds(paginatedTransactions.map(t => t.id));
                                            } else {
                                                setSelectedIds([]);
                                            }
                                        }}
                                    />
                                </th>
                            )}
                            <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-[#8C7E6A]">ID Pesanan</th>
                            <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-[#8C7E6A]">Frame</th>
                            <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-[#8C7E6A]">Pendapatan</th>
                            <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-[#8C7E6A]">Tanggal</th>
                            {isAdminOrKaryawan && <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-[#8C7E6A] text-right">Aksi</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTransactions.map((t) => (
                            <tr key={t.id} className={`border-b border-[#F5F1EA] hover:bg-[#FDFBF7] transition-colors ${selectedIds.includes(t.id) ? 'bg-[#FDFBF7]' : ''}`}>
                                {isAdminOrKaryawan && (
                                    <td className="pl-8 py-6">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 accent-[#A68B67]"
                                            checked={selectedIds.includes(t.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedIds(prev => [...prev, t.id]);
                                                } else {
                                                    setSelectedIds(prev => prev.filter(id => id !== t.id));
                                                }
                                            }}
                                        />
                                    </td>
                                )}
                                <td className="px-8 py-6 text-[11px] font-medium font-mono text-[#A68B67]">{t.id.slice(0, 8)}</td>
                                <td className="px-8 py-6">
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-bold uppercase text-[#4A3F35] tracking-wider">{t.frame}</p>
                                        <p className="text-[9px] text-[#A68B67] uppercase font-bold tracking-widest">{t.user}</p>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-[11px] font-bold text-[#4A3F35] tracking-wide">{formatPrice(t.revenue)}</td>
                                <td className="px-8 py-6 text-[10px] text-[#8C7E6A] font-bold tracking-wide">
                                    {new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                {isAdminOrKaryawan && (
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={() => setConfirmModal({ show: true, ids: [t.id], isAll: false })}
                                            className="p-2 text-[#8C7E6A] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                            title="Hapus Transaksi"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {pagination && (
                <PaginationBar
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total}
                    onPageChange={setCurrentPage}
                />
            )}

            <DeleteConfirmModal
                isOpen={confirmModal.show}
                onClose={() => setConfirmModal({ show: false, ids: [], isAll: false })}
                onConfirm={() => handleDelete(confirmModal.ids, confirmModal.isAll)}
                saving={isDeleting}
            />
        </div>
    );
}
