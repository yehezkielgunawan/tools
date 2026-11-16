import {
  inspectImageFile,
  MAX_INPUT_BYTES,
} from '../image-compressor/imageUtils';
import type { ConverterInputInfo } from './converterTypes';
import { runHeicWorker } from './decodeHeic';
import { prepareSvg } from './prepareSvg';

export async function inspectConverterInput(
  file: File,
  signal?: AbortSignal,
): Promise<ConverterInputInfo> {
  if (file.size === 0) throw new Error('The selected file is empty.');
  if (file.size > MAX_INPUT_BYTES)
    throw new Error('Choose an image 32 MB or smaller.');
  const prefix = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  if (signal?.aborted)
    throw new DOMException('Conversion cancelled.', 'AbortError');
  if (prefix[0] === 0xff || prefix[0] === 137) {
    const info = await inspectImageFile(file);
    return {
      format: info.mimeType === 'image/png' ? 'png' : 'jpeg',
      width: info.width,
      height: info.height,
    };
  }
  if (
    prefix.length >= 16 &&
    String.fromCharCode(...prefix.slice(4, 8)) === 'ftyp'
  ) {
    const boxSize = new DataView(prefix.buffer).getUint32(0);
    const brands: string[] = [];
    for (
      let offset = 8;
      offset + 4 <= Math.min(prefix.length, boxSize);
      offset += 4
    ) {
      if (offset !== 12)
        brands.push(String.fromCharCode(...prefix.slice(offset, offset + 4)));
    }
    if (
      brands.some((brand) => ['heic', 'heix', 'hevc', 'hevx'].includes(brand))
    ) {
      const type = file.type.toLowerCase();
      if (
        type &&
        ![
          'application/octet-stream',
          'image/heic',
          'image/heif',
          'image/heic-sequence',
          'image/heif-sequence',
          'image/x-heic',
          'image/x-heif',
        ].includes(type)
      ) {
        throw new Error('The file type does not match its image contents.');
      }
      const { width, height } = await runHeicWorker(file, 'inspect', signal);
      return { format: 'heic', width, height };
    }
  }
  const text = new TextDecoder().decode(prefix).trimStart();
  if (
    file.type === 'image/svg+xml' ||
    /^(?:<\?xml[\s\S]*?\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg(?:\s|>)/i.test(text)
  ) {
    if (
      file.type &&
      !['image/svg+xml', 'application/octet-stream'].includes(
        file.type.toLowerCase(),
      )
    ) {
      throw new Error('The file type does not match its image contents.');
    }
    const { width, height } = await prepareSvg(file);
    return { format: 'svg', width, height };
  }
  throw new Error('Choose a supported HEIC, JPG, PNG, or SVG image.');
}
