"use client";
import { useRef, useEffect } from 'react';
import type { PhotoData } from '@/store/usePhotoStore';

interface LivePhotoFrameProps {
    photos: PhotoData[];
    frameImageUrl?: string; // URL frame dari database
    slots?: { x: number; y: number; width: number; height: number }[];
    outputWidth?: number;
    outputHeight?: number;
    width: number;
}

const LivePhotoFrame: React.FC<LivePhotoFrameProps> = ({
    photos,
    frameImageUrl,
    slots,
    outputWidth = 1200,
    outputHeight = 1800,
    width,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const height = Math.round(width * (outputHeight / outputWidth));

    // Filter photos yang punya Live Photo
    const photosWithLivePhoto = photos.filter(p => p.livePhotoUrl);

    useEffect(() => {
        if (photosWithLivePhoto.length === 0) return;
        renderFrame();
    }, [photosWithLivePhoto, frameImageUrl]);

    const renderFrame = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = outputWidth;
        canvas.height = outputHeight;

        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Load frame image if exists
        if (frameImageUrl) {
            const frameImg = await loadImage(frameImageUrl);
            ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
        }

        // Draw video frames (take first frame from each video)
        if (slots && slots.length >= photosWithLivePhoto.length) {
            for (let i = 0; i < photosWithLivePhoto.length; i++) {
                const video = videoRefs.current[i];
                const slot = slots[i];
                if (video && slot) {
                    try {
                        ctx.drawImage(
                            video,
                            slot.x,
                            slot.y,
                            slot.width,
                            slot.height
                        );
                    } catch (error) {
                        console.error('Error drawing video frame:', error);
                    }
                }
            }
        } else {
            // Default 2x2 grid layout
            const gridSize = 2;
            const cellWidth = canvas.width / gridSize;
            const cellHeight = canvas.height / gridSize;
            const padding = 20;

            for (let i = 0; i < Math.min(photosWithLivePhoto.length, 4); i++) {
                const video = videoRefs.current[i];
                if (video) {
                    const row = Math.floor(i / gridSize);
                    const col = i % gridSize;
                    const x = col * cellWidth + padding;
                    const y = row * cellHeight + padding;
                    const w = cellWidth - padding * 2;
                    const h = cellHeight - padding * 2;

                    try {
                        ctx.drawImage(video, x, y, w, h);
                    } catch (error) {
                        console.error('Error drawing video frame:', error);
                    }
                }
            }
        }
    };

    const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    };

    if (photosWithLivePhoto.length === 0) {
        return (
            <div className="text-center text-gray-500 py-8">
                <p className="text-sm">Tidak ada Live Photo tersedia</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Hidden videos for frame extraction */}
            <div className="hidden">
                {photosWithLivePhoto.map((photo, idx) => (
                    <video
                        key={photo.id}
                        ref={(el) => { videoRefs.current[idx] = el; }}
                        src={photo.livePhotoUrl}
                        onLoadedData={renderFrame}
                        muted
                        playsInline
                    />
                ))}
            </div>

            {/* Canvas preview */}
            <canvas
                ref={canvasRef}
                className="w-full h-auto rounded-sm shadow-lg"
                style={{ width: `${width}px`, height: `${height}px` }}
            />

            {/* Video grid overlay */}
            <div className="mt-4 grid grid-cols-2 gap-2">
                {photosWithLivePhoto.map((photo, idx) => (
                    <div key={photo.id} className="relative group">
                        <video
                            src={photo.livePhotoUrl}
                            controls
                            loop
                            muted
                            playsInline
                            className="w-full rounded-sm shadow-md hover:shadow-lg transition-shadow"
                        />
                        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                            Live {idx + 1}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LivePhotoFrame;
