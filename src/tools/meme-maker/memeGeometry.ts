import type { MemeCaption } from './memeTypes';

export interface CaptionPosition {
  x: number;
  y: number;
}
export interface CaptionBounds {
  width: number;
  height: number;
}

export function createDefaultCaptions(count: number): MemeCaption[] {
  return Array.from(
    { length: Math.max(1, Math.min(10, count)) },
    (_, index) => ({
      id: `caption-${index + 1}`,
      text: '',
      x: 0.5,
      y: count === 1 ? 0.5 : 0.12 + (index / (count - 1)) * 0.76,
      width: 0.9,
      fontScale: 8,
      color: '#ffffff',
      outlineColor: '#000000',
    }),
  );
}

export function clampCaptionPosition(
  position: CaptionPosition,
  bounds: CaptionBounds,
): CaptionPosition {
  const halfWidth = Math.max(0, Math.min(1, bounds.width)) / 2;
  const halfHeight = Math.max(0, Math.min(1, bounds.height)) / 2;
  return {
    x: Math.max(
      halfWidth,
      Math.min(1 - halfWidth, Number.isFinite(position.x) ? position.x : 0.5),
    ),
    y: Math.max(
      halfHeight,
      Math.min(1 - halfHeight, Number.isFinite(position.y) ? position.y : 0.5),
    ),
  };
}

export function pointerToCaptionPosition(
  pointer: { clientX: number; clientY: number },
  rect: { left: number; top: number; width: number; height: number },
): CaptionPosition {
  if (
    !Number.isFinite(rect.width) ||
    !Number.isFinite(rect.height) ||
    rect.width <= 0 ||
    rect.height <= 0
  ) {
    throw new RangeError('Preview dimensions must be positive.');
  }
  return {
    x: (pointer.clientX - rect.left) / rect.width,
    y: (pointer.clientY - rect.top) / rect.height,
  };
}
