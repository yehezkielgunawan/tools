import type { PDFDocumentProxy } from 'pdfjs-dist';
import { getDocument, PDFWorker } from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface LocalPdfLoadingTask {
  destroy: () => Promise<void>;
  promise: Promise<PDFDocumentProxy>;
}

export function createPdfWorkerOptions(): WorkerOptions {
  return { name: 'local-pdf-worker', type: 'classic' };
}

export function createPdfWorker(): Worker {
  return new Worker(
    new URL('./pdf.worker.ts', import.meta.url),
    createPdfWorkerOptions(),
  );
}

export function createPdfDocumentOptions(data: Uint8Array) {
  return {
    data: new Uint8Array(data),
    cMapUrl: '/static/pdfjs/cmaps/',
    cMapPacked: true,
    iccUrl: '/static/pdfjs/iccs/',
    standardFontDataUrl: '/static/pdfjs/standard_fonts/',
    wasmUrl: '/static/pdfjs/wasm/',
    useWasm: false,
  };
}

export function loadPdfDocument(bytes: Uint8Array): LocalPdfLoadingTask {
  const port = createPdfWorker();
  let worker: PDFWorker | undefined;
  try {
    worker = PDFWorker.create({ port });
    const task = getDocument({ ...createPdfDocumentOptions(bytes), worker });
    let destruction: Promise<void> | null = null;
    return {
      promise: task.promise,
      destroy: () => {
        destruction ??= task.destroy().finally(() => {
          try {
            worker?.destroy();
          } finally {
            port.terminate();
          }
        });
        return destruction;
      },
    };
  } catch (error) {
    try {
      worker?.destroy();
    } finally {
      port.terminate();
    }
    throw error;
  }
}
