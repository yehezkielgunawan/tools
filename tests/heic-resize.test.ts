import { expect, test } from '@rstest/core';
import { assertHeicDimensions } from '../src/tools/image-shared/heic/limits';
import { resizeRgba } from '../src/tools/image-shared/heic/resizeRgba';

test('accepts actual 48 MP and marketed 24 MP HEIC dimensions', () => {
  expect(() => assertHeicDimensions(8064, 6048)).not.toThrow();
  expect(() => assertHeicDimensions(5712, 4284)).not.toThrow();
  expect(() => assertHeicDimensions(10_000, 5001)).toThrow(/50 megapixel/i);
  expect(() => assertHeicDimensions(12_001, 1)).toThrow(/12,000/i);
  expect(() => assertHeicDimensions(0, 1)).toThrow(/dimensions/i);
});

test('area-averages decoded pixels into only the requested output buffer', () => {
  const data = new Uint8Array([
    255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
  ]);
  const result = resizeRgba({ data, width: 2, height: 2, stride: 8 }, 1, 1);
  expect(Array.from(result)).toEqual([128, 128, 128, 255]);
  expect(result.byteLength).toBe(4);
});

test('uses premultiplied alpha so transparent colors do not bleed into edges', () => {
  const result = resizeRgba(
    {
      data: new Uint8Array([255, 0, 0, 255, 0, 0, 255, 0]),
      width: 2,
      height: 1,
      stride: 8,
    },
    1,
    1,
  );
  expect(Array.from(result)).toEqual([255, 0, 0, 128]);
});

test('respects decoder row padding and produces independent transferable pixels', () => {
  const data = new Uint8Array([
    10, 20, 30, 255, 99, 99, 99, 99, 30, 40, 50, 255, 99, 99, 99, 99,
  ]);
  const result = resizeRgba({ data, width: 1, height: 2, stride: 8 }, 1, 2);
  expect(Array.from(result)).toEqual([10, 20, 30, 255, 30, 40, 50, 255]);
  expect(result.buffer).not.toBe(data.buffer);
});

test('rejects unsafe output sizes, upscaling, and incomplete decoded channels', () => {
  const channel = { data: new Uint8Array(16), width: 2, height: 2, stride: 8 };
  expect(() => resizeRgba(channel, 0, 1)).toThrow();
  expect(() => resizeRgba(channel, 3, 3)).toThrow();
  expect(() =>
    resizeRgba({ ...channel, data: new Uint8Array(1) }, 1, 1),
  ).toThrow(/pixels|channel/i);
});
