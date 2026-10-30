import { afterEach, expect, rs, test } from '@rstest/core';
import { createDefaultCaptions } from '../src/tools/meme-maker/memeGeometry';
import {
  exportMemePng,
  getCaptionLayout,
  renderMeme,
} from '../src/tools/meme-maker/memeRenderer';

function context() {
  return {
    font: '',
    clearRect: rs.fn(),
    drawImage: rs.fn(),
    save: rs.fn(),
    restore: rs.fn(),
    strokeText: rs.fn(),
    fillText: rs.fn(),
    fillStyle: '',
    strokeStyle: '',
    measureText(text: string) {
      return {
        width:
          Array.from(text).length *
          (Number.parseFloat(this.font.split(' ')[1]) || 20) *
          0.6,
      };
    },
  } as unknown as CanvasRenderingContext2D;
}
afterEach(() => rs.restoreAllMocks());

test('wraps newlines, Unicode, and long words within measured caption bounds', () => {
  const ctx = context();
  const caption = {
    ...createDefaultCaptions(1)[0],
    text: 'Hello world\nこんにちは 👋\nSupercalifragilisticexpialidocious',
    width: 0.45,
    fontScale: 12,
  };
  const layout = getCaptionLayout(ctx, caption, 300, 200);
  expect(layout.lines.length).toBeGreaterThan(3);
  for (const line of layout.lines)
    expect(ctx.measureText(line).width).toBeLessThanOrEqual(
      layout.width - layout.padding * 2 + 0.01,
    );
  expect(layout.lines.join('')).toContain('こんにちは');
  expect(layout.lines.join('')).toContain('👋');
  expect(layout.height).toBeLessThanOrEqual(180);
  expect(layout.x - layout.width / 2).toBeGreaterThanOrEqual(0);
  expect(layout.y - layout.height / 2).toBeGreaterThanOrEqual(0);
});

test('renders original capitalization and colors, skipping blank captions', () => {
  const ctx = context();
  rs.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
  const source = document.createElement('canvas');
  source.width = 600;
  source.height = 400;
  const target = document.createElement('canvas');
  const captions = createDefaultCaptions(2);
  captions[0] = {
    ...captions[0],
    text: 'My caption',
    color: '#ff0000',
    outlineColor: '#00ff00',
  };
  renderMeme(source, target, captions);
  expect(target.width).toBe(600);
  expect(ctx.drawImage).toHaveBeenCalledWith(source, 0, 0);
  expect(ctx.fillText).toHaveBeenCalledTimes(1);
  expect(ctx.fillText).toHaveBeenCalledWith(
    'My caption',
    expect.any(Number),
    expect.any(Number),
  );
  expect(ctx.fillStyle).toBe('#ff0000');
  expect(ctx.strokeStyle).toBe('#00ff00');
});

test('fits a large caption inside a narrow image and clamps its position', () => {
  const layout = getCaptionLayout(
    context(),
    {
      ...createDefaultCaptions(1)[0],
      text: 'Long text '.repeat(50),
      x: 0,
      y: 1,
      fontScale: 20,
    },
    100,
    600,
  );
  expect(layout.height).toBeLessThanOrEqual(540);
  expect(layout.x - layout.width / 2).toBeGreaterThanOrEqual(0);
  expect(layout.y + layout.height / 2).toBeLessThanOrEqual(600);
});

test('exports PNG using the shared renderer and releases its temporary canvas', async () => {
  rs.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context(),
  );
  const exported: HTMLCanvasElement[] = [];
  rs.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    callback,
  ) {
    exported.push(this);
    callback(new Blob(['png'], { type: 'image/png' }));
  });
  const source = document.createElement('canvas');
  const blob = await exportMemePng(source, createDefaultCaptions(2));
  expect(blob.type).toBe('image/png');
  expect(exported[0]?.width).toBe(0);
  expect(source.width).not.toBe(0);
});

test('reports missing canvas and failed PNG encoding', async () => {
  const source = document.createElement('canvas');
  rs.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  await expect(exportMemePng(source, [])).rejects.toThrow(/canvas/i);
  rs.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context(),
  );
  rs.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
    (callback) => callback(null),
  );
  await expect(exportMemePng(source, [])).rejects.toThrow(/PNG/i);
});

test('wraps Unicode code points on browsers without Intl.Segmenter', () => {
  const original = Object.getOwnPropertyDescriptor(Intl, 'Segmenter');
  Object.defineProperty(Intl, 'Segmenter', {
    configurable: true,
    value: undefined,
  });
  try {
    const layout = getCaptionLayout(
      context(),
      { ...createDefaultCaptions(1)[0], text: 'Hello 👋 world' },
      300,
      200,
    );
    expect(layout.lines.join('')).toContain('👋');
  } finally {
    if (original) Object.defineProperty(Intl, 'Segmenter', original);
  }
});

test('lets short labels move across a multi-panel template instead of clamping them to the center', () => {
  const layout = getCaptionLayout(
    context(),
    { ...createDefaultCaptions(1)[0], text: 'Label', x: 0.15 },
    600,
    400,
  );
  expect(layout.width).toBeLessThan(300);
  expect(layout.x / 600).toBeCloseTo(0.15);
});
