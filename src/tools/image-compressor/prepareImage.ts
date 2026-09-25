import {
  calculateOutputDimensions,
  ImageInputError,
  type ImageMimeType,
  inspectImageFile,
  MAX_INPUT_EDGE,
  MAX_INPUT_PIXELS,
  type MaxEdgeOption,
} from './imageUtils';

export interface PreparedImage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  mimeType: ImageMimeType;
  outputMimeType: ImageMimeType;
}

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

function loadImageElement(file: File): Promise<DecodedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    let settled = false;

    const release = (): void => {
      image.onload = null;
      image.onerror = null;
      image.src = '';
      URL.revokeObjectURL(url);
    };

    image.onload = () => {
      settled = true;
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        release,
      });
    };

    image.onerror = () => {
      settled = true;
      release();
      reject(
        new Error(
          'This browser could not decode the selected image. Try another JPEG or PNG.',
        ),
      );
    };

    image.src = url;

    if (!settled && typeof image.decode === 'function') {
      void image.decode().then(
        () => {
          if (settled) return;
          settled = true;
          resolve({
            source: image,
            width: image.naturalWidth,
            height: image.naturalHeight,
            release,
          });
        },
        () => {
          if (settled) return;
          settled = true;
          release();
          reject(
            new Error(
              'This browser could not decode the selected image. Try another JPEG or PNG.',
            ),
          );
        },
      );
    }
  });
}

async function decodeImage(
  file: File,
  maxEdge: MaxEdgeOption,
  width: number,
  height: number,
): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const dimensions = calculateOutputDimensions(width, height, maxEdge);
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
        resizeWidth: dimensions.width,
        resizeHeight: dimensions.height,
        resizeQuality: 'high',
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      return loadImageElement(file);
    }
  }

  return loadImageElement(file);
}

export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

export async function prepareImage(
  file: File,
  maxEdge: MaxEdgeOption,
  outputFormat: ImageMimeType | 'same' = 'same',
): Promise<PreparedImage> {
  const info = await inspectImageFile(file);
  const outputMimeType = outputFormat === 'same' ? info.mimeType : outputFormat;
  const decoded = await decodeImage(file, maxEdge, info.width, info.height);
  const canvas = document.createElement('canvas');
  let completed = false;

  try {
    if (
      decoded.width > MAX_INPUT_EDGE ||
      decoded.height > MAX_INPUT_EDGE ||
      decoded.width * decoded.height > MAX_INPUT_PIXELS
    ) {
      throw new ImageInputError(
        'dimensions-too-large',
        'This image exceeds the 24 megapixel mobile safety limit. Resize it on your device and try again.',
      );
    }

    const dimensions = calculateOutputDimensions(
      decoded.width,
      decoded.height,
      maxEdge,
    );
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('The image canvas is unavailable in this browser.');
    }

    if (outputMimeType === 'image/jpeg') {
      context.fillStyle = '#fff';
      context.fillRect(0, 0, dimensions.width, dimensions.height);
    }

    context.drawImage(
      decoded.source,
      0,
      0,
      dimensions.width,
      dimensions.height,
    );

    completed = true;
    return { canvas, ...dimensions, mimeType: info.mimeType, outputMimeType };
  } catch (error) {
    if (error instanceof ImageInputError) {
      throw error;
    }
    if (error instanceof Error && error.message.includes('canvas')) {
      throw error;
    }
    if (error instanceof Error) {
      error.message = `Your device could not prepare this image. Choose a smaller maximum edge or another photo. ${error.message}`;
      throw error;
    }
    throw error;
  } finally {
    decoded.release();
    if (!completed) {
      releaseCanvas(canvas);
    }
  }
}
