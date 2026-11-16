import { assertConverterDimensions } from './converterLimits';
import type {
  HeicRequest,
  HeicResult,
  HeifImage,
  HeifLibrary,
} from './heicTypes';

export async function readHeic(
  library: HeifLibrary,
  buffer: ArrayBuffer,
  operation: HeicRequest['operation'],
): Promise<HeicResult> {
  const decoder = new library.HeifDecoder();
  let images: HeifImage[] = [];
  try {
    images = decoder.decode(new Uint8Array(buffer));
    const primary = images.find((image) => image.is_primary());
    if (!primary)
      throw new Error(
        'This HEIC/HEIF file does not contain a readable primary photo.',
      );
    // libheif handle dimensions include HEIF rotation/crop transformations.
    const width = primary.get_width();
    const height = primary.get_height();
    assertConverterDimensions(width, height);
    if (operation === 'inspect') return { width, height };
    const data = new Uint8ClampedArray(width * height * 4);
    await new Promise<void>((resolve, reject) => {
      primary.display({ data, width, height }, (result) => {
        if (result) resolve();
        else
          reject(
            new Error(
              'This HEIC/HEIF photo could not be decoded. Try another photo.',
            ),
          );
      });
    });
    return { width, height, pixels: data.buffer };
  } finally {
    for (const image of images) image.free();
    if (decoder.decoder) library.heif_context_free(decoder.decoder);
  }
}
