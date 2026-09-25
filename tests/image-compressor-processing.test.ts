import { expect, rs, test } from '@rstest/core';
import type { PreparedImage } from '../src/tools/image-compressor/prepareImage';
import {
  type CompressionAdapters,
  compressImage,
} from '../src/tools/image-compressor/processImage';

const sourceFile = new File(['source'], 'photo.png', { type: 'image/png' });
const prepared = {
  canvas: {} as HTMLCanvasElement,
  width: 1600,
  height: 1200,
  mimeType: 'image/png',
  outputMimeType: 'image/jpeg',
} satisfies PreparedImage;

function createAdapters(
  encodeWithCanvas = rs.fn(
    async () => new Blob(['canvas'], { type: 'image/jpeg' }),
  ),
  encodeWithWasm = rs.fn(
    async () => new Blob(['wasm'], { type: 'image/jpeg' }),
  ),
): CompressionAdapters {
  return {
    prepareImage: rs.fn(async () => prepared),
    encodeWithCanvas,
    encodeWithWasm,
    releaseCanvas: rs.fn(),
  };
}

test('routes Canvas compression and returns the prepared dimensions', async () => {
  const adapters = createAdapters();
  const result = await compressImage(
    sourceFile,
    {
      engine: 'canvas',
      format: 'image/jpeg',
      quality: 82,
      maxEdge: 2048,
      pngLossy: false,
    },
    undefined,
    adapters,
  );

  expect(result).toMatchObject({
    width: 1600,
    height: 1200,
    mimeType: 'image/jpeg',
  });
  expect(adapters.encodeWithCanvas).toHaveBeenCalledWith(
    prepared.canvas,
    'image/jpeg',
    82,
  );
  expect(adapters.releaseCanvas).toHaveBeenCalledWith(prepared.canvas);
});

test('routes WASM compression and releases the canvas when encoding fails', async () => {
  const adapters = createAdapters(
    undefined,
    rs.fn(async () => {
      throw new Error('WASM worker unavailable');
    }),
  );
  const controller = new AbortController();

  await expect(
    compressImage(
      sourceFile,
      {
        engine: 'wasm',
        format: 'image/jpeg',
        quality: 82,
        maxEdge: 2048,
        pngLossy: false,
      },
      controller.signal,
      adapters,
    ),
  ).rejects.toThrow('WASM worker unavailable');

  expect(adapters.encodeWithWasm).toHaveBeenCalledWith(
    prepared.canvas,
    { format: 'image/jpeg', quality: 82, pngLossy: false },
    controller.signal,
  );
  expect(adapters.releaseCanvas).toHaveBeenCalledWith(prepared.canvas);
});

test('does not start encoding if the job was cancelled during preparation', async () => {
  const adapters = createAdapters();
  const controller = new AbortController();
  adapters.prepareImage = rs.fn(async () => {
    controller.abort();
    return prepared;
  });

  await expect(
    compressImage(
      sourceFile,
      {
        engine: 'canvas',
        format: 'image/jpeg',
        quality: 82,
        maxEdge: 2048,
        pngLossy: false,
      },
      controller.signal,
      adapters,
    ),
  ).rejects.toMatchObject({ name: 'AbortError' });

  expect(adapters.encodeWithCanvas).not.toHaveBeenCalled();
  expect(adapters.releaseCanvas).toHaveBeenCalledWith(prepared.canvas);
});

test('discards an encoder result when cancelled before it finishes', async () => {
  const controller = new AbortController();
  const adapters = createAdapters(
    rs.fn(async () => {
      controller.abort();
      return new Blob(['canvas'], { type: 'image/jpeg' });
    }),
  );

  await expect(
    compressImage(
      sourceFile,
      {
        engine: 'canvas',
        format: 'image/jpeg',
        quality: 82,
        maxEdge: 2048,
        pngLossy: false,
      },
      controller.signal,
      adapters,
    ),
  ).rejects.toMatchObject({ name: 'AbortError' });

  expect(adapters.releaseCanvas).toHaveBeenCalledWith(prepared.canvas);
});
