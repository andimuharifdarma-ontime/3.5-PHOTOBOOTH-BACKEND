export type FrameCategory = 'standard' | 'frames2';
export type ExtendedFrameCategory = FrameCategory | 'database';

export interface FrameThemeOption {
  id: FrameCategory;
  title: string;
  description: string;
  highlight: string;
  previewUrl: string;
  actionLabel: string;
  route: string;
}

export interface FrameSlot {
  x: number; // relative 0..1
  y: number;
  width: number;
  height: number;
}

export interface FrameLayoutConfig {
  id: string;
  category: FrameCategory | 'database';
  name: string;
  previewUrl: string;
  backgroundUrl?: string;
  overlayUrl?: string;
  detectionUrl?: string;
  outputWidth: number;
  outputHeight: number;
  slots?: FrameSlot[];
}

const EX_FRAMES_BASE = '/ex%20frames%202';
const FRAMES_TWO_BASE = '/frames%202';

export const FRAME_THEME_OPTIONS: FrameThemeOption[] = [
  {
    id: 'standard',
    title: 'Koleksi Frame Utama',
    description: 'Strip foto klasik 4 slot dengan berbagai gaya.',
    highlight: 'Cocok untuk cetak 2x6 inci',
    previewUrl: '/ex%20frames/Groovy.png',
    actionLabel: 'Pakai Frame Utama',
    route: '/session',
  },
  {
    id: 'frames2',
    title: 'Tema Frame 2 (1080 x 1920)',
    description: 'Layout dengan latar penuh sesuai contoh yang diberi nomor.',
    highlight: 'Optimasi layar smartphone & sosial media',
    previewUrl: `${EX_FRAMES_BASE}/1.png`,
    actionLabel: 'Pilih Tema Frame 2',
    route: '/frames-two',
  },
];

export const FRAME_TWO_LAYOUTS: FrameLayoutConfig[] = [
  {
    id: 'frame2-layout-1',
    category: 'frames2',
    name: 'Frame 2 #1',
    previewUrl: `${EX_FRAMES_BASE}/1.png`,
    backgroundUrl: `${FRAMES_TWO_BASE}/2.png`,
    detectionUrl: `${EX_FRAMES_BASE}/1.png`,
    outputWidth: 1080,
    outputHeight: 1920,
    slots: [
      { x: 42 / 1080, y: 83 / 1920, width: 1003 / 1080, height: 623 / 1920 }, // area 1 besar
      { x: 42 / 1080, y: 746 / 1920, width: 470 / 1080, height: 360 / 1920 }, // area 2
      { x: 42 / 1080, y: 1146 / 1920, width: 470 / 1080, height: 360 / 1920 }, // area 3
      { x: 42 / 1080, y: 1546 / 1920, width: 470 / 1080, height: 360 / 1920 }, // area 4
    ],
  },
  {
    id: 'frame2-layout-2',
    category: 'frames2',
    name: 'Frame 2 #2',
    previewUrl: `${EX_FRAMES_BASE}/3.png`,
    backgroundUrl: `${FRAMES_TWO_BASE}/4.png`,
    detectionUrl: `${EX_FRAMES_BASE}/3.png`,
    outputWidth: 1080,
    outputHeight: 1920,
    slots: [
      { x: 42 / 1080, y: 83 / 1920, width: 1003 / 1080, height: 623 / 1920 }, // sama dengan layout patokan
      { x: 42 / 1080, y: 746 / 1920, width: 470 / 1080, height: 360 / 1920 },
      { x: 42 / 1080, y: 1146 / 1920, width: 470 / 1080, height: 360 / 1920 },
      { x: 42 / 1080, y: 1546 / 1920, width: 470 / 1080, height: 360 / 1920 },
    ],
  },
  {
    id: 'frame2-layout-3',
    category: 'frames2',
    name: 'Frame 2 #3',
    previewUrl: `${EX_FRAMES_BASE}/5.png`,
    backgroundUrl: `${FRAMES_TWO_BASE}/6.png`,
    detectionUrl: `${EX_FRAMES_BASE}/5.png`,
    outputWidth: 1080,
    outputHeight: 1920,
    slots: [
      { x: 42 / 1080, y: 83 / 1920, width: 1003 / 1080, height: 623 / 1920 }, // area 1 besar
      { x: 42 / 1080, y: 746 / 1920, width: 470 / 1080, height: 360 / 1920 }, // area 2
      { x: 42 / 1080, y: 1146 / 1920, width: 470 / 1080, height: 360 / 1920 }, // area 3
      { x: 42 / 1080, y: 1546 / 1920, width: 470 / 1080, height: 360 / 1920 }, // area 4
    ],
  },
  {
    id: 'frame2-layout-4',
    category: 'frames2',
    name: 'Frame 2 #4',
    previewUrl: `${EX_FRAMES_BASE}/7.png`,
    backgroundUrl: `${FRAMES_TWO_BASE}/8.png`,
    detectionUrl: `${EX_FRAMES_BASE}/7.png`,
    outputWidth: 1080,
    outputHeight: 1920,
    slots: [
      { x: 42 / 1080, y: 83 / 1920, width: 1003 / 1080, height: 623 / 1920 }, // area 1 besar
      { x: 42 / 1080, y: 746 / 1920, width: 470 / 1080, height: 360 / 1920 }, // area 2
      { x: 42 / 1080, y: 1146 / 1920, width: 470 / 1080, height: 360 / 1920 }, // area 3
      { x: 42 / 1080, y: 1546 / 1920, width: 470 / 1080, height: 360 / 1920 }, // area 4
    ],
  },
  {
    id: 'frame2-layout-5',
    category: 'frames2',
    name: 'Frame 2 #5',
    previewUrl: `${EX_FRAMES_BASE}/9.png`,
    backgroundUrl: `${FRAMES_TWO_BASE}/10.png`,
    detectionUrl: `${EX_FRAMES_BASE}/9.png`,
    outputWidth: 1080,
    outputHeight: 1920,
    slots: [
      { x: 42 / 1080, y: 83 / 1920, width: 1003 / 1080, height: 623 / 1920 }, // area 1 besar
      { x: 42 / 1080, y: 746 / 1920, width: 470 / 1080, height: 360 / 1920 }, // area 2
      { x: 42 / 1080, y: 1146 / 1920, width: 470 / 1080, height: 360 / 1920 }, // area 3
      { x: 42 / 1080, y: 1546 / 1920, width: 470 / 1080, height: 360 / 1920 }, // area 4
    ],
  },
  {
    id: 'frame2-layout-6',
    category: 'frames2',
    name: 'Frame 2 #6',
    previewUrl: `${EX_FRAMES_BASE}/11.png`,
    backgroundUrl: `${FRAMES_TWO_BASE}/12.png`,
    detectionUrl: `${EX_FRAMES_BASE}/11.png`,
    outputWidth: 1080,
    outputHeight: 1920,
    slots: [
      { x: 42 / 1080, y: 83 / 1920, width: 1003 / 1080, height: 623 / 1920 }, // area 1 besar
      { x: 42 / 1080, y: 746 / 1920, width: 470 / 1080, height: 360 / 1920 }, // area 2
      { x: 42 / 1080, y: 1146 / 1920, width: 470 / 1080, height: 360 / 1920 }, // area 3
      { x: 42 / 1080, y: 1546 / 1920, width: 470 / 1080, height: 360 / 1920 }, // area 4
    ],
  },
];

export const getFrameTwoLayout = (id: string) =>
  FRAME_TWO_LAYOUTS.find((layout) => layout.id === id);

export const getFrameLayoutConfig = (
  frameId: string,
  category: ExtendedFrameCategory = 'standard'
): FrameLayoutConfig => {
  if (category === 'frames2') {
    const found = getFrameTwoLayout(frameId);
    if (found) return found;

    const first = FRAME_TWO_LAYOUTS[0];
    if (first) return first;

    // Ultimate fallback
    return {
      id: 'frame2-layout-fallback',
      category: 'frames2',
      name: 'Frame 2 Default',
      previewUrl: `${EX_FRAMES_BASE}/1.png`,
      backgroundUrl: `${FRAMES_TWO_BASE}/2.png`,
      detectionUrl: `${EX_FRAMES_BASE}/1.png`,
      outputWidth: 1080,
      outputHeight: 1920,
    };
  }

  // Improved fallback logic
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(frameId);
  const isDatabaseId = isUuid || frameId.length > 20; // Assume longer strings are database IDs

  return {
    id: frameId,
    category: 'standard',
    name: frameId,
    previewUrl: isDatabaseId ? '' : `/frames/${frameId}.png`,
    backgroundUrl: undefined,
    overlayUrl: isDatabaseId ? undefined : `/frames/${frameId}.png`,
    detectionUrl: isDatabaseId ? undefined : `/frames/${frameId}.png`,
    outputWidth: 2000,
    outputHeight: 6000,
  };
};

