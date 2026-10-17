import { parsePageSelection } from '../pdf-shared/pageRanges';
import { MAX_CONVERSION_ITEMS } from './conversionLimits';
import type { ImageFit } from './conversionTypes';

export function fitImage(
  iw: number,
  ih: number,
  bw: number,
  bh: number,
  fit: ImageFit,
) {
  if (![iw, ih, bw, bh].every((v) => Number.isFinite(v) && v > 0))
    throw new RangeError('Image and page dimensions must be positive.');
  const scale =
    fit === 'contain' ? Math.min(bw / iw, bh / ih) : Math.max(bw / iw, bh / ih);
  if (fit === 'cover') {
    const sw = bw / scale;
    const sh = bh / scale;
    return {
      x: 0,
      y: 0,
      width: bw,
      height: bh,
      sx: (iw - sw) / 2,
      sy: (ih - sh) / 2,
      sw,
      sh,
    };
  }
  const width = iw * scale;
  const height = ih * scale;
  return {
    x: (bw - width) / 2,
    y: (bh - height) / 2,
    width,
    height,
    sx: 0,
    sy: 0,
    sw: iw,
    sh: ih,
  };
}

export function getExportPages(value: string, count: number): number[] {
  if (!Number.isSafeInteger(count) || count < 1)
    throw new RangeError('This document has no pages or slides.');
  if (!value.trim() && count > MAX_CONVERSION_ITEMS)
    throw new RangeError('Select 50 pages or slides or fewer using a range.');
  const pages = value.trim()
    ? parsePageSelection(value, count)
    : Array.from({ length: count }, (_, i) => i + 1);
  if (pages.length > MAX_CONVERSION_ITEMS)
    throw new RangeError('Select 50 pages or slides or fewer.');
  return pages;
}

export function baseFilename(name: string) {
  const cleaned = Array.from(name, (character) =>
    character.charCodeAt(0) < 32 ? '-' : character,
  ).join('');
  return (
    cleaned
      .replace(/\.[^.]+$/, '')
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/^[.\s-]+|[.\s-]+$/g, '')
      .slice(0, 100) || 'document'
  );
}

export function outputFilename(
  name: string,
  unit: 'page' | 'slide',
  page: number,
  extension: string,
) {
  return `${baseFilename(name)}-${unit}-${String(page).padStart(3, '0')}.${extension}`;
}
