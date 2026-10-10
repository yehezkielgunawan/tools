export interface PdfOutput {
  url: string;
  blob: Blob;
  filename: string;
  pageCount: number;
  originalPages?: readonly number[];
}

export function getPdfFilename(value: string, fallback: string): string {
  const cleaned = Array.from(value, (character) =>
    character.charCodeAt(0) < 32 ? '-' : character,
  ).join('');
  const base = cleaned
    .trim()
    .replace(/\.pdf$/i, '')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/^\.+|\.+$/g, '')
    .trim();
  return `${base || fallback}.pdf`;
}

export function getSplitFilename(
  sourceName: string,
  pages: readonly number[],
  outputNumber: number,
): string {
  const base = getPdfFilename(sourceName, 'document').slice(0, -4);
  const selection =
    pages.length === 1
      ? `${pages[0]}`
      : `${pages[0]}-${pages[pages.length - 1]}`;
  return getPdfFilename(
    `${base}-part-${outputNumber}-pages-${selection}`,
    'document',
  );
}

export function createPdfOutput(
  bytes: Uint8Array,
  filename: string,
  pageCount: number,
  originalPages?: readonly number[],
): PdfOutput {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
  return {
    url: URL.createObjectURL(blob),
    blob,
    filename,
    pageCount,
    originalPages,
  };
}
