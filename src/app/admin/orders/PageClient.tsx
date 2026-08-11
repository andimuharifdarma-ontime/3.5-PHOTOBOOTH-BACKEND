'use client';

import { useEffect, useState } from 'react';
import { Clock, Printer, Search, Filter, Layers, Check, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';

// Components
import LoadingScreen from '@/components/ui/LoadingScreen';
import AdminPageSkeleton from '@/components/ui/AdminPageSkeleton';
import OrderRow from '@/components/admin/orders/OrderRow';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import PaginationBar from '@/components/ui/PaginationBar';
import { useAdminProfile } from '@/contexts/AdminProfileContext';
import { useAdminSettings } from '@/hooks/useAdminSettings';

interface PrintOrder {
    id: string;
    userName: string;
    frameName: string;
    quantity: number;
    pricePerFrame: number;
    totalPrice: number;
    imageUrl: string;
    paymentStatus: string;
    printedAt: string | null;
    createdAt: string;
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<PrintOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const { data: settingsData } = useAdminSettings();
    const isPaymentEnabled = settingsData?.isPaymentEnabled !== false;
    const { data: session } = useSession();
    const { userProfile } = useAdminProfile();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const isAdmin = (session?.user as any)?.role === 'ADMIN' || userProfile?.role === 'ADMIN';

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [filter, debouncedSearch]);

    useEffect(() => {
        void fetchOrders(page);
    }, [page, filter, debouncedSearch]);

    const fetchOrders = async (pageNumber = page) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(pageNumber),
                limit: '25',
                status: filter,
                search: debouncedSearch,
            });
            const res = await fetch(`/api/admin/orders?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders || []);
                setTotalPages(data.totalPages || 1);
                setTotalOrders(data.total || 0);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const syncAllOrders = async () => {
        setIsSyncing(true);
        try {
            const res = await fetch('/api/admin/orders/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (res.ok) {
                await fetchOrders();
            }
        } catch (error) {
            console.error('Failed to sync orders:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const syncOrder = async (orderId: string) => {
        try {
            const res = await fetch('/api/admin/orders/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId }),
            });
            if (res.ok) {
                await fetchOrders();
            }
        } catch (error) {
            console.error('Failed to sync order:', error);
        }
    };

    const markAsPrinted = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentStatus: 'printed', printedAt: new Date().toISOString() }),
            });
            if (res.ok) {
                fetchOrders();
            }
        } catch (error) {
            console.error('Failed to update order:', error);
        }
    };

    const filteredOrders = orders.filter(order => {
        if (!isAdmin && !isPaymentEnabled && order.paymentStatus === 'pending') return false;
        return true;
    });

    const stats = {
        total: totalOrders,
        pending: orders.filter(o => o.paymentStatus === 'pending').length,
        paid: orders.filter(o => o.paymentStatus === 'paid').length,
        printed: orders.filter(o => o.paymentStatus === 'printed').length,
    };

    // Delete single order
    const deleteOrder = async () => {
        if (!deleteOrderId) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/admin/orders?id=${deleteOrderId}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchOrders();
            }
        } catch (error) {
            console.error('Failed to delete order:', error);
        } finally {
            setIsDeleting(false);
            setDeleteOrderId(null);
        }
    };

    // Delete ALL orders
    const deleteAllOrders = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch('/api/admin/orders?all=true', { method: 'DELETE' });
            if (res.ok) {
                await fetchOrders();
            }
        } catch (error) {
            console.error('Failed to delete all orders:', error);
        } finally {
            setIsDeleting(false);
            setShowDeleteAllModal(false);
        }
    };

    if (loading) return <AdminPageSkeleton variant="table" />;

    return (
        <div className="space-y-10 pb-20">
            {/* Modern Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#1C1917] p-8 md:p-12 shadow-2xl shadow-black/20">
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[linear-gradient(to_right,#A68B67_1px,transparent_1px),linear-gradient(to_bottom,#A68B67_1px,transparent_1px)] [background-size:32px_32px]" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#A68B67]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-[#4A3F35]/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

                <div className="relative z-10 space-y-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A68B67] to-[#8C7E6A] flex items-center justify-center shadow-lg shadow-[#A68B67]/20">
                                    <Printer className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#A68B67]/80">Print Fulfillment Hub</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-sans font-extrabold text-white tracking-tight">Antrian Cetak</h1>
                        </motion.div>

                        <div className="flex flex-wrap items-center gap-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A68B67]/60" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="CARI NAMA / FRAME..."
                                    className="pl-12 pr-6 py-3.5 bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest focus:outline-none text-white/80 placeholder:text-white/30 w-56 focus:border-[#A68B67]/40 transition-colors"
                                />
                            </div>
                            <div className="flex items-center gap-3 bg-white/[0.06] backdrop-blur-md px-4 py-2 border border-white/10 rounded-xl">
                                <Filter className="w-3 h-3 text-[#A68B67]/60" />
                                <select
                                    value={filter}
                                    onChange={(e) => setFilter(e.target.value)}
                                    className="bg-transparent text-[9px] font-bold uppercase tracking-widest focus:outline-none text-white/70"
                                >
                                    <option value="all" className="bg-[#1C1917]">SEMUA STATUS</option>
                                    {(isAdmin || isPaymentEnabled) && <option value="pending" className="bg-[#1C1917]">MENUNGGU BAYAR</option>}
                                    <option value="paid" className="bg-[#1C1917]">SIAP CETAK</option>
                                    <option value="printed" className="bg-[#1C1917]">SUDAH CETAK</option>
                                    <option value="cancelled" className="bg-[#1C1917]">DIBATALKAN</option>
                                </select>
                            </div>
                            <button
                                onClick={syncAllOrders}
                                disabled={isSyncing}
                                className="flex items-center gap-3 bg-[#A68B67] text-white px-6 py-3.5 rounded-xl text-[9px] font-bold uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-[#A68B67]/20 hover:shadow-xl transition-all"
                            >
                                <Clock className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                {isSyncing ? 'SYNCING...' : 'SYNC ALL'}
                            </button>
                            {isAdmin && orders.length > 0 && (
                                <button
                                    onClick={() => setShowDeleteAllModal(true)}
                                    className="flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-xl text-[9px] font-bold uppercase tracking-widest shadow-lg shadow-red-900/20 hover:shadow-xl transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    HAPUS SEMUA
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className={`grid grid-cols-1 gap-6 ${isAdmin || isPaymentEnabled ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                {[
                    { label: 'Total Pesanan', val: stats.total, icon: Layers, bg: "bg-white" },
                    ...((isAdmin || isPaymentEnabled) ? [{ label: 'Menunggu Bayar', val: stats.pending, icon: Clock, bg: "bg-white" }] : []),
                    { label: 'Siap Produksi', val: stats.paid, icon: Printer, bg: "bg-white" },
                    { label: 'Selesai Cetak', val: stats.printed, icon: Check, bg: "bg-white" }
                ].map((stat, idx) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }} transition={{ delay: idx * 0.1 }} className={`p-7 rounded-2xl border border-[#EAE1D3] ${stat.bg} shadow-md hover:shadow-xl hover:shadow-[#4A3F35]/8 hover:border-[#A68B67]/30 group transition-all duration-500`}>
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-gradient-to-br from-[#F5F1EA] to-[#EAE1D3]/50 border border-[#EAE1D3] text-[#A68B67] rounded-xl group-hover:scale-110 group-hover:shadow-md transition-all duration-500">
                                <stat.icon className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-[9px] font-bold text-[#A68B67] uppercase tracking-widest mb-2">{stat.label}</p>
                        <h4 className="text-3xl font-sans font-bold text-[#4A3F35]">{stat.val}</h4>
                    </motion.div>
                ))}
            </div>

            {/* Table */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-3xl border border-[#EAE1D3] shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#F5F1EA] text-[9px] font-bold text-[#8C7E6A] uppercase tracking-widest border-b border-[#EAE1D3]">
                                <th className="px-10 py-6">Klien Studio</th>
                                <th className="px-6 py-6">Asset Kreatif</th>
                                <th className="px-6 py-6 text-center">Kuantitas</th>
                                {isPaymentEnabled && <th className="px-6 py-6 text-right">Investasi</th>}
                                <th className="px-6 py-6 text-center">Status Sesi</th>
                                <th className="px-6 py-6">Kronologi</th>
                                <th className="px-10 py-6 text-right">Aksi Studio</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EAE1D3]/50">
                            {filteredOrders.map((order) => (
                                <OrderRow
                                    key={order.id}
                                    order={order}
                                    isPaymentEnabled={isPaymentEnabled}
                                    isAdmin={isAdmin}
                                    markAsPrinted={markAsPrinted}
                                    syncOrder={syncOrder}
                                    onDelete={(id) => setDeleteOrderId(id)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
                <PaginationBar
                    page={page}
                    totalPages={totalPages}
                    totalItems={totalOrders}
                    onPageChange={setPage}
                />
            </motion.div>

            {/* Delete Single Order Modal */}
            <DeleteConfirmModal
                isOpen={!!deleteOrderId}
                onClose={() => setDeleteOrderId(null)}
                onConfirm={deleteOrder}
                title="Hapus Order?"
                description="Data order cetak ini akan dihapus secara permanen dan tidak dapat dikembalikan."
                saving={isDeleting}
            />

            {/* Delete All Orders Modal */}
            <DeleteConfirmModal
                isOpen={showDeleteAllModal}
                onClose={() => setShowDeleteAllModal(false)}
                onConfirm={deleteAllOrders}
                title="Hapus Semua Order?"
                description={`Anda akan menghapus ${totalOrders} order cetak secara permanen. Tindakan ini tidak dapat dibatalkan.`}
                saving={isDeleting}
            />
        </div>
    );
}
