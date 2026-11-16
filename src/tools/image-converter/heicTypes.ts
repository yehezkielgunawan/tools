export interface HeifImage {
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
    decoder: number;
    decode(bytes: Uint8Array): HeifImage[];
  };
  heif_context_free(context: number): void;
}

export interface HeicResult {
  width: number;
  height: number;
  pixels?: ArrayBuffer;
}

export interface HeicRequest {
  operation: 'inspect' | 'decode';
  buffer: ArrayBuffer;
}

export type HeicResponse =
  | { ok: true; result: HeicResult }
  | { ok: false; message: string };
