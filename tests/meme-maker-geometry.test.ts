import { expect, test } from '@rstest/core';
import {
  clampCaptionPosition,
  createDefaultCaptions,
  pointerToCaptionPosition,
} from '../src/tools/meme-maker/memeGeometry';

test('creates editable top and bottom captions with neutral meme styling', () => {
  const captions = createDefaultCaptions(2);
  expect(captions).toHaveLength(2);
  expect(captions.map((caption) => caption.y)).toEqual([0.12, 0.88]);
  expect(captions[0]).toMatchObject({
    text: '',
    x: 0.5,
    width: 0.9,
    color: '#ffffff',
    outlineColor: '#000000',
  });
  expect(createDefaultCaptions(3).map((caption) => caption.y)).toEqual([
    0.12, 0.5, 0.88,
  ]);
  expect(createDefaultCaptions(1)[0].y).toBe(0.5);
});

test('maps pointers to normalized image coordinates regardless of preview scale', () => {
  expect(
    pointerToCaptionPosition(
      { clientX: 110, clientY: 70 },
      { left: 10, top: 20, width: 200, height: 100 },
    ),
  ).toEqual({ x: 0.5, y: 0.5 });
});

test('keeps caption bounds inside the image and rejects invalid preview sizes', () => {
  expect(
    clampCaptionPosition({ x: -1, y: 2 }, { width: 0.8, height: 0.2 }),
  ).toEqual({ x: 0.4, y: 0.9 });
  expect(
    clampCaptionPosition(
      { x: Number.NaN, y: Number.POSITIVE_INFINITY },
      { width: 0.8, height: 0.2 },
    ),
  ).toEqual({ x: 0.5, y: 0.5 });
  expect(() =>
    pointerToCaptionPosition(
      { clientX: 1, clientY: 1 },
      { left: 0, top: 0, width: 0, height: 1 },
    ),
  ).toThrow();
});
