import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  GlobalWorkerOptions,
  getDocument,
} from 'pdfjs-dist/legacy/build/pdf.mjs';

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
    data,
    cMapUrl: '/static/pdfjs/cmaps/',
    cMapPacked: true,
    iccUrl: '/static/pdfjs/iccs/',
    standardFontDataUrl: '/static/pdfjs/standard_fonts/',
    wasmUrl: '/static/pdfjs/wasm/',
    useWasm: false,
  };
}

export function loadPdfDocument(bytes: Uint8Array): LocalPdfLoadingTask {
  const worker = createPdfWorker();
  GlobalWorkerOptions.workerPort = worker;
  const task = getDocument(createPdfDocumentOptions(bytes));

  return {
    promise: task.promise,
    destroy: async () => {
      try {
        await task.destroy();
      } finally {
        if (GlobalWorkerOptions.workerPort === worker) {
          GlobalWorkerOptions.workerPort = null;
        }
        worker.terminate();
      }
    },
  };
}
