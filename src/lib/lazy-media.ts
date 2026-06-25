let gifModulePromise: Promise<typeof import('gif.js')> | null = null;

async function loadGifModule() {
  if (!gifModulePromise) {
    gifModulePromise = import('gif.js');
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
