import { expect, rs, test } from '@rstest/core';
import { encodeWithCanvas } from '../src/tools/image-compressor/canvasEncoder';
import { rgbaToRgb } from '../src/tools/image-compressor/pixelFormats';
import { encodeWithWasm } from '../src/tools/image-compressor/wasmEncoder';

test('passes normalized quality to Canvas JPEG encoding', async () => {
  const jpeg = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });
  const toBlob = rs.fn((callback: BlobCallback) => callback(jpeg));
  const canvas = { toBlob } as unknown as HTMLCanvasElement;

  await expect(encodeWithCanvas(canvas, 'image/jpeg', 82)).resolves.toBe(jpeg);
  expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.82);
});

test('does not pass a quality value when encoding PNG with Canvas', async () => {
  const png = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
  const toBlob = rs.fn((callback: BlobCallback) => callback(png));
  const canvas = { toBlob } as unknown as HTMLCanvasElement;

  await expect(encodeWithCanvas(canvas, 'image/png', 82)).resolves.toBe(png);
  expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
});

test('rejects when Canvas cannot encode the requested output type', async () => {
  const pngFallback = new Blob([new Uint8Array([1])], { type: 'image/png' });
  const toBlob = rs.fn((callback: BlobCallback) => callback(pngFallback));
  const canvas = { toBlob } as unknown as HTMLCanvasElement;

  await expect(encodeWithCanvas(canvas, 'image/jpeg', 80)).rejects.toThrow(
    /does not support JPEG output/i,
  );
});

test('flattens transparent RGBA pixels against white for JPEG', () => {
  const pixels = new Uint8ClampedArray([
    255, 0, 0, 255, 0, 0, 0, 0, 0, 0, 255, 128,
  ]);

  expect([...rgbaToRgb(pixels)]).toEqual([
    255, 0, 0, 255, 255, 255, 127, 127, 255,
  ]);
});

test('rejects malformed RGBA pixel buffers', () => {
  expect(() => rgbaToRgb(new Uint8Array([1, 2, 3]))).toThrow(
    /RGBA pixel buffer/i,
  );
});

test('transfers bounded canvas pixels to the WASM worker and resolves a Blob', async () => {
  const pixels = new Uint8ClampedArray([255, 0, 0, 255]);
  const output = new Uint8Array([4, 5, 6]).buffer;
  const postMessage = rs.fn((message: unknown) => {
    const workerMessage = message as { type: string };
    expect(workerMessage.type).toBe('encode');
  });
  const terminate = rs.fn();
  const worker = {
    onmessage: null,
    onmessageerror: null,
    onerror: null,
    postMessage,
    terminate,
  } as unknown as Worker;
  const canvas = {
    width: 1,
    height: 1,
    getContext: () => ({ getImageData: () => ({ data: pixels }) }),
  } as unknown as HTMLCanvasElement;
  const factory = rs.fn(() => worker);
  const result = encodeWithWasm(
    canvas,
    { format: 'image/jpeg', quality: 82, pngLossy: false },
    undefined,
    factory,
  );

  const request = postMessage.mock.calls[0]?.[0] as {
    width: number;
    height: number;
    format: string;
    quality: number;
    pngLossy: boolean;
    pixels: ArrayBuffer;
  };
  expect(request).toMatchObject({
    width: 1,
    height: 1,
    format: 'image/jpeg',
    quality: 82,
    pngLossy: false,
  });
  expect(postMessage.mock.calls[0]?.[1]).toEqual([pixels.buffer]);

  worker.onmessage?.({
    data: { type: 'result', buffer: output },
  } as MessageEvent);

  await expect(result).resolves.toMatchObject({
    type: 'image/jpeg',
    size: 3,
  });
  expect(terminate).toHaveBeenCalledOnce();
});

test('terminates the WASM worker and rejects when cancelled', async () => {
  const worker = {
    onmessage: null,
    onmessageerror: null,
    onerror: null,
    postMessage: rs.fn(),
    terminate: rs.fn(),
  } as unknown as Worker;
  const canvas = {
    width: 1,
    height: 1,
    getContext: () => ({
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    }),
  } as unknown as HTMLCanvasElement;
  const controller = new AbortController();
  const result = encodeWithWasm(
    canvas,
    { format: 'image/png', quality: 82, pngLossy: false },
    controller.signal,
    () => worker,
  );

  controller.abort();

  await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  expect(worker.terminate).toHaveBeenCalledOnce();
});
