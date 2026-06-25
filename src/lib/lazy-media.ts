type GifConstructor = new (options: Record<string, unknown>) => {
  addFrame: (canvas: HTMLCanvasElement | CanvasRenderingContext2D, options?: { copy?: boolean; delay?: number }) => void;
  on: (event: string, callback: (blob: Blob) => void) => void;
  render: () => void;
};

let gifModulePromise: Promise<{ default: GifConstructor }> | null = null;

async function loadGifModule() {
  if (!gifModulePromise) {
    gifModulePromise = import('gif.js') as Promise<{ default: GifConstructor }>;
  }
  return gifModulePromise;
}

export async function createGifEncoder(options: {
  workers: number;
  quality: number;
  width: number;
  height: number;
  workerScript: string;
}) {
  const { default: GIF } = await loadGifModule();
  return new GIF(options);
}

let mobileMp4ModulePromise: Promise<typeof import('@/lib/mobileMp4')> | null = null;

export async function loadMobileMp4() {
  if (!mobileMp4ModulePromise) {
    mobileMp4ModulePromise = import('@/lib/mobileMp4');
  }
  return mobileMp4ModulePromise;
}
