declare module 'gif.js' {
  export default class GIF {
    constructor(options: Record<string, unknown>);
    addFrame(
      element: HTMLCanvasElement | CanvasRenderingContext2D,
      options?: { copy?: boolean; delay?: number },
    ): void;
    on(event: 'finished', callback: (blob: Blob) => void): void;
    render(): void;
  }
}
