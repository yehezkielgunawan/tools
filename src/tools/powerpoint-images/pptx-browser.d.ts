declare module 'pptx-browser' {
  export class PptxRenderer {
    slideCount: number;
    slideSize: { cx: number; cy: number };
    load(source: File | Uint8Array): Promise<void>;
    renderSlide(
      index: number,
      canvas: HTMLCanvasElement,
      width: number,
    ): Promise<void>;
    destroy(): void;
  }
}
