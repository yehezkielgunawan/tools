export function rgbaToRgb(rgba: Uint8Array): Uint8Array {
  if (rgba.length % 4 !== 0) {
    throw new Error('Expected a complete RGBA pixel buffer.');
  }

  const rgb = new Uint8Array((rgba.length / 4) * 3);
  for (let sourceIndex = 0, targetIndex = 0; sourceIndex < rgba.length; ) {
    const alpha = rgba[sourceIndex + 3] / 255;
    const inverseAlpha = 1 - alpha;

    rgb[targetIndex] = Math.round(
      rgba[sourceIndex] * alpha + 255 * inverseAlpha,
    );
    rgb[targetIndex + 1] = Math.round(
      rgba[sourceIndex + 1] * alpha + 255 * inverseAlpha,
    );
    rgb[targetIndex + 2] = Math.round(
      rgba[sourceIndex + 2] * alpha + 255 * inverseAlpha,
    );

    sourceIndex += 4;
    targetIndex += 3;
  }

  return rgb;
}
