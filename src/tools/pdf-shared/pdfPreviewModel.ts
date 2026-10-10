export interface PdfPreviewSource {
  id: string;
  filename: string;
  kind: 'source' | 'output';
  data: Uint8Array | Blob;
  originalPages?: readonly number[];
}

export function parsePreviewPage(
  value: string,
  pageCount: number,
): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 && page <= pageCount
    ? page
    : null;
}

export function getThumbnailPages(page: number, count: number): number[] {
  const length = Math.min(5, count);
  const start = Math.max(1, Math.min(page - 2, count - length + 1));
  return Array.from({ length }, (_, index) => start + index);
}

export function getCanvasScale(
  width: number,
  height: number,
  deviceScale: number,
): number {
  return Math.min(deviceScale || 1, Math.sqrt(4_000_000 / (width * height)));
}
