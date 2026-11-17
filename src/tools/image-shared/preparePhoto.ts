import {
  calculateOutputDimensions,
  type ImageMimeType,
  type MaxEdgeOption,
} from '../image-compressor/imageUtils';
import { prepareImage, releaseCanvas } from '../image-compressor/prepareImage';
import { assertNotAborted } from './abort';
import { runHeicWorker } from './heic/client';
import {
  inspectPhotoInput,
  type PhotoInfo,
  type PhotoMimeType,
} from './photoInput';

export interface PreparedPhoto {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  mimeType: PhotoMimeType;
  outputMimeType: ImageMimeType;
}

export function resolvePhotoOutputFormat(
  format: ImageMimeType | 'same',
  input: PhotoMimeType,
): ImageMimeType {
  return format === 'same'
    ? input === 'image/png'
      ? 'image/png'
      : 'image/jpeg'
    : format;
}

export async function preparePhoto(
  file: File,
  options: { outputMimeType: ImageMimeType; maxEdge: MaxEdgeOption },
  signal?: AbortSignal,
  inspected?: PhotoInfo,
): Promise<PreparedPhoto> {
  assertNotAborted(signal);
  const info = inspected ?? (await inspectPhotoInput(file, signal));
  assertNotAborted(signal);
  if (info.mimeType === 'image/jpeg' || info.mimeType === 'image/png') {
    const prepared = await prepareImage(
      file,
      options.maxEdge,
      options.outputMimeType,
    );
    if (signal?.aborted) {
      releaseCanvas(prepared.canvas);
      assertNotAborted(signal);
    }
    return prepared;
  }
  const dimensions = calculateOutputDimensions(
    info.width,
    info.height,
    options.maxEdge,
  );
  let bitmap: ImageBitmap | undefined;
  try {
    // Native decoding is used only for single-image containers. Otherwise the
    // worker explicitly selects the primary photo, not an arbitrary first frame.
    if (info.imageCount === 1 && typeof createImageBitmap === 'function') {
      try {
        bitmap = await createImageBitmap(file, {
          imageOrientation: 'from-image',
          resizeWidth: dimensions.width,
          resizeHeight: dimensions.height,
          resizeQuality: 'high',
        });
        if (
          bitmap.width !== dimensions.width ||
          bitmap.height !== dimensions.height
        ) {
          bitmap.close();
          bitmap = undefined;
        }
      } catch {
        assertNotAborted(signal);
      }
    }
    assertNotAborted(signal);
    const pixels = bitmap
      ? undefined
      : await runHeicWorker(file, 'decode', signal, options.maxEdge);
    assertNotAborted(signal);
    const canvas = document.createElement('canvas');
    try {
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext('2d');
      if (!context)
        throw new Error('The image canvas is unavailable in this browser.');
      if (bitmap) {
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      } else {
        if (
          !pixels?.pixels ||
          pixels.width !== dimensions.width ||
          pixels.height !== dimensions.height
        ) {
          throw new Error(
            'The HEIC decoder returned an unexpected output size.',
          );
        }
        context.putImageData(
          new ImageData(
            new Uint8ClampedArray(pixels.pixels),
            pixels.width,
            pixels.height,
          ),
          0,
          0,
        );
      }
      if (options.outputMimeType === 'image/jpeg') {
        context.globalCompositeOperation = 'destination-over';
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.globalCompositeOperation = 'source-over';
      }
      return {
        canvas,
        ...dimensions,
        mimeType: info.mimeType,
        outputMimeType: options.outputMimeType,
      };
    } catch (error) {
      releaseCanvas(canvas);
      throw error;
    }
  } finally {
    bitmap?.close();
  }
}

export async function prepareCompressionPhoto(
  file: File,
  maxEdge: MaxEdgeOption,
  format: ImageMimeType | 'same',
  signal?: AbortSignal,
): Promise<PreparedPhoto> {
  const info = await inspectPhotoInput(file, signal);
  return preparePhoto(
    file,
    {
      outputMimeType: resolvePhotoOutputFormat(format, info.mimeType),
      maxEdge,
    },
    signal,
    info,
  );
}
