import { describe, expect, it } from '@rstest/core';
import {
  createPdfDocumentOptions,
  createPdfWorkerOptions,
} from '../src/tools/pdf-editor/pdfjsClient';

describe('createPdfWorkerOptions', () => {
  it('selects a classic worker for Rsbuild’s importScripts chunk loader', () => {
    expect(createPdfWorkerOptions()).toEqual({
      name: 'local-pdf-worker',
      type: 'classic',
    });
  });
});

describe('createPdfDocumentOptions', () => {
  it('uses same-origin cached assets for PDF fonts, CMaps, and ICC profiles', () => {
    const data = new Uint8Array([1, 2, 3]);

    expect(createPdfDocumentOptions(data)).toEqual({
      data,
      cMapUrl: '/static/pdfjs/cmaps/',
      cMapPacked: true,
      iccUrl: '/static/pdfjs/iccs/',
      standardFontDataUrl: '/static/pdfjs/standard_fonts/',
      wasmUrl: '/static/pdfjs/wasm/',
      useWasm: false,
    });
  });
});
