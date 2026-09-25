export const MAX_INPUT_BYTES = 32 * 1024 * 1024;
export const MAX_INPUT_PIXELS = 24_000_000;
export const MAX_INPUT_EDGE = 12_000;
export const MAX_OUTPUT_PIXELS = 9_500_000;
export const MAX_ORIGINAL_OUTPUT_PIXELS = 12_000_000;
export const MAX_CANVAS_EDGE = 4096;

export const MAX_EDGE_OPTIONS = [1024, 1600, 2048, 2560, 3072] as const;
export type MaxEdgeOption = (typeof MAX_EDGE_OPTIONS)[number] | 'original';
export type ImageMimeType = 'image/jpeg' | 'image/png';

export interface ImageInfo {
  mimeType: ImageMimeType;
  width: number;
  height: number;
  orientation: number;
}

export interface ImageSizeComparison {
  isLarger: boolean;
  percentage: number;
}

export type ImageInputErrorCode =
  | 'unsupported-type'
  | 'file-too-large'
  | 'invalid-image'
  | 'dimensions-too-large';

export class ImageInputError extends Error {
  readonly code: ImageInputErrorCode;

  constructor(code: ImageInputErrorCode, message: string) {
    super(message);
    this.name = 'ImageInputError';
    this.code = code;
  }
}

const MAX_HEADER_BYTES = 1024 * 1024;
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;
const JPEG_START = [0xff, 0xd8] as const;
const SUPPORTED_MIME_TYPES = new Set<ImageMimeType>([
  'image/jpeg',
  'image/png',
]);
const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 24 &&
    PNG_SIGNATURE.every((byte, index) => bytes[index] === byte) &&
    bytes[12] === 73 &&
    bytes[13] === 72 &&
    bytes[14] === 68 &&
    bytes[15] === 82
  );
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes[0] === JPEG_START[0] && bytes[1] === JPEG_START[1];
}

function readExifOrientation(
  bytes: Uint8Array,
  segmentOffset: number,
  segmentLength: number,
): number {
  const segmentStart = segmentOffset + 2;
  const segmentEnd = segmentOffset + segmentLength;
  const isExif =
    bytes[segmentStart] === 69 &&
    bytes[segmentStart + 1] === 120 &&
    bytes[segmentStart + 2] === 105 &&
    bytes[segmentStart + 3] === 102 &&
    bytes[segmentStart + 4] === 0 &&
    bytes[segmentStart + 5] === 0;
  if (!isExif) return 1;

  const tiffOffset = segmentStart + 6;
  if (tiffOffset + 8 > segmentEnd) return 1;
  const byteOrder = String.fromCharCode(
    bytes[tiffOffset],
    bytes[tiffOffset + 1],
  );
  if (byteOrder !== 'II' && byteOrder !== 'MM') return 1;

  const littleEndian = byteOrder === 'II';
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(tiffOffset + 2, littleEndian) !== 42) return 1;

  const directoryOffset = view.getUint32(tiffOffset + 4, littleEndian);
  const directoryStart = tiffOffset + directoryOffset;
  if (directoryStart + 2 > segmentEnd) return 1;

  const entryCount = view.getUint16(directoryStart, littleEndian);
  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    const entryOffset = directoryStart + 2 + entryIndex * 12;
    if (entryOffset + 12 > segmentEnd) return 1;

    const isOrientationTag =
      view.getUint16(entryOffset, littleEndian) === 0x0112 &&
      view.getUint16(entryOffset + 2, littleEndian) === 3 &&
      view.getUint32(entryOffset + 4, littleEndian) === 1;
    if (isOrientationTag) {
      const orientation = view.getUint16(entryOffset + 8, littleEndian);
      return orientation >= 1 && orientation <= 8 ? orientation : 1;
    }
  }

  return 1;
}

function readJpegHeader(bytes: Uint8Array): {
  width: number;
  height: number;
  orientation: number;
} | null {
  let offset = 2;
  let orientation = 1;

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (bytes[offset] === 0xff) {
      offset += 1;
    }

    const marker = bytes[offset];
    offset += 1;

    if (marker === undefined || marker === 0xda || marker === 0xd9) {
      return null;
    }

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      continue;
    }

    if (offset + 2 > bytes.length) {
      return null;
    }

    const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      return null;
    }

    if (marker === 0xe1) {
      orientation = readExifOrientation(bytes, offset, segmentLength);
    }

    if (JPEG_START_OF_FRAME_MARKERS.has(marker)) {
      if (segmentLength < 7) {
        return null;
      }

      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      return { width, height, orientation };
    }

    offset += segmentLength;
  }

  return null;
}

function assertDimensions(width: number, height: number): void {
  const valid = Number.isSafeInteger(width) && Number.isSafeInteger(height);
  if (!valid || width <= 0 || height <= 0) {
    throw new ImageInputError(
      'invalid-image',
      'This file does not contain valid image dimensions.',
    );
  }

  if (
    width > MAX_INPUT_EDGE ||
    height > MAX_INPUT_EDGE ||
    width * height > MAX_INPUT_PIXELS
  ) {
    throw new ImageInputError(
      'dimensions-too-large',
      'This image exceeds the 24 megapixel mobile safety limit. Resize it on your device and try again.',
    );
  }
}

export async function inspectImageFile(file: File): Promise<ImageInfo> {
  if (file.size === 0) {
    throw new ImageInputError('invalid-image', 'The selected file is empty.');
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageInputError(
      'file-too-large',
      'Choose an image 32 MB or smaller for reliable mobile processing.',
    );
  }

  const declaredType = file.type.toLowerCase();
  if (
    declaredType &&
    declaredType !== 'application/octet-stream' &&
    !SUPPORTED_MIME_TYPES.has(declaredType as ImageMimeType)
  ) {
    throw new ImageInputError(
      'unsupported-type',
      'Choose a JPEG or PNG image. HEIC, HEIF, and WebP are not supported.',
    );
  }

  const prefix = new Uint8Array(
    await file.slice(0, Math.min(file.size, 24)).arrayBuffer(),
  );
  let mimeType: ImageMimeType;
  let dimensions: { width: number; height: number } | null;
  let orientation = 1;

  if (isPng(prefix)) {
    mimeType = 'image/png';
    const view = new DataView(
      prefix.buffer,
      prefix.byteOffset,
      prefix.byteLength,
    );
    dimensions = {
      width: view.getUint32(16),
      height: view.getUint32(20),
    };
  } else if (isJpeg(prefix)) {
    mimeType = 'image/jpeg';
    const headerBytes = new Uint8Array(
      await file.slice(0, Math.min(file.size, MAX_HEADER_BYTES)).arrayBuffer(),
    );
    const jpegHeader = readJpegHeader(headerBytes);
    dimensions = jpegHeader;
    orientation = jpegHeader?.orientation ?? 1;
  } else {
    throw new ImageInputError(
      'unsupported-type',
      'Choose a JPEG or PNG image. HEIC, HEIF, and WebP are not supported.',
    );
  }

  if (
    declaredType &&
    declaredType !== 'application/octet-stream' &&
    declaredType !== mimeType
  ) {
    throw new ImageInputError(
      'invalid-image',
      'The file type does not match its image contents.',
    );
  }

  if (!dimensions) {
    throw new ImageInputError(
      'invalid-image',
      'The image header is incomplete or damaged. Try another JPEG or PNG.',
    );
  }

  if (orientation >= 5) {
    dimensions = { width: dimensions.height, height: dimensions.width };
  }

  assertDimensions(dimensions.width, dimensions.height);
  return { mimeType, ...dimensions, orientation };
}

export function calculateOutputDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: MaxEdgeOption,
): { width: number; height: number } {
  if (
    !Number.isSafeInteger(sourceWidth) ||
    !Number.isSafeInteger(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    throw new ImageInputError(
      'invalid-image',
      'The browser could not read valid image dimensions.',
    );
  }

  const sourcePixels = sourceWidth * sourceHeight;
  if (maxEdge === 'original') {
    if (
      sourceWidth > MAX_CANVAS_EDGE ||
      sourceHeight > MAX_CANVAS_EDGE ||
      sourcePixels > MAX_ORIGINAL_OUTPUT_PIXELS
    ) {
      throw new ImageInputError(
        'dimensions-too-large',
        'Original size exceeds the safe canvas limit. Choose a smaller maximum edge.',
      );
    }

    return { width: sourceWidth, height: sourceHeight };
  }

  if (!(MAX_EDGE_OPTIONS as readonly number[]).includes(maxEdge)) {
    throw new RangeError('Choose one of the supported maximum edge values.');
  }

  const scale = Math.min(
    1,
    maxEdge / Math.max(sourceWidth, sourceHeight),
    Math.sqrt(MAX_OUTPUT_PIXELS / sourcePixels),
  );

  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}

export function compareImageSizes(
  originalBytes: number,
  compressedBytes: number,
): ImageSizeComparison {
  if (
    !Number.isFinite(originalBytes) ||
    !Number.isFinite(compressedBytes) ||
    originalBytes <= 0 ||
    compressedBytes < 0
  ) {
    throw new RangeError('Image sizes must be finite byte counts.');
  }

  const byteDifference = compressedBytes - originalBytes;
  return {
    isLarger: byteDifference > 0,
    percentage: (Math.abs(byteDifference) / originalBytes) * 100,
  };
}
