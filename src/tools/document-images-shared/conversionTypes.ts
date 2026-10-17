export type DocumentKind = 'pdf' | 'pptx';
export type ImageFormat = 'image/png' | 'image/jpeg';
export type ImageFit = 'contain' | 'cover';

export interface PreparedDocumentImage {
  bytes: Uint8Array;
  width: number;
  height: number;
  mimeType: ImageFormat;
}

export interface ImageInput {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
}

export interface ConversionOutput {
  filename: string;
  blob: Blob;
  thumbnail?: Blob;
}

export interface ImageExportOptions {
  format: ImageFormat;
  maxEdge: number;
  quality: number;
}

export interface RasterDocument {
  count: number;
  render: (
    page: number,
    canvas: HTMLCanvasElement,
    maxEdge: number,
    signal: AbortSignal,
  ) => Promise<void>;
  destroy: () => Promise<void>;
}

export interface PdfImageOptions {
  pageSize: 'a4' | 'letter' | 'image';
  orientation: 'portrait' | 'landscape';
  margin: number;
  fit: ImageFit;
}

export interface PptxImageOptions {
  layout: 'wide' | 'standard';
  fit: ImageFit;
}
