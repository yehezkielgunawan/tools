import { inspectImageFile } from '../image-compressor/imageUtils';
import { prepareImage, releaseCanvas } from '../image-compressor/prepareImage';
import {
  checkCancelled,
  MAX_CONVERSION_ITEMS,
  MAX_IMAGE_QUEUE_BYTES,
} from './conversionLimits';
import type { ImageInput, PreparedDocumentImage } from './conversionTypes';

export async function inspectImageInputs(
  files: File[],
  existing: readonly ImageInput[],
  signal: AbortSignal,
): Promise<ImageInput[]> {
  if (files.length + existing.length > MAX_CONVERSION_ITEMS)
    throw new RangeError('Choose 50 images or fewer.');
  if (
    [...files, ...existing.map((item) => item.file)].reduce(
      (sum, file) => sum + file.size,
      0,
    ) > MAX_IMAGE_QUEUE_BYTES
  )
    throw new RangeError('Choose images totaling 64 MiB or less.');
  const next: ImageInput[] = [];
  try {
    for (const file of files) {
      checkCancelled(signal);
      const info = await inspectImageFile(file);
      checkCancelled(signal);
      next.push({
        id: crypto.randomUUID(),
        file,
        width: info.width,
        height: info.height,
        url: URL.createObjectURL(file),
      });
    }
    return next;
  } catch (error) {
    for (const image of next) URL.revokeObjectURL(image.url);
    throw error;
  }
}

export async function* prepareDocumentImages(
  images: readonly ImageInput[],
  signal: AbortSignal,
  progress: (done: number, total: number) => void,
): AsyncGenerator<PreparedDocumentImage> {
  for (let i = 0; i < images.length; i += 1) {
    checkCancelled(signal);
    const prepared = await prepareImage(images[i].file, 3072, 'same');
    try {
      checkCancelled(signal);
      const blob = await canvasBlob(
        prepared.canvas,
        prepared.outputMimeType,
        0.94,
      );
      const bytes = new Uint8Array(await blob.arrayBuffer());
      checkCancelled(signal);
      yield {
        bytes,
        width: prepared.width,
        height: prepared.height,
        mimeType: prepared.outputMimeType,
      };
      progress(i + 1, images.length);
    } finally {
      releaseCanvas(prepared.canvas);
    }
  }
}

export function canvasBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality = 0.9,
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.type !== type)
          reject(
            new Error(
              'Your browser could not encode this image. Try a smaller resolution.',
            ),
          );
        else resolve(blob);
      },
      type,
      quality,
    ),
  );
}
