"use client";
import React, { createContext, useContext, useRef, useState, useEffect, ReactNode } from 'react';
import type { FrameCategory } from '@/lib/frameLayouts';

export type ExtendedFrameCategory = FrameCategory | 'database';

export interface PhotoData {
    id: string;
    dataUrl: string;
    originalUrl?: string;
    livePhotoUrl?: string; // URL video live photo (5-7 detik)
    timestamp: number;
}

interface PhotoContextType {
    photos: PhotoData[];
    selectedFrame: string;
    frameCategory: ExtendedFrameCategory;
    selectedDbTheme: string | null;
    userName: string;
    isHydrated: boolean;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    addPhoto: (dataUrl: string, originalUrl?: string, id?: string, livePhotoUrl?: string) => void;
    removePhoto: (id: string) => void;
    updatePhoto: (id: string, dataUrl: string, originalUrl?: string, livePhotoUrl?: string) => void;
    setLivePhoto: (photoId: string, livePhotoUrl: string) => void; // BARU: Set live photo URL
    reorderPhotos: (fromIndex: number, toIndex: number) => void;
    setSelectedFrame: (frameId: string) => void;
    setFrameCategory: (category: ExtendedFrameCategory) => void;
    setSelectedDbTheme: (themeId: string | null) => void;
    setUserName: (name: string) => void;
    clearPhotos: () => void;
    resetAll: () => void;
    startCamera: () => Promise<void>;
    stopCamera: () => void;
    capturePhoto: () => string | null;
    sessionId: string;
    systemSettings: any;
    settingsLoaded: boolean;
    printQuantity: number;
    setPrintQuantity: (qty: number) => void;
}

const PhotoContext = createContext<PhotoContextType | undefined>(undefined);

export const PhotoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [sessionId, setSessionId] = useState<string>('');
    const [photos, setPhotos] = useState<PhotoData[]>([]);
    const [selectedFrame, setSelectedFrame] = useState<string>('classic');
    const [frameCategory, setFrameCategory] = useState<ExtendedFrameCategory>('standard');
    const [selectedDbTheme, setSelectedDbTheme] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>('');
    const [isHydrated, setIsHydrated] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [systemSettings, setSystemSettings] = useState<any>({});
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [printQuantity, setPrintQuantity] = useState<number>(1);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const addPhoto = (dataUrl: string, originalUrl?: string, id?: string, livePhotoUrl?: string) => {
        const newPhoto: PhotoData = {
            id: id || `photo-${Date.now()}`,
            dataUrl,
            originalUrl: originalUrl || dataUrl,
            livePhotoUrl,
            timestamp: Date.now(),
        };
        setPhotos(prev => [...prev, newPhoto]);
    };

    const removePhoto = (id: string) => {
        setPhotos(prev => prev.filter(photo => photo.id !== id));
    };

    const updatePhoto = (id: string, dataUrl: string, originalUrl?: string, livePhotoUrl?: string) => {
        setPhotos(prev => prev.map(photo =>
            photo.id === id
                ? {
                    ...photo,
                    dataUrl,
                    timestamp: Date.now(),
                    ...(originalUrl ? { originalUrl } : {}),
                    ...(livePhotoUrl ? { livePhotoUrl } : {})
                }
                : photo
        ));
    };

    const setLivePhoto = (photoId: string, livePhotoUrl: string) => {
        setPhotos(prev => prev.map(photo =>
            photo.id === photoId
                ? { ...photo, livePhotoUrl }
                : photo
        ));
    };

    const reorderPhotos = (fromIndex: number, toIndex: number) => {
        setPhotos(prev => {
            const newPhotos = [...prev];
            const [moved] = newPhotos.splice(fromIndex, 1);
            newPhotos.splice(toIndex, 0, moved);
            return newPhotos;
        });
    };

    const clearPhotos = () => {
        setPhotos([]);
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem('photobooth.photos');
            } catch { }
        }
    };

    const resetAll = () => {
        setPhotos([]);
        setSelectedFrame('classic');
        setFrameCategory('standard');
        setSelectedDbTheme(null);
        setUserName('');
        setPrintQuantity(1);
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem('photobooth.photos');
                localStorage.removeItem('photobooth.selectedFrame');
                localStorage.removeItem('photobooth.frameCategory');
                localStorage.removeItem('photobooth.userName');
                localStorage.removeItem('photobooth.userEmail');
                localStorage.removeItem('photobooth.userPhone');
                localStorage.removeItem('photobooth.sessionDeadlineMs');
                localStorage.removeItem('photobooth.sessionId');
            } catch { }
        }
        const newId = `img-${Date.now()}`;
        setSessionId(newId);
    };

    const setUserNameHandler = (name: string) => {
        setUserName(name);
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('photobooth.userName', name);
            } catch { }
        }
    };

    // Global Settings Sync (Real-time Polling)
    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setSystemSettings(data);
                setSettingsLoaded(true);
            }
        } catch (error) {
            console.error('Failed to sync settings:', error);
        }
    };

    useEffect(() => {
        fetchSettings();

        const syncOnFocus = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                fetchSettings();
            }
        };

        window.addEventListener('focus', syncOnFocus);
        document.addEventListener('visibilitychange', syncOnFocus);

        return () => {
            window.removeEventListener('focus', syncOnFocus);
            document.removeEventListener('visibilitychange', syncOnFocus);
        };
    }, []);

    // Persist & hydrate photos and selected frame
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const savedPhotos = localStorage.getItem('photobooth.photos');
            const savedFrame = localStorage.getItem('photobooth.selectedFrame');
            const savedCategory = localStorage.getItem('photobooth.frameCategory') as FrameCategory | null;
            const savedUserName = localStorage.getItem('photobooth.userName');
            const savedSessionId = localStorage.getItem('photobooth.sessionId');
            const savedPrintQty = localStorage.getItem('photobooth.printQuantity');
            if (savedPhotos) {
                const parsed: PhotoData[] = JSON.parse(savedPhotos);
                if (Array.isArray(parsed)) setPhotos(parsed);
            }
            if (savedFrame) setSelectedFrame(savedFrame);
            if (savedCategory === 'standard' || savedCategory === 'frames2' || savedCategory === 'database') {
                setFrameCategory(savedCategory as ExtendedFrameCategory);
            }
            if (savedUserName) setUserName(savedUserName);
            
            // Handle Session ID: Restore existing or create new once per session
            if (savedSessionId) {
                setSessionId(savedSessionId);
            } else {
                const newId = `img-${Date.now()}`;
                setSessionId(newId);
                localStorage.setItem('photobooth.sessionId', newId);
            }

            if (savedPrintQty) {
                const qty = parseInt(savedPrintQty, 10);
                if (!isNaN(qty)) setPrintQuantity(qty);
            }
        } catch { }
        
        // Delay hydration slightly to ensure all state updates (userName, etc) 
        // have fully propagated before components start using them for ID calculation.
        setTimeout(() => setIsHydrated(true), 100);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('photobooth.photos', JSON.stringify(photos));
        } catch { }
    }, [photos]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('photobooth.selectedFrame', selectedFrame);
        } catch { }
    }, [selectedFrame]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('photobooth.frameCategory', frameCategory);
        } catch { }
    }, [frameCategory]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('photobooth.sessionId', sessionId);
        } catch { }
    }, [sessionId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('photobooth.printQuantity', String(printQuantity));
        } catch { }
    }, [printQuantity]);

    const startCamera = async () => {
        try {
            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Browser tidak mendukung akses kamera. Gunakan browser modern seperti Chrome, Firefox, atau Safari terbaru.');
            }

            // Check if running on HTTPS or localhost
            const isSecureContext = window.isSecureContext ||
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                window.location.protocol === 'https:';

            if (!isSecureContext) {
                throw new Error('Kamera membutuhkan HTTPS atau localhost untuk berfungsi. Pastikan aplikasi berjalan di environment yang aman.');
            }

            // Try with ideal settings first
            let mediaStream: MediaStream;
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1920, min: 640 },
                        height: { ideal: 1080, min: 480 },
                        frameRate: { ideal: 60, min: 30 }, // 60 FPS untuk Live Photo smooth
                        facingMode: 'user'
                    },
                    audio: false
                });
            } catch (idealError) {
                console.warn('Failed with ideal constraints, trying basic:', idealError);
                // Fallback to basic constraints
                try {
                    mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { min: 640 },
                            height: { min: 480 },
                            frameRate: { ideal: 60, min: 30 }
                        },
                        audio: false
                    });
                } catch (basicError) {
                    console.warn('Failed with basic constraints, trying minimal:', basicError);
                    // Final fallback - just video
                    mediaStream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false
                    });
                }
            }

            setStream(mediaStream);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                // Add error handling for video play
                try {
                    await videoRef.current.play();
                } catch (playError) {
                    // AbortError can safely be ignored (often happens on rapid re-renders)
                    if (playError instanceof Error && playError.name !== 'AbortError') {
                        console.warn('Video play failed:', playError);
                    }
                }
            }
        } catch (error) {
            console.error('Error accessing camera:', error);

            // Provide specific error messages based on error type
            if (error instanceof Error) {
                if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    throw new Error('Permission kamera ditolak. Klik ikon kamera di address bar browser dan izinkan akses kamera.');
                } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                    throw new Error('Kamera tidak ditemukan. Pastikan kamera terpasang dan tidak sedang digunakan aplikasi lain.');
                } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                    throw new Error('Kamera sedang digunakan aplikasi lain. Tutup aplikasi lain yang menggunakan kamera dan coba lagi.');
                } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
                    throw new Error('Kamera tidak mendukung pengaturan yang diperlukan. Coba gunakan kamera lain.');
                } else if (error.message.includes('HTTPS') || error.message.includes('localhost')) {
                    throw error; // Re-throw HTTPS error as-is
                } else {
                    throw new Error(`Camera tidak dapat diakses: ${error.message}. Pastikan browser memiliki permission untuk menggunakan kamera.`);
                }
            } else {
                throw new Error('Camera tidak dapat diakses. Pastikan browser memiliki permission untuk menggunakan kamera.');
            }
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const capturePhoto = (): string | null => {
        if (!videoRef.current || !canvasRef.current) return null;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;

        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Mirror the capture (horizontal flip) so results match the mirror preview
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Convert to data URL
        return canvas.toDataURL('image/jpeg', 0.9);
    };

    const value: PhotoContextType = {
        photos,
        selectedFrame,
        frameCategory,
        selectedDbTheme,
        userName,
        isHydrated,
        videoRef,
        canvasRef,
        addPhoto,
        removePhoto,
        updatePhoto,
        setLivePhoto,
        reorderPhotos,
        setSelectedFrame,
        setFrameCategory,
        setSelectedDbTheme,
        setUserName: setUserNameHandler,
        clearPhotos,
        resetAll,
        startCamera,
        stopCamera,
        capturePhoto,
        sessionId,
        systemSettings,
        settingsLoaded,
        printQuantity,
        setPrintQuantity,
    };

    return (
        <PhotoContext.Provider value={value}>
            {children}
        </PhotoContext.Provider>
    );
};

export const usePhotoStore = () => {
    const context = useContext(PhotoContext);
    if (context === undefined) {
        throw new Error('usePhotoStore must be used within a PhotoProvider');
    }
    return context;
};