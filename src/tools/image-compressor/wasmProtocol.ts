import type { ImageMimeType } from './imageUtils';

export interface WasmEncodeRequest {
  type: 'encode';
  pixels: ArrayBuffer;
  width: number;
  height: number;
  format: ImageMimeType;
  quality: number;
  pngLossy: boolean;
}

export type WasmEncodeResponse =
  | { type: 'result'; buffer: ArrayBuffer }
  | { type: 'error'; message: string };
