import { releaseCanvas } from '../image-compressor/prepareImage';
import {
  checkCancelled,
  checkResultSize,
  MAX_CONVERSION_ITEMS,
} from './conversionLimits';
import type {
  ConversionOutput,
  DocumentKind,
  ImageExportOptions,
  RasterDocument,
} from './conversionTypes';
import { canvasBlob } from './imageInputs';
import { outputFilename } from './imageLayout';

async function encodePage(
  canvas: HTMLCanvasElement,
  options: ImageExportOptions,
) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas rendering is unavailable.');
  // Flatten transparent pages onto white, including JPEG outputs.
  context.globalCompositeOperation = 'destination-over';
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = 'source-over';
  const blob = await canvasBlob(canvas, options.format, options.quality);
  const thumb = document.createElement('canvas');
  try {
    const scale = Math.min(1, 320 / Math.max(canvas.width, canvas.height));
    thumb.width = Math.max(1, Math.round(canvas.width * scale));
    thumb.height = Math.max(1, Math.round(canvas.height * scale));
    const ctx = thumb.getContext('2d');
    if (!ctx) throw new Error('Canvas rendering is unavailable.');
    ctx.drawImage(canvas, 0, 0, thumb.width, thumb.height);
    return { blob, thumbnail: await canvasBlob(thumb, 'image/jpeg', 0.75) };
  } finally {
    releaseCanvas(thumb);
  }
}

export async function documentToImages(
  source: RasterDocument,
  filename: string,
  kind: DocumentKind,
  pages: readonly number[],
  options: ImageExportOptions,
  signal: AbortSignal,
  progress: (done: number, total: number) => void,
  encode = encodePage,
): Promise<ConversionOutput[]> {
  if (!pages.length || pages.length > MAX_CONVERSION_ITEMS)
    throw new RangeError('Select between 1 and 50 pages or slides.');
  const outputs: ConversionOutput[] = [];
  let bytes = 0;
  for (const page of pages) {
    checkCancelled(signal);
    if (!Number.isSafeInteger(page) || page < 1 || page > source.count)
      throw new RangeError('Page or slide is outside this document.');
    const canvas = document.createElement('canvas');
    try {
      await source.render(page, canvas, options.maxEdge, signal);
      checkCancelled(signal);
      const result = await encode(canvas, options);
      checkCancelled(signal);
      bytes += result.blob.size + result.thumbnail.size;
      checkResultSize(bytes);
      outputs.push({
        ...result,
        filename: outputFilename(
          filename,
          kind === 'pdf' ? 'page' : 'slide',
          page,
          options.format === 'image/png' ? 'png' : 'jpg',
        ),
      });
      progress(outputs.length, pages.length);
    } catch (error) {
      if (signal.aborted) checkCancelled(signal);
      throw Object.assign(
        new Error(
          `Could not export ${kind === 'pdf' ? 'page' : 'slide'} ${page}. ${error instanceof Error ? error.message : 'Try another file.'}`,
        ),
        { cause: error },
      );
    } finally {
      releaseCanvas(canvas);
    }
  }
  return outputs;
}
