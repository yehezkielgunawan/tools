import { afterEach, expect, rs, test } from '@rstest/core';
import { convertImage } from '../src/tools/image-converter/convertImage';

function png(width = 640, height = 480): File {
  const data = new Uint8Array(24);
  data.set([137, 80, 78, 71, 13, 10, 26, 10]);
  data.set([73, 72, 68, 82], 12);
  new DataView(data.buffer).setUint32(16, width);
  new DataView(data.buffer).setUint32(20, height);
  return new File([data], 'photo.png', { type: 'image/png' });
}

function browser(width = 640, height = 480) {
  const close = rs.fn();
  rs.stubGlobal(
    'createImageBitmap',
    rs.fn().mockResolvedValue({ width, height, close }),
  );
  const context = { fillStyle: '', fillRect: rs.fn(), drawImage: rs.fn() };
  const canvas = document.createElement('canvas');
  rs.spyOn(canvas, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  const encode = rs
    .spyOn(canvas, 'toBlob')
    .mockImplementation((callback, type) =>
      callback(new Blob(['pixels'], { type })),
    );
  const create = document.createElement.bind(document);
  rs.spyOn(document, 'createElement').mockImplementation((name, options) =>
    name === 'canvas' ? canvas : create(name, options),
  );
  return { close, context, canvas, encode };
}

afterEach(() => {
  rs.restoreAllMocks();
  rs.unstubAllGlobals();
});

test('flattens transparent pixels onto white for JPG and encodes quality as 0.92', async () => {
  const { context, encode, canvas, close } = browser();
  const result = await convertImage(png(), {
    outputMimeType: 'image/jpeg',
    quality: 92,
    maxEdge: 'original',
  });
  expect(result).toMatchObject({ width: 640, height: 480 });
  expect(result.blob.type).toBe('image/jpeg');
  expect(context.fillStyle).toBe('#fff');
  expect(context.fillRect).toHaveBeenCalledWith(0, 0, 640, 480);
  expect(encode.mock.calls[0][2]).toBe(0.92);
  expect(close).toHaveBeenCalled();
  expect(canvas.width).toBe(0);
});

test('preserves PNG transparency and ignores JPG quality', async () => {
  const { context, encode } = browser();
  const result = await convertImage(png(), {
    outputMimeType: 'image/png',
    quality: 92,
    maxEdge: 'original',
  });
  expect(result.blob.type).toBe('image/png');
  expect(context.fillRect).not.toHaveBeenCalled();
  expect(encode.mock.calls[0][2]).toBeUndefined();
});

test('requires explicit downsizing when original output exceeds canvas limits', async () => {
  const { context } = browser(4096, 3072);
  await expect(
    convertImage(png(4096, 3072), {
      outputMimeType: 'image/png',
      quality: 92,
      maxEdge: 'original',
    }),
  ).rejects.toThrow(/Original size/i);
  const result = await convertImage(png(4096, 3072), {
    outputMimeType: 'image/png',
    quality: 92,
    maxEdge: 2048,
  });
  expect(result).toMatchObject({ width: 2048, height: 1536 });
  expect(context.drawImage.mock.calls.at(-1)?.slice(1)).toEqual([
    0, 0, 2048, 1536,
  ]);
});

test('releases resources when the browser returns the wrong output format', async () => {
  const { encode, close, canvas } = browser();
  encode.mockImplementation((callback) =>
    callback(new Blob(['wrong'], { type: 'image/webp' })),
  );
  await expect(
    convertImage(png(), {
      outputMimeType: 'image/png',
      quality: 92,
      maxEdge: 'original',
    }),
  ).rejects.toThrow(/support.*PNG/i);
  expect(close).toHaveBeenCalled();
  expect(canvas.width).toBe(0);
});

test('does not return an export when cancelled during encoding', async () => {
  const { encode, close } = browser();
  const controller = new AbortController();
  encode.mockImplementation((callback, type) => {
    controller.abort();
    callback(new Blob(['pixels'], { type }));
  });
  await expect(
    convertImage(
      png(),
      { outputMimeType: 'image/png', quality: 92, maxEdge: 'original' },
      controller.signal,
    ),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(close).toHaveBeenCalled();
});

test('rejects invalid settings before decoding', async () => {
  const { context } = browser();
  await expect(
    convertImage(png(), {
      outputMimeType: 'image/png',
      quality: Number.NaN,
      maxEdge: 'original',
    }),
  ).rejects.toThrow(/quality/i);
  expect(context.drawImage).not.toHaveBeenCalled();
});
