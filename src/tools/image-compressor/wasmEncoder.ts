import type { ImageMimeType } from './imageUtils';
import type { WasmEncodeRequest, WasmEncodeResponse } from './wasmProtocol';

interface WasmWorkerOptions {
  format: ImageMimeType;
  quality: number;
  pngLossy: boolean;
}

function createWasmWorker(): Worker {
  return new Worker(new URL('./pixo.worker.ts', import.meta.url), {
    type: 'module',
    name: 'image-compressor-wasm',
  });
}

function makeAbortError(): Error {
  const error = new Error('Compression was cancelled.');
  error.name = 'AbortError';
  return error;
}

export function encodeWithWasm(
  canvas: HTMLCanvasElement,
  options: WasmWorkerOptions,
  signal?: AbortSignal,
  workerFactory: () => Worker = createWasmWorker,
): Promise<Blob> {
  if (signal?.aborted) {
    return Promise.reject(makeAbortError());
  }

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return Promise.reject(
      new Error('The image pixels are unavailable for WASM compression.'),
    );
  }

  let imageData: ImageData;
  try {
    imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return Promise.reject(
      new Error('The image pixels could not be read for WASM compression.'),
    );
  }

  let worker: Worker;
  try {
    worker = workerFactory();
  } catch {
    return Promise.reject(
      new Error(
        'The WASM compressor could not start. Select Canvas mode to continue.',
      ),
    );
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = (): void => {
      worker.onmessage = null;
      worker.onmessageerror = null;
      worker.onerror = null;
      signal?.removeEventListener('abort', handleAbort);
      worker.terminate();
    };

    const finish = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };

    const handleAbort = (): void => finish(() => reject(makeAbortError()));

    worker.onmessage = (event: MessageEvent<WasmEncodeResponse>) => {
      const response = event.data;
      if (response.type === 'error') {
        finish(() => reject(new Error(response.message)));
        return;
      }

      finish(() =>
        resolve(new Blob([response.buffer], { type: options.format })),
      );
    };

    worker.onmessageerror = () =>
      finish(() =>
        reject(new Error('The WASM worker returned an unreadable result.')),
      );
    worker.onerror = (event) => {
      event.preventDefault();
      finish(() =>
        reject(
          new Error(
            'The WASM compressor failed. Select Canvas mode to continue.',
          ),
        ),
      );
    };
    signal?.addEventListener('abort', handleAbort, { once: true });

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    const request: WasmEncodeRequest = {
      type: 'encode',
      pixels: imageData.data.buffer,
      width: canvas.width,
      height: canvas.height,
      format: options.format,
      quality: Math.min(100, Math.max(1, Math.round(options.quality))),
      pngLossy: options.pngLossy,
    };

    try {
      worker.postMessage(request, [request.pixels]);
    } catch {
      finish(() =>
        reject(
          new Error('The WASM worker could not receive the image pixels.'),
        ),
      );
    }
  });
}
