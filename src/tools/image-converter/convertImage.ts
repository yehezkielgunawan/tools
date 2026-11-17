import { encodeWithCanvas } from '../image-compressor/canvasEncoder';
import { calculateOutputDimensions } from '../image-compressor/imageUtils';
import { releaseCanvas } from '../image-compressor/prepareImage';
import { preparePhoto } from '../image-shared/preparePhoto';
import { assertConverterDimensions } from './converterLimits';
import type { ConversionResult, ConverterOptions } from './converterTypes';
import {
  assertNotAborted,
  type DecodedConverterImage,
  decodeBrowserImage,
} from './decodeBrowserImage';
import { inspectConverterInput } from './inspectConverterInput';
import { prepareSvg } from './prepareSvg';

export async function convertImage(
  file: File,
  options: ConverterOptions,
  signal?: AbortSignal,
): Promise<ConversionResult> {
  assertNotAborted(signal);
  if (!['image/jpeg', 'image/png'].includes(options.outputMimeType)) {
    throw new Error('Choose JPG or PNG output.');
  }
  if (
    !Number.isFinite(options.quality) ||
    options.quality < 1 ||
    options.quality > 100
  ) {
    throw new Error('JPG quality must be between 1 and 100.');
  }
  const info = await inspectConverterInput(file, signal);
  assertNotAborted(signal);
  // Fail before decoding when the user must explicitly choose a smaller output.
  calculateOutputDimensions(info.width, info.height, options.maxEdge);
  if (info.format === 'heic') {
    const prepared = await preparePhoto(file, options, signal);
    try {
      const blob = await encodeWithCanvas(
        prepared.canvas,
        options.outputMimeType,
        options.quality,
      );
      assertNotAborted(signal);
      return { blob, width: prepared.width, height: prepared.height };
    } finally {
      releaseCanvas(prepared.canvas);
    }
  }
  let decoded: DecodedConverterImage | undefined;
  const canvas = document.createElement('canvas');
  try {
    const source = info.format === 'svg' ? (await prepareSvg(file)).blob : file;
    decoded = await decodeBrowserImage(source, signal);
    assertNotAborted(signal);
    assertConverterDimensions(decoded.width, decoded.height);
    const dimensions = calculateOutputDimensions(
      decoded.width,
      decoded.height,
      options.maxEdge,
    );
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext('2d');
    if (!context)
      throw new Error('The image canvas is unavailable in this browser.');
    if (options.outputMimeType === 'image/jpeg') {
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
    const blob = await encodeWithCanvas(
      canvas,
      options.outputMimeType,
      options.quality,
    );
    assertNotAborted(signal);
    return { blob, ...dimensions };
  } finally {
    decoded?.release();
    releaseCanvas(canvas);
  }
}
