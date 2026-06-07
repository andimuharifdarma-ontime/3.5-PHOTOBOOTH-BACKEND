'use client';

import { Calendar, Search } from 'lucide-react';

interface FilterSectionProps {
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    startDate: string;
    setStartDate: (val: string) => void;
    endDate: string;
    setEndDate: (val: string) => void;
}

export default function FilterSection({
    searchTerm,
    setSearchTerm,
    startDate,
    setStartDate,
    endDate,
    setEndDate
}: FilterSectionProps) {
    return (
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 w-full lg:w-auto">
            {/* Search Input Group */}
            <div className="relative group w-full lg:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A68B67]/50 group-focus-within:text-[#4A3F35] transition-colors" />
                <input
                    type="text"
                    placeholder="Search client/frame..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 h-12 bg-white border border-[#EAE1D3] rounded-sm text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-[#4A3F35] text-[#4A3F35] transition-all placeholder:text-[#A68B67]/30"
                />
            </div>

            {/* Date Range Group */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative group flex-1 sm:flex-none">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#A68B67]" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full sm:w-auto pl-9 pr-3 h-12 bg-white border border-[#EAE1D3] rounded-sm text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-[#4A3F35] text-[#4A3F35]"
                        />
                    </div>
                    <div className="w-2 h-px bg-[#EAE1D3]" />
                    <div className="relative group flex-1 sm:flex-none">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#A68B67]" />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full sm:w-auto pl-9 pr-3 h-12 bg-white border border-[#EAE1D3] rounded-sm text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-[#4A3F35] text-[#4A3F35]"
                        />
                    </div>
                </div>

                {/* Vertical Divider (Desktop) / Horizontal (Mobile) */}
                <div className="hidden lg:block w-px h-6 bg-[#EAE1D3] mx-2" />

                {/* Presets Button Group */}
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    {[
                        { label: 'Semua', val: ['', ''] },
                        {
                            label: 'Hari Ini', val: [
                                new Date().toISOString().split('T')[0],
                                new Date().toISOString().split('T')[0]
                            ]
                        }
                    ].map(preset => (
                        <button
                            key={preset.label}
                            onClick={() => {
                                setStartDate(preset.val[0]);
                                setEndDate(preset.val[1]);
                            }}
                            className="flex-1 sm:flex-none px-5 h-12 bg-[#F5F1EA] text-[#4A3F35] text-[9px] font-black uppercase tracking-widest rounded-sm hover:bg-[#4A3F35] hover:text-white transition-all border border-[#EAE1D3]"
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
