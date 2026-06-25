'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar,
    Search,
    ChevronLeft,
    ChevronRight,
    Download,
    Filter,
    X,
    Banknote,
    ShoppingCart,
    Trash2,
    AlertTriangle,
    Clock,
    User as UserIcon,
    Users
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import { useAdminProfile } from '@/contexts/AdminProfileContext';

// Components
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';

interface OfflineOrder {
    id: string;
    userName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    frameId: string;
    frameName: string;
    quantity: number;
    pricePerFrame: number;
    totalPrice: number;
    paymentStatus: string;
    createdAt: string;
}

interface OfflineReportData {
    orders: OfflineOrder[];
    summary: {
        totalRevenue: number;
        totalSessions: number;
    };
}

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isPaymentEnabled?: boolean;
    createdAt?: string;
}

export default function OfflineReportsPage() {
    const [data, setData] = useState<OfflineReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const { data: session } = useSession();
    const { userProfile, profileLoaded } = useAdminProfile();
    const isAdminOrKaryawan = (session?.user as any)?.role === 'ADMIN' || (session?.user as any)?.role === 'KARYAWAN' || userProfile?.role === 'ADMIN' || userProfile?.role === 'KARYAWAN';

    // New State for Admin View
    const [users, setUsers] = useState<User[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    // Filter and Delete States
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ show: boolean; ids: string[]; isAll: boolean }>({
        show: false,
        ids: [],
        isAll: false
    });
    
    // Check if current user is ADMIN specifically (not just Karyawan)
    const isAdmin = (session?.user as any)?.role === 'ADMIN' || userProfile?.role === 'ADMIN';

    useEffect(() => {
        if (!profileLoaded && !session?.user) return;

        const role = userProfile?.role || (session?.user as any)?.role;
        if (role === 'CLIENT' && userProfile) {
            setSelectedUser({
                id: userProfile.id,
                name: userProfile.name,
                email: userProfile.email,
                role: userProfile.role,
                isPaymentEnabled: userProfile.isPaymentEnabled,
                createdAt: userProfile.createdAt,
            });
            setViewMode('detail');
            void fetchOfflineReports(startDate, endDate);
        } else if (role === 'ADMIN' || role === 'KARYAWAN') {
            setViewMode('list');
            void fetchUsers();
        }
    }, [userProfile, session, profileLoaded]);

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

    const fetchOfflineReports = async (start = '', end = '', userName = '', adminUserId = '') => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (start) params.append('startDate', start);
            if (end) params.append('endDate', end);
            if (userName) params.append('userName', userName);
            if (adminUserId) params.append('adminUserId', adminUserId);

            const url = `/api/admin/offline-reports?${params.toString()}`;
            const res = await fetch(url);
            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (error) {
            console.error('Failed to fetch offline reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartDateChange = (val: string) => {
        setStartDate(val);
        if (endDate) fetchOfflineReports(val, endDate, '', selectedUser?.id || '');
    };

    const handleEndDateChange = (val: string) => {
        setEndDate(val);
        if (startDate) fetchOfflineReports(startDate, val, '', selectedUser?.id || '');
    };

    const handleUserSelect = (user: User) => {
        setSelectedUser(user);
        setViewMode('detail');
        fetchOfflineReports(startDate, endDate, '', user.id);
    };

    const handleBackToList = () => {
        setSelectedUser(null);
        setViewMode('list');
        setData(null);
        setSelectedIds([]);
    };

    const handleDelete = async (ids: string[], isAll = false) => {
        setIsDeleting(true);
        try {
            const res = await fetch('/api/admin/offline-reports', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, all: isAll })
            });

            if (res.ok) {
                await fetchOfflineReports(startDate, endDate, '', selectedUser?.id || '');
                setSelectedIds([]);
                if (isAll) setCurrentPage(1);
                setConfirmModal({ show: false, ids: [], isAll: false });
            }
        } catch (error) {
            console.error('Failed to delete offline sessions:', error);
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

    const handleExportExcel = () => {
        if (!data || data.orders.length === 0) return;

        const mainData = data.orders.map(o => ({
            'ID PESANAN': o.id,
            'NAMA PELANGGAN': o.userName,
            'NAMA FRAME': o.frameName,
            'JUMLAH (QTY)': o.quantity,
            'TOTAL PENDAPATAN (Rp)': o.totalPrice,
            'TANGGAL': new Date(o.createdAt).toLocaleString('id-ID'),
            'STATUS': o.paymentStatus.toUpperCase()
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(mainData);
        XLSX.utils.book_append_sheet(wb, ws, "Sesi Manual");
        XLSX.writeFile(wb, `DOVELENS-OFFLINE-REPORT-${new Date().getTime()}.xlsx`);
    };

    const filteredOrders = data?.orders.filter(o =>
        o.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.frameName.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 border-2 border-[#A68B67]/20 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-[#A68B67] border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#A68B67] animate-pulse">Menilik Non Payment Report...</p>
            </div>
        );
    }

    // LIST VIEW (For Admin/Karyawan)
    if (viewMode === 'list' && isAdminOrKaryawan) {
        return (
            <div className="space-y-12 pb-24">
                {/* Premium Hero Header for List View */}
                <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#1C1917] p-10 md:p-16 shadow-2xl shadow-black/20 mb-16">
                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[linear-gradient(to_right,#A68B67_1px,transparent_1px),linear-gradient(to_bottom,#A68B67_1px,transparent_1px)] [background-size:32px_32px]" />
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#A68B67]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#4A3F35]/20 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />

                    <div className="relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A68B67] to-[#8C7E6A] flex items-center justify-center shadow-lg shadow-[#A68B67]/20">
                                    <Users className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#A68B67]/80">Client Database Hub</span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-sans font-extrabold text-white tracking-tight">Arsip Klien Terdaftar</h1>
                            <p className="text-white/40 font-medium text-lg md:text-xl max-w-2xl">Pilih klien photobooth untuk meninjau rekaman sesi operasional secara mendalam.</p>
                        </motion.div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {users.filter(u => u.role === 'CLIENT' && !u.isPaymentEnabled).map((user, idx) => (
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
                                    <div className="px-4 py-2 bg-red-50/50 text-red-600 text-[8px] font-black uppercase tracking-widest rounded-xl border border-red-100 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                        Full Sewa
                                    </div>
                                </div>

                                <div className="space-y-2 mb-10">
                                    <h3 className="text-2xl font-sans font-bold text-[#4A3F35] tracking-tight group-hover:text-[#A68B67] transition-colors">{user.name}</h3>
                                    <p className="text-[11px] font-medium text-[#8C7E6A] uppercase tracking-wider opacity-60 truncate">{user.email}</p>
                                </div>

                                <div className="mt-auto pt-8 border-t border-[#F5F1EA] flex items-center justify-between w-full">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[8px] font-black text-[#A68B67] uppercase tracking-widest">Database Sesi</span>
                                        <span className="text-[10px] font-bold text-[#4A3F35] opacity-40">Klik Untuk Memantau</span>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-[#F5F1EA] group-hover:bg-[#4A3F35] flex items-center justify-center transition-all duration-500 border border-[#EAE1D3] group-hover:border-transparent">
                                        <ChevronRight className="w-5 h-5 text-[#A68B67] group-hover:text-white transition-colors" />
                                    </div>
                                </div>
                            </div>
                        </motion.button>
                    ))}
                    {users.filter(u => u.role === 'CLIENT' && !u.isPaymentEnabled).length === 0 && (
                        <div className="col-span-full py-40 text-center bg-white/40 backdrop-blur-md rounded-[3rem] border border-[#EAE1D3] border-dashed">
                            <Users className="w-12 h-12 text-[#A68B67]/20 mx-auto mb-6" />
                            <p className="text-[10px] font-bold text-[#A68B67] uppercase tracking-[0.3em]">Belum ada arsitektur klien terdeteksi</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 mb-20">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                >
                    <div className="flex items-center gap-3 text-[#A68B67]">
                        {viewMode === 'detail' && isAdminOrKaryawan && !selectedUser && (
                            <button
                                onClick={handleBackToList}
                                className="group flex items-center gap-2 hover:text-[#4A3F35] transition-colors mr-4 bg-white px-3 py-1.5 rounded-lg border border-[#EAE1D3] shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span className="text-[9px] font-bold uppercase tracking-widest">Kembali</span>
                            </button>
                        )}
                        <Banknote className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Non Payment Session Hub</span>
                    </div>
                    <h1 className="text-6xl font-sans font-bold text-[#4A3F35] tracking-tight">
                        {userProfile?.role === 'CLIENT' ? `Laporan: ${userProfile?.name}` : (selectedUser ? `Laporan: ${selectedUser.name}` : 'Non Payment Report')}
                    </h1>
                    <p className="text-[#8C7E6A] font-medium text-lg opacity-80">Riwayat sesi untuk mode Non-Payment</p>
                </motion.div>

                <div className="relative group/export">
                    <button
                        onClick={handleExportExcel}
                        className="flex flex-col items-start gap-2 bg-[#FDFBF7] hover:bg-[#F5F1EA] text-[#4A3F35] border border-[#EAE1D3] px-8 py-5 rounded-xl transition-all shadow-lg hover:shadow-xl group disabled:opacity-50 disabled:cursor-not-allowed min-w-[240px]"
                        disabled={!data || data.orders.length === 0}
                    >
                        <div className="flex items-center gap-3 w-full">
                            <Download className="w-5 h-5 text-[#A68B67] group-hover:-translate-y-1 transition-transform" />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Ekspor ke Excel</span>
                        </div>
                        <p className="text-[8px] text-[#8C7E6A] font-bold uppercase tracking-widest opacity-70">
                            {startDate && endDate
                                ? `Periode: ${new Date(startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                : 'Semua Sesi Manual'}
                        </p>
                    </button>
                </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-[#4A3F35] p-10 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group"
                >
                    <ShoppingCart className="absolute top-0 right-0 p-8 w-40 h-40 text-white opacity-[0.03]" />
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold text-[#A68B67] uppercase tracking-widest mb-2">Total Sesi Non-Payment</p>
                        <h3 className="text-5xl font-sans font-bold text-white">{data?.summary.totalSessions || 0} <span className="text-lg not-italic font-sans font-bold text-[#A68B67]/60 ml-4">SESSIONS</span></h3>
                        <div className="mt-6 pt-6 border-t border-white/5 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#A68B67]" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#A68B67]">Non-Payment Activity Tracking</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Main Content Area - Redesigned */}
            <div className="space-y-8">
                {/* Unified Filter & Action Bar */}
                {(isAdminOrKaryawan || userProfile?.canManageFilters === true) && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/70 backdrop-blur-xl border border-[#EAE1D3] rounded-[2.5rem] p-8 md:p-10 shadow-[0_8px_32px_-8px_rgba(74,63,53,0.05)]"
                    >
                        <div className="flex flex-col xl:flex-row gap-10 items-start xl:items-center">
                            {/* Search & Date Block */}
                            <div className="flex flex-col md:flex-row items-center gap-6 flex-1 w-full">
                                <div className="relative flex-1 w-full group/search">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A68B67] group-focus-within/search:scale-110 transition-transform" />
                                    <input
                                        type="text"
                                        placeholder="Cari nama klien atau tipe frame..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                        className="w-full pl-16 pr-8 py-5 bg-[#FDFBF7]/50 border border-[#EAE1D3] rounded-2xl text-[11px] font-bold uppercase tracking-widest focus:outline-none focus:border-[#4A3F35] focus:ring-4 focus:ring-[#A68B67]/5 text-[#4A3F35] transition-all"
                                    />
                                </div>

                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-44 group/date">
                                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A68B67]" />
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => handleStartDateChange(e.target.value)}
                                            className="w-full pl-14 pr-5 py-5 bg-[#FDFBF7]/50 border border-[#EAE1D3] rounded-2xl text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-[#4A3F35] cursor-pointer"
                                        />
                                    </div>
                                    <div className="text-[#D1C4B2] font-sans italic text-xl opacity-40">to</div>
                                    <div className="relative flex-1 md:w-44 group/date">
                                        <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A68B67]" />
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => handleEndDateChange(e.target.value)}
                                            className="w-full pl-14 pr-5 py-5 bg-[#FDFBF7]/50 border border-[#EAE1D3] rounded-2xl text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-[#4A3F35] cursor-pointer"
                                        />
                                    </div>
                                    {(startDate || endDate) && (
                                        <button
                                            onClick={() => {
                                                setStartDate('');
                                                setEndDate('');
                                                fetchOfflineReports(undefined, undefined, selectedUser?.name || '');
                                            }}
                                            className="p-5 text-red-400 hover:bg-red-50 rounded-2xl border border-red-100 transition-all hover:shadow-lg hover:shadow-red-500/10"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Admin Actions Block */}
                            {isAdmin && (
                                <div className="flex items-center gap-4 pt-8 xl:pt-0 xl:pl-10 border-t xl:border-t-0 xl:border-l border-[#EAE1D3] w-full xl:w-auto">
                                    <AnimatePresence mode="wait">
                                        {selectedIds.length > 0 && (
                                            <motion.button
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                onClick={() => setConfirmModal({ show: true, ids: selectedIds, isAll: false })}
                                                className="flex items-center gap-3 bg-red-600 text-white px-8 h-16 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 whitespace-nowrap"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Hapus ({selectedIds.length})
                                            </motion.button>
                                        )}
                                    </AnimatePresence>

                                    <button
                                        onClick={() => setConfirmModal({ show: true, ids: [], isAll: true })}
                                        className="flex-1 xl:flex-none flex items-center justify-center gap-3 bg-white text-[#4A3F35] border border-[#EAE1D3] px-8 h-16 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-[#4A3F35] transition-all group whitespace-nowrap hover:shadow-lg"
                                    >
                                        <AlertTriangle className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                                        Clear History
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* Table Section Redesigned */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/80 backdrop-blur-xl rounded-[3rem] border border-[#EAE1D3] shadow-[0_20px_60px_-15px_rgba(74,63,53,0.08)] overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gradient-to-r from-[#F5F1EA] to-[#FDFBF7] text-[10px] font-black text-[#8C7E6A] uppercase tracking-[0.2em] border-b border-[#EAE1D3]">
                                    {isAdmin && (
                                        <th className="pl-12 py-10 w-20">
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 accent-[#4A3F35] rounded-lg cursor-pointer transition-all border-2 border-[#EAE1D3]"
                                                    checked={selectedIds.length === paginatedOrders.length && paginatedOrders.length > 0}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedIds(paginatedOrders.map(o => o.id));
                                                        } else {
                                                            setSelectedIds([]);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </th>
                                    )}
                                    <th className="px-10 py-10">Database ID</th>
                                    <th className="px-10 py-10">Client Profile</th>
                                    <th className="px-10 py-10">Frame Selection</th>
                                    <th className="px-12 py-10 text-right">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F1EA]">
                                {paginatedOrders.map((order, idx) => (
                                    <motion.tr 
                                        key={order.id} 
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className={`group hover:bg-[#FDFBF7] transition-all duration-500 ${selectedIds.includes(order.id) ? 'bg-[#FDFBF7]' : ''}`}
                                    >
                                        {isAdmin && (
                                            <td className="pl-12 py-10">
                                                <div className="flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        className="w-5 h-5 accent-[#4A3F35] rounded-lg cursor-pointer transition-all border-2 border-[#EAE1D3]"
                                                        checked={selectedIds.includes(order.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedIds(prev => [...prev, order.id]);
                                                            } else {
                                                                setSelectedIds(prev => prev.filter(id => id !== order.id));
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-10 py-10">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[11px] font-mono font-bold text-[#A68B67] tracking-widest uppercase">#{order.id.slice(0, 8)}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500/40" />
                                                    <span className="text-[8px] font-black text-[#A68B67] uppercase tracking-widest">Digital Record</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-10">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F5F1EA] to-[#EAE1D3] flex items-center justify-center text-[#4A3F35] shrink-0 border border-[#EAE1D3] group-hover:bg-[#4A3F35] group-hover:text-white transition-all duration-500 shadow-sm font-black text-lg">
                                                    {order.userName.charAt(0)}
                                                </div>
                                                <div className="flex flex-col gap-1.5 min-w-0">
                                                    <span className="text-[13px] font-sans font-extrabold text-[#4A3F35] uppercase tracking-tight truncate">{order.userName}</span>
                                                    <span className="text-[9px] font-black text-[#A68B67] uppercase tracking-[0.1em] opacity-60 truncate">{order.customerPhone || 'Direct Access'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-10">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[12px] font-sans font-black text-[#4A3F35] tracking-tight group-hover:text-[#A68B67] transition-colors">{order.frameName}</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="px-3 py-1 bg-[#F5F1EA] rounded-lg border border-[#EAE1D3] flex items-center gap-2">
                                                        <ShoppingCart className="w-3 h-3 text-[#A68B67]" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-[#4A3F35]">{order.quantity} Lembar</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-12 py-10 text-right">
                                            <div className="flex flex-col items-end gap-2.5">
                                                <div className="flex items-center justify-end w-full gap-4">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className="flex items-center gap-2 text-[#4A3F35]">
                                                            <Clock className="w-3.5 h-3.5 text-[#A68B67]" />
                                                            <span className="text-[11px] font-black uppercase tracking-widest">{new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                                                        </div>
                                                        <span className="text-[9px] text-[#A68B67] font-black uppercase tracking-[0.2em]">{new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    </div>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={() => setConfirmModal({ show: true, ids: [order.id], isAll: false })}
                                                            className="w-10 h-10 flex items-center justify-center text-[#8C7E6A] hover:text-white hover:bg-red-500 rounded-xl transition-all border border-[#EAE1D3] hover:border-red-500 shadow-sm"
                                                            title="Hapus Sesi"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}

                                {filteredOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={isAdmin ? 5 : 4} className="px-12 py-48 text-center bg-gradient-to-b from-white to-[#FDFBF7]/30">
                                            <div className="flex flex-col items-center gap-8 max-w-sm mx-auto">
                                                <div className="w-24 h-24 rounded-full bg-[#F5F1EA] flex items-center justify-center border border-[#EAE1D3] shadow-inner">
                                                    <X className="w-10 h-10 text-[#A68B67] opacity-40" />
                                                </div>
                                                <div className="space-y-3">
                                                    <p className="text-[12px] font-black uppercase tracking-[0.3em] text-[#4A3F35]">Historical Void</p>
                                                    <p className="text-[10px] font-bold text-[#8C7E6A] uppercase tracking-widest opacity-60 leading-relaxed">
                                                        Tidak ada rekaman sesi yang terdeteksi untuk parameter pencarian saat ini.
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Redesigned */}
                    {totalPages > 1 && (
                        <div className="p-12 border-t border-[#F5F1EA] bg-[#FDFBF7]/50 flex items-center justify-between">
                            <span className="text-[10px] font-black text-[#A68B67] uppercase tracking-[0.2em]">Archival Page {currentPage} <span className="text-[#D1C4B2] mx-2">of</span> {totalPages}</span>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="w-12 h-12 flex items-center justify-center border border-[#EAE1D3] rounded-2xl hover:bg-[#F5F1EA] hover:border-[#A68B67] disabled:opacity-20 transition-all shadow-sm"
                                >
                                    <ChevronLeft className="w-5 h-5 text-[#4A3F35]" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="w-12 h-12 flex items-center justify-center border border-[#EAE1D3] rounded-2xl hover:bg-[#F5F1EA] hover:border-[#A68B67] disabled:opacity-20 transition-all shadow-sm"
                                >
                                    <ChevronRight className="w-5 h-5 text-[#4A3F35]" />
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            <DeleteConfirmModal
                isOpen={confirmModal.show}
                onClose={() => setConfirmModal({ show: false, ids: [], isAll: false })}
                onConfirm={() => handleDelete(confirmModal.ids, confirmModal.isAll)}
                saving={isDeleting}
            />
        </div>
    );
}
