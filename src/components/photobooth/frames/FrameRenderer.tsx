import { useRef, useEffect, useMemo } from 'react';
import type { PhotoData } from '@/store/usePhotoStore';
import type { ExtendedFrameCategory, FrameLayoutConfig } from '@/lib/frameLayouts';
import { getFrameLayoutConfig } from '@/lib/frameLayouts';
import { applySlotTransformAndClip } from '@/lib/canvasUtils';

interface FrameRendererProps {
  photos: PhotoData[];
  frameType: string;
  width?: number;
  height?: number;
  className?: string;
  rounded?: boolean; // kontrol sudut membulat pada slot foto
  frameCategory?: ExtendedFrameCategory;
}

const FrameRenderer: React.FC<FrameRendererProps> = ({
  photos,
  frameType,
  width,
  height,
  className = '',
  rounded = true,
  frameCategory = 'standard',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layout = useMemo<FrameLayoutConfig>(() => getFrameLayoutConfig(frameType, frameCategory), [frameCategory, frameType]);
  const effectiveWidth = width ?? layout.outputWidth;
  const effectiveHeight = height ?? layout.outputHeight;

  useEffect(() => {
    if (photos.length === 4) {
      renderFrame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, frameType]);

  // Fungsi untuk mendeteksi kotak hijau dari frame overlay
  const detectGreenBoxes = async (sourcePath: string | undefined, canvasWidth: number, canvasHeight: number): Promise<Array<{ x: number, y: number, width: number, height: number }> | null> => {
    if (!sourcePath) return null;
    try {
      // Load frame overlay
      const overlay = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = sourcePath;
      });

      // Create temporary canvas untuk analisis
      const analysisCanvas = document.createElement('canvas');
      analysisCanvas.width = canvasWidth;
      analysisCanvas.height = canvasHeight;
      const analysisCtx = analysisCanvas.getContext('2d');
      if (!analysisCtx) return null;

      // Draw overlay ke canvas
      analysisCtx.drawImage(overlay, 0, 0, canvasWidth, canvasHeight);

      // Ambil image data
      const imageData = analysisCtx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imageData.data;

      // Deteksi semua kotak hijau
      const greenBoxes: Array<{ minX: number, minY: number, maxX: number, maxY: number }> = [];
      const visited = new Set<string>();

      // Threshold untuk mendeteksi hijau
      for (let y = 0; y < canvasHeight; y++) {
        for (let x = 0; x < canvasWidth; x++) {
          const idx = (y * canvasWidth + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          // Deteksi hijau
          const isGreen = a > 100 && g > 150 && g > r * 1.3 && g > b * 1.3;
          const isLightGreen = a > 100 && g > 120 && (g - r) > 50 && (g - b) > 50;

          if ((isGreen || isLightGreen) && !visited.has(`${x},${y}`)) {
            // Flood fill untuk menemukan seluruh kotak hijau
            const box = { minX: x, minY: y, maxX: x, maxY: y };
            const queue: Array<[number, number]> = [[x, y]];
            visited.add(`${x},${y}`);

            while (queue.length > 0) {
              const [cx, cy] = queue.shift()!;

              // Update bounds
              box.minX = Math.min(box.minX, cx);
              box.minY = Math.min(box.minY, cy);
              box.maxX = Math.max(box.maxX, cx);
              box.maxY = Math.max(box.maxY, cy);

              // Check neighbors
              const neighbors = [
                [cx - 1, cy], [cx + 1, cy],
                [cx, cy - 1], [cx, cy + 1]
              ];

              for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < canvasWidth && ny >= 0 && ny < canvasHeight) {
                  const key = `${nx},${ny}`;
                  if (!visited.has(key)) {
                    const nIdx = (ny * canvasWidth + nx) * 4;
                    const nr = data[nIdx];
                    const ng = data[nIdx + 1];
                    const nb = data[nIdx + 2];
                    const na = data[nIdx + 3];
                    const nIsGreen = na > 100 && ng > 150 && ng > nr * 1.3 && ng > nb * 1.3;
                    const nIsLightGreen = na > 100 && ng > 120 && (ng - nr) > 50 && (ng - nb) > 50;

                    if (nIsGreen || nIsLightGreen) {
                      visited.add(key);
                      queue.push([nx, ny]);
                    }
                  }
                }
              }
            }

            // Hanya tambahkan kotak yang cukup besar (untuk menghindari noise)
            const boxWidth = box.maxX - box.minX;
            const boxHeight = box.maxY - box.minY;
            if (boxWidth > 50 && boxHeight > 50) {
              greenBoxes.push(box);
            }
          }
        }
      }

      // Sort kotak berdasarkan posisi Y (dari atas ke bawah)
      greenBoxes.sort((a, b) => a.minY - b.minY);

      // Konversi ke format yang digunakan untuk rendering
      return greenBoxes.map(box => ({
        x: box.minX,
        y: box.minY,
        width: box.maxX - box.minX,
        height: box.maxY - box.minY
      }));
    } catch (error) {
      // console.error('Error detecting green boxes:', error);
      return null;
    }
  };

  const mapSlotsToPixels = () => {
    if (!layout.slots || layout.slots.length === 0) return null;
    return layout.slots.map((slot: any) => ({
      x: slot.x * effectiveWidth,
      y: slot.y * effectiveHeight,
      width: slot.width * effectiveWidth,
      height: slot.height * effectiveHeight,
      rotation: slot.rotation || 0,
      borderRadius: slot.borderRadius || 0,
    }));
  };

  const renderFrame = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = effectiveWidth;
    canvas.height = effectiveHeight;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, effectiveWidth, effectiveHeight);

    // Load and draw photos
    const imagePromises = photos.map(photo => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = photo.dataUrl;
      });
    });

    const loadImage = (src?: string) => {
      if (!src) return Promise.resolve(null as unknown as HTMLImageElement);
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    try {
      // Load photos and overlay in parallel
      const [images, overlayMaybe] = await Promise.all([
        Promise.all(imagePromises),
        loadImage(layout.overlayUrl).catch(() => null as unknown as HTMLImageElement)
      ]);

      // --- APPLY SAFE ZONE PROTECTION ---
      // Apply 3% margin to ensure critical elements match the editor's Safe Zone
      const marginX = effectiveWidth * 0.03;
      const marginY = effectiveHeight * 0.03;
      const targetWidth = effectiveWidth - (marginX * 2);
      const targetHeight = effectiveHeight - (marginY * 2);

      ctx.save();
      ctx.translate(marginX, marginY);
      ctx.scale(targetWidth / effectiveWidth, targetHeight / effectiveHeight);

      // Draw frame background based on type
      if (frameCategory === 'frames2' && layout.backgroundUrl) {
        try {
          const background = await loadImage(layout.backgroundUrl);
          if (background) {
            ctx.drawImage(background, 0, 0, effectiveWidth, effectiveHeight);
          }
        } catch {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, effectiveWidth, effectiveHeight);
        }
      } else {
        drawFrameBackground(ctx, frameType, effectiveWidth, effectiveHeight);
      }

      // Draw PNG overlay UNDER photos so photos remain visible
      if (frameCategory === 'standard' && overlayMaybe) {
        try {
          ctx.drawImage(overlayMaybe, 0, 0, effectiveWidth, effectiveHeight);
        } catch {
          // ignore overlay error
        }
      }

      const slotBoxes = mapSlotsToPixels();
      // Deteksi kotak hijau dari frame overlay jika slot manual tidak tersedia
      const detectionSource = layout.detectionUrl ?? layout.overlayUrl ?? layout.backgroundUrl;
      const greenBoxes = slotBoxes ? null : await detectGreenBoxes(detectionSource, effectiveWidth, effectiveHeight);
      const boxes = slotBoxes ?? greenBoxes;

      // Gunakan slot manual / kotak hijau jika ditemukan, jika tidak gunakan posisi default
      if (boxes && boxes.length > 0) {
        // Render semua kotak/slot yang tersedia
        boxes.forEach((srcBox, index) => {
          // Gunakan foto berdasarkan urutan slot, ulang foto jika slot lebih banyak dari foto
          const img = images[index % images.length];
          if (!img) return;

          const useLegacyExpansion = frameCategory === 'standard' && !slotBoxes;
          const expandLeftRight = useLegacyExpansion ? srcBox.width * 0.15 : 0;
          const expandDown = useLegacyExpansion ? srcBox.height * 0.10 : 0;
          const photoOffsetY = 0;

          const box = {
            x: Math.max(0, srcBox.x - expandLeftRight),
            y: srcBox.y + photoOffsetY,
            width: srcBox.width + (expandLeftRight * 2),
            height: srcBox.height + expandDown
          };
          // jaga dalam batas kanvas
          if (box.x + box.width > effectiveWidth) box.width = effectiveWidth - box.x;
          if (box.y + box.height > effectiveHeight) box.height = effectiveHeight - box.y;

          // Gambar foto mode COVER di dalam rounded rect
          ctx.save();
          applySlotTransformAndClip(ctx, box.x, box.y, box.width, box.height, (srcBox as any).rotation, (srcBox as any).borderRadius, rounded ? 20 : 0);

          const imgAspect = img.width / img.height;
          const targetAspect = box.width / box.height;
          let drawWidth, drawHeight, offsetX, offsetY;

          if (imgAspect > targetAspect) {
            // Gambar lebih lebar: sesuaikan tinggi, crop samping
            drawHeight = box.height;
            drawWidth = box.height * imgAspect;
            offsetX = (box.width - drawWidth) / 2;
            offsetY = 0;
          } else {
            // Gambar lebih tinggi: sesuaikan lebar, crop atas/bawah
            drawWidth = box.width;
            drawHeight = box.width / imgAspect;
            offsetX = 0;
            offsetY = (box.height - drawHeight) / 2;
          }

          ctx.drawImage(img, box.x + offsetX, box.y + offsetY, drawWidth, drawHeight);
          ctx.restore();
        });
      } else {
        // Fallback: gunakan posisi default jika kotak hijau tidak terdeteksi
        // Selaraskan dengan FinalResultPage (92% lebar, 19% tinggi, gap 1%, start 7%)
        const photoWidth = effectiveWidth * 0.92;
        const photoHeight = effectiveHeight * 0.19;
        const horizontalMargin = (effectiveWidth - photoWidth) / 2;
        const verticalGap = effectiveHeight * 0.01;
        const totalPhotosHeight = (photoHeight * images.length) + (verticalGap * (images.length - 1));
        const topStart = (effectiveHeight - totalPhotosHeight) / 2;

        const positions = Array.from({ length: 4 }).map((_, i) => ({
          x: horizontalMargin,
          y: topStart + i * (photoHeight + verticalGap),
          width: photoWidth,
          height: photoHeight
        }));

        images.forEach((img, index) => {
          if (positions[index]) {
            const pos = positions[index];

            // Draw photo with rounded corners
            ctx.save();
            applySlotTransformAndClip(ctx, pos.x, pos.y, pos.width, pos.height, (pos as any).rotation, (pos as any).borderRadius, rounded ? 20 : 0);

            // Calculate aspect ratio (COVER) and draw image
            const imgAspect = img.width / img.height;
            const targetAspect = pos.width / pos.height;

            let drawWidth, drawHeight, offsetX, offsetY;

            if (imgAspect > targetAspect) {
              // Lebih lebar: sesuaikan tinggi, crop samping
              drawHeight = pos.height;
              drawWidth = pos.height * imgAspect;
              offsetX = (pos.width - drawWidth) / 2;
              offsetY = 0;
            } else {
              // Lebih tinggi: sesuaikan lebar, crop atas/bawah
              drawWidth = pos.width;
              drawHeight = pos.width / imgAspect;
              offsetX = 0;
              offsetY = (pos.height - drawHeight) / 2;
            }

            ctx.drawImage(img, pos.x + offsetX, pos.y + offsetY, drawWidth, drawHeight);
            ctx.restore();
          }
        });
      }

      // If no overlay was drawn, optionally add decorative strokes on TOP
      if (frameCategory === 'standard' && !overlayMaybe) {
        drawFrameDecorations(ctx, frameType, effectiveWidth, effectiveHeight);
      }

      ctx.restore();
    } catch (error) {
      console.error('Error rendering frame:', error);
    }
  };

  // drawRoundedRect removed, using applySlotTransformAndClip instead

  const drawFrameBackground = (ctx: CanvasRenderingContext2D, frameType: string, width: number, height: number) => {
    switch (frameType) {
      case 'classic':
        // Classic white frame with border
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#71604b';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, width - 10, height - 10);
        break;

      case 'vintage':
        // Vintage sepia frame
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#f5e8c6');
        gradient.addColorStop(1, '#e6d7b3');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        break;

      case 'modern':
        // Modern gradient frame
        const modernGradient = ctx.createLinearGradient(0, 0, width, height);
        modernGradient.addColorStop(0, '#71604b');
        modernGradient.addColorStop(0.5, '#f5e8c6');
        modernGradient.addColorStop(1, '#71604b');
        ctx.fillStyle = modernGradient;
        ctx.fillRect(0, 0, width, height);
        break;

      case 'elegant':
        // Elegant dark frame
        ctx.fillStyle = '#2c1810';
        ctx.fillRect(0, 0, width, height);

        // Add ornate border
        ctx.strokeStyle = '#71604b';
        ctx.lineWidth = 15;
        ctx.strokeRect(20, 20, width - 40, height - 40);
        break;

      default:
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    }
  };

  const drawFrameDecorations = (ctx: CanvasRenderingContext2D, frameType: string, width: number, height: number) => {
    // Decorative elements based on frame type (title, date, and title box removed)
    switch (frameType) {
      case 'vintage':
        drawVintageDecorations(ctx, width, height);
        break;
      case 'elegant':
        drawElegantDecorations(ctx, width, height);
        break;
      case 'modern':
        drawModernDecorations(ctx, width, height);
        break;
    }
  };

  const drawVintageDecorations = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Add vintage corner decorations
    const cornerSize = width * 0.05;
    ctx.strokeStyle = '#71604b';
    ctx.lineWidth = 3;

    // Top corners
    ctx.beginPath();
    ctx.moveTo(cornerSize, cornerSize * 2);
    ctx.lineTo(cornerSize, cornerSize);
    ctx.lineTo(cornerSize * 2, cornerSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(width - cornerSize * 2, cornerSize);
    ctx.lineTo(width - cornerSize, cornerSize);
    ctx.lineTo(width - cornerSize, cornerSize * 2);
    ctx.stroke();
  };

  const drawElegantDecorations = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Add elegant flourishes
    ctx.strokeStyle = '#71604b';
    ctx.lineWidth = 2;

    // Decorative lines
    for (let i = 0; i < 3; i++) {
      const y = height * 0.85 + i * 20;
      ctx.beginPath();
      ctx.moveTo(width * 0.3, y);
      ctx.lineTo(width * 0.7, y);
      ctx.stroke();
    }
  };

  const drawModernDecorations = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Add modern geometric elements
    ctx.fillStyle = 'rgba(113, 96, 75, 0.3)';

    // Geometric shapes
    ctx.fillRect(width * 0.05, height * 0.9, width * 0.1, height * 0.05);
    ctx.fillRect(width * 0.85, height * 0.9, width * 0.1, height * 0.05);
  };

  return (
    <div className="w-full flex justify-center">
      <canvas
        ref={canvasRef}
        className={`${className} max-w-full h-auto`}
        style={{
          maxWidth: '100%',
          height: 'auto',
          aspectRatio: `${width}/${height}`,
          maxHeight: '80vh',
          width: 'auto',
          minWidth: '200px'
        }}
      />
    </div>
  );
};

export default FrameRenderer;