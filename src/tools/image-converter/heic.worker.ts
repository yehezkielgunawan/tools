import { readHeic } from './heicDecoder';
import type { HeicRequest, HeicResponse } from './heicTypes';

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<HeicRequest>) => void) | null;
  postMessage(message: HeicResponse, transfer?: Transferable[]): void;
};

scope.onmessage = async ({ data }) => {
  try {
    const { default: factory } = await import(
      /* webpackChunkName: "image-converter-heic-decoder" */
      'libheif-js/libheif-wasm/libheif-bundle.mjs'
    );
    const library = await factory();
    const result = await readHeic(library, data.buffer, data.operation);
    scope.postMessage(
      { ok: true, result },
      result.pixels ? [result.pixels] : [],
    );
  } catch (error) {
    scope.postMessage({
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : 'HEIC conversion failed. Try another photo.',
    });
  }
};
