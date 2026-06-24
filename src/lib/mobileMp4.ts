import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

/** Target max size for bonus / live photo MP4 uploads (Supabase budget). */
export const VIDEO_BUDGET_MAX_BYTES = 2 * 1024 * 1024;

/** Video is encoded at reduced resolution; PNG final stays full frame size. */
export const VIDEO_ENCODE_MAX_LONG_EDGE = 1080;

export type CanvasFrameRenderer = (
  ctx: CanvasRenderingContext2D,
  frameIndex: number,
  timeSec: number,
) => void | Promise<void>;

function evenDimension(value: number): number {
  const n = Math.max(2, Math.round(value));
  return n % 2 === 0 ? n : n - 1;
}

export function getVideoEncodeDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxLongEdge = VIDEO_ENCODE_MAX_LONG_EDGE,
): { width: number; height: number; scale: number } {
  const longEdge = Math.max(sourceWidth, sourceHeight);
  if (longEdge <= maxLongEdge) {
    return {
      width: evenDimension(sourceWidth),
      height: evenDimension(sourceHeight),
      scale: 1,
    };
  }
  const scale = maxLongEdge / longEdge;
  return {
    width: evenDimension(sourceWidth * scale),
    height: evenDimension(sourceHeight * scale),
    scale,
  };
}

/** Bitrate (bps) so encoded duration fits under byte budget with mux overhead margin. */
export function computeBitrateForBudget(
  targetBytes: number,
  durationSec: number,
  minBitrate = 350_000,
  maxBitrate = 2_200_000,
): number {
  const raw = Math.floor((targetBytes * 8 * 0.88) / Math.max(durationSec, 0.5));
  return Math.min(maxBitrate, Math.max(minBitrate, raw));
}

/** Quick check: ISO BMFF "ftyp" box (MP4/MOV container). */
export async function isLikelyMp4Container(blob: Blob): Promise<boolean> {
  if (blob.size < 12) return false;
  const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  return (
    head[4] === 0x66 &&
    head[5] === 0x74 &&
    head[6] === 0x79 &&
    head[7] === 0x70
  );
}

export async function isMobileCompatibleMp4(blob: Blob): Promise<boolean> {
  const mime = blob.type.toLowerCase();
  if (mime.includes('webm')) return false;
  if (!mime.includes('mp4') && !(await isLikelyMp4Container(blob))) return false;
  return isLikelyMp4Container(blob);
}

function webCodecsSupported(): boolean {
  return (
    typeof VideoEncoder !== 'undefined' &&
    typeof VideoFrame !== 'undefined' &&
    typeof VideoEncoder.isConfigSupported === 'function'
  );
}

async function pickH264Codec(width: number, height: number, bitrate: number): Promise<string> {
  const candidates = ['avc1.42E01E', 'avc1.4D401E', 'avc1.64001E'];
  for (const codec of candidates) {
    try {
      const result = await VideoEncoder.isConfigSupported({
        codec,
        width,
        height,
        bitrate,
        framerate: 30,
      });
      if (result.supported) return codec;
    } catch {
      // try next
    }
  }
  return 'avc1.42E01E';
}

async function encodeOnce(options: {
  sourceWidth: number;
  sourceHeight: number;
  encodeWidth: number;
  encodeHeight: number;
  fps: number;
  totalFrames: number;
  bitrate: number;
  renderFrame: CanvasFrameRenderer;
}): Promise<Blob> {
  const {
    sourceWidth,
    sourceHeight,
    encodeWidth,
    encodeHeight,
    fps,
    totalFrames,
    bitrate,
    renderFrame,
  } = options;

  const needsScale =
    encodeWidth !== evenDimension(sourceWidth) ||
    encodeHeight !== evenDimension(sourceHeight);

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = evenDimension(sourceWidth);
  sourceCanvas.height = evenDimension(sourceHeight);
  const sourceCtx = sourceCanvas.getContext('2d', { alpha: false });
  if (!sourceCtx) throw new Error('Canvas 2D tidak tersedia');

  const encodeCanvas = document.createElement('canvas');
  encodeCanvas.width = encodeWidth;
  encodeCanvas.height = encodeHeight;
  const encodeCtx = encodeCanvas.getContext('2d', { alpha: false });
  if (!encodeCtx) throw new Error('Canvas 2D tidak tersedia');

  const drawFrame: CanvasFrameRenderer = async (ctx, frameIndex, timeSec) => {
    await renderFrame(sourceCtx, frameIndex, timeSec);
    if (needsScale) {
      ctx.drawImage(sourceCanvas, 0, 0, encodeWidth, encodeHeight);
    } else {
      ctx.drawImage(sourceCanvas, 0, 0);
    }
  };

  if (!webCodecsSupported()) {
    return encodeWithMediaRecorder(encodeCanvas, encodeCtx, fps, totalFrames, drawFrame, bitrate);
  }

  const codec = await pickH264Codec(encodeWidth, encodeHeight, bitrate);
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width: encodeWidth, height: encodeHeight },
    fastStart: 'in-memory',
  });

  let encodeError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => {
      encodeError = err instanceof Error ? err : new Error(String(err));
    },
  });

  encoder.configure({
    codec,
    width: encodeWidth,
    height: encodeHeight,
    bitrate,
    framerate: fps,
  });

  const frameDurationUs = Math.round(1_000_000 / fps);

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const timeSec = frameIndex / fps;
    await drawFrame(encodeCtx, frameIndex, timeSec);
    const timestamp = frameIndex * frameDurationUs;
    const frame = new VideoFrame(encodeCanvas, { timestamp, duration: frameDurationUs });
    encoder.encode(frame, { keyFrame: frameIndex % fps === 0 });
    frame.close();
    if (encodeError) throw encodeError;
  }

  await encoder.flush();
  muxer.finalize();
  encoder.close();

  return new Blob([target.buffer], { type: 'video/mp4' });
}

/**
 * Encode canvas frames to H.264 MP4 (baseline) under size budget.
 * Large frames (e.g. A4) are downscaled for video only.
 */
export async function encodeCanvasToMobileMp4(options: {
  width: number;
  height: number;
  fps?: number;
  totalFrames: number;
  bitrate?: number;
  maxBytes?: number;
  maxLongEdge?: number;
  renderFrame: CanvasFrameRenderer;
}): Promise<Blob> {
  const fps = options.fps ?? 30;
  const maxBytes = options.maxBytes ?? VIDEO_BUDGET_MAX_BYTES;
  const durationSec = options.totalFrames / fps;
  const { width: encodeWidth, height: encodeHeight } = getVideoEncodeDimensions(
    options.width,
    options.height,
    options.maxLongEdge,
  );

  let bitrate =
    options.bitrate ??
    computeBitrateForBudget(maxBytes, durationSec);

  let blob = await encodeOnce({
    sourceWidth: options.width,
    sourceHeight: options.height,
    encodeWidth,
    encodeHeight,
    fps,
    totalFrames: options.totalFrames,
    bitrate,
    renderFrame: options.renderFrame,
  });

  if (blob.size <= maxBytes) return blob;

  for (let attempt = 0; attempt < 2 && blob.size > maxBytes; attempt++) {
    bitrate = Math.max(350_000, Math.floor(bitrate * 0.65));
    blob = await encodeOnce({
      sourceWidth: options.width,
      sourceHeight: options.height,
      encodeWidth,
      encodeHeight,
      fps,
      totalFrames: options.totalFrames,
      bitrate,
      renderFrame: options.renderFrame,
    });
  }

  return blob;
}

async function encodeWithMediaRecorder(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  fps: number,
  totalFrames: number,
  renderFrame: CanvasFrameRenderer,
  bitrate: number,
): Promise<Blob> {
  const types = [
    'video/mp4;codecs=h264',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=h264',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const mimeType = types.find((t) => MediaRecorder.isTypeSupported(t)) || 'video/webm';
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
  const chunks: Blob[] = [];

  const blobPromise = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  recorder.start();
  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    await renderFrame(ctx, frameIndex, frameIndex / fps);
    await new Promise((r) => setTimeout(r, 1000 / fps));
  }
  recorder.stop();
  return blobPromise;
}

/** Re-encode arbitrary video blob to mobile MP4 via backend ffmpeg (fallback). */
export async function transcodeBlobViaApi(blob: Blob, filename = 'input.webm'): Promise<Blob> {
  const formData = new FormData();
  formData.append('file', blob, filename);
  const response = await fetch('/api/transcode-mp4', { method: 'POST', body: formData });
  if (!response.ok) {
    throw new Error('Transcode MP4 gagal');
  }
  return response.blob();
}

/** Ensure blob is H.264 MP4 within size budget for mobile sharing. */
export async function ensureMobileMp4(
  blob: Blob,
  sourceName = 'video.webm',
  maxBytes = VIDEO_BUDGET_MAX_BYTES,
): Promise<Blob> {
  if (await isMobileCompatibleMp4(blob) && blob.size <= maxBytes) {
    return new Blob([await blob.arrayBuffer()], { type: 'video/mp4' });
  }
  try {
    const transcoded = await transcodeBlobViaApi(blob, sourceName);
    if (transcoded.size <= maxBytes) {
      return new Blob([await transcoded.arrayBuffer()], { type: 'video/mp4' });
    }
    return new Blob([await transcoded.arrayBuffer()], { type: 'video/mp4' });
  } catch {
    return blob;
  }
}
