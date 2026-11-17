import {
  calculateOutputDimensions,
  type MaxEdgeOption,
} from '../../image-compressor/imageUtils';
import { assertHeicDimensions } from './limits';
import type { HeicRequest, HeicResponse, HeicResult } from './types';

export function runHeicWorker(
  file: File,
  operation: HeicRequest['operation'],
  signal?: AbortSignal,
  maxEdge: MaxEdgeOption = 'original',
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
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
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
          'HEIC processing failed. Your device may not have enough memory; try a desktop browser or a smaller photo.',
        ),
      );
    };
    worker.onmessageerror = () =>
      finish(new Error('The HEIC decoder returned an unreadable result.'));
    worker.onmessage = ({ data }: MessageEvent<HeicResponse>) => {
      try {
        if (!data.ok) throw new Error(data.message);
        assertHeicDimensions(data.result.width, data.result.height);
        if (
          !Number.isSafeInteger(data.result.imageCount) ||
          data.result.imageCount < 1
        ) {
          throw new Error('The HEIC decoder returned invalid photo metadata.');
        }
        if (operation === 'decode') {
          const { sourceWidth, sourceHeight } = data.result;
          assertHeicDimensions(sourceWidth ?? 0, sourceHeight ?? 0);
          const expected = calculateOutputDimensions(
            sourceWidth ?? 0,
            sourceHeight ?? 0,
            maxEdge,
          );
          if (
            expected.width !== data.result.width ||
            expected.height !== data.result.height
          ) {
            throw new Error(
              'The HEIC decoder did not return the requested output size.',
            );
          }
        }
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
          worker.postMessage(
            { buffer, operation, maxEdge } satisfies HeicRequest,
            [buffer],
          );
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
