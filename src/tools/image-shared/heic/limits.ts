import { MAX_INPUT_EDGE } from '../../image-compressor/imageUtils';

export const MAX_HEIC_INPUT_PIXELS = 50_000_000;

export function assertHeicDimensions(width: number, height: number): void {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error('This HEIC/HEIF image does not contain valid dimensions.');
  }
  if (
    width > MAX_INPUT_EDGE ||
    height > MAX_INPUT_EDGE ||
    width * height > MAX_HEIC_INPUT_PIXELS
  ) {
    throw new Error(
      'This HEIC/HEIF image exceeds the 50 megapixel or 12,000 pixel edge limit.',
    );
  }
}
