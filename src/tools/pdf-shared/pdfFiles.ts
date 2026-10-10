import { PDFDocument } from 'pdf-lib';

export const MAX_PDF_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_MERGE_BYTES = 100 * 1024 * 1024;
export const MAX_OUTPUT_PAGES = 500;
export const MAX_SPLIT_OUTPUTS = 20;

export interface LoadedPdfFile {
  id: string;
  file: File;
  bytes: Uint8Array;
  pageCount: number;
}

const PDF_HEADER = [37, 80, 68, 70, 45] as const;
const HEADER_SCAN_BYTES = 1024;

function hasPdfHeader(bytes: Uint8Array): boolean {
  for (let start = 0; start <= bytes.length - PDF_HEADER.length; start += 1) {
    if (PDF_HEADER.every((byte, offset) => bytes[start + offset] === byte)) {
      return true;
    }
  }
  return false;
}

export async function readPdfFile(file: File): Promise<Uint8Array> {
  if (file.size === 0) throw new Error('The selected file is empty.');
  const type = file.type.toLowerCase();
  if (
    type &&
    type !== 'application/pdf' &&
    type !== 'application/octet-stream'
  ) {
    throw new Error('Choose a PDF file.');
  }
  const prefix = new Uint8Array(
    await file.slice(0, HEADER_SCAN_BYTES).arrayBuffer(),
  );
  if (!hasPdfHeader(prefix))
    throw new Error('The selected file is not a valid PDF.');
  return new Uint8Array(await file.arrayBuffer());
}

export function getPdfErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (
      /encrypt|password/i.test(error.message) ||
      error.name === 'PasswordException'
    ) {
      return 'This PDF is encrypted. Remove its password and try again.';
    }
    if (error instanceof RangeError || error.name === 'PdfInputError')
      return error.message;
  }
  return 'Could not process this PDF. It may be damaged or unsupported. Your selected files are still available.';
}

export async function loadPdfFile(file: File): Promise<LoadedPdfFile> {
  try {
    if (file.size > MAX_PDF_FILE_BYTES)
      throw new RangeError('Choose a PDF 25 MB or smaller.');
    let bytes: Uint8Array;
    try {
      bytes = await readPdfFile(file);
    } catch (error) {
      if (error instanceof Error) error.name = 'PdfInputError';
      throw error;
    }
    const document = await PDFDocument.load(bytes);
    const pageCount = document.getPageCount();
    if (!pageCount)
      throw new RangeError('This PDF has no pages. Choose another file.');
    return { id: crypto.randomUUID(), file, bytes, pageCount };
  } catch (error) {
    throw Object.assign(new Error(getPdfErrorMessage(error)), { cause: error });
  }
}
