import { encodeWithCanvas } from './canvasEncoder';
import type { ImageMimeType, MaxEdgeOption } from './imageUtils';
import {
  type PreparedImage,
  prepareImage,
  releaseCanvas,
} from './prepareImage';
import { encodeWithWasm } from './wasmEncoder';

export type CompressionEngine = 'canvas' | 'wasm';
export type ImageOutputFormat = ImageMimeType | 'same';

export interface ImageCompressionOptions {
  engine: CompressionEngine;
  format: ImageOutputFormat;
  quality: number;
  maxEdge: MaxEdgeOption;
  pngLossy: boolean;
}

export interface ImageCompressionResult {
  blob: Blob;
  width: number;
  height: number;
  mimeType: ImageMimeType;
  inputMimeType: ImageMimeType;
}

export interface CompressionAdapters {
  prepareImage: (
    file: File,
    maxEdge: MaxEdgeOption,
    outputFormat: ImageOutputFormat,
  ) => Promise<PreparedImage>;
  encodeWithCanvas: typeof encodeWithCanvas;
  encodeWithWasm: typeof encodeWithWasm;
  releaseCanvas: typeof releaseCanvas;
}

const defaultAdapters: CompressionAdapters = {
  prepareImage,
  encodeWithCanvas,
  encodeWithWasm,
  releaseCanvas,
};

function createAbortError(): Error {
  const error = new Error('Compression was cancelled.');
  error.name = 'AbortError';
  return error;
}

export async function compressImage(
  file: File,
  options: ImageCompressionOptions,
  signal?: AbortSignal,
  adapters: CompressionAdapters = defaultAdapters,
): Promise<ImageCompressionResult> {
  const prepared = await adapters.prepareImage(
    file,
    options.maxEdge,
    options.format,
  );

  try {
    if (signal?.aborted) {
      throw createAbortError();
    }

    const blob =
      options.engine === 'canvas'
        ? await adapters.encodeWithCanvas(
            prepared.canvas,
            prepared.outputMimeType,
            options.quality,
          )
        : await adapters.encodeWithWasm(
            prepared.canvas,
            {
              format: prepared.outputMimeType,
              quality: options.quality,
              pngLossy: options.pngLossy,
            },
            signal,
          );

    if (signal?.aborted) {
      throw createAbortError();
    }

    return {
      blob,
      width: prepared.width,
      height: prepared.height,
      mimeType: prepared.outputMimeType,
      inputMimeType: prepared.mimeType,
    };
  } finally {
    adapters.releaseCanvas(prepared.canvas);
  }
}
