'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface FinancialBlueprintProps {
    totalRevenue: number;
    appliedCapital: number;
}

export default function FinancialBlueprint({
    totalRevenue,
    appliedCapital
}: FinancialBlueprintProps) {
    const profit = totalRevenue - appliedCapital;

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(price);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mb-24 group"
        >
            <div className="absolute inset-0 bg-[#A68B67]/5 blur-[100px] -z-10 rounded-full translate-y-10" />

            <div className="bg-white/70 backdrop-blur-xl border border-[#EAE1D3] rounded-[3rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(74,63,53,0.1)] relative">
                <div className="h-2 w-full bg-gradient-to-r from-transparent via-[#A68B67]/40 to-transparent" />

                <div className="p-12 lg:p-16">
                    <div className="flex flex-col xl:flex-row gap-20 items-stretch">
                        {/* Left Side: Context */}
                        <div className="xl:w-1/3 space-y-10 flex flex-col justify-between">
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-px bg-[#A68B67]" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#A68B67]">Financial Blueprint</span>
                                </div>
                                <h4 className="text-4xl lg:text-5xl font-sans font-extrabold text-[#4A3F35] leading-tight tracking-tight">
                                    Anatomi Keuntungan <br /><span className="text-[#A68B67]">Studio Anda</span>
                                </h4>
                                <p className="text-[12px] text-[#8C7E6A] font-medium leading-relaxed opacity-70 max-w-sm">
                                    Audit mendalam untuk memastikan setiap investasi bahan baku menghasilkan nilai mahakarya yang sepadan.
                                </p>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex -space-x-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-11 h-11 rounded-full border-4 border-white/80 bg-gradient-to-br from-[#F5F1EA] to-[#EAE1D3] flex items-center justify-center text-[10px] font-black text-[#A68B67] shadow-md group-hover:scale-110 transition-transform">
                                            0{i}
                                        </div>
                                    ))}
                                </div>
                                <div className="h-10 w-px bg-[#EAE1D3]" />
                                <span className="text-[9px] font-black text-[#4A3F35] uppercase tracking-widest italic opacity-50">3-Step Verification</span>
                            </div>
                        </div>

                        {/* Right Side: The Math Flow */}
                        <div className="flex-1 w-full relative">
                            <div className="hidden lg:block absolute top-[28px] left-0 right-0 h-px border-t border-dashed border-[#EAE1D3] -z-0" />

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 relative z-10">
                                {/* Component 1: Omzet */}
                                <div className="space-y-8 group/item">
                                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-[#A68B67] shadow-xl shadow-black/5 group-hover/item:bg-[#A68B67] group-hover/item:text-white transition-all duration-500 border border-[#EAE1D3]/50">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-5">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black text-[#8C7E6A] uppercase tracking-[0.2em]">A. Pendapatan Kotor</p>
                                            <h5 className="text-3xl font-sans font-black text-[#4A3F35]">{formatPrice(totalRevenue)}</h5>
                                        </div>
                                        <div className="p-5 bg-white/40 rounded-2xl border border-[#EAE1D3]/60 backdrop-blur-sm">
                                            <p className="text-[9px] font-bold text-[#8C7E6A] uppercase tracking-widest leading-relaxed">
                                                Akumulasi dari seluruh sesi & cetak terbayar
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Component 2: Modal */}
                                <div className="space-y-8 group/item">
                                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-red-400 shadow-xl shadow-black/5 group-hover/item:bg-red-500 group-hover/item:text-white transition-all duration-500 border border-red-100">
                                        <Minus className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-5">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black text-[#8C7E6A] uppercase tracking-[0.2em]">B. Modal Operasional</p>
                                            <h5 className="text-3xl font-sans font-black text-red-500">{formatPrice(appliedCapital)}</h5>
                                        </div>
                                        <div className="p-5 bg-red-50/20 rounded-2xl border border-red-100 backdrop-blur-sm">
                                            <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest leading-relaxed">
                                                Investasi bahan baku & infrastruktur pendukung
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Component 3: Profit */}
                                <div className="space-y-8 group/item lg:pl-4">
                                    <div className={`w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-xl shadow-black/5 group-hover/item:scale-110 transition-all duration-500 border ${profit >= 0 ? 'border-green-200 text-green-500 group-hover/item:bg-green-500 group-hover/item:text-white' : 'border-red-200 text-red-500 group-hover/item:bg-red-500 group-hover/item:text-white'}`}>
                                        {profit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                    </div>
                                    <div className="space-y-5">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black text-[#8C7E6A] uppercase tracking-[0.2em]">C. Hasil Akhir (A - B)</p>
                                            <h5 className={`text-3xl font-sans font-black ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatPrice(profit)}
                                            </h5>
                                        </div>
                                        <div className={`p-5 rounded-2xl border backdrop-blur-sm ${profit >= 0 ? 'bg-green-50/20 border-green-100' : 'bg-red-50/20 border-red-100'}`}>
                                            <p className={`text-[9px] font-bold uppercase tracking-widest leading-relaxed ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {profit >= 0 ? 'Kesehatan finansial studio dalam status OPTIMAL' : 'Audit ulang efisiensi operasional diperlukan'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
