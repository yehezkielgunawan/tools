import { describe, expect, it } from '@rstest/core';
import {
  getCanvasScale,
  getThumbnailPages,
  parsePreviewPage,
} from '../src/tools/pdf-shared/pdfPreviewModel';

describe('PDF preview navigation and rendering limits', () => {
  it('only accepts whole pages inside the document', () => {
    expect(parsePreviewPage(' 3 ', 5)).toBe(3);
    for (const value of ['', '0', '6', '1.5', '1e0', '-2'])
      expect(parsePreviewPage(value, 5)).toBeNull();
  });
  it('windows at most five thumbnails, including at the document boundaries', () => {
    expect(getThumbnailPages(1, 500)).toEqual([1, 2, 3, 4, 5]);
    expect(getThumbnailPages(250, 500)).toEqual([248, 249, 250, 251, 252]);
    expect(getThumbnailPages(500, 500)).toEqual([496, 497, 498, 499, 500]);
    expect(getThumbnailPages(1, 2)).toEqual([1, 2]);
  });
  it('limits canvas allocation without changing displayed page dimensions', () => {
    const scale = getCanvasScale(3000, 4000, 3);
    expect(
      Math.floor(3000 * scale) * Math.floor(4000 * scale),
    ).toBeLessThanOrEqual(4_000_000);
    expect(getCanvasScale(600, 800, 2)).toBe(2);
  });
});
