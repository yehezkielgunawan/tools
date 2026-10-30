import { MAX_INPUT_BYTES } from '../image-compressor/imageUtils';
import { prepareImage, releaseCanvas } from '../image-compressor/prepareImage';
import type { MemeTemplate, PreparedMemeImage } from './memeTypes';

export async function prepareMemeImage(
  template: MemeTemplate,
  signal?: AbortSignal,
): Promise<PreparedMemeImage> {
  const url = new URL(template.blankUrl);
  if (
    url.origin !== 'https://api.memegen.link' ||
    url.username ||
    url.password
  ) {
    throw new Error('This template image is not supported.');
  }
  signal?.throwIfAborted();
  const response = await fetch(url.href, {
    signal,
    mode: 'cors',
    credentials: 'omit',
  });
  if (!response.ok)
    throw new Error('Could not load this template image. Please try again.');
  if (Number(response.headers.get('content-length')) > MAX_INPUT_BYTES) {
    throw new Error(
      'This template is too large to edit safely. Choose another template.',
    );
  }
  const blob = await response.blob();
  signal?.throwIfAborted();
  const file = new File([blob], `${template.id}.png`, { type: blob.type });
  const prepared = await prepareImage(file, 2048, 'image/png');
  if (signal?.aborted) {
    releaseCanvas(prepared.canvas);
    signal.throwIfAborted();
  }
  return {
    canvas: prepared.canvas,
    width: prepared.width,
    height: prepared.height,
    release: () => releaseCanvas(prepared.canvas),
  };
}
