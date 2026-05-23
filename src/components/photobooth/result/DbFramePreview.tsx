'use client';

import React, { useRef, useEffect } from 'react';
import type { PhotoData } from '@/store/usePhotoStore';
import { applySlotTransformAndClip } from '@/lib/canvasUtils';

interface DbFramePreviewProps {
    photos: PhotoData[];
    dbFrame: {
        id: string;
        imageUrl: string;
        outputWidth: number;
        outputHeight: number;
        slots: { x: number; y: number; width: number; height: number }[];
        maxSlots: number;
        framePosition: string;
    };
    width: number;
}

const DbFramePreview: React.FC<DbFramePreviewProps> = ({ photos, dbFrame, width }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const height = Math.round(width * (dbFrame.outputHeight / dbFrame.outputWidth));
    const maxS = dbFrame.maxSlots || 4;

    useEffect(() => {
        if (photos.length < maxS || !dbFrame) return;
        renderPreview();
    }, [photos, dbFrame]);

    const renderPreview = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = dbFrame.outputWidth;
        canvas.height = dbFrame.outputHeight;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const loadImage = (src: string) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });

        try {
            // Load photos
            const images = await Promise.all(photos.map(p => loadImage(p.dataUrl)));

            // Load frame image
            let frameImage: HTMLImageElement | null = null;
            if (dbFrame.imageUrl) {
                try {
                    frameImage = await loadImage(dbFrame.imageUrl);
                } catch {
                    frameImage = null;
                }
            }

            // --- APPLY SAFE ZONE PROTECTION ---
            // Apply 3% margin to ensure critical elements match the editor's Safe Zone
            const marginX = canvas.width * 0.03;
            const marginY = canvas.height * 0.03;
            const targetWidth = canvas.width - (marginX * 2);
            const targetHeight = canvas.height - (marginY * 2);

            ctx.save();
            ctx.translate(marginX, marginY);
            ctx.scale(targetWidth / canvas.width, targetHeight / canvas.height);

            // Draw background frame if position is 'background'
            if (dbFrame.framePosition === 'background' && frameImage) {
                ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
            }

            // Draw photos in slots
            if (dbFrame.slots && dbFrame.slots.length > 0) {
                dbFrame.slots.forEach((slot, index) => {
                    const img = images[index % images.length];
                    if (!img || !slot) return;

                    const slotX = slot.x * canvas.width;
                    const slotY = slot.y * canvas.height;
                    const slotW = slot.width * canvas.width;
                    const slotH = slot.height * canvas.height;

                    ctx.save();

                    // Draw rounded rect clip
                    applySlotTransformAndClip(ctx, slotX, slotY, slotW, slotH, (slot as any).rotation, (slot as any).borderRadius, 10);

                    // Draw photo with cover fit
                    const imgAspect = img.width / img.height;
                    const slotAspect = slotW / slotH;
                    let drawW, drawH, offsetX, offsetY;

                    if (imgAspect > slotAspect) {
                        drawH = slotH;
                        drawW = slotH * imgAspect;
                        offsetX = (slotW - drawW) / 2;
                        offsetY = 0;
                    } else {
                        drawW = slotW;
                        drawH = slotW / imgAspect;
                        offsetX = 0;
                        offsetY = (slotH - drawH) / 2;
                    }

                    ctx.drawImage(img, slotX + offsetX, slotY + offsetY, drawW, drawH);
                    ctx.restore();
                });
            }

            // Draw overlay frame if position is 'overlay'
            if (dbFrame.framePosition === 'overlay' && frameImage) {
                ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);
            }

            ctx.restore();
        } catch (error) {
            console.error('Error rendering db frame preview:', error);
        }
    };

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-auto"
            style={{
                maxWidth: '100%',
                aspectRatio: `${dbFrame.outputWidth}/${dbFrame.outputHeight}`,
            }}
        />
    );
};

export default DbFramePreview;
