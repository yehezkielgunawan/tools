import {
  MAX_INPUT_EDGE,
  MAX_INPUT_PIXELS,
} from '../image-compressor/imageUtils';

export function assertConverterDimensions(width: number, height: number): void {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error('This image does not contain valid dimensions.');
  }
  if (
    width > MAX_INPUT_EDGE ||
    height > MAX_INPUT_EDGE ||
    width * height > MAX_INPUT_PIXELS
  ) {
    throw new Error(
      'This image exceeds the 24 megapixel or 12,000 pixel edge limit. Resize it on your device first.',
    );
  }
}
