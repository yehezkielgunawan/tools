import { rgbaToRgb } from './pixelFormats';
import init, { encodeJpeg, encodePng } from './vendor/pixo-wasm/pixo.js';
import type { WasmEncodeRequest, WasmEncodeResponse } from './wasmProtocol';

interface WorkerScope {
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<WasmEncodeRequest>) => void,
  ): void;
  postMessage(message: WasmEncodeResponse, transfer?: Transferable[]): void;
}

const workerScope = self as unknown as WorkerScope;
const wasmUrl = new URL('./vendor/pixo-wasm/pixo_bg.wasm', import.meta.url);
let wasmInitialization: Promise<void> | undefined;

workerScope.addEventListener('message', async (event) => {
  try {
    wasmInitialization ??= init(wasmUrl).then(() => undefined);
    await wasmInitialization;

    const request = event.data;
    const rgba = new Uint8Array(request.pixels);
    const output =
      request.format === 'image/jpeg'
        ? encodeJpeg(
            rgbaToRgb(rgba),
            request.width,
            request.height,
            2,
            request.quality,
            1,
            true,
          )
        : encodePng(
            rgba,
            request.width,
            request.height,
            3,
            1,
            request.pngLossy,
          );

    const buffer = output.buffer;
    if (!(buffer instanceof ArrayBuffer)) {
      throw new Error('The WASM encoder returned an unsupported buffer.');
    }

    workerScope.postMessage({ type: 'result', buffer }, [buffer]);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'The WASM compressor could not encode this image.';
    workerScope.postMessage({ type: 'error', message });
  }
});
