import {
  MAX_CANVAS_EDGE,
  MAX_ORIGINAL_OUTPUT_PIXELS,
} from '../../image-compressor/imageUtils';
import { assertHeicDimensions } from './limits';

export interface RgbaChannel {
  data: Uint8Array;
  width: number;
  height: number;
  stride: number;
}

// Read directly from the decoder's WASM view. Allocate only the bounded output,
// rather than a second full-resolution RGBA array or a full-size source canvas.
export function resizeRgba(
  channel: RgbaChannel,
  width: number,
  height: number,
): Uint8ClampedArray<ArrayBuffer> {
  assertHeicDimensions(channel.width, channel.height);
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > channel.width ||
    height > channel.height ||
    width > MAX_CANVAS_EDGE ||
    height > MAX_CANVAS_EDGE ||
    width * height > MAX_ORIGINAL_OUTPUT_PIXELS
  )
    throw new Error('Choose safe output dimensions without upscaling.');
  if (
    !Number.isSafeInteger(channel.stride) ||
    channel.stride < channel.width * 4 ||
    channel.data.byteLength <
      (channel.height - 1) * channel.stride + channel.width * 4
  )
    throw new Error('The HEIC decoder returned incomplete channel pixels.');

  const output = new Uint8ClampedArray(width * height * 4);
  const scaleX = channel.width / width;
  const scaleY = channel.height / height;
  for (let y = 0; y < height; y++) {
    const top = y * scaleY;
    const bottom = (y + 1) * scaleY;
    for (let x = 0; x < width; x++) {
      const left = x * scaleX;
      const right = (x + 1) * scaleX;
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 0;
      for (
        let sy = Math.floor(top);
        sy < Math.ceil(bottom) && sy < channel.height;
        sy++
      ) {
        const vertical = Math.min(bottom, sy + 1) - Math.max(top, sy);
        for (
          let sx = Math.floor(left);
          sx < Math.ceil(right) && sx < channel.width;
          sx++
        ) {
          const weight =
            vertical * (Math.min(right, sx + 1) - Math.max(left, sx));
          const offset = sy * channel.stride + sx * 4;
          const weightedAlpha = channel.data[offset + 3] * weight;
          alpha += weightedAlpha;
          red += channel.data[offset] * weightedAlpha;
          green += channel.data[offset + 1] * weightedAlpha;
          blue += channel.data[offset + 2] * weightedAlpha;
        }
      }
      const offset = (y * width + x) * 4;
      if (alpha > 0) {
        output[offset] = Math.round(red / alpha);
        output[offset + 1] = Math.round(green / alpha);
        output[offset + 2] = Math.round(blue / alpha);
      }
      output[offset + 3] = Math.round(alpha / (scaleX * scaleY));
    }
  }
  return output;
}
