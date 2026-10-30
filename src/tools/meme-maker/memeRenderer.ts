/// <reference lib="es2022.intl" />
import { releaseCanvas } from '../image-compressor/prepareImage';
import { clampCaptionPosition } from './memeGeometry';
import type { MemeCaption } from './memeTypes';

export interface CaptionLayout {
  lines: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  lineHeight: number;
  padding: number;
}

function setFont(context: CanvasRenderingContext2D, size: number): void {
  context.font = `900 ${size}px Impact, "Arial Black", sans-serif`;
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
): string[] {
  const lines: string[] = [];
  const segmenter =
    typeof Intl.Segmenter === 'function'
      ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
      : null;
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (context.measureText(candidate).width <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      const segments = segmenter
        ? Array.from(segmenter.segment(word), (value) => value.segment)
        : Array.from(word);
      for (const segment of segments) {
        if (line && context.measureText(line + segment).width > width) {
          lines.push(line);
          line = '';
        }
        line += segment;
      }
    }
    lines.push(line);
  }
  return lines;
}

export function getCaptionLayout(
  context: CanvasRenderingContext2D,
  caption: MemeCaption,
  imageWidth: number,
  imageHeight: number,
): CaptionLayout {
  const width = imageWidth * caption.width;
  let fontSize = Math.max(
    1,
    (Math.min(imageWidth, imageHeight) * caption.fontScale) / 100,
  );
  let lines: string[] = [];
  let padding = 0;
  let height = 0;
  // Rewrap while shrinking: both tall blocks and unbreakable graphemes must fit.
  for (let attempt = 0; attempt < 80; attempt += 1) {
    setFont(context, fontSize);
    padding = fontSize * 0.2;
    const available = Math.max(1, width - padding * 2);
    lines = wrapText(context, caption.text.slice(0, 500), available);
    height = lines.length * fontSize * 1.2 + padding * 2;
    if (
      height <= imageHeight * 0.9 &&
      lines.every((line) => context.measureText(line).width <= available)
    )
      break;
    fontSize *= 0.9;
  }
  // Wrap against the maximum box width, but move short labels freely across panels.
  const textWidth = caption.text.trim()
    ? Math.min(
        width,
        Math.max(...lines.map((line) => context.measureText(line).width)) +
          padding * 2,
      )
    : width;
  const position = clampCaptionPosition(caption, {
    width: textWidth / imageWidth,
    height: height / imageHeight,
  });
  return {
    lines,
    x: position.x * imageWidth,
    y: position.y * imageHeight,
    width: textWidth,
    height,
    fontSize,
    lineHeight: fontSize * 1.2,
    padding,
  };
}

export function renderMeme(
  source: HTMLCanvasElement,
  target: HTMLCanvasElement,
  captions: readonly MemeCaption[],
): void {
  target.width = source.width;
  target.height = source.height;
  const context = target.getContext('2d');
  if (!context)
    throw new Error('The image canvas is unavailable in this browser.');
  context.clearRect(0, 0, target.width, target.height);
  context.drawImage(source, 0, 0);
  for (const caption of captions) {
    if (!caption.text.trim()) continue;
    context.save();
    const layout = getCaptionLayout(
      context,
      caption,
      source.width,
      source.height,
    );
    setFont(context, layout.fontSize);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    context.lineWidth = layout.fontSize * 0.09;
    context.fillStyle = caption.color;
    context.strokeStyle = caption.outlineColor;
    const top = layout.y - ((layout.lines.length - 1) * layout.lineHeight) / 2;
    layout.lines.forEach((line, index) => {
      context.strokeText(line, layout.x, top + index * layout.lineHeight);
      context.fillText(line, layout.x, top + index * layout.lineHeight);
    });
    context.restore();
  }
}

export async function exportMemePng(
  source: HTMLCanvasElement,
  captions: readonly MemeCaption[],
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  try {
    renderMeme(source, canvas, captions);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob?.type === 'image/png') resolve(blob);
        else
          reject(
            new Error(
              'The browser could not create the PNG. Please try again.',
            ),
          );
      }, 'image/png');
    });
  } finally {
    releaseCanvas(canvas);
  }
}
