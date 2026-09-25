import type { ImageMimeType } from './imageUtils';

function expectedFormatError(mimeType: ImageMimeType): Error {
  const format = mimeType === 'image/jpeg' ? 'JPEG' : 'PNG';
  return new Error(`This browser does not support ${format} output.`);
}

export function encodeWithCanvas(
  canvas: HTMLCanvasElement,
  mimeType: ImageMimeType,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const handleBlob: BlobCallback = (blob) => {
      if (!blob) {
        reject(new Error('The browser could not create the compressed image.'));
        return;
      }

      if (blob.type !== mimeType) {
        reject(expectedFormatError(mimeType));
        return;
      }

      resolve(blob);
    };

    if (mimeType === 'image/jpeg') {
      const boundedQuality = Math.min(100, Math.max(1, quality)) / 100;
      canvas.toBlob(handleBlob, mimeType, boundedQuality);
      return;
    }

    canvas.toBlob(handleBlob, mimeType);
  });
}
