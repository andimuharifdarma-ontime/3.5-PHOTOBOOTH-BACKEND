'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    Star,
    Users,
    History,
    Award,
    Calendar,
    Search,
    ChevronRight,
    Smartphone,
    Mail,
    Medal,
    Trophy
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import AdminPageSkeleton from '@/components/ui/AdminPageSkeleton';

interface TopFrame {
    name: string;
    count: number;
    revenue: number;
}

interface LoyalCustomer {
    email: string | null;
    phone: string | null;
    name: string;
    sessionCount: number;
    totalSpent: number;
    lastVisit: string;
}

interface TrackRecordData {
    topFrames: TopFrame[];
    loyalCustomers: LoyalCustomer[];
    totalOrders: number;
}

export default function TrackRecordPage() {
    const [data, setData] = useState<TrackRecordData | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { data: session } = useSession();

    useEffect(() => {
        fetchTrackRecord();
    }, []);

    const fetchTrackRecord = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/track-record');
            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (error) {
            console.error('Failed to fetch track record:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(price);
    };

    const filteredCustomers = data?.loyalCustomers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.phone?.includes(searchTerm))
    ) || [];

    if (loading) {
        return <AdminPageSkeleton variant="table" />;
    }

    return (
        <div className="space-y-16 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                >
                    <div className="flex items-center gap-3 text-[#A68B67]">
                        <History className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Performance Track Record</span>
                    </div>
                    <h1 className="text-6xl font-sans font-bold text-[#4A3F35] tracking-tight">Jejak & Prestasi</h1>
                    <p className="text-[#8C7E6A] font-medium text-lg opacity-80">Analisis mendalam frame terlaris dan pelanggan paling berdedikasi</p>
                </motion.div>

                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <p className="text-[9px] font-bold text-[#A68B67] uppercase tracking-widest">Total Lembar Terbit</p>
                        <p className="text-3xl font-sans font-bold text-[#4A3F35]">{data?.totalOrders || 0}</p>
                    </div>
                    <div className="w-px h-12 bg-[#EAE1D3]" />
                    <div className="w-12 h-12 rounded-full border border-[#A68B67] flex items-center justify-center">
                        <Award className="w-6 h-6 text-[#A68B67]" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* 1. Frame POPULER (Moved from Reports) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-1 bg-[#F5F1EA] p-10 rounded-3xl border border-[#EAE1D3] shadow-md flex flex-col"
                >
                    <div className="flex items-center justify-between mb-12">
                        <div>
                            <h3 className="text-sm font-bold text-[#4A3F35] uppercase tracking-wider">Pilihan Terpopuler</h3>
                            <p className="text-[9px] text-[#A68B67] uppercase tracking-widest font-bold mt-2">Frame Terlaris Studio</p>
                        </div>
                        <Star className="w-4 h-4 text-[#A68B67] animate-pulse" />
                    </div>

                    <div className="space-y-10 flex-1">
                        {data?.topFrames.map((frame, idx) => (
                            <div key={idx} className="space-y-4 group">
                                <div className="flex justify-between items-end">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-[#A68B67]/40">0{idx + 1}</span>
                                        <span className="text-lg font-sans font-bold text-[#4A3F35] group-hover:text-[#A68B67] transition-colors">{frame.name}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-[#A68B67] uppercase tracking-widest">{frame.count} Lembar Print</span>
                                </div>
                                <div className="h-[2px] w-full bg-[#EAE1D3] overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(frame.count / (data?.topFrames[0]?.count || 1)) * 100}%` }}
                                        transition={{ duration: 1.5, ease: "circOut", delay: 0.2 + idx * 0.1 }}
                                        className="h-full bg-[#A68B67]"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-bold text-[#8C7E6A] uppercase tracking-widest">Estimated Revenue</span>
                                    <span className="text-[10px] font-bold text-[#4A3F35]">{formatPrice(frame.revenue)}</span>
                                </div>
                            </div>
                        ))}
                        {(!data?.topFrames || data.topFrames.length === 0) && (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <Trophy className="w-10 h-10 text-[#D1C4B2] opacity-20" />
                                <p className="text-[10px] text-[#8C7E6A] font-bold uppercase tracking-widest">Belum Ada Analitik Frame</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* 2. Customer TERLOYAL (New Component) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="lg:col-span-2 bg-white rounded-3xl border border-[#EAE1D3] shadow-md overflow-hidden flex flex-col"
                >
                    <div className="p-12 border-b border-[#EAE1D3] bg-[#FDFBF7]">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="space-y-2">
                                <h3 className="text-base font-bold text-[#4A3F35] uppercase tracking-widest leading-none">Customer Terloyal</h3>
                                <p className="text-[10px] text-[#A68B67] uppercase tracking-widest font-bold opacity-70">Apresiasi Untuk Pelanggan Setia</p>
                            </div>

                            <div className="relative group/search max-w-xs w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A68B67]" />
                                <input
                                    type="text"
                                    placeholder="Cari nama, email, atau HP..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-[#EAE1D3] rounded-xl text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-[#4A3F35] focus:ring-2 focus:ring-[#A68B67]/20 text-[#4A3F35] transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#F5F1EA] text-[9px] font-bold text-[#8C7E6A] uppercase tracking-widest border-b border-[#EAE1D3]">
                                    <th className="px-10 py-6">Rank</th>
                                    <th className="px-6 py-6">Customer</th>
                                    <th className="px-6 py-6 text-center">Total Sesi</th>
                                    <th className="px-6 py-6 text-right">Total Kontribusi</th>
                                    <th className="px-10 py-6 text-right">Kunjungan Terakhir</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F5F1EA]">
                                {filteredCustomers.map((customer, idx) => (
                                    <tr key={idx} className="group hover:bg-[#FDFBF7] transition-colors">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-3">
                                                {idx === 0 ? (
                                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                                ) : idx === 1 ? (
                                                    <Medal className="w-4 h-4 text-slate-400" />
                                                ) : idx === 2 ? (
                                                    <Medal className="w-4 h-4 text-amber-700" />
                                                ) : (
                                                    <span className="text-[11px] font-bold text-[#A68B67]/40 w-4 text-center">{(idx + 1).toString().padStart(2, '0')}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[11px] font-bold uppercase tracking-widest text-[#4A3F35]">{customer.name}</span>
                                                <div className="flex items-center gap-3 opacity-60">
                                                    {customer.phone && (
                                                        <div className="flex items-center gap-1">
                                                            <Smartphone className="w-2.5 h-2.5" />
                                                            <span className="text-[9px] font-medium">{customer.phone}</span>
                                                        </div>
                                                    )}
                                                    {customer.email && (
                                                        <div className="flex items-center gap-1">
                                                            <Mail className="w-2.5 h-2.5" />
                                                            <span className="text-[9px] font-medium">{customer.email}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className="inline-flex items-center justify-center px-3 py-1 bg-[#F5F1EA] rounded-full text-[10px] font-bold text-[#4A3F35] border border-[#EAE1D3]">
                                                {customer.sessionCount} Sesi
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <span className="text-[11px] font-bold text-[#4A3F35]">{formatPrice(customer.totalSpent)}</span>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="flex items-center gap-2 text-[#A68B67]">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">{new Date(customer.lastVisit).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                </div>
                                                <span className="text-[9px] text-[#A68B67]/50 font-medium">{new Date(customer.lastVisit).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredCustomers.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-10 py-24 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-30">
                                                <Users className="w-12 h-12 text-[#A68B67]" />
                                                <p className="text-[10px] font-bold uppercase tracking-widest">Data Pelanggan Kosong</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-8 bg-[#FDFBF7] border-t border-[#EAE1D3] flex justify-center">
                        <button className="flex items-center gap-3 text-[10px] font-bold text-[#A68B67] uppercase tracking-widest hover:text-[#4A3F35] transition-colors">
                            <span>Lihat Semua Dedikasi Pelanggan</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
