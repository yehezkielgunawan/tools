import { zip } from 'fflate';
import { checkCancelled, checkResultSize } from './conversionLimits';
import type { ConversionOutput } from './conversionTypes';

export async function createImagesZip(
  outputs: readonly ConversionOutput[],
  signal: AbortSignal,
): Promise<Blob> {
  const entries: Record<string, Uint8Array> = {};
  let size = 0;
  for (const output of outputs) {
    checkCancelled(signal);
    size += output.blob.size;
    checkResultSize(size);
    entries[output.filename] = new Uint8Array(await output.blob.arrayBuffer());
  }
  checkCancelled(signal);
  return new Promise((resolve, reject) => {
    const abort = () => {
      terminate();
      reject(new DOMException('Conversion cancelled.', 'AbortError'));
    };
    const terminate = zip(entries, { level: 0 }, (error, bytes) => {
      signal.removeEventListener('abort', abort);
      if (error) reject(error);
      else
        resolve(new Blob([new Uint8Array(bytes)], { type: 'application/zip' }));
    });
    signal.addEventListener('abort', abort, { once: true });
  });
}
