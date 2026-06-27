/** A4 portrait @ 300 DPI (full bleed). */
export const A4_OUTPUT_WIDTH = 2480;
export const A4_OUTPUT_HEIGHT = 3508;

/** 4×6 inch portrait @ 300 DPI — target resolusi cetak strip photobooth. */
export const R4_OUTPUT_WIDTH = 1200;
export const R4_OUTPUT_HEIGHT = 1800;

export function isA4FrameSize(width: number, height: number): boolean {
  if (width < 2400 || height < 3400) return false;
  return Math.abs(width / height - 210 / 297) < 0.04;
}

export function isPhotoStripFrameSize(width: number, height: number): boolean {
  if (isA4FrameSize(width, height)) return false;
  const aspect = width / height;
  return aspect >= 0.55 && aspect <= 0.75;
}
