import { afterEach, beforeEach, expect, rs, test } from '@rstest/core';
import { prepareMemeImage } from '../src/tools/meme-maker/prepareMemeImage';

const template = {
  id: 'buzz',
  name: 'Buzz',
  captionCount: 2,
  blankUrl: 'https://api.memegen.link/images/buzz.png',
};

function png(width = 640, height = 480): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

beforeEach(() => {
  rs.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: rs.fn(),
  } as unknown as CanvasRenderingContext2D);
});
afterEach(() => {
  rs.restoreAllMocks();
  rs.unstubAllGlobals();
});

test('prepares a remote PNG locally and releases decoded and canvas resources', async () => {
  const close = rs.fn();
  rs.stubGlobal(
    'createImageBitmap',
    rs.fn().mockResolvedValue({ width: 640, height: 480, close }),
  );
  rs.stubGlobal(
    'fetch',
    rs
      .fn()
      .mockResolvedValue(
        new Response(png(), { headers: { 'Content-Type': 'image/png' } }),
      ),
  );
  const image = await prepareMemeImage(template);
  expect([image.width, image.height]).toEqual([640, 480]);
  expect(close).toHaveBeenCalledTimes(1);
  image.release();
  expect(image.canvas.width).toBe(0);
});

test('downscales working images to 2048px without upscaling', async () => {
  rs.stubGlobal(
    'createImageBitmap',
    rs.fn().mockResolvedValue({ width: 4000, height: 2000, close: rs.fn() }),
  );
  rs.stubGlobal(
    'fetch',
    rs.fn().mockResolvedValue(
      new Response(png(4000, 2000), {
        headers: { 'Content-Type': 'image/png' },
      }),
    ),
  );
  const image = await prepareMemeImage(template);
  expect([image.width, image.height]).toEqual([2048, 1024]);
  image.release();
});

test('rejects HTTP errors, corrupt files, unsupported types, and excessive dimensions', async () => {
  for (const response of [
    new Response('', { status: 500 }),
    new Response('broken', { headers: { 'Content-Type': 'image/png' } }),
    new Response('gif', { headers: { 'Content-Type': 'image/gif' } }),
    new Response(png(20000, 20000), {
      headers: { 'Content-Type': 'image/png' },
    }),
  ]) {
    rs.stubGlobal('fetch', rs.fn().mockResolvedValue(response));
    await expect(prepareMemeImage(template)).rejects.toThrow();
  }
});

test('rejects non-provider URLs without a network request', async () => {
  const fetchMock = rs.fn();
  rs.stubGlobal('fetch', fetchMock);
  await expect(
    prepareMemeImage({ ...template, blankUrl: 'https://evil.example/a.png' }),
  ).rejects.toThrow(/template/i);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('releases an image if cancelled during decoding', async () => {
  const controller = new AbortController();
  const close = rs.fn();
  rs.stubGlobal(
    'fetch',
    rs
      .fn()
      .mockResolvedValue(
        new Response(png(), { headers: { 'Content-Type': 'image/png' } }),
      ),
  );
  rs.stubGlobal(
    'createImageBitmap',
    rs.fn().mockImplementation(async () => {
      controller.abort();
      return { width: 640, height: 480, close };
    }),
  );
  await expect(
    prepareMemeImage(template, controller.signal),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(close).toHaveBeenCalledTimes(1);
});
