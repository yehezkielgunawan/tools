import { expect, test } from '@rstest/core';
import {
  calculateOutputDimensions,
  compareImageSizes,
  ImageInputError,
  inspectImageFile,
} from '../src/tools/image-compressor/imageUtils';

function createPngFile(
  width: number,
  height: number,
  type = 'image/png',
): File {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return new File([bytes], 'photo.png', { type });
}

function createJpegFile(width: number, height: number, orientation = 1): File {
  const exif = new Uint8Array([
    69,
    120,
    105,
    102,
    0,
    0,
    77,
    77,
    0,
    42,
    0,
    0,
    0,
    8,
    0,
    1,
    1,
    18,
    0,
    3,
    0,
    0,
    0,
    1,
    0,
    orientation,
    0,
    0,
    0,
    0,
    0,
    0,
  ]);
  const exifSegmentLength = exif.length + 2;
  const bytes = new Uint8Array([
    0xff,
    0xd8,
    0xff,
    0xe1,
    (exifSegmentLength >> 8) & 0xff,
    exifSegmentLength & 0xff,
    ...exif,
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03,
    0x01,
    0x11,
    0x00,
    0x02,
    0x11,
    0x00,
    0x03,
    0x11,
    0x00,
    0xff,
    0xd9,
  ]);
  return new File([bytes], 'photo.jpg', { type: 'image/jpeg' });
}

test('inspects PNG signature and dimensions without decoding pixels', async () => {
  const info = await inspectImageFile(createPngFile(1600, 1200));

  expect(info).toEqual({
    mimeType: 'image/png',
    width: 1600,
    height: 1200,
    orientation: 1,
  });
});

test('inspects JPEG dimensions from a start-of-frame segment', async () => {
  const info = await inspectImageFile(createJpegFile(4032, 3024));

  expect(info).toEqual({
    mimeType: 'image/jpeg',
    width: 4032,
    height: 3024,
    orientation: 1,
  });
});

test('accounts for EXIF rotation in JPEG dimensions', async () => {
  const info = await inspectImageFile(createJpegFile(4032, 3024, 6));

  expect(info).toEqual({
    mimeType: 'image/jpeg',
    width: 3024,
    height: 4032,
    orientation: 6,
  });
});

test('rejects an image whose header conflicts with its declared MIME type', async () => {
  await expect(
    inspectImageFile(createPngFile(20, 20, 'image/jpeg')),
  ).rejects.toMatchObject({ code: 'invalid-image' });
});

test('rejects unsupported image formats before browser decoding', async () => {
  const heic = new File([new Uint8Array([0, 0, 0, 0])], 'camera.heic', {
    type: 'image/heic',
  });

  await expect(inspectImageFile(heic)).rejects.toMatchObject({
    code: 'unsupported-type',
  });
});

test('rejects dimensions above the mobile-safe pixel budget', async () => {
  await expect(
    inspectImageFile(createPngFile(5000, 5000)),
  ).rejects.toMatchObject({ code: 'dimensions-too-large' });
});

test('caps dimensions without enlarging and retains aspect ratio', () => {
  expect(calculateOutputDimensions(4032, 3024, 2048)).toEqual({
    width: 2048,
    height: 1536,
  });
  expect(calculateOutputDimensions(800, 1200, 2048)).toEqual({
    width: 800,
    height: 1200,
  });
});

test('allows original dimensions only within the bounded output budget', () => {
  expect(calculateOutputDimensions(3000, 2000, 'original')).toEqual({
    width: 3000,
    height: 2000,
  });
  expect(() => calculateOutputDimensions(4032, 3024, 'original')).toThrow(
    ImageInputError,
  );
});

test('detects even small outputs that are larger than their source', () => {
  expect(compareImageSizes(1000, 1001)).toEqual({
    isLarger: true,
    percentage: 0.1,
  });
  expect(compareImageSizes(1000, 800)).toEqual({
    isLarger: false,
    percentage: 20,
  });
});
