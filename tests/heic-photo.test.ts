import { afterEach, beforeEach, expect, rs, test } from '@rstest/core';
import { compressImage } from '../src/tools/image-compressor/processImage';
import { runHeicWorker } from '../src/tools/image-shared/heic/client';
import { inspectPhotoInput } from '../src/tools/image-shared/photoInput';
import {
  preparePhoto,
  resolvePhotoOutputFormat,
} from '../src/tools/image-shared/preparePhoto';

rs.mock('../src/tools/image-shared/heic/client', () => ({
  runHeicWorker: rs.fn(),
}));

function heic(type = 'image/heic') {
  return new File(
    [
      new Uint8Array([
        0, 0, 0, 24, 102, 116, 121, 112, 104, 101, 105, 99, 0, 0, 0, 0, 109,
        105, 102, 49, 104, 101, 105, 99,
      ]),
    ],
    'photo.heic',
    { type },
  );
}
const info = { width: 8064, height: 6048, imageCount: 1 };
const nativeClose = rs.fn();
const bitmap = { width: 2048, height: 1536, close: nativeClose };
let context: {
  putImageData: ReturnType<typeof rs.fn>;
  drawImage: ReturnType<typeof rs.fn>;
  fillRect: ReturnType<typeof rs.fn>;
  fillStyle: string;
  globalCompositeOperation: string;
};

beforeEach(() => {
  rs.mocked(runHeicWorker).mockImplementation(async (_file, operation) =>
    operation === 'inspect'
      ? info
      : {
          ...info,
          width: 2048,
          height: 1536,
          sourceWidth: 8064,
          sourceHeight: 6048,
          pixels: new ArrayBuffer(2048 * 1536 * 4),
        },
  );
  rs.stubGlobal(
    'createImageBitmap',
    rs.fn().mockRejectedValue(new Error('Native HEIC unavailable')),
  );
  rs.stubGlobal(
    'ImageData',
    class {
      constructor(
        public data: Uint8ClampedArray,
        public width: number,
        public height: number,
      ) {}
    },
  );
  context = {
    putImageData: rs.fn(),
    drawImage: rs.fn(),
    fillRect: rs.fn(),
    fillStyle: '',
    globalCompositeOperation: 'source-over',
  };
  rs.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  rs.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
    (callback, type) => callback(new Blob(['image'], { type })),
  );
});
afterEach(() => {
  rs.restoreAllMocks();
  rs.unstubAllGlobals();
  rs.mocked(runHeicWorker).mockReset();
  nativeClose.mockReset();
});

test('inspects large HEIC contents without trusting a filename or rejecting 48 MP', async () => {
  await expect(inspectPhotoInput(heic(''))).resolves.toMatchObject({
    mimeType: 'image/heic',
    width: 8064,
    height: 6048,
    imageCount: 1,
  });
  await expect(inspectPhotoInput(heic('image/jpeg'))).rejects.toThrow(/match/i);
});

test('automatic output means JPG for HEIC and preserves PNG/JPEG defaults', () => {
  expect(resolvePhotoOutputFormat('same', 'image/heic')).toBe('image/jpeg');
  expect(resolvePhotoOutputFormat('same', 'image/heif')).toBe('image/jpeg');
  expect(resolvePhotoOutputFormat('same', 'image/png')).toBe('image/png');
  expect(resolvePhotoOutputFormat('image/png', 'image/heic')).toBe('image/png');
});

test('prepares only a resized canvas and composites a white JPG background', async () => {
  const result = await preparePhoto(heic(), {
    outputMimeType: 'image/jpeg',
    maxEdge: 2048,
  });
  expect(result).toMatchObject({
    width: 2048,
    height: 1536,
    mimeType: 'image/heic',
    outputMimeType: 'image/jpeg',
  });
  expect(result.canvas.width).toBe(2048);
  expect(result.canvas.height).toBe(1536);
  expect(runHeicWorker).toHaveBeenCalledWith(
    expect.any(File),
    'decode',
    undefined,
    2048,
  );
  expect(context.fillStyle).toBe('#fff');
  expect(context.fillRect).toHaveBeenCalledWith(0, 0, 2048, 1536);
  expect(context.globalCompositeOperation).toBe('source-over');
});

test('preserves PNG transparency without adding a JPG background', async () => {
  await preparePhoto(heic(), { outputMimeType: 'image/png', maxEdge: 2048 });
  expect(context.fillRect).not.toHaveBeenCalled();
});

test('uses verified resized native decoding for a single primary image', async () => {
  rs.mocked(createImageBitmap).mockResolvedValue(bitmap as ImageBitmap);
  await preparePhoto(heic(), { outputMimeType: 'image/jpeg', maxEdge: 2048 });
  expect(createImageBitmap).toHaveBeenCalledWith(expect.any(File), {
    imageOrientation: 'from-image',
    resizeWidth: 2048,
    resizeHeight: 1536,
    resizeQuality: 'high',
  });
  expect(rs.mocked(runHeicWorker).mock.calls.map((call) => call[1])).toEqual([
    'inspect',
  ]);
  expect(nativeClose).toHaveBeenCalled();
});

test('uses the primary-photo worker instead of native decoding for multiple images', async () => {
  rs.mocked(runHeicWorker).mockResolvedValueOnce({ ...info, imageCount: 2 });
  rs.mocked(createImageBitmap).mockResolvedValue(bitmap as ImageBitmap);
  await preparePhoto(heic(), { outputMimeType: 'image/png', maxEdge: 2048 });
  expect(createImageBitmap).not.toHaveBeenCalled();
});

test('requires explicit downsizing before any full HEIC pixel decode', async () => {
  await expect(
    preparePhoto(heic(), { outputMimeType: 'image/jpeg', maxEdge: 'original' }),
  ).rejects.toThrow(/Original size/i);
  expect(createImageBitmap).not.toHaveBeenCalled();
  expect(rs.mocked(runHeicWorker).mock.calls.map((call) => call[1])).toEqual([
    'inspect',
  ]);
});

test('compresses HEIC to JPG through the existing Canvas encoder', async () => {
  const result = await compressImage(heic(), {
    engine: 'canvas',
    format: 'same',
    quality: 82,
    maxEdge: 2048,
    pngLossy: false,
  });
  expect(result).toMatchObject({
    inputMimeType: 'image/heic',
    mimeType: 'image/jpeg',
    width: 2048,
    height: 1536,
  });
  expect(result.blob.type).toBe('image/jpeg');
});

test('does not prepare or inspect a photo after cancellation', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    preparePhoto(
      heic(),
      { outputMimeType: 'image/jpeg', maxEdge: 2048 },
      controller.signal,
    ),
  ).rejects.toMatchObject({ name: 'AbortError' });
  expect(runHeicWorker).not.toHaveBeenCalled();
});
