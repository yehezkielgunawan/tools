import type {
  ImageMimeType,
  MaxEdgeOption,
} from '../image-compressor/imageUtils';

export type ConverterInputFormat = 'jpeg' | 'png' | 'heic' | 'svg';

export interface ConverterInputInfo {
  format: ConverterInputFormat;
  width: number;
  height: number;
}

export interface ConverterOptions {
  outputMimeType: ImageMimeType;
  quality: number;
  maxEdge: MaxEdgeOption;
}

export interface ConversionResult {
  blob: Blob;
  width: number;
  height: number;
}
