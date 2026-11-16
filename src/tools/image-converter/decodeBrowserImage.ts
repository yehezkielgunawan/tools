export interface DecodedConverterImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release(): void;
}

export function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted)
    throw new DOMException('Conversion cancelled.', 'AbortError');
}

function loadImage(
  blob: Blob,
  signal?: AbortSignal,
): Promise<DecodedConverterImage> {
  return new Promise((resolve, reject) => {
    assertNotAborted(signal);
    const image = new Image();
    const url = URL.createObjectURL(blob);
    const release = (): void => {
      image.onload = null;
      image.onerror = null;
      image.src = '';
      URL.revokeObjectURL(url);
    };
    const cleanup = (): void => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    };
    const fail = (error: Error): void => {
      cleanup();
      release();
      reject(error);
    };
    const abort = (): void =>
      fail(new DOMException('Conversion cancelled.', 'AbortError'));
    const timeout = setTimeout(
      () => fail(new Error('Image decoding timed out. Try a smaller image.')),
      30_000,
    );
    signal?.addEventListener('abort', abort, { once: true });
    image.onload = () => {
      cleanup();
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        release,
      });
    };
    image.onerror = () =>
      fail(
        new Error('This browser could not open the image. Try another file.'),
      );
    image.src = url;
  });
}

export async function decodeBrowserImage(
  blob: Blob,
  signal?: AbortSignal,
): Promise<DecodedConverterImage> {
  assertNotAborted(signal);
  if (
    typeof createImageBitmap === 'function' &&
    blob.type !== 'image/svg+xml'
  ) {
    try {
      const bitmap = await createImageBitmap(blob, {
        imageOrientation: 'from-image',
      });
      if (signal?.aborted) {
        bitmap.close();
        assertNotAborted(signal);
      }
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch (error) {
      assertNotAborted(signal);
      // Some browser decoders only support the image-element path.
      if (error instanceof Error && error.name === 'AbortError') throw error;
    }
  }
  return loadImage(blob, signal);
}
