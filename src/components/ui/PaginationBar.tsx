'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

type PaginationBarProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export default function PaginationBar({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: PaginationBarProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8C7E6A]">
        Halaman {page} dari {totalPages} · {totalItems} item
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#EAE1D3] bg-white text-[10px] font-bold uppercase tracking-widest text-[#4A3F35] disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          Sebelumnya
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#EAE1D3] bg-white text-[10px] font-bold uppercase tracking-widest text-[#4A3F35] disabled:opacity-40"
        >
          Berikutnya
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
