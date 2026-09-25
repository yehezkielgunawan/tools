import {
  calculateOutputDimensions,
  ImageInputError,
  type ImageMimeType,
  MAX_INPUT_BYTES,
  MAX_INPUT_EDGE,
  MAX_INPUT_PIXELS,
} from '../image-compressor/imageUtils';
import {
  type PreparedImage,
  prepareImage,
  releaseCanvas,
} from '../image-compressor/prepareImage';
import {
  clampWatermarkPosition,
  type WatermarkPosition,
} from './watermarkGeometry';

export const WATERMARK_MAX_EDGE = 2048;
export const HEIF_DECODE_WARNING =
  "This browser can't open this HEIC/HEIF photo. Try a JPEG or PNG, or convert the photo on your device first.";

export type WatermarkInputMimeType =
  | ImageMimeType
  | 'image/heic'
  | 'image/heif'
  | 'image/heic-sequence'
  | 'image/heif-sequence'
  | 'image/x-heic'
  | 'image/x-heif';

export interface PreparedWatermarkImage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  mimeType: ImageMimeType;
  inputMimeType: WatermarkInputMimeType;
}

export interface WatermarkRenderOptions {
  text: string;
  position: WatermarkPosition;
  fontScale: number;
  color: string;
  opacity: number;
}

interface HeifDimensions {
  width: number;
  height: number;
}

interface BoxHeader {
  type: string;
  payloadStart: number;
  end: number;
}

interface DecodedImage {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

const MAX_HEIF_HEADER_BYTES = 1024 * 1024;
const HEIF_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1']);
const HEIF_MIME_TYPES = new Set<WatermarkInputMimeType>([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
  'image/x-heic',
  'image/x-heif',
]);
const HEIF_EXTENSIONS = new Set(['.heic', '.heif']);

function getBoxHeader(
  view: DataView,
  offset: number,
  limit: number,
): BoxHeader | null {
  if (offset + 8 > limit) return null;

  const size32 = view.getUint32(offset);
  const type = String.fromCharCode(
    view.getUint8(offset + 4),
    view.getUint8(offset + 5),
    view.getUint8(offset + 6),
    view.getUint8(offset + 7),
  );
  let headerSize = 8;
  let boxSize = size32;

  if (size32 === 1) {
    if (offset + 16 > limit) return null;
    boxSize =
      view.getUint32(offset + 8) * 2 ** 32 + view.getUint32(offset + 12);
    headerSize = 16;
  } else if (size32 === 0) {
    boxSize = limit - offset;
  }

  if (!Number.isSafeInteger(boxSize) || boxSize < headerSize) return null;

  return {
    type,
    payloadStart: offset + headerSize,
    end: Math.min(offset + boxSize, limit),
  };
}

function readHeifDimensions(bytes: Uint8Array): HeifDimensions | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fileTypeBox = getBoxHeader(view, 0, bytes.length);
  if (fileTypeBox?.type !== 'ftyp') return null;

  const brands = new Set<string>();
  if (fileTypeBox.payloadStart + 8 > fileTypeBox.end) return null;

  const readBrand = (offset: number): string =>
    String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    );

  brands.add(readBrand(fileTypeBox.payloadStart));
  for (
    let offset = fileTypeBox.payloadStart + 8;
    offset + 4 <= fileTypeBox.end;
    offset += 4
  ) {
    brands.add(readBrand(offset));
  }
  if (![...brands].some((brand) => HEIF_BRANDS.has(brand))) return null;

  const findDimensions = (
    start: number,
    end: number,
    depth: number,
  ): HeifDimensions | null => {
    if (depth > 5) return null;

    let offset = start;
    while (offset + 8 <= end) {
      const header = getBoxHeader(view, offset, end);
      if (!header || header.end <= offset) return null;

      if (header.type === 'ispe' && header.payloadStart + 12 <= header.end) {
        return {
          width: view.getUint32(header.payloadStart + 4),
          height: view.getUint32(header.payloadStart + 8),
        };
      }

      if (header.type === 'meta' && header.payloadStart + 4 <= header.end) {
        const dimensions = findDimensions(
          header.payloadStart + 4,
          header.end,
          depth + 1,
        );
        if (dimensions) return dimensions;
      } else if (header.type === 'iprp' || header.type === 'ipco') {
        const dimensions = findDimensions(
          header.payloadStart,
          header.end,
          depth + 1,
        );
        if (dimensions) return dimensions;
      }

      offset = header.end;
    }

    return null;
  };

  let offset = fileTypeBox.end;
  while (offset + 8 <= bytes.length) {
    const header = getBoxHeader(view, offset, bytes.length);
    if (!header || header.end <= offset) return null;
    if (header.type === 'meta') {
      const dimensions = findDimensions(header.payloadStart + 4, header.end, 1);
      if (dimensions) return dimensions;
    }
    offset = header.end;
  }

  return null;
}

function assertInputSize(file: File): void {
  if (file.size === 0) {
    throw new ImageInputError('invalid-image', 'The selected file is empty.');
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageInputError(
      'file-too-large',
      'Choose a photo 32 MB or smaller for reliable mobile processing.',
    );
  }
}

function assertInputDimensions(width: number, height: number): void {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new ImageInputError(
      'invalid-image',
      'This HEIC/HEIF file does not contain valid image dimensions.',
    );
  }

  if (
    width > MAX_INPUT_EDGE ||
    height > MAX_INPUT_EDGE ||
    width * height > MAX_INPUT_PIXELS
  ) {
    throw new ImageInputError(
      'dimensions-too-large',
      'This photo exceeds the 24 megapixel mobile safety limit. Resize it on your device and try again.',
    );
  }
}

function unsupportedHeifError(): ImageInputError {
  return new ImageInputError('unsupported-type', HEIF_DECODE_WARNING);
}

function getHeifInputType(file: File): WatermarkInputMimeType | null {
  const declaredType = file.type.toLowerCase();
  if (HEIF_MIME_TYPES.has(declaredType as WatermarkInputMimeType)) {
    return declaredType as WatermarkInputMimeType;
  }

  const extension = file.name.match(/\.[^.]+$/)?.[0]?.toLowerCase() ?? '';
  if (
    HEIF_EXTENSIONS.has(extension) &&
    (!declaredType || declaredType === 'application/octet-stream')
  ) {
    return extension === '.heic' ? 'image/heic' : 'image/heif';
  }

  return null;
}

export async function inspectHeifFile(file: File): Promise<HeifDimensions> {
  assertInputSize(file);

  const bytes = new Uint8Array(
    await file.slice(0, MAX_HEIF_HEADER_BYTES).arrayBuffer(),
  );
  const dimensions = readHeifDimensions(bytes);
  if (!dimensions) {
    throw unsupportedHeifError();
  }

  assertInputDimensions(dimensions.width, dimensions.height);
  return dimensions;
}

function loadHeifImageElement(file: File): Promise<DecodedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    let settled = false;

    const release = (): void => {
      image.onload = null;
      image.onerror = null;
      image.src = '';
      URL.revokeObjectURL(url);
    };

    const resolveImage = (): void => {
      if (settled) return;
      settled = true;
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        release,
      });
    };

    image.onload = resolveImage;
    image.onerror = () => {
      if (settled) return;
      settled = true;
      release();
      reject(unsupportedHeifError());
    };
    image.src = url;

    if (typeof image.decode === 'function') {
      void image.decode().then(resolveImage, () => {
        if (settled) return;
        settled = true;
        release();
        reject(unsupportedHeifError());
      });
    }
  });
}

async function decodeHeifImage(
  file: File,
  dimensions: HeifDimensions,
): Promise<DecodedImage> {
  if (typeof createImageBitmap !== 'function') {
    return loadHeifImageElement(file);
  }

  const outputDimensions = calculateOutputDimensions(
    dimensions.width,
    dimensions.height,
    WATERMARK_MAX_EDGE,
  );
  const resizeOptions: ImageBitmapOptions = {
    imageOrientation: 'from-image',
    resizeQuality: 'high',
    ...(dimensions.width >= dimensions.height
      ? { resizeWidth: outputDimensions.width }
      : { resizeHeight: outputDimensions.height }),
  };

  try {
    const bitmap = await createImageBitmap(file, resizeOptions);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    };
  } catch {
    throw unsupportedHeifError();
  }
}

function prepareCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  backgroundColor?: string,
): HTMLCanvasElement {
  const dimensions = calculateOutputDimensions(
    width,
    height,
    WATERMARK_MAX_EDGE,
  );
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext('2d');
  if (!context) {
    releaseCanvas(canvas);
    throw new Error('The image canvas is unavailable in this browser.');
  }

  try {
    if (backgroundColor) {
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, dimensions.width, dimensions.height);
    }
    context.drawImage(source, 0, 0, dimensions.width, dimensions.height);
    return canvas;
  } catch (error) {
    releaseCanvas(canvas);
    throw error;
  }
}

export function getWatermarkOutputMimeType(
  inputMimeType: WatermarkInputMimeType,
): ImageMimeType {
  return inputMimeType === 'image/png' ? 'image/png' : 'image/jpeg';
}

export async function prepareWatermarkImage(
  file: File,
): Promise<PreparedWatermarkImage> {
  assertInputSize(file);

  const heifType = getHeifInputType(file);
  if (heifType) {
    const dimensions = await inspectHeifFile(file);
    const decoded = await decodeHeifImage(file, dimensions);
    let canvas: HTMLCanvasElement | null = null;

    try {
      assertInputDimensions(decoded.width, decoded.height);
      canvas = prepareCanvas(
        decoded.source,
        decoded.width,
        decoded.height,
        '#fff',
      );
      return {
        canvas,
        width: canvas.width,
        height: canvas.height,
        mimeType: getWatermarkOutputMimeType(heifType),
        inputMimeType: heifType,
      };
    } catch (error) {
      if (canvas) releaseCanvas(canvas);
      throw error;
    } finally {
      decoded.release();
    }
  }

  const declaredType = file.type.toLowerCase();
  if (
    declaredType &&
    declaredType !== 'application/octet-stream' &&
    declaredType !== 'image/jpeg' &&
    declaredType !== 'image/png'
  ) {
    throw new ImageInputError(
      'unsupported-type',
      'Choose a JPEG, PNG, HEIC, or HEIF photo.',
    );
  }

  const prepared: PreparedImage = await prepareImage(
    file,
    WATERMARK_MAX_EDGE,
    'same',
  );
  return {
    canvas: prepared.canvas,
    width: prepared.width,
    height: prepared.height,
    mimeType: prepared.outputMimeType,
    inputMimeType: prepared.mimeType,
  };
}

export function releaseWatermarkImage(image: PreparedWatermarkImage): void {
  releaseCanvas(image.canvas);
}

function getWatermarkTextSize(
  context: CanvasRenderingContext2D,
  text: string,
  imageSize: { width: number; height: number },
  fontScale: number,
): { width: number; height: number } {
  const shortEdge = Math.min(imageSize.width, imageSize.height);
  let fontSize = Math.max(
    1,
    Math.round(shortEdge * Math.min(0.2, Math.max(0.02, fontScale))),
  );
  context.font = `600 ${fontSize}px system-ui, sans-serif`;

  const firstMetrics = context.measureText(text);
  const maxWidth = imageSize.width * 0.9;
  if (firstMetrics.width > maxWidth && firstMetrics.width > 0) {
    fontSize = Math.max(
      1,
      Math.floor(fontSize * (maxWidth / firstMetrics.width)),
    );
    context.font = `600 ${fontSize}px system-ui, sans-serif`;
  }

  const metrics = context.measureText(text);
  return {
    width: Math.min(metrics.width, maxWidth),
    height:
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent ||
      fontSize * 1.2,
  };
}

export function renderWatermark(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  options: WatermarkRenderOptions,
): WatermarkPosition {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  targetCanvas.width = width;
  targetCanvas.height = height;
  const context = targetCanvas.getContext('2d');
  if (!context) {
    throw new Error('The image canvas is unavailable in this browser.');
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(sourceCanvas, 0, 0, width, height);
  if (!options.text.trim()) return options.position;

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  const textSize = getWatermarkTextSize(
    context,
    options.text,
    { width, height },
    options.fontScale,
  );
  const position = clampWatermarkPosition(
    options.position,
    { width, height },
    textSize,
  );
  const x = position.x * width;
  const y = position.y * height;
  const alpha = Math.max(0, Math.min(1, options.opacity));

  context.save();
  context.globalAlpha = alpha;
  context.lineWidth = Math.max(1, Math.round(Math.min(width, height) * 0.0015));
  context.strokeStyle =
    options.color.toLowerCase() === '#ffffff'
      ? 'rgba(0, 0, 0, 0.78)'
      : 'rgba(255, 255, 255, 0.86)';
  context.shadowColor = 'rgba(0, 0, 0, 0.55)';
  context.shadowBlur = Math.min(width, height) * 0.003;
  context.shadowOffsetY = Math.min(width, height) * 0.0015;
  context.fillStyle = options.color;
  context.strokeText(options.text, x, y, width * 0.9);
  context.fillText(options.text, x, y, width * 0.9);
  context.restore();

  return position;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: ImageMimeType,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error('The browser could not create the watermarked image.'),
          );
          return;
        }
        if (blob.type !== mimeType) {
          reject(
            new Error(`This browser does not support ${mimeType} output.`),
          );
          return;
        }
        resolve(blob);
      },
      mimeType,
      mimeType === 'image/jpeg' ? 0.92 : undefined,
    );
  });
}

export async function exportWatermarkedImage(
  sourceCanvas: HTMLCanvasElement,
  options: WatermarkRenderOptions,
  mimeType: ImageMimeType,
  createCanvas: () => HTMLCanvasElement = () =>
    document.createElement('canvas'),
): Promise<Blob> {
  const canvas = createCanvas();
  try {
    renderWatermark(sourceCanvas, canvas, options);
    return await canvasToBlob(canvas, mimeType);
  } finally {
    releaseCanvas(canvas);
  }
}
