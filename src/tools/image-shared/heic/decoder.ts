import {
  calculateOutputDimensions,
  type MaxEdgeOption,
} from '../../image-compressor/imageUtils';
import { assertHeicDimensions } from './limits';
import { resizeRgba } from './resizeRgba';
import type { HeicRequest, HeicResult, HeifImage, HeifLibrary } from './types';

export async function readHeic(
  library: HeifLibrary,
  buffer: ArrayBuffer,
  operation: HeicRequest['operation'],
  maxEdge: MaxEdgeOption = 'original',
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
    assertHeicDimensions(width, height);
    if (operation === 'inspect')
      return { width, height, imageCount: images.length };
    const dimensions = calculateOutputDimensions(width, height, maxEdge);
    const decoded = library.heif_js_decode_image2(
      primary.handle,
      library.heif_colorspace.heif_colorspace_RGB,
      library.heif_chroma.heif_chroma_interleaved_RGBA,
    );
    if (!decoded || decoded.code)
      throw new Error(
        'This HEIC/HEIF photo could not be decoded. Try another photo.',
      );
    try {
      const channel = decoded.channels.find(
        (item) => item.id === library.heif_channel.heif_channel_interleaved,
      );
      if (!channel || channel.width !== width || channel.height !== height) {
        throw new Error(
          'The HEIC decoder returned inconsistent photo dimensions.',
        );
      }
      const data = resizeRgba(channel, dimensions.width, dimensions.height);
      return {
        ...dimensions,
        imageCount: images.length,
        sourceWidth: width,
        sourceHeight: height,
        pixels: data.buffer,
      };
    } finally {
      library.heif_image_release(decoded.image);
    }
  } finally {
    for (const image of images) image.free();
    if (decoder.decoder) library.heif_context_free(decoder.decoder);
  }
}
