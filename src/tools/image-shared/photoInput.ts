import {
  inspectImageFile,
  MAX_INPUT_BYTES,
} from '../image-compressor/imageUtils';
import { assertNotAborted } from './abort';
import { runHeicWorker } from './heic/client';

export type PhotoMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/heic'
  | 'image/heif';
export interface PhotoInfo {
  mimeType: PhotoMimeType;
  width: number;
  height: number;
  orientation: number;
  imageCount?: number;
}

export function hasHeicHeader(prefix: Uint8Array): boolean {
  if (
    prefix.length < 16 ||
    String.fromCharCode(...prefix.slice(4, 8)) !== 'ftyp'
  )
    return false;
  const boxSize = new DataView(
    prefix.buffer,
    prefix.byteOffset,
    prefix.byteLength,
  ).getUint32(0);
  for (
    let offset = 8;
    offset + 4 <= Math.min(prefix.length, boxSize);
    offset += 4
  ) {
    if (
      offset !== 12 &&
      ['heic', 'heix', 'hevc', 'hevx'].includes(
        String.fromCharCode(...prefix.slice(offset, offset + 4)),
      )
    )
      return true;
  }
  return false;
}

export async function inspectPhotoInput(
  file: File,
  signal?: AbortSignal,
): Promise<PhotoInfo> {
  assertNotAborted(signal);
  if (file.size === 0) throw new Error('The selected file is empty.');
  if (file.size > MAX_INPUT_BYTES)
    throw new Error('Choose an image 32 MB or smaller.');
  const prefix = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  assertNotAborted(signal);
  if (!hasHeicHeader(prefix)) return inspectImageFile(file);
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
  const { width, height, imageCount } = await runHeicWorker(
    file,
    'inspect',
    signal,
  );
  return {
    mimeType:
      type.includes('heif') || /\.heif$/i.test(file.name)
        ? 'image/heif'
        : 'image/heic',
    width,
    height,
    imageCount,
    orientation: 1,
  };
}
