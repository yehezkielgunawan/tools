import { expect, rs, test } from '@rstest/core';
import {
  exportWatermarkedImage,
  getWatermarkOutputMimeType,
  inspectHeifFile,
  prepareWatermarkImage,
  releaseWatermarkImage,
} from '../src/tools/image-watermark/watermarkImage';

function bytesFromText(value: string): Uint8Array {
  return new Uint8Array(
    Array.from(value, (character) => character.charCodeAt(0)),
  );
}

function box(type: string, payload: Uint8Array): Uint8Array {
  const result = new Uint8Array(8 + payload.length);
  const view = new DataView(result.buffer);
  view.setUint32(0, result.length);
  result.set(bytesFromText(type), 4);
  result.set(payload, 8);
  return result;
}

function joinBytes(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(
    parts.reduce((length, part) => length + part.length, 0),
  );
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function createHeifFile(width = 3000, height = 2000): File {
  const fileType = box(
    'ftyp',
    joinBytes(bytesFromText('heic'), new Uint8Array(4), bytesFromText('mif1')),
  );
  const imageSpace = new Uint8Array(12);
  const imageSpaceView = new DataView(imageSpace.buffer);
  imageSpaceView.setUint32(4, width);
  imageSpaceView.setUint32(8, height);
  const properties = box('ipco', box('ispe', imageSpace));
  const itemProperties = box('iprp', properties);
  const metadata = box('meta', joinBytes(new Uint8Array(4), itemProperties));

  return new File([joinBytes(fileType, metadata)], 'phone-photo.heic', {
    type: 'image/heic',
  });
}

function createPngFile(width: number, height: number): File {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new File([bytes], 'photo.png', { type: 'image/png' });
}

test('reads HEIF dimensions from the primary image properties', async () => {
  await expect(inspectHeifFile(createHeifFile())).resolves.toEqual({
    width: 3000,
    height: 2000,
  });
});

test('rejects a HEIF image above the mobile-safe input pixel limit', async () => {
  await expect(inspectHeifFile(createHeifFile(12000, 2001))).rejects.toThrow(
    /24 megapixel/i,
  );
});

test('exports HEIC and HEIF photos as JPEG while preserving JPEG and PNG input formats', () => {
  expect(getWatermarkOutputMimeType('image/heic')).toBe('image/jpeg');
  expect(getWatermarkOutputMimeType('image/heif')).toBe('image/jpeg');
  expect(getWatermarkOutputMimeType('image/jpeg')).toBe('image/jpeg');
  expect(getWatermarkOutputMimeType('image/png')).toBe('image/png');
});

test('resizes HEIF during native decoding and closes the decoded bitmap', async () => {
  const close = rs.fn();
  const createImageBitmap = rs
    .spyOn(globalThis, 'createImageBitmap')
    .mockResolvedValue({ width: 2048, height: 1365, close } as ImageBitmap);
  const drawImage = rs.fn();
  const fillRect = rs.fn();
  const getContext = rs
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({
      drawImage,
      fillRect,
    } as unknown as CanvasRenderingContext2D);

  try {
    const prepared = await prepareWatermarkImage(createHeifFile());

    expect(createImageBitmap).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({
        imageOrientation: 'from-image',
        resizeQuality: 'high',
        resizeWidth: 2048,
      }),
    );
    expect(prepared).toMatchObject({
      width: 2048,
      height: 1365,
      mimeType: 'image/jpeg',
    });
    expect(drawImage).toHaveBeenCalledOnce();
    expect(fillRect).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();

    releaseWatermarkImage(prepared);
    expect(prepared.canvas).toHaveProperty('width', 0);
  } finally {
    createImageBitmap.mockRestore();
    getContext.mockRestore();
  }
});

test('reuses the compressor preparation path and keeps PNG output for PNG input', async () => {
  const close = rs.fn();
  const createImageBitmap = rs
    .spyOn(globalThis, 'createImageBitmap')
    .mockResolvedValue({ width: 2048, height: 1024, close } as ImageBitmap);
  const drawImage = rs.fn();
  const getContext = rs
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);

  try {
    const prepared = await prepareWatermarkImage(createPngFile(2560, 1280));

    expect(createImageBitmap).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({
        resizeWidth: 2048,
        resizeHeight: 1024,
        resizeQuality: 'high',
      }),
    );
    expect(prepared).toMatchObject({
      width: 2048,
      height: 1024,
      mimeType: 'image/png',
      inputMimeType: 'image/png',
    });
    expect(close).toHaveBeenCalledOnce();
    releaseWatermarkImage(prepared);
  } finally {
    createImageBitmap.mockRestore();
    getContext.mockRestore();
  }
});

test('explains when the browser cannot decode a valid HEIF image', async () => {
  const createImageBitmap = rs
    .spyOn(globalThis, 'createImageBitmap')
    .mockRejectedValue(new Error('unsupported codec'));

  try {
    await expect(prepareWatermarkImage(createHeifFile())).rejects.toThrow(
      /this browser can.t open this heic\/heif photo/i,
    );
  } finally {
    createImageBitmap.mockRestore();
  }
});

test('encodes the composited image in the selected output format and releases its canvas', async () => {
  const source = { width: 640, height: 480 } as HTMLCanvasElement;
  const drawImage = rs.fn();
  const measureText = rs.fn(() => ({
    width: 80,
    actualBoundingBoxAscent: 12,
    actualBoundingBoxDescent: 4,
  }));
  let encodedType = '';
  const outputCanvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      clearRect: rs.fn(),
      drawImage,
      fillText: rs.fn(),
      measureText,
      restore: rs.fn(),
      save: rs.fn(),
      strokeText: rs.fn(),
    }),
    toBlob: (callback: BlobCallback, type?: string) => {
      encodedType = type ?? '';
      callback(new Blob(['watermarked'], { type }));
    },
  } as unknown as HTMLCanvasElement;

  const blob = await exportWatermarkedImage(
    source,
    {
      text: 'Sample',
      position: { x: 0.5, y: 0.5 },
      fontScale: 0.06,
      color: '#ffffff',
      opacity: 0.8,
    },
    'image/jpeg',
    () => outputCanvas,
  );

  expect(blob.type).toBe('image/jpeg');
  expect(encodedType).toBe('image/jpeg');
  expect(drawImage).toHaveBeenCalledWith(source, 0, 0, 640, 480);
  expect(outputCanvas).toMatchObject({ width: 0, height: 0 });
});
