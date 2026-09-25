import { expect, rs, test } from '@rstest/core';
import {
  prepareImage,
  releaseCanvas,
} from '../src/tools/image-compressor/prepareImage';

function createPngFile(width: number, height: number): File {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new File([bytes], 'photo.png', { type: 'image/png' });
}

test('prepares a bounded canvas and releases the decoded bitmap', async () => {
  const close = rs.fn();
  const drawImage = rs.fn();
  const fillRect = rs.fn();
  const decodedImage = { width: 4032, height: 3024, close } as ImageBitmap;
  const createImageBitmapSpy = rs
    .spyOn(globalThis, 'createImageBitmap')
    .mockResolvedValue(decodedImage);
  const context = {
    drawImage,
    fillRect,
  } as unknown as CanvasRenderingContext2D;
  const getContext = rs
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(context);

  const file = createPngFile(4032, 3024);
  const prepared = await prepareImage(file, 2048);

  expect(prepared).toMatchObject({
    width: 2048,
    height: 1536,
    mimeType: 'image/png',
    outputMimeType: 'image/png',
  });
  expect(drawImage).toHaveBeenCalledWith(decodedImage, 0, 0, 2048, 1536);
  expect(createImageBitmapSpy).toHaveBeenCalledWith(file, {
    imageOrientation: 'from-image',
    resizeWidth: 2048,
    resizeHeight: 1536,
    resizeQuality: 'high',
  });
  expect(close).toHaveBeenCalledOnce();

  releaseCanvas(prepared.canvas);
  expect(prepared.canvas.width).toBe(0);
  expect(prepared.canvas.height).toBe(0);

  createImageBitmapSpy.mockRestore();
  getContext.mockRestore();
});

test('flattens alpha onto white when preparing JPEG output', async () => {
  const close = rs.fn();
  const fillRect = rs.fn();
  const drawImage = rs.fn();
  const decodedImage = { width: 1200, height: 800, close } as ImageBitmap;
  const createImageBitmapSpy = rs
    .spyOn(globalThis, 'createImageBitmap')
    .mockResolvedValue(decodedImage);
  const context = {
    fillRect,
    drawImage,
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D;
  const getContext = rs
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(context);

  const prepared = await prepareImage(
    createPngFile(1200, 800),
    2048,
    'image/jpeg',
  );

  expect(prepared.outputMimeType).toBe('image/jpeg');
  expect(context.fillStyle).toBe('#fff');
  expect(fillRect).toHaveBeenCalledWith(0, 0, 1200, 800);

  createImageBitmapSpy.mockRestore();
  getContext.mockRestore();
});

test('closes the decoded bitmap when canvas preparation fails', async () => {
  const close = rs.fn();
  const decodedImage = { width: 1200, height: 800, close } as ImageBitmap;
  const createImageBitmapSpy = rs
    .spyOn(globalThis, 'createImageBitmap')
    .mockResolvedValue(decodedImage);
  const getContext = rs
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(null);

  await expect(prepareImage(createPngFile(1200, 800), 2048)).rejects.toThrow(
    /canvas.*unavailable/i,
  );
  expect(close).toHaveBeenCalledOnce();

  createImageBitmapSpy.mockRestore();
  getContext.mockRestore();
});

test('falls back to an image element when bitmap downsampling is unavailable', async () => {
  const imageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  const decodedImage = {
    naturalWidth: 640,
    naturalHeight: 480,
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
    decode: rs.fn(async () => undefined),
    set src(value: string) {
      if (value) queueMicrotask(() => this.onload?.());
    },
  };
  const createImageBitmap = rs
    .spyOn(globalThis, 'createImageBitmap')
    .mockRejectedValue(new TypeError('resize option unavailable'));
  const createObjectURL = rs
    .spyOn(URL, 'createObjectURL')
    .mockReturnValue('blob:photo');
  const revokeObjectURL = rs.spyOn(URL, 'revokeObjectURL');
  const imageConstructor = rs.fn(() => decodedImage);
  Object.defineProperty(globalThis, 'Image', {
    configurable: true,
    value: imageConstructor,
  });
  const drawImage = rs.fn();
  const getContext = rs
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);

  try {
    const prepared = await prepareImage(createPngFile(640, 480), 2048);

    expect(prepared).toMatchObject({ width: 640, height: 480 });
    expect(drawImage).toHaveBeenCalledWith(decodedImage, 0, 0, 640, 480);
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:photo');
    releaseCanvas(prepared.canvas);
  } finally {
    if (imageDescriptor) {
      Object.defineProperty(globalThis, 'Image', imageDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'Image');
    }
    createImageBitmap.mockRestore();
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
    getContext.mockRestore();
  }
});
