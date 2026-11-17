import { expect, rs, test } from '@rstest/core';
import { runHeicWorker } from '../src/tools/image-shared/heic/client';
import { readHeic } from '../src/tools/image-shared/heic/decoder';
import type { HeifLibrary } from '../src/tools/image-shared/heic/types';

function library(width = 4, height = 3) {
  const free = rs.fn();
  const contextFree = rs.fn();
  const display = rs.fn(() => ({
    image: 321,
    channels: [
      {
        id: 3,
        width,
        height,
        stride: width * 4,
        data: new Uint8Array(width * height * 4).fill(127),
      },
    ],
  }));
  const thumbnail = {
    get_width: () => 1,
    get_height: () => 1,
    is_primary: () => false,
    display: rs.fn(),
    free,
  };
  const primary = {
    get_width: () => width,
    handle: 123,
    get_height: () => height,
    is_primary: () => true,
    display,
    free,
  };
  const lib = {
    heif_colorspace: { heif_colorspace_RGB: 1 },
    heif_chroma: { heif_chroma_interleaved_RGBA: 2 },
    heif_channel: { heif_channel_interleaved: 3 },
    heif_js_decode_image2: display,
    heif_image_release: rs.fn(),
    HeifDecoder: class {
      decoder = 42;
      decode() {
        return [thumbnail, primary];
      }
    },
    heif_context_free: contextFree,
  } as unknown as HeifLibrary;
  return { lib, free, contextFree, display };
}

test('inspects the primary HEIC image without decoding pixels and releases handles', async () => {
  const { lib, free, contextFree, display } = library();
  await expect(readHeic(lib, new ArrayBuffer(1), 'inspect')).resolves.toEqual({
    width: 4,
    height: 3,
    imageCount: 2,
  });
  expect(display).not.toHaveBeenCalled();
  expect(free).toHaveBeenCalledTimes(2);
  expect(contextFree).toHaveBeenCalledWith(42);
});

test('decodes only the primary HEIC image into transferable RGBA pixels', async () => {
  const { lib, display } = library();
  const result = await readHeic(lib, new ArrayBuffer(1), 'decode');
  expect(result).toMatchObject({ width: 4, height: 3 });
  expect(result.pixels?.byteLength).toBe(4 * 3 * 4);
  expect(display).toHaveBeenCalledTimes(1);
});

test('checks primary dimensions before allocating or decoding pixels', async () => {
  const { lib, free, contextFree, display } = library(10_000, 5001);
  await expect(readHeic(lib, new ArrayBuffer(1), 'decode')).rejects.toThrow(
    /50 megapixel/i,
  );
  expect(display).not.toHaveBeenCalled();
  expect(free).toHaveBeenCalledTimes(2);
  expect(contextFree).toHaveBeenCalled();
});

test('rejects a HEIC container without a primary image', async () => {
  const { lib } = library();
  lib.HeifDecoder = class {
    decoder = 42;
    decode() {
      return [];
    }
  };
  await expect(readHeic(lib, new ArrayBuffer(1), 'decode')).rejects.toThrow(
    /primary|photo/i,
  );
});

test('terminates the HEIC worker immediately on cancellation', async () => {
  const terminate = rs.fn();
  class WorkerStub {
    postMessage = rs.fn();
    terminate = terminate;
    onmessage = null;
    onerror = null;
  }
  rs.stubGlobal('Worker', WorkerStub);
  try {
    const controller = new AbortController();
    const result = runHeicWorker(
      new File(['heic'], 'photo.heic'),
      'decode',
      controller.signal,
    );
    await Promise.resolve();
    await Promise.resolve();
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(terminate).toHaveBeenCalledTimes(1);
  } finally {
    rs.unstubAllGlobals();
  }
});
