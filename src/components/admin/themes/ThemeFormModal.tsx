'use client';

import Modal from '@/components/ui/Modal';
import { Loader2, Upload } from 'lucide-react';

interface ThemeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    editingTheme: any;
    formData: any;
    setFormData: (data: any) => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    uploading: boolean;
    saving: boolean;
    isPaymentEnabled: boolean;
}

export default function ThemeFormModal({
    isOpen,
    onClose,
    onSubmit,
    editingTheme,
    formData,
    setFormData,
    handleImageUpload,
    uploading,
    saving,
    isPaymentEnabled,
}: ThemeFormModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingTheme ? 'Konfigurasi Koleksi' : 'Koleksi Studio Baru'}
            subtitle="Essential Metadata Hub"
            darkHeader
        >
            <form onSubmit={onSubmit} className="space-y-6 md:space-y-10">
                {/* Image Upload */}
                <div>
                    <label className="block text-[10px] font-black text-[#8C7E6A] uppercase tracking-[0.2em] mb-4">
                        Digital Studio Asset
                    </label>
                    <div className="border-2 border-dashed border-[#EAE1D3] rounded-sm p-6 text-center hover:border-[#A68B67] hover:bg-[#FDFBF7] transition-all group cursor-pointer relative overflow-hidden aspect-video flex flex-col items-center justify-center">
                        {formData.previewUrl ? (
                            <>
                                <img
                                    src={formData.previewUrl}
                                    alt="Preview"
                                    className="absolute inset-0 w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-300"
                                />
                                <div className="absolute inset-0 bg-[#4A3F35]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setFormData((prev: any) => ({ ...prev, previewUrl: '' }))}
                                        className="bg-[#FDFBF7] text-[#4A3F35] px-6 py-3 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white transition-all shadow-2xl"
                                    >
                                        Ubah Asset Utama
                                    </button>
                                </div>
                            </>
                        ) : (
                            <label className="cursor-pointer block w-full">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                {uploading ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <Loader2 className="w-8 h-8 text-[#A68B67] animate-spin" />
                                        <p className="text-[9px] font-black text-[#A68B67] uppercase tracking-[0.3em]">Uploading...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 bg-[#F5F1EA] text-[#A68B67] rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform border border-[#EAE1D3]">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-[#4A3F35] font-black tracking-widest uppercase text-[10px] mb-1">Click to Upload Cover</p>
                                            <p className="text-[8px] text-[#A68B67] uppercase tracking-widest opacity-60">High resolution JPG or PNG</p>
                                        </div>
                                    </div>
                                )}
                            </label>
                        )}
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Name */}
                    <div>
                        <label className="block text-[10px] font-black text-[#8C7E6A] uppercase tracking-[0.2em] mb-3">
                            Nama Koleksi
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-[#F5F1EA] px-6 py-4 border border-[#EAE1D3] rounded-sm focus:outline-none focus:border-[#A68B67] text-[#4A3F35] font-sans italic text-xl transition-all"
                            placeholder="Contoh: Ethereal Essence"
                            required
                        />
                    </div>

                    {/* Tag / Label */}
                    <div>
                        <label className="block text-[10px] font-black text-[#8C7E6A] uppercase tracking-[0.2em] mb-3">
                            Label Koleksi (Opsional)
                        </label>
                        <input
                            type="text"
                            value={formData.tag}
                            onChange={(e) => setFormData((prev: any) => ({ ...prev, tag: e.target.value }))}
                            className="w-full bg-[#F5F1EA] px-6 py-4 border border-[#EAE1D3] rounded-sm focus:outline-none focus:border-[#A68B67] text-[#4A3F35] font-black tracking-wider text-sm transition-all"
                            placeholder="Contoh: BEST SELLER, NEW ARRIVAL"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-[10px] font-black text-[#8C7E6A] uppercase tracking-[0.2em] mb-3">
                            Esensi & Narasi
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
                            className="w-full bg-[#F5F1EA] px-6 py-4 border border-[#EAE1D3] rounded-sm focus:outline-none focus:border-[#A68B67] text-[#4A3F35] font-sans italic text-sm transition-all"
                            placeholder="Gambarkan jiwa dari koleksi tema ini..."
                            rows={3}
                        />
                    </div>

                    {/* Price - Hanya muncul untuk mode Bagi Hasil / DOKU */}
                    {isPaymentEnabled && (
                        <div>
                            <label className="block text-[10px] font-black text-[#8C7E6A] uppercase tracking-[0.2em] mb-3">
                                Harga Per Sesi (Rp)
                            </label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData((prev: any) => ({ ...prev, price: val === '' ? '' : parseInt(val) }));
                                }}
                                className="w-full bg-[#F5F1EA] px-6 py-4 border border-[#EAE1D3] rounded-sm focus:outline-none focus:border-[#A68B67] text-[#4A3F35] font-black text-lg"
                                placeholder="Contoh: 5000"
                                min={0}
                                step={1000}
                                required={isPaymentEnabled}
                            />
                        </div>
                    )}
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between bg-[#1C1917] p-6 rounded-sm shadow-xl shadow-black/10">
                    <div>
                        <span className="block text-[10px] font-black text-[#FDFBF7] uppercase tracking-[0.3em]">Status Display</span>
                        <span className="text-[8px] text-[#A68B67] uppercase tracking-[0.2em] mt-1 block">Rilis ke Galeri Publik?</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFormData((prev: any) => ({ ...prev, isActive: !prev.isActive }))}
                        className={`w-12 h-6 rounded-full transition-all relative focus:outline-none ${formData.isActive ? 'bg-[#A68B67]' : 'bg-[#4A3F35]'
                            }`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-xl ${formData.isActive ? 'translate-x-6' : 'translate-x-0'
                            }`} />
                    </button>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={saving || !formData.name}
                    className="w-full bg-[#4A3F35] hover:bg-[#2D2824] text-[#FDFBF7] py-5 rounded-sm font-black uppercase tracking-[0.4em] text-[10px] disabled:opacity-30 transition-all shadow-2xl shadow-[#4A3F35]/20 flex items-center justify-center gap-4"
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Memproses Koleksi...
                        </>
                    ) : (
                        'Simpan Konfigurasi Koleksi'
                    )}
                </button>
            </form>
        </Modal>
    );
}
