/** Paper / screen presets for frame output dimensions (width × height px). */
export const FRAME_FORMAT_PRESETS = [
  {
    group: 'Format Populer (300 DPI)',
    options: [
      { value: '1205x1795', label: '10 x 15 cm (4 x 6 in) (Borderless) - 1205 x 1795 px' },
      { value: '945x1772', label: 'Frame Receipt - 945 x 1772 px' },
      { value: '889x2000', label: 'Frame Receipt - 889 x 2000 px' },
      { value: '2480x3508', label: 'A4 (210 × 297 mm) - 2480 x 3508 px' },
    ],
  },
  {
    group: 'Digital / Screen',
    options: [
      { value: '1080x1920', label: 'Full HD Portrait (9:16) - 1080 x 1920 px' },
      { value: '1080x1080', label: 'Instagram Square (1:1) - 1080 x 1080 px' },
    ],
  },
] as const;

/** A4 portrait @ 300 DPI (full bleed). */
export const A4_OUTPUT_WIDTH = 2480;
export const A4_OUTPUT_HEIGHT = 3508;

export function isA4FrameSize(width: number, height: number): boolean {
  return width >= 2400 && height >= 3400 && Math.abs(width / height - 210 / 297) < 0.04;
}
