import type { MaxEdgeOption } from '../../image-compressor/imageUtils';
import type { RgbaChannel } from './resizeRgba';

export interface HeifImage {
  handle: unknown;
  get_width(): number;
  get_height(): number;
  is_primary(): boolean;
  display(
    target: { data: Uint8ClampedArray; width: number; height: number },
    callback: (result: unknown) => void,
  ): void;
  free(): void;
}

export interface HeifLibrary {
  HeifDecoder: new () => {
    decoder: unknown;
    decode(bytes: Uint8Array): HeifImage[];
  };
  heif_context_free(context: unknown): void;
  heif_colorspace: { heif_colorspace_RGB: unknown };
  heif_chroma: { heif_chroma_interleaved_RGBA: unknown };
  heif_channel: { heif_channel_interleaved: unknown };
  heif_js_decode_image2(
    handle: unknown,
    colorspace: unknown,
    chroma: unknown,
  ): {
    image: unknown;
    channels: (RgbaChannel & { id: unknown })[];
    code?: number;
    message?: string;
  };
  heif_image_release(image: unknown): void;
}

export interface HeicResult {
  width: number;
  height: number;
  imageCount: number;
  sourceWidth?: number;
  sourceHeight?: number;
  pixels?: ArrayBuffer;
}

export interface HeicRequest {
  operation: 'inspect' | 'decode';
  buffer: ArrayBuffer;
  maxEdge: MaxEdgeOption;
}

export type HeicResponse =
  | { ok: true; result: HeicResult }
  | { ok: false; message: string };
