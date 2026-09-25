import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  buildPageOperations,
  type PdfEdit,
  type PdfViewportTransform,
} from './editModel';

function parseHexColor(value: string) {
  const match = /^#([\da-f]{6})$/i.exec(value);
  if (!match) {
    throw new RangeError('Annotation color must be a six-digit hex value.');
  }

  const hex = match[1];
  if (!hex) {
    throw new RangeError('Annotation color must be a six-digit hex value.');
  }

  return rgb(
    Number.parseInt(hex.slice(0, 2), 16) / 255,
    Number.parseInt(hex.slice(2, 4), 16) / 255,
    Number.parseInt(hex.slice(4, 6), 16) / 255,
  );
}

export async function validatePdfCanEdit(bytes: Uint8Array): Promise<void> {
  await PDFDocument.load(bytes);
}

export async function createEditedPdf(
  originalBytes: Uint8Array,
  edits: readonly PdfEdit[],
  pageViewports: readonly PdfViewportTransform[],
): Promise<Uint8Array> {
  const document = await PDFDocument.load(originalBytes);
  const pages = document.getPages();

  if (pages.length !== pageViewports.length) {
    throw new RangeError('Page geometry is unavailable for this PDF.');
  }

  let font: Awaited<ReturnType<typeof document.embedFont>> | null = null;

  for (const [pageIndex, page] of pages.entries()) {
    const operations = buildPageOperations(
      edits,
      pageIndex,
      pageViewports[pageIndex] as PdfViewportTransform,
    );

    for (const operation of operations) {
      const color = parseHexColor(operation.color);
      if (operation.kind === 'text') {
        font ??= await document.embedFont(StandardFonts.Helvetica);
        page.drawText(operation.text, {
          x: operation.x,
          y: operation.y,
          size: operation.fontSize,
          font,
          color,
          rotate: degrees(operation.rotateDegrees),
        });
      } else {
        page.drawLine({
          start: operation.start,
          end: operation.end,
          thickness: operation.width,
          color,
        });
      }
    }
  }

  return document.save();
}
