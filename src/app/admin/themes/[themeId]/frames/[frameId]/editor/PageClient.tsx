'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Rnd } from 'react-rnd';
import { ArrowLeft, Plus, Trash2, Save, Eye, EyeOff, Move, Layers, RotateCw, Square } from 'lucide-react';
import BackgroundRemoverPanel from '@/components/admin/frames/BackgroundRemoverPanel';
import { loadImage, sampleImageColorAtPoint, type RgbColor } from '@/lib/chromaKey';

interface Slot {
    id: string;
    x: number; // percentage 0-1
    y: number;
    width: number;
    height: number;
    rotation?: number;
    borderRadius?: number;
}

interface Frame {
    id: string;
    name: string;
    imageUrl: string;
    originalImageUrl?: string | null;
    previewUrl: string;
    outputWidth: number;
    outputHeight: number;
    slots: Slot[];
    maxSlots: number;
    framePosition: string; // 'overlay' | 'background'
    themeId: string;
}

const SAMPLE_PHOTOS = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop',
];

const CHECKER_CELL_PX = 16;

function snapCanvasDimension(value: number): number {
    const snapped = Math.floor(value / CHECKER_CELL_PX) * CHECKER_CELL_PX;
    return Math.max(CHECKER_CELL_PX * 2, snapped);
}

export default function SlotEditorPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session, status } = useSession();
    const isAdmin = (session?.user as any)?.role === 'ADMIN';
    const canManageThemes = isAdmin || (session?.user as any)?.canManageThemes === true;

    const themeId = params.themeId as string;
    const frameId = params.frameId as string;
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasAreaRef = useRef<HTMLDivElement>(null);
    const eyedropperImageRef = useRef<HTMLImageElement | null>(null);

    const [frame, setFrame] = useState<Frame | null>(null);
    const [activeImageUrl, setActiveImageUrl] = useState('');
    const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [eyedropperActive, setEyedropperActive] = useState(false);
    const [pickedColor, setPickedColor] = useState<RgbColor | null>(null);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [framePosition, setFramePosition] = useState<'overlay' | 'background'>('overlay');
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [maxSlots, setMaxSlots] = useState<number | string>(4); // Jumlah slot yang diinginkan

    useEffect(() => {
        if (status === 'authenticated') {
            if (!canManageThemes) {
                router.push('/admin/themes');
            }
        }
        if (frameId) fetchFrame();
    }, [frameId, status, canManageThemes, router]);

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current && frame) {
                const container = containerRef.current;
                const maxWidth = container.clientWidth;
                const maxHeight = window.innerHeight - 300;

                const aspectRatio = frame.outputWidth / frame.outputHeight;

                let width = maxWidth;
                let height = width / aspectRatio;

                if (height > maxHeight) {
                    height = maxHeight;
                    width = height * aspectRatio;
                }

                setContainerSize({
                    width: snapCanvasDimension(width),
                    height: snapCanvasDimension(height),
                });
            }
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [frame]);

    useEffect(() => {
        const sourceUrl = originalImageUrl || activeImageUrl;
        if (!sourceUrl) return;

        let cancelled = false;
        loadImage(sourceUrl)
            .then((image) => {
                if (!cancelled) eyedropperImageRef.current = image;
            })
            .catch(() => {
                if (!cancelled) eyedropperImageRef.current = null;
            });

        return () => {
            cancelled = true;
        };
    }, [originalImageUrl, activeImageUrl]);

    const handleCanvasEyedropperClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!eyedropperActive || !canvasAreaRef.current || !eyedropperImageRef.current) return;

        const rect = canvasAreaRef.current.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        const color = sampleImageColorAtPoint(
            eyedropperImageRef.current,
            rect.width,
            rect.height,
            clickX,
            clickY,
        );

        if (color) {
            setPickedColor(color);
        }
    };

    const handleFrameImageUpdated = ({
        imageUrl,
        originalImageUrl: nextOriginal,
    }: {
        imageUrl: string;
        originalImageUrl: string;
    }) => {
        setActiveImageUrl(imageUrl);
        setOriginalImageUrl(nextOriginal);
        setPreviewImageUrl(null);
        setFrame((prev) =>
            prev
                ? {
                      ...prev,
                      imageUrl,
                      originalImageUrl: nextOriginal,
                  }
                : prev,
        );
    };

    const fetchFrame = async () => {
        try {
            const res = await fetch(`/api/admin/frames/${frameId}`);
            if (res.ok) {
                const data = await res.json();
                setFrame(data);
                setActiveImageUrl(data.imageUrl);
                setOriginalImageUrl(data.originalImageUrl || null);
                setPreviewImageUrl(null);
                setFramePosition(data.framePosition || 'overlay');
                // Ensure slots have IDs
                const slotsWithIds = (data.slots || []).map((slot: any, index: number) => ({
                    ...slot,
                    id: slot.id || `slot-${Date.now()}-${index}`,
                }));
                setSlots(slotsWithIds);
                // Set maxSlots from DB or fallback to calculation based on existing slots
                if (data.maxSlots !== undefined) {
                    setMaxSlots(data.maxSlots);
                } else {
                    setMaxSlots(''); // Default empty as requested
                }
            } else {
                router.push(`/admin/themes/${themeId}/frames`);
            }
        } catch (error) {
            console.error('Failed to fetch frame:', error);
        } finally {
            setLoading(false);
        }
    };

    const addSlot = () => {
        // Batas maksimal slot fisik di canvas saya buat 12 agar fleksibel
        if (slots.length >= 12) {
            alert("Maksimal 12 slot fisik pada canvas.");
            return;
        }

        const newSlot: Slot = {
            id: `slot-${Date.now()}`,
            x: 0.1 + (slots.length % 2 === 0 ? 0 : 0.4),
            y: 0.1 + (Math.floor(slots.length / 2) * 0.15),
            width: 0.35,
            height: 0.12,
            rotation: 0,
            borderRadius: 0,
        };
        setSlots([...slots, newSlot]);
        setSelectedSlot(newSlot.id);
    };

    const removeSlot = (id: string) => {
        setSlots(slots.filter(s => s.id !== id));
        if (selectedSlot === id) setSelectedSlot(null);
    };

    const updateSlot = (id: string, updates: Partial<Slot>) => {
        setSlots(slots.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const handleDragStop = (id: string, x: number, y: number) => {
        const xPercent = Math.max(0, Math.min(1, x / containerSize.width));
        const yPercent = Math.max(0, Math.min(1, y / containerSize.height));
        updateSlot(id, { x: xPercent, y: yPercent });
    };

    const handleResizeStop = (id: string, width: number, height: number, x: number, y: number) => {
        const widthPercent = Math.max(0.05, Math.min(1, width / containerSize.width));
        const heightPercent = Math.max(0.05, Math.min(1, height / containerSize.height));
        const xPercent = Math.max(0, Math.min(1, x / containerSize.width));
        const yPercent = Math.max(0, Math.min(1, y / containerSize.height));
        updateSlot(id, {
            width: widthPercent,
            height: heightPercent,
            x: xPercent,
            y: yPercent,
        });
    };

    const saveSlots = async () => {
        setSaving(true);
        try {
            // Remove id before saving (not needed in DB)
            const slotsToSave = slots.map(({ id, ...rest }) => rest);

                const res = await fetch(`/api/admin/frames/${frameId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        slots: slotsToSave,
                        maxSlots: Number(maxSlots) || 4, // Final fallback for DB
                        framePosition: framePosition,
                    }),
                });

            if (res.ok) {
                router.push(`/admin/themes/${themeId}/frames`);
            }
        } catch (error) {
            console.error('Failed to save slots:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading || !frame) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
                <div className="relative w-12 h-12">
                    <div className="absolute inset-0 border-2 border-[#A68B67]/20 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-[#A68B67] border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#A68B67] animate-pulse">Initializing Studio...</p>
            </div>
        );
    }

    // Render slots
    const renderSlots = () => (
        <>
            {slots.map((slot, index) => {
                // Penomoran berulang berdasarkan maxSlots
                // Jika maxSlots = 4: slot 0→1, 1→2, 2→3, 3→4, 4→1, 5→2, dst
                const mSlots = Number(maxSlots) || 4;
                const displayNumber = (index % mSlots) + 1;

                return (
                    <Rnd
                        key={slot.id}
                        position={{
                            x: slot.x * containerSize.width,
                            y: slot.y * containerSize.height,
                        }}
                        size={{
                            width: slot.width * containerSize.width,
                            height: slot.height * containerSize.height,
                        }}
                        onDragStop={(e, d) => handleDragStop(slot.id, d.x, d.y)}
                        onResizeStop={(e, dir, ref, delta, position) => {
                            handleResizeStop(
                                slot.id,
                                parseInt(ref.style.width),
                                parseInt(ref.style.height),
                                position.x,
                                position.y
                            );
                        }}
                        bounds="parent"
                        className={`absolute ${selectedSlot === slot.id ? 'z-20' : 'z-10'}`}
                        onClick={() => setSelectedSlot(slot.id)}
                    >
                        <div
                            className={`w-full h-full border-2 overflow-hidden transition-all flex items-center justify-center shadow-lg ${selectedSlot === slot.id
                                ? 'border-amber-500 bg-amber-500/10 scale-[1.02]'
                                : 'border-[#A68B67]/50 bg-white/40 backdrop-blur-sm'
                                }`}
                            style={{
                                backgroundColor: showPreview ? 'transparent' : undefined,
                                borderRadius: `${(slot.borderRadius || 0)}%`,
                                transform: `rotate(${slot.rotation || 0}deg)`,
                            }}
                        >
                            {showPreview ? (
                                <img
                                    src={SAMPLE_PHOTOS[index % SAMPLE_PHOTOS.length]}
                                    alt={`Slot ${displayNumber}`}
                                    className="w-full h-full object-cover"
                                    draggable={false}
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-1">
                                    <span className={`font-sans font-bold text-3xl drop-shadow-sm ${selectedSlot === slot.id ? 'text-amber-600' : 'text-[#4A3F35]'}`}>
                                        {displayNumber}
                                    </span>
                                    <span className={`text-[8px] font-bold uppercase tracking-widest ${selectedSlot === slot.id ? 'text-amber-600/60' : 'text-[#A68B67]/60'}`}>Foto {displayNumber}</span>
                                </div>
                            )}
                        </div>
                    </Rnd>
                );
            })}
        </>
    );

    // Render frame image
    const displayImageUrl = previewImageUrl || activeImageUrl || frame.imageUrl;

    const renderFrame = () => (
        <img
            src={displayImageUrl}
            alt={frame.name}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
        />
    );

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                <div className="space-y-4">
                    <Link
                        href={`/admin/themes/${themeId}/frames`}
                        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#A68B67] hover:text-[#4A3F35] transition-colors group"
                    >
                        <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
                        Kembali ke Galeri
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#4A3F35] rounded-xl text-[#FDFBF7]">
                            <Move className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-sans font-bold text-[#4A3F35] tracking-tight truncate max-w-md">Edit Slot: {frame.name}</h1>
                            <p className="text-[#8C7E6A] text-[10px] font-bold uppercase tracking-widest mt-1">Konfigurasi Geometri Visual</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={`flex items-center gap-3 px-6 py-4 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest border shadow-sm ${showPreview
                            ? 'bg-[#A68B67] border-[#A68B67] text-white'
                            : 'bg-white border-[#EAE1D3] text-[#A68B67] hover:border-[#A68B67]'
                            }`}
                    >
                        {showPreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        Preview Mode
                    </button>
                    <button
                        onClick={addSlot}
                        disabled={slots.length >= 12}
                        className={`flex items-center gap-3 px-6 py-4 rounded-xl transition-all shadow-lg text-[10px] font-bold uppercase tracking-widest ${slots.length >= 12
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-gray-200/10'
                            : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-900/10'
                            }`}
                    >
                        <Plus className="w-4 h-4" />
                        {slots.length >= 12
                            ? 'Canvas Penuh (12/12)'
                            : `Tambah Slot (${slots.length + 1})`}
                    </button>
                    <button
                        onClick={saveSlots}
                        disabled={saving}
                        className="flex items-center gap-3 bg-[#4A3F35] hover:bg-[#2D2824] text-[#FDFBF7] px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl shadow-[#4A3F35]/20 text-[10px] font-bold uppercase tracking-widest disabled:opacity-30"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-8">
                    {/* Editor Canvas */}
                    <div
                        ref={containerRef}
                        className="relative bg-[#1C1917] rounded-3xl p-8 shadow-2xl overflow-hidden min-h-[500px] flex items-center justify-center border border-[#4A3F35]"
                    >
                        {/* Background pattern */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#FDFBF7 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                        <div
                            ref={canvasAreaRef}
                            className={`relative shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden ${
                                previewImageUrl ? '' : 'bg-white'
                            } ${eyedropperActive ? 'cursor-crosshair ring-2 ring-[#A68B67]/60' : ''}`}
                            style={{
                                width: containerSize.width || 'auto',
                                height: containerSize.height || 'auto',
                            }}
                        >
                            {previewImageUrl && (
                                <div
                                    aria-hidden
                                    className="transparency-checker absolute inset-0 pointer-events-none"
                                />
                            )}
                            {eyedropperActive && (
                                <div
                                    className="absolute inset-0 z-50 cursor-crosshair bg-[#A68B67]/5"
                                    onClick={handleCanvasEyedropperClick}
                                />
                            )}
                            {/* Render based on framePosition */}
                            {framePosition === 'background' ? (
                                <>
                                    {/* Frame as background (behind photos) */}
                                    <div className="absolute inset-0 z-0">
                                        {renderFrame()}
                                    </div>
                                    {/* Photos in front */}
                                    <div className="relative z-10 w-full h-full">
                                        {renderSlots()}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Photos behind */}
                                    <div className="relative z-0 w-full h-full">
                                        {renderSlots()}
                                    </div>
                                    {/* Frame as overlay (in front of photos) */}
                                    <div className="absolute inset-0 z-30 pointer-events-none">
                                        {renderFrame()}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-[#FDFBF7] border border-[#EAE1D3] p-10 rounded-3xl shadow-md">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-10 h-10 rounded-xl bg-[#4A3F35] flex items-center justify-center text-[#FDFBF7]">
                                <Move className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-widest text-[#4A3F35]">Studio Design Guidelines</h4>
                                <p className="text-[10px] text-[#A68B67] font-bold uppercase tracking-widest mt-1">Panduan Konfigurasi Visual</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                            <div className="space-y-10">
                                <div className="flex items-start gap-5 group">
                                    <span className="text-xl font-sans font-bold text-[#D1C4B2] group-hover:text-[#A68B67] transition-colors leading-none">01</span>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-[#4A3F35] tracking-tight">Presisi Dimensi Slot</p>
                                        <p className="text-xs text-[#8C7E6A] leading-relaxed">Atur dimensi slot secara presisi untuk menjaga keseimbangan komposisi visual agar hasil cetak terlihat profesional.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-5 group">
                                    <span className="text-xl font-sans font-bold text-[#D1C4B2] group-hover:text-[#A68B67] transition-colors leading-none">02</span>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-[#4A3F35] tracking-tight">Verifikasi Preview Mode</p>
                                        <p className="text-xs text-[#8C7E6A] leading-relaxed">Gunakan "Preview Mode" untuk memastikan foto tidak terpotong bagian penting oleh bingkai atau dekorasi frame.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-10">
                                <div className="flex items-start gap-5 group">
                                    <span className="text-xl font-sans font-bold text-[#D1C4B2] group-hover:text-[#A68B67] transition-colors leading-none">03</span>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-[#4A3F35] tracking-tight">Hierarki Layer Overlay</p>
                                        <p className="text-xs text-[#8C7E6A] leading-relaxed">Posisi frame "Overlay" ideal untuk desain dengan detail di pinggiran atau ornamen yang menjorok ke arah subjek.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-5 group">
                                    <span className="text-xl font-sans font-bold text-[#D1C4B2] group-hover:text-[#A68B67] transition-colors leading-none">04</span>
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-[#4A3F35] tracking-tight">Sinkronisasi Perubahan</p>
                                        <p className="text-xs text-[#8C7E6A] leading-relaxed">Selalu tekan tombol "Simpan Perubahan" sebelum navigasi keluar untuk mengamankan geometri slot Anda.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-10">
                    <BackgroundRemoverPanel
                        frameId={frameId}
                        sourceImageUrl={activeImageUrl || frame.imageUrl}
                        originalImageUrl={originalImageUrl}
                        eyedropperActive={eyedropperActive}
                        onEyedropperActiveChange={setEyedropperActive}
                        pickedColor={pickedColor}
                        onPickedColorConsumed={() => setPickedColor(null)}
                        onPreviewUrlChange={setPreviewImageUrl}
                        onFrameImageUpdated={handleFrameImageUpdated}
                    />

                    {/* Frame Position Toggle */}
                    <div className="bg-white p-8 rounded-3xl border border-[#EAE1D3] shadow-md space-y-6">
                        <div className="flex items-center gap-3 text-[#A68B67]">
                            <Layers className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Layer Hierarchy</span>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[11px] font-medium text-[#4A3F35]">Tentukan struktur kedalaman frame terhadap subjek foto:</label>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => setFramePosition('background')}
                                    className={`flex items-center justify-between px-6 py-4 rounded-xl border transition-all ${framePosition === 'background'
                                        ? 'bg-[#4A3F35] border-[#4A3F35] text-white shadow-xl'
                                        : 'bg-[#FDFBF7] border-[#EAE1D3] text-[#8C7E6A] hover:bg-[#F5F1EA]'
                                        }`}
                                >
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Background</span>
                                    <span className="text-[10px] opacity-60 font-medium">Foto di Depan</span>
                                </button>
                                <button
                                    onClick={() => setFramePosition('overlay')}
                                    className={`flex items-center justify-between px-6 py-4 rounded-xl border transition-all ${framePosition === 'overlay'
                                        ? 'bg-[#4A3F35] border-[#4A3F35] text-white shadow-xl'
                                        : 'bg-[#FDFBF7] border-[#EAE1D3] text-[#8C7E6A] hover:bg-[#F5F1EA]'
                                        }`}
                                >
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Overlay</span>
                                    <span className="text-[10px] opacity-60 font-medium">Frame di Depan</span>
                                </button>
                            </div>
                            <p className="text-[9px] text-[#A68B67] font-bold uppercase tracking-widest text-center mt-4">
                                {framePosition === 'overlay'
                                    ? '• Frame menutupi sebagian objek'
                                    : '• Objek menutupi sebagian frame'}
                            </p>
                        </div>
                    </div>

                    {/* Photo Looping Config */}
                    <div className="bg-white p-8 rounded-3xl border border-[#EAE1D3] shadow-md space-y-6">
                        <div className="flex items-center gap-3 text-[#A68B67]">
                            <Plus className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Photo Looping Config</span>
                        </div>
                        <div className="space-y-4">
                            <label className="text-[11px] font-medium text-[#4A3F35]">Jumlah foto unik per sesi (Pola penomoran berulang):</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={maxSlots}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                            setMaxSlots('');
                                            return;
                                        }
                                        const num = Math.min(12, parseInt(val));
                                        setMaxSlots(num);
                                    }}
                                    className="w-20 px-4 py-3 text-center text-xl font-sans font-bold text-[#4A3F35] border border-[#EAE1D3] rounded-xl focus:outline-none focus:border-[#A68B67] focus:ring-2 focus:ring-[#A68B67]/20"
                                />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8C7E6A]">Foto Per Sesi</span>
                                    <span className="text-[8px] text-[#A68B67] uppercase font-bold">(Reset nomor setiap {Number(maxSlots) || 0} slot)</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4">
                                {[3, 4, 5, 6, 8].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => setMaxSlots(num)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${maxSlots === num
                                            ? 'bg-[#4A3F35] text-white shadow-lg'
                                            : 'bg-[#F5F1EA] text-[#8C7E6A] hover:bg-[#EAE1D3]'
                                            }`}
                                    >
                                        Pola {num}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Slot List */}
                    <div className="bg-white p-8 rounded-3xl border border-[#EAE1D3] shadow-md space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-[#A68B67]">
                                <Move className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Active Slots List</span>
                            </div>
                            <span className="text-[10px] font-bold text-[#A68B67]">{slots.length} Total Slots</span>
                        </div>

                        <div className="flex flex-col gap-3">
                            {slots.map((slot, index) => {
                                const mSlots = Number(maxSlots) || 4;
                                const displayNumber = (index % mSlots) + 1;
                                return (
                                    <div key={`container-${slot.id}`} className="space-y-3">
                                        <div
                                            key={slot.id}
                                            onClick={() => setSelectedSlot(slot.id)}
                                            className={`flex items-center justify-between px-5 py-4 rounded-xl cursor-pointer transition-all border ${selectedSlot === slot.id
                                                ? 'bg-[#F5F1EA] border-[#A68B67] shadow-lg'
                                                : 'bg-[#FDFBF7] border-[#EAE1D3] hover:border-[#A68B67]/40'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${selectedSlot === slot.id ? 'bg-[#4A3F35] text-white' : 'bg-[#F5F1EA] text-[#A68B67]'}`}>
                                                    {displayNumber}
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-[#4A3F35]">Foto {displayNumber}</span>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeSlot(slot.id); }}
                                                className="p-2 text-[#D1C4B2] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Editor properties for selected slot */}
                                        {selectedSlot === slot.id && (
                                            <div className="p-5 border border-[#A68B67]/20 bg-[#FDFBF7] rounded-xl space-y-5 animate-scaleIn">
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#4A3F35]">
                                                            <RotateCw className="w-3.5 h-3.5 text-[#A68B67]" /> Rotasi (Derajat)
                                                        </label>
                                                        <span className="text-xs font-bold text-[#A68B67] bg-[#F5F1EA] px-2 py-0.5 rounded-md">{slot.rotation || 0}°</span>
                                                    </div>
                                                    <input 
                                                        type="range" min="0" max="360" value={slot.rotation || 0} 
                                                        onChange={(e) => updateSlot(slot.id, { rotation: parseInt(e.target.value) })}
                                                        className="w-full accent-[#A68B67]"
                                                    />
                                                </div>
                                                
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#4A3F35]">
                                                            <Square className="w-3.5 h-3.5 text-[#A68B67]" /> Radius Sudut (%)
                                                        </label>
                                                        <span className="text-xs font-bold text-[#A68B67] bg-[#F5F1EA] px-2 py-0.5 rounded-md">{slot.borderRadius || 0}%</span>
                                                    </div>
                                                    <input 
                                                        type="range" min="0" max="50" value={slot.borderRadius || 0} 
                                                        onChange={(e) => updateSlot(slot.id, { borderRadius: parseInt(e.target.value) })}
                                                        className="w-full accent-[#A68B67]"
                                                    />
                                                    <p className="text-[9px] text-[#8C7E6A] font-medium leading-relaxed">Geser hingga penuh (50%) untuk membuat slot berbentuk bundar / oval.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {slots.length === 0 && (
                                <div className="py-12 text-center space-y-4">
                                    <div className="w-12 h-12 bg-[#F5F1EA] rounded-full flex items-center justify-center mx-auto text-[#D1C4B2]">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <p className="text-[10px] text-[#A68B67] font-bold uppercase tracking-widest leading-relaxed">Belum ada slot visual yang didefinisikan.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
