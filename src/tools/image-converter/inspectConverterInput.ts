import {
  inspectImageFile,
  MAX_INPUT_BYTES,
} from '../image-compressor/imageUtils';
import { hasHeicHeader, inspectPhotoInput } from '../image-shared/photoInput';
import type { ConverterInputInfo } from './converterTypes';
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
  if (hasHeicHeader(prefix)) {
    const { width, height } = await inspectPhotoInput(file, signal);
    return { format: 'heic', width, height };
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
