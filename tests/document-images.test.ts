import { describe, expect, it } from '@rstest/core';
import { strFromU8, unzipSync } from 'fflate';
import { PDFDocument } from 'pdf-lib';
import type { PreparedDocumentImage } from '../src/tools/document-images-shared/conversionTypes';
import { createImagesZip } from '../src/tools/document-images-shared/imageDownloads';
import {
  fitImage,
  getExportPages,
  outputFilename,
} from '../src/tools/document-images-shared/imageLayout';
import { imagesToPdf } from '../src/tools/pdf-images/imagesToPdf';
import { imagesToPptx } from '../src/tools/powerpoint-images/imagesToPptx';

const pixel = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  ),
  (c) => c.charCodeAt(0),
);

async function* images(): AsyncGenerator<PreparedDocumentImage> {
  yield { bytes: pixel, width: 200, height: 100, mimeType: 'image/png' };
  yield { bytes: pixel, width: 100, height: 300, mimeType: 'image/png' };
}

describe('document image conversion', () => {
  it('centers images without distortion and returns source cropping for fill', () => {
    expect(fitImage(200, 100, 100, 100, 'contain')).toEqual({
      x: 0,
      y: 25,
      width: 100,
      height: 50,
      sx: 0,
      sy: 0,
      sw: 200,
      sh: 100,
    });
    expect(fitImage(200, 100, 100, 100, 'cover')).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      sx: 50,
      sy: 0,
      sw: 100,
      sh: 100,
    });
  });

  it('enforces the converter limit for both all-pages and custom selections', () => {
    expect(getExportPages('3, 1-2', 100)).toEqual([3, 1, 2]);
    expect(() => getExportPages('', 51)).toThrow(/50/);
    expect(() => getExportPages('1-51', 100)).toThrow(/50/);
    expect(() => getExportPages('1, 1', 3)).toThrow(/more than once/);
    expect(() => fitImage(0, 10, 100, 100, 'contain')).toThrow();
  });

  it('sanitizes output filenames and preserves original page numbers', () => {
    expect(outputFilename('../report.pdf', 'page', 3, 'png')).toBe(
      'report-page-003.png',
    );
    expect(outputFilename('deck.pptx', 'slide', 12, 'jpg')).toBe(
      'deck-slide-012.jpg',
    );
  });

  it('writes a real PDF in image order with proportional pages', async () => {
    const blob = await imagesToPdf(
      images(),
      { pageSize: 'image', orientation: 'portrait', margin: 0, fit: 'contain' },
      new AbortController().signal,
    );
    const pdf = await PDFDocument.load(await blob.arrayBuffer());
    expect(pdf.getPages().map((p) => p.getSize())).toEqual([
      { width: 150, height: 75 },
      { width: 75, height: 225 },
    ]);
  });

  it('writes landscape Letter pages and honors cancellation', async () => {
    const signal = new AbortController().signal;
    const pdf = await PDFDocument.load(
      await (
        await imagesToPdf(
          images(),
          {
            pageSize: 'letter',
            orientation: 'landscape',
            margin: 18,
            fit: 'cover',
          },
          signal,
        )
      ).arrayBuffer(),
    );
    expect(pdf.getPage(0).getSize()).toEqual({ width: 792, height: 612 });
    const controller = new AbortController();
    controller.abort();
    await expect(
      imagesToPdf(
        images(),
        {
          pageSize: 'image',
          orientation: 'portrait',
          margin: 0,
          fit: 'contain',
        },
        controller.signal,
      ),
    ).rejects.toThrow(/cancel/i);
  });

  it('writes a real PPTX with one ordered image per slide', async () => {
    const blob = await imagesToPptx(
      images(),
      { layout: 'wide', fit: 'contain' },
      new AbortController().signal,
    );
    const zip = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(strFromU8(zip['ppt/presentation.xml'])).toContain('cx="12192000"');
    expect(strFromU8(zip['ppt/slides/slide1.xml'])).toContain('<p:pic>');
    expect(strFromU8(zip['ppt/slides/slide2.xml'])).toContain('<p:pic>');
    expect(zip['ppt/slides/slide3.xml']).toBeUndefined();
    const first = strFromU8(zip['ppt/slides/slide1.xml']);
    const second = strFromU8(zip['ppt/slides/slide2.xml']);
    expect(first).not.toBe(second);
  });

  it('creates a ZIP with the exact download names and bytes', async () => {
    const blob = await createImagesZip(
      [{ filename: 'report-page-003.png', blob: new Blob([pixel]) }],
      new AbortController().signal,
    );
    const zip = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(zip)).toEqual(['report-page-003.png']);
    expect(zip['report-page-003.png']).toEqual(pixel);
  });

  it('supports fill-and-crop in a standard PowerPoint deck', async () => {
    const blob = await imagesToPptx(
      images(),
      { layout: 'standard', fit: 'cover' },
      new AbortController().signal,
    );
    const zip = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(strFromU8(zip['ppt/presentation.xml'])).toContain('cx="9144000"');
    expect(strFromU8(zip['ppt/slides/slide1.xml'])).toContain('srcRect');
  });
});
