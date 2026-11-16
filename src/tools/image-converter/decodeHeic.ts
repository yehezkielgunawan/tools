import { assertConverterDimensions } from './converterLimits';
import type { HeicRequest, HeicResponse, HeicResult } from './heicTypes';

export function runHeicWorker(
  file: File,
  operation: HeicRequest['operation'],
  signal?: AbortSignal,
): Promise<HeicResult> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Conversion cancelled.', 'AbortError'));
      return;
    }
    if (typeof Worker === 'undefined') {
      reject(
        new Error('HEIC conversion needs Web Workers. Try a current browser.'),
      );
      return;
    }
    const worker = new Worker(new URL('./heic.worker.ts', import.meta.url), {
      type: 'module',
      name: 'image-converter-heic',
    });
    let settled = false;
    const finish = (error?: Error, result?: HeicResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      if (error) reject(error);
      else if (result) resolve(result);
    };
    const abort = (): void =>
      finish(new DOMException('Conversion cancelled.', 'AbortError'));
    const timeout = setTimeout(
      () =>
        finish(new Error('HEIC processing timed out. Try a smaller photo.')),
      60_000,
    );
    signal?.addEventListener('abort', abort, { once: true });
    worker.onerror = (event) => {
      event.preventDefault();
      finish(
        new Error(
          'The HEIC decoder could not start. Try another browser or a smaller photo.',
        ),
      );
    };
    worker.onmessageerror = () =>
      finish(new Error('The HEIC decoder returned an unreadable result.'));
    worker.onmessage = ({ data }: MessageEvent<HeicResponse>) => {
      try {
        if (!data.ok) throw new Error(data.message);
        assertConverterDimensions(data.result.width, data.result.height);
        if (
          operation === 'decode' &&
          (!(data.result.pixels instanceof ArrayBuffer) ||
            data.result.pixels.byteLength !==
              data.result.width * data.result.height * 4)
        ) {
          throw new Error('The HEIC decoder returned incomplete pixels.');
        }
        finish(undefined, data.result);
      } catch (error) {
        finish(
          error instanceof Error ? error : new Error('HEIC decoding failed.'),
        );
      }
    };
    void file.arrayBuffer().then(
      (buffer) => {
        if (settled) return;
        try {
          worker.postMessage({ buffer, operation } satisfies HeicRequest, [
            buffer,
          ]);
        } catch (error) {
          finish(
            error instanceof Error ? error : new Error('HEIC decoding failed.'),
          );
        }
      },
      () => finish(new Error('The selected photo could not be read.')),
    );
  });
}
