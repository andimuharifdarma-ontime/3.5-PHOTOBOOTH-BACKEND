'use client';

import { useState, useEffect } from 'react';
import { Download, RefreshCw, FolderDown, Image as ImageIcon, Video, FileJson, Play } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'framer-motion';

type SupabaseFile = {
    name: string;
    url: string;
    created_at: string;
    folder?: string;
};

type FileCategory = 'Picture' | 'Original' | 'GIF' | 'Live Photos';

export default function CloudGalleryPage() {
    const [activeTab, setActiveTab] = useState<FileCategory>('Picture');
    const [files, setFiles] = useState<SupabaseFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isZipping, setIsZipping] = useState(false);
    const [zipProgress, setZipProgress] = useState(0);

    const fetchFiles = async () => {
        setIsLoading(true);
        try {
            // Fetch from images folder
            const resImages = await fetch('/api/admin/supabase-files?folder=images');
            const dataImages = await resImages.json();

            // Fetch from live-photos folder
            const resLive = await fetch('/api/admin/supabase-files?folder=live-photos');
            const dataLive = await resLive.json();

            const allFiles = [
                ...(dataImages.files || []).map((f: any) => ({ ...f, folder: 'images' })),
                ...(dataLive.files || []).map((f: any) => ({ ...f, folder: 'live-photos' }))
            ];
            
            // Sort by newest
            allFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            setFiles(allFiles);
        } catch (error) {
            console.error('Failed to fetch files', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);

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
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-serif italic text-white mb-2">Cloud Gallery</h1>
                    <p className="text-[#A68B67] text-xs font-black uppercase tracking-[0.2em]">Pusat Backup & Manajemen Aset Studio</p>
                </div>
                
                <div className="flex gap-4">
                    <button
                        onClick={fetchFiles}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-6 py-3 bg-[#1C1917] border border-white/10 text-white rounded-lg hover:bg-white/5 transition-all disabled:opacity-50"
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
        </div>
    );
}
