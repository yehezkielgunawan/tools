import { expect, test } from '@rstest/core';
import {
  clampWatermarkPosition,
  pointerToWatermarkPosition,
} from '../src/tools/image-watermark/watermarkGeometry';

test('keeps the complete text bounds inside the image', () => {
  expect(
    clampWatermarkPosition(
      { x: 0, y: 1 },
      { width: 400, height: 200 },
      { width: 100, height: 20 },
    ),
  ).toEqual({ x: 0.125, y: 0.95 });
});

test('maps touch coordinates from the displayed preview to normalized image coordinates', () => {
  expect(
    pointerToWatermarkPosition(
      { clientX: 160, clientY: 280 },
      { left: 40, top: 80, width: 240, height: 400 },
    ),
  ).toEqual({ x: 0.5, y: 0.5 });
});

test('clamps pointer coordinates outside the preview to its edges', () => {
  expect(
    pointerToWatermarkPosition(
      { clientX: 400, clientY: 20 },
      { left: 40, top: 80, width: 240, height: 400 },
    ),
  ).toEqual({ x: 1, y: 0 });
});
