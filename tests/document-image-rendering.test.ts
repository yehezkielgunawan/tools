import { describe, expect, it, rs } from '@rstest/core';
import type { RasterDocument } from '../src/tools/document-images-shared/conversionTypes';
import { documentToImages } from '../src/tools/document-images-shared/documentToImages';

describe('sequential document rasterization', () => {
  it('renders selected pages in order and frees each canvas', async () => {
    const canvases: HTMLCanvasElement[] = [];
    const render = rs.fn(async (_page: number, canvas: HTMLCanvasElement) => {
      canvas.width = 100;
      canvas.height = 50;
      canvases.push(canvas);
    });
    const document: RasterDocument = {
      count: 5,
      render,
      destroy: async () => undefined,
    };
    const progress = rs.fn();
    const outputs = await documentToImages(
      document,
      'report.pdf',
      'pdf',
      [3, 1],
      { maxEdge: 1600, format: 'image/png', quality: 0.9 },
      new AbortController().signal,
      progress,
      async () => ({
        blob: new Blob(['image']),
        thumbnail: new Blob(['thumb']),
      }),
    );
    expect(outputs.map((o) => o.filename)).toEqual([
      'report-page-003.png',
      'report-page-001.png',
    ]);
    expect(render.mock.calls.map((args) => args[0])).toEqual([3, 1]);
    expect(canvases.every((c) => c.width === 0 && c.height === 0)).toBe(true);
    expect(progress).toHaveBeenLastCalledWith(2, 2);
  });

  it('stops before scheduling another page when cancelled during rendering', async () => {
    const controller = new AbortController();
    const render = rs.fn(async () => {
      controller.abort();
    });
    await expect(
      documentToImages(
        { count: 3, render, destroy: async () => undefined },
        'deck.pptx',
        'pptx',
        [1, 2, 3],
        { maxEdge: 1600, format: 'image/png', quality: 0.9 },
        controller.signal,
        () => undefined,
      ),
    ).rejects.toThrow(/cancel/i);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('reports a failed page instead of silently leaving it out', async () => {
    await expect(
      documentToImages(
        {
          count: 1,
          render: async () => {
            throw new Error('broken');
          },
          destroy: async () => undefined,
        },
        'deck.pptx',
        'pptx',
        [1],
        { maxEdge: 1600, format: 'image/png', quality: 0.9 },
        new AbortController().signal,
        () => undefined,
      ),
    ).rejects.toThrow(/slide 1/i);
  });
});
