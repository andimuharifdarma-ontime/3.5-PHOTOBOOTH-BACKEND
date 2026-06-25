'use client';

import { useState, useEffect } from 'react';
import { Download, RefreshCw, FolderDown, Image as ImageIcon, Video, FileJson, Play, Trash2, Clock, Cloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PaginationBar from '@/components/ui/PaginationBar';

type SupabaseFile = {
    name: string;
    url: string;
    created_at: string;
    folder?: string;
};

type FileCategory = 'Picture' | 'Original' | 'GIF' | 'Live Photos';

type CleanupResult = {
  success: boolean;
  deleted: number;
  checked: number;
  retentionDays: number;
  cutoffDate: string;
  folders: Record<string, { checked: number; deleted: number }>;
};

export default function CloudGalleryPage() {
    const [activeTab, setActiveTab] = useState<FileCategory>('Picture');
    const [files, setFiles] = useState<SupabaseFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const filesPerPage = 48;
    const [isZipping, setIsZipping] = useState(false);
    const [zipProgress, setZipProgress] = useState(0);
    const [photoRetentionDays, setPhotoRetentionDays] = useState<number>(7);
    const [isCleaning, setIsCleaning] = useState(false);
    const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
    const [showConfirmCleanup, setShowConfirmCleanup] = useState(false);

    const fetchFiles = async (pageNumber = page) => {
        setIsLoading(true);
        try {
            const query = `folder=images&page=${pageNumber}&limit=${filesPerPage}`;
            const queryLive = `folder=live-photos&page=${pageNumber}&limit=${filesPerPage}`;

            const [resImages, resLive] = await Promise.all([
                fetch(`/api/admin/supabase-files?${query}`),
                fetch(`/api/admin/supabase-files?${queryLive}`),
            ]);

            const dataImages = await resImages.json();
            const dataLive = await resLive.json();

            const allFiles = [
                ...(dataImages.files || []).map((f: SupabaseFile) => ({ ...f, folder: 'images' })),
                ...(dataLive.files || []).map((f: SupabaseFile) => ({ ...f, folder: 'live-photos' })),
            ];

            allFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setFiles(allFiles);
            setHasMore(Boolean(dataImages.hasMore || dataLive.hasMore));
        } catch (error) {
            console.error('Failed to fetch files', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void fetchFiles(page);
        fetch('/api/admin/cleanup-storage')
            .then(r => r.json())
            .then(data => {
                if (data.photoRetentionDays) setPhotoRetentionDays(data.photoRetentionDays);
            })
            .catch(console.error);
    }, [page]);

    const handleCleanup = async () => {
        setIsCleaning(true);
        setCleanupResult(null);
        setShowConfirmCleanup(false);
        try {
            const res = await fetch('/api/admin/cleanup-storage', { method: 'POST' });
            const data = await res.json();
            setCleanupResult(data);
            fetchFiles();
        } catch (error) {
            console.error('Cleanup failed', error);
            alert('Gagal membersihkan storage. Silakan coba lagi.');
        } finally {
            setIsCleaning(false);
        }
    };

    const categorizedFiles = () => {
        return files.filter(f => {
            const ext = f.name.split('.').pop()?.toLowerCase() || '';
            const isOrig = f.name.includes('-orig');
            const isLive = f.name.includes('-live');
            const isBonus = f.name.includes('-bonus');
            
            if (activeTab === 'Picture') {
                return !isOrig && !isLive && !isBonus && (ext === 'jpg' || ext === 'png' || ext === 'jpeg') && f.folder === 'images';
            }
            if (activeTab === 'Original') {
                return isOrig && (ext === 'jpg' || ext === 'png' || ext === 'jpeg') && f.folder === 'images';
            }
            if (activeTab === 'GIF') {
                return (ext === 'gif' || isBonus) && f.folder === 'images';
            }
            if (activeTab === 'Live Photos') {
                return isLive || f.folder === 'live-photos';
            }
            return false;
        });
    };

    const handleDownloadSingle = async (file: SupabaseFile) => {
        try {
            const { saveAs } = await import('file-saver');
            const response = await fetch(file.url);
            const blob = await response.blob();
            saveAs(blob, file.name);
        } catch (error) {
            console.error('Failed to download file', error);
            // Fallback
            window.open(file.url, '_blank');
        }
    };

    const handleDownloadZip = async () => {
        const currentFiles = categorizedFiles();
        if (currentFiles.length === 0) return;

        setIsZipping(true);
        setZipProgress(0);

        try {
            const [{ default: JSZip }, { saveAs }] = await Promise.all([
                import('jszip'),
                import('file-saver'),
            ]);
            const zip = new JSZip();
            const folder = zip.folder(`backup_${activeTab.toLowerCase()}_${new Date().toISOString().slice(0,10)}`);

            if (!folder) throw new Error("Could not create zip folder");

            for (let i = 0; i < currentFiles.length; i++) {
                const file = currentFiles[i];
                const response = await fetch(file.url);
                const blob = await response.blob();
                folder.file(file.name, blob);
                setZipProgress(Math.round(((i + 1) / currentFiles.length) * 100));
            }

            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `backup_${activeTab.toLowerCase()}_${Date.now()}.zip`);
        } catch (error) {
            console.error('Failed to zip files', error);
            alert('Gagal mendownload ZIP. Silakan coba lagi atau download manual.');
        } finally {
            setIsZipping(false);
            setZipProgress(0);
        }
    };

    const renderTabs = () => {
        const tabs: FileCategory[] = ['Picture', 'Original', 'GIF', 'Live Photos'];
        return (
            <div className="flex space-x-2 bg-[#1C1917] p-1.5 rounded-lg mb-6 border border-white/10 w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-md text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                            activeTab === tab 
                            ? 'bg-[#A68B67] text-white shadow-lg shadow-black/20' 
                            : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
        );
    };

    const currentList = categorizedFiles();

    return (
        <div className="p-8 pb-32 max-w-7xl mx-auto min-h-screen">
            <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#1C1917] p-8 md:p-12 shadow-2xl shadow-black/20 mb-8">
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[linear-gradient(to_right,#A68B67_1px,transparent_1px),linear-gradient(to_bottom,#A68B67_1px,transparent_1px)] [background-size:32px_32px]" />
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#A68B67]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-[#4A3F35]/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                    <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A68B67] to-[#8C7E6A] flex items-center justify-center shadow-lg shadow-[#A68B67]/20">
                                <Cloud className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#A68B67]/80">Cloud Backup</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-sans font-extrabold text-white tracking-tight font-sans italic">
                            Cloud <span className="text-[#A68B67]">Gallery</span>
                        </h1>
                        <p className="text-white/40 font-medium text-lg max-w-xl">
                            Pusat Backup & Manajemen Aset Studio
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-3 bg-white/[0.06] backdrop-blur-md border border-white/10 rounded-lg">
                            <Clock className="w-4 h-4 text-[#A68B67]" />
                            <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                                Retensi <span className="text-[#A68B67]">{photoRetentionDays}</span> hari
                            </span>
                            {cleanupResult && (
                                <span className="text-[10px] font-bold text-emerald-400 ml-2">
                                    ✓ {cleanupResult.deleted} file dihapus
                                </span>
                            )}
                        </div>

                        <button
                            onClick={() => setShowConfirmCleanup(true)}
                            disabled={isCleaning}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white rounded-lg shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-xs font-black uppercase tracking-wider">
                                {isCleaning ? 'Membersihkan...' : 'Bersihkan Storage Cloud'}
                            </span>
                        </button>

                        <button
                            onClick={() => void fetchFiles(page)}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-6 py-3 bg-white/[0.06] backdrop-blur-md border border-white/10 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            <span className="text-xs font-black uppercase tracking-wider">Sync Data</span>
                        </button>
                        <button
                            onClick={handleDownloadZip}
                            disabled={isZipping || currentList.length === 0}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#A68B67] to-[#8C7E6A] text-white rounded-lg shadow-lg hover:opacity-90 transition-all disabled:opacity-50 relative overflow-hidden"
                        >
                            <FolderDown className="w-4 h-4 relative z-10" />
                            <span className="text-xs font-black uppercase tracking-wider relative z-10">
                                {isZipping ? `Zipping ${zipProgress}%...` : 'Unduh ZIP'}
                            </span>
                            {isZipping && (
                                <div 
                                    className="absolute left-0 top-0 bottom-0 bg-white/20 z-0" 
                                    style={{ width: `${zipProgress}%` }}
                                />
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {renderTabs()}

            {isLoading ? (
                <div className="flex items-center justify-center h-64 border-2 border-dashed border-white/10 rounded-2xl">
                    <div className="text-center">
                        <RefreshCw className="w-8 h-8 text-[#A68B67] animate-spin mx-auto mb-4" />
                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Memuat Aset Cloud...</p>
                    </div>
                </div>
            ) : currentList.length === 0 ? (
                <div className="flex items-center justify-center h-64 border-2 border-dashed border-white/10 rounded-2xl bg-[#1C1917]/50">
                    <div className="text-center">
                        <ImageIcon className="w-12 h-12 text-white/10 mx-auto mb-4" />
                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Tidak Ada File</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    <AnimatePresence>
                        {currentList.map((file, idx) => {
                            const isVideo = file.name.endsWith('.mp4') || file.name.endsWith('.webm');
                            return (
                                <motion.div
                                    key={file.name}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="group relative bg-[#1C1917] border border-white/5 rounded-xl overflow-hidden shadow-xl"
                                >
                                    <div className="aspect-[3/4] relative bg-black/50 flex items-center justify-center overflow-hidden">
                                        {!isVideo ? (
                                            <img 
                                                src={file.url} 
                                                alt={file.name} 
                                                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110" 
                                            />
                                        ) : (
                                            <div className="relative w-full h-full">
                                                <video 
                                                    src={file.url} 
                                                    className="object-cover w-full h-full opacity-70"
                                                    autoPlay
                                                    muted
                                                    loop
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm border border-white/20">
                                                        <Play className="w-4 h-4 text-white ml-1" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    
                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                        <button
                                            onClick={() => handleDownloadSingle(file)}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#A68B67] text-white rounded-lg shadow-lg hover:bg-white hover:text-black transition-colors"
                                        >
                                            <Download className="w-4 h-4" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Download</span>
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="p-4 border-t border-white/5">
                                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider truncate mb-1" title={file.name}>
                                        {file.name}
                                    </p>
                                    <p className="text-white/40 text-[9px] font-bold tracking-wider">
                                        {new Date(file.created_at).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {!isLoading && (
                <PaginationBar
                    page={page}
                    totalPages={hasMore ? page + 1 : page}
                    totalItems={files.length}
                    onPageChange={setPage}
                />
            )}

            {showConfirmCleanup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1C1917] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8 text-red-400" />
                            </div>
                            <h3 className="text-xl font-sans italic text-white mb-2">Bersihkan Storage Cloud?</h3>
                            <p className="text-white/50 text-sm mb-6">
                                Foto dan video yang lebih tua dari <span className="text-[#A68B67] font-bold">{photoRetentionDays} hari</span> akan dihapus permanen dari storage. Tindakan ini tidak bisa dibatalkan.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmCleanup(false)}
                                    className="flex-1 px-6 py-3 bg-[#1C1917] border border-white/10 text-white rounded-lg hover:bg-white/5 transition-all text-xs font-black uppercase tracking-wider"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleCleanup}
                                    className="flex-1 px-6 py-3 bg-red-700 text-white rounded-lg hover:bg-red-600 transition-all text-xs font-black uppercase tracking-wider"
                                >
                                    Ya, Bersihkan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
