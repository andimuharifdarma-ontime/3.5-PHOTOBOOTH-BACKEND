'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileImage, FileVideo, Archive, Loader2, PlaySquare, Image as ImageIcon, Search } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface GalleryItem {
    id: string;
    sessionId: string;
    userName: string;
    frameName: string;
    createdAt: string;
    shareUrl: string;
}

export default function GalleryPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [items, setItems] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchGallery();
        }
    }, [status, router]);

    const fetchGallery = async () => {
        try {
            const res = await fetch('/api/admin/gallery');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setItems(data.items);
                }
            }
        } catch (error) {
            console.error('Failed to fetch gallery:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadZip = async (item: GalleryItem) => {
        if (downloadingId) return;
        setDownloadingId(item.id);

        try {
            const zip = new JSZip();
            const sid = item.sessionId;

            // Define possible assets
            const assets = [
                { name: 'Picture_Compiled.jpg', url: `/api/images/${sid}` },
                { name: 'Animation.gif', url: `/api/images/${sid}.gif` },
                ...Array.from({ length: 8 }).map((_, i) => ({ name: `Original_${i + 1}.jpg`, url: `/api/images/${sid}-orig-${i}` })),
                ...Array.from({ length: 8 }).map((_, i) => ({ name: `LivePhoto_${i + 1}.mp4`, url: `/api/images/${sid}-live-${i}` }))
            ];

            let addedFiles = 0;

            const promises = assets.map(async (asset) => {
                try {
                    const res = await fetch(asset.url);
                    if (res.ok) {
                        const blob = await res.blob();
                        zip.file(asset.name, blob);
                        addedFiles++;
                    }
                } catch (e) {
                    // Ignore errors for missing files
                }
            });

            await Promise.all(promises);

            if (addedFiles > 0) {
                const content = await zip.generateAsync({ type: 'blob' });
                saveAs(content, `Dove_Photobooth_${item.userName.replace(/\s+/g, '_')}_${new Date(item.createdAt).getTime()}.zip`);
            } else {
                alert('File tidak ditemukan di server. Mungkin masa simpannya sudah kedaluwarsa.');
            }
        } catch (error) {
            console.error('Error zipping files:', error);
            alert('Gagal mendownload ZIP.');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleSingleDownload = (url: string, filename: string) => {
        // Trigger download programmatically
        const a = document.createElement('a');
        a.href = `${url}?download=1`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const filteredItems = items.filter(item => 
        item.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.frameName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#FDFBF7]">
                <Loader2 className="w-8 h-8 animate-spin text-[#A68B67]" />
            </div>
        );
    }

    return (
        <div className="p-8 lg:p-12 max-w-7xl mx-auto space-y-8 pb-32">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-serif text-[#2C241B]">Galeri Hasil Studio</h1>
                    <p className="text-[#8C7E6A] mt-2">Arsip aset pelanggan dari sesi foto photobooth (Cloud Storage)</p>
                </div>
                
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                    <input 
                        type="text" 
                        placeholder="Cari nama klien..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white border border-black/5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#A68B67]/30 transition-all w-full md:w-64"
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                    {filteredItems.map(item => (
                        <motion.div 
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl border border-[#EAE1D3] overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                        >
                            {/* Header Item */}
                            <div className="p-5 border-b border-[#EAE1D3] bg-[#FDFBF7]/50">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-[#2C241B] truncate pr-2">{item.userName}</h3>
                                    <span className="text-[10px] font-mono text-[#A68B67] bg-[#A68B67]/10 px-2 py-1 rounded-full whitespace-nowrap">
                                        {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                                <p className="text-xs text-[#8C7E6A] truncate">{item.frameName}</p>
                            </div>

                            {/* Preview Area (Compiled Image) */}
                            <div className="relative aspect-[3/4] bg-[#EAE1D3]/30 overflow-hidden">
                                <img 
                                    src={`/api/images/${item.sessionId}`} 
                                    alt="Compiled Picture"
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        target.parentElement!.innerHTML = '<div class="absolute inset-0 flex flex-col items-center justify-center text-black/30 text-xs"><p>Gambar tidak tersedia</p><p>(Kedaluwarsa)</p></div>';
                                    }}
                                />
                                {/* Overlay gradient & Zip Button on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                    <button 
                                        onClick={() => downloadZip(item)}
                                        disabled={downloadingId === item.id}
                                        className="w-full bg-[#A68B67] hover:bg-[#8C7E6A] text-white py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors disabled:opacity-70"
                                    >
                                        {downloadingId === item.id ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Zipping...</>
                                        ) : (
                                            <><Archive className="w-4 h-4" /> Download ZIP</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Quick Download Links */}
                            <div className="p-4 bg-white grid grid-cols-4 gap-2">
                                <button 
                                    onClick={() => handleSingleDownload(`/api/images/${item.sessionId}`, `${item.userName}_Picture.jpg`)}
                                    className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg hover:bg-[#FDFBF7] text-[#8C7E6A] hover:text-[#A68B67] transition-colors group/btn"
                                    title="Download Gambar Cetak"
                                >
                                    <ImageIcon className="w-4 h-4 group-hover/btn:-translate-y-0.5 transition-transform" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Pic</span>
                                </button>
                                
                                <button 
                                    onClick={() => handleSingleDownload(`/api/images/${item.sessionId}-orig-0`, `${item.userName}_Original.jpg`)}
                                    className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg hover:bg-[#FDFBF7] text-[#8C7E6A] hover:text-[#A68B67] transition-colors group/btn"
                                    title="Download Original Photos (Satu)"
                                >
                                    <FileImage className="w-4 h-4 group-hover/btn:-translate-y-0.5 transition-transform" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Orig</span>
                                </button>

                                <button 
                                    onClick={() => handleSingleDownload(`/api/images/${item.sessionId}.gif`, `${item.userName}_Anim.gif`)}
                                    className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg hover:bg-[#FDFBF7] text-[#8C7E6A] hover:text-[#A68B67] transition-colors group/btn"
                                    title="Download GIF Animation"
                                >
                                    <PlaySquare className="w-4 h-4 group-hover/btn:-translate-y-0.5 transition-transform" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">GIF</span>
                                </button>

                                <button 
                                    onClick={() => handleSingleDownload(`/api/images/${item.sessionId}-live-0`, `${item.userName}_Live.mp4`)}
                                    className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg hover:bg-[#FDFBF7] text-[#8C7E6A] hover:text-[#A68B67] transition-colors group/btn"
                                    title="Download Live Photos (Video)"
                                >
                                    <FileVideo className="w-4 h-4 group-hover/btn:-translate-y-0.5 transition-transform" />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Live</span>
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredItems.length === 0 && (
                    <div className="col-span-full py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-[#EAE1D3] rounded-2xl bg-white/50">
                        <ImageIcon className="w-12 h-12 text-[#EAE1D3] mb-4" />
                        <h3 className="text-lg font-serif text-[#8C7E6A]">Belum ada hasil foto</h3>
                        <p className="text-sm text-black/40 mt-1">Sesi photobooth yang selesai akan muncul di sini.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
