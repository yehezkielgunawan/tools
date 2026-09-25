export interface WatermarkPosition {
  x: number;
  y: number;
}

export interface ImageSize {
  width: number;
  height: number;
}

export interface TextSize {
  width: number;
  height: number;
}

export interface PreviewRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PointerCoordinates {
  clientX: number;
  clientY: number;
}

function assertPositiveSize(size: ImageSize): void {
  if (
    !Number.isFinite(size.width) ||
    !Number.isFinite(size.height) ||
    size.width <= 0 ||
    size.height <= 0
  ) {
    throw new RangeError('Image dimensions must be positive finite values.');
  }
}

export function getRotatedTextBounds(
  textSize: TextSize,
  rotationDegrees: number,
): TextSize {
  const width = Number.isFinite(textSize.width)
    ? Math.max(0, textSize.width)
    : 0;
  const height = Number.isFinite(textSize.height)
    ? Math.max(0, textSize.height)
    : 0;
  const rotation = Number.isFinite(rotationDegrees) ? rotationDegrees : 0;
  const radians = (rotation * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));

  return {
    width: Math.round((width * cosine + height * sine) * 1e10) / 1e10,
    height: Math.round((width * sine + height * cosine) * 1e10) / 1e10,
  };
}

export function clampWatermarkPosition(
  position: WatermarkPosition,
  imageSize: ImageSize,
  textSize: TextSize,
): WatermarkPosition {
  assertPositiveSize(imageSize);

  const halfTextWidth = Math.min(
    Math.max(0, textSize.width) / imageSize.width / 2,
    0.5,
  );
  const halfTextHeight = Math.min(
    Math.max(0, textSize.height) / imageSize.height / 2,
    0.5,
  );
  const x = Number.isFinite(position.x) ? position.x : 0.5;
  const y = Number.isFinite(position.y) ? position.y : 0.5;

  return {
    x: Math.max(halfTextWidth, Math.min(1 - halfTextWidth, x)),
    y: Math.max(halfTextHeight, Math.min(1 - halfTextHeight, y)),
  };
}

export function pointerToWatermarkPosition(
  pointer: PointerCoordinates,
  preview: PreviewRect,
): WatermarkPosition {
  if (
    !Number.isFinite(preview.width) ||
    !Number.isFinite(preview.height) ||
    preview.width <= 0 ||
    preview.height <= 0
  ) {
    throw new RangeError('Preview dimensions must be positive finite values.');
  }

  return {
    x: Math.max(
      0,
      Math.min(1, (pointer.clientX - preview.left) / preview.width),
    ),
    y: Math.max(
      0,
      Math.min(1, (pointer.clientY - preview.top) / preview.height),
    ),
  };
}
